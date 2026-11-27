import "server-only";
import { CONTENT_SCHEMA_VERSION, validateSnapshotChunk, type ChangeEntry, type UnitId } from "@habit/shared";
import type { ContentDb } from "../content-db/client";
import { getContentVersion, getSyncedEpoch, setMeta, setSyncedEpoch } from "../content-db/meta";
import { applyChanges, applyUnits, type ChangePage, type UnitPage } from "./apply";
import type { UnitInfo } from "./serve";

export type SyncStatus = "up-to-date" | "updated" | "app-too-old" | "offline" | "error";

export type SyncOutcome = {
  status: SyncStatus;
  /** Changes written (entries applied, plus entities re-downloaded). */
  applied: number;
  /** content_version after the run. */
  version: number;
  /** Cache tags to expire (route handlers call revalidateTag with them). */
  tags: string[];
  /**
   * True when every followed unit was downloaded again because the content epoch changed or the server's version is
   * lower than this copy's (plan 0115 rule 6). The caller adds the "Content was refreshed" notice (refreshNotice).
   */
  refreshed: boolean;
  /** The change entries applied from the changes feed (with note, notify and units), for update notices (plan 0119). */
  entries?: ChangeEntry[];
  error?: string;
};

export type SyncDeps = {
  db: ContentDb;
  fetch: typeof fetch;
  /** Origin of the hosted site, without a trailing slash, e.g. https://example.com */
  origin: string;
  /** "all", or the units the client follows. */
  units: "all" | UnitId[];
  now: number;
};

/** Keys in content_meta written by the sync (plan 0115 step 4). */
export const SYNC_META = {
  checkedAt: "sync_last_checked_at",
  status: "sync_status",
  error: "sync_last_error",
} as const;

const APP_TOO_OLD = "New content needs a newer app version.";

async function getJson(f: typeof fetch, url: string): Promise<unknown> {
  const res = await f(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
  return res.json();
}

type RemoteVersion = { version: number; schema: number; epoch: number };

function asVersion(v: unknown, what: string): RemoteVersion {
  if (typeof v !== "object" || v === null) throw new Error(`${what}: expected an object`);
  const o = v as Record<string, unknown>;
  if (typeof o.version !== "number" || typeof o.schema !== "number" || typeof o.epoch !== "number") {
    throw new Error(`${what}: missing version, schema or epoch`);
  }
  return { version: o.version, schema: o.schema, epoch: o.epoch };
}

/** Checks the shape of a changes page before anything is written. */
function asChangePage(v: unknown): ChangePage {
  if (typeof v !== "object" || v === null) throw new Error("changes: expected an object");
  const o = v as Record<string, unknown>;
  if (typeof o.from !== "number" || typeof o.to !== "number" || typeof o.schema !== "number" || !Array.isArray(o.changes)) {
    throw new Error("changes: missing from, to, schema or changes");
  }
  for (const c of o.changes as Record<string, unknown>[]) {
    if (typeof c?.version !== "number" || typeof c.entity !== "string" || typeof c.id !== "string") throw new Error("changes: bad entry");
    if (c.op !== "upsert" && c.op !== "delete") throw new Error("changes: bad op");
    if (!Array.isArray(c.parts) || !Array.isArray(c.units) || typeof c.rev !== "string") throw new Error("changes: bad parts, units or rev");
  }
  return v as ChangePage;
}

/** One unit's pages, fetched at `version`. Each page is shape-checked before use. */
async function fetchUnit(f: typeof fetch, origin: string, unit: UnitId, version: number): Promise<UnitPage[]> {
  const pages: UnitPage[] = [];
  for (let n = 0; ; n++) {
    const body = await getJson(f, `${origin}/api/content/unit/${encodeURIComponent(unit)}?v=${version}&page=${n}`);
    const checked = validateSnapshotChunk(body);
    if (!checked.ok) throw new Error(`unit ${unit}: ${checked.errors[0]}`);
    pages.push({ unit, entities: checked.value.entities, assets: checked.value.assets });
    const next = (body as { next?: unknown }).next;
    if (typeof next !== "number") return pages;
    if (next !== n + 1) throw new Error(`unit ${unit}: unexpected next page ${String(next)}`);
  }
}

async function writeStatus(db: ContentDb, now: number, status: SyncStatus, error: string | null): Promise<void> {
  await db.transaction(async (tx) => {
    await setMeta(tx, SYNC_META.checkedAt, String(now));
    await setMeta(tx, SYNC_META.status, status);
    await setMeta(tx, SYNC_META.error, error ?? "");
  });
}

function sumEntities(pages: UnitPage[]): number {
  return pages.reduce((sum, p) => sum + p.entities.length, 0);
}

/**
 * Full download of the followed units at `remote.version` and `remote.epoch`, in one transaction (plan 0115 rule 6).
 * Desktop ("all") empties the whole copy first, so a unit that disappeared on the server does not stay behind.
 */
async function downloadFull(deps: SyncDeps, base: string, remote: RemoteVersion, refreshed: boolean): Promise<SyncOutcome> {
  const { db, units, now } = deps;
  const f = deps.fetch;
  const list = asUnitList(await getJson(f, `${base}/api/content/units?v=${remote.version}`));
  const wanted = units === "all" ? list.map((u) => u.unit) : units.filter((u) => list.some((l) => l.unit === u));
  const unitPages: UnitPage[] = [];
  for (const unit of wanted) unitPages.push(...(await fetchUnit(f, base, unit, remote.version)));
  const result = await applyUnits(db, unitPages, {
    version: remote.version,
    epoch: remote.epoch,
    purgeAll: units === "all",
  });
  await writeStatus(db, now, "updated", null);
  return { status: "updated", applied: sumEntities(unitPages), version: remote.version, tags: result.tags, refreshed };
}

/**
 * Brings the local copy up to the hosted version (plan 0115 step 4 and rule 6). All network reads happen before any
 * write, so a failure in the middle writes nothing. Versions:
 * - server schema newer than this app: "app-too-old", nothing written;
 * - epoch changed, or the server's version is lower than this copy's: every followed unit is downloaded again
 *   (refreshed true);
 * - same version and epoch: nothing to do;
 * - changes available: fetch them, apply them, then download again any entity whose rev did not match;
 * - 410 (too far behind): download every followed unit in full.
 * content_version moves only once every entity is in the state the server has.
 * An empty copy has no earlier download to compare with, so it takes the server's epoch and the changes feed fills it.
 */
export async function syncContent(deps: SyncDeps): Promise<SyncOutcome> {
  const { db, origin, units, now } = deps;
  const f = deps.fetch;
  const base = origin.replace(/\/+$/, "");
  const local = await getContentVersion(db);

  try {
    const remote = asVersion(await getJson(f, `${base}/api/content/version`), "version");
    if (remote.schema > CONTENT_SCHEMA_VERSION) {
      await writeStatus(db, now, "app-too-old", APP_TOO_OLD);
      return { status: "app-too-old", applied: 0, version: local, tags: [], refreshed: false, error: APP_TOO_OLD };
    }

    const synced = await getSyncedEpoch(db);
    const baseline = synced ?? (local === 0 ? remote.epoch : null);
    if (baseline !== remote.epoch || remote.version < local) {
      // "Refreshed" (and its notice) only when this copy had synced before and the server really moved on. A copy that
      // never synced (shipped in the installer, or seeded) is simply brought in line, silently.
      return await downloadFull(deps, base, remote, synced !== null);
    }
    if (remote.version === local) {
      await writeStatus(db, now, "up-to-date", null);
      return { status: "up-to-date", applied: 0, version: local, tags: [], refreshed: false };
    }

    const unitsParam = units === "all" ? "all" : units.join(",");
    const pages: ChangePage[] = [];
    let gone = false;
    let since = local;
    for (;;) {
      const res = await f(`${base}/api/content/changes?since=${since}&units=${encodeURIComponent(unitsParam)}`);
      if (res.status === 410) {
        gone = true;
        break;
      }
      if (!res.ok) throw new Error(`GET changes failed with ${res.status}`);
      const page = asChangePage(await res.json());
      if (page.schema > CONTENT_SCHEMA_VERSION) {
        await writeStatus(db, now, "app-too-old", APP_TOO_OLD);
        return { status: "app-too-old", applied: 0, version: local, tags: [], refreshed: false, error: APP_TOO_OLD };
      }
      pages.push(page);
      if (page.next === undefined) break;
      if (page.next <= since) throw new Error("changes: next cursor did not advance");
      since = page.next;
    }

    if (gone) return await downloadFull(deps, base, remote, false);

    // Apply the changes pages in order; content_version moves only after any mismatch is repaired.
    let applied = 0;
    const tags: string[] = [];
    const entries: ChangeEntry[] = [];
    const mismatched = new Map<string, { unit: UnitId }>();
    for (const page of pages) {
      const r = await applyChanges(db, page, { setVersion: false });
      applied += r.applied.length;
      entries.push(...r.applied);
      tags.push(...r.tags);
      for (const m of r.mismatches) for (const u of m.units) mismatched.set(u, { unit: u });
    }

    if (mismatched.size > 0) {
      const unitPages: UnitPage[] = [];
      for (const { unit } of mismatched.values()) unitPages.push(...(await fetchUnit(f, base, unit, remote.version)));
      const result = await applyUnits(db, unitPages, { version: remote.version });
      tags.push(...result.tags);
      applied += sumEntities(unitPages);
    } else {
      const to = pages.length > 0 ? pages[pages.length - 1].to : remote.version;
      await db.transaction(async (tx) => setMeta(tx, "content_version", String(to)));
    }
    // The epoch matched (or the copy was empty), so this copy now holds the server's epoch.
    await db.transaction(async (tx) => setSyncedEpoch(tx, remote.epoch));

    const version = await getContentVersion(db);
    const status: SyncStatus = applied > 0 ? "updated" : "up-to-date";
    await writeStatus(db, now, status, null);
    return { status, applied, version, tags: [...new Set(tags)], refreshed: false, entries };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // fetch() rejects with a TypeError when the network is down.
    const offline = e instanceof TypeError;
    const status: SyncStatus = offline ? "offline" : "error";
    try {
      await writeStatus(db, now, status, message);
    } catch {
      // The status row is best effort; the outcome below still tells the caller what happened.
    }
    return { status, applied: 0, version: local, tags: [], refreshed: false, error: message };
  }
}

function asUnitList(v: unknown): UnitInfo[] {
  if (!Array.isArray(v)) throw new Error("units: expected a list");
  for (const u of v as Record<string, unknown>[]) {
    if (typeof u?.unit !== "string") throw new Error("units: bad entry");
  }
  return v as UnitInfo[];
}
