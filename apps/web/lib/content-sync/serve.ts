import "server-only";
import { and, asc, eq, inArray, isNull, min, or, sql } from "drizzle-orm";
import {
  CONTENT_SCHEMA_VERSION,
  canonicalJson,
  extractParts,
  mergeChanges,
  revOf,
  type AssetRow,
  type ChangeEntry,
  type ContentEntity,
  type EntityKind,
  type PartId,
  type UnitId,
} from "@habit/shared";
import type { ContentDb, ContentTx } from "../content-db/client";
import { loadCourse, loadDoc, loadLesson, loadProblem } from "../content-db/load";
import { getContentVersion, getSchemaVersion } from "../content-db/meta";
import { assets, changes, courses, docs, lessons, problems } from "../content-db/schema";

/** One unit page is at most this many bytes of JSON (images included as base64). Plan 0115 step 2. */
export const UNIT_PAGE_BYTES = 3 * 1024 * 1024;
/** A changes page holds at most this many entities. Plan 0115 step 3. */
export const CHANGE_ENTITY_LIMIT = 200;
/** A changes page is at most this many bytes of JSON (images included), next to the entity limit. Plan 0115 step 3. */
export const CHANGE_PAGE_BYTES = 3 * 1024 * 1024;

const CHANGE_BATCH = 500;
const UNIT_RE = /^(course:[^:/\s]+|problems:[^:/\s]+|docs)$/;

export type UnitInfo = { unit: UnitId; title: string; kind: "course" | "problems" | "docs"; count: number; bytes: number; rev: string };

export type UnitPageBody = { entities: ContentEntity[]; assets: AssetRow[]; next?: number };

export type ChangesPageBody = {
  from: number;
  to: number;
  schema: number;
  changes: ChangeEntry[];
  next?: number;
};

export function unitKind(unit: string): UnitInfo["kind"] | null {
  if (!UNIT_RE.test(unit)) return null;
  if (unit === "docs") return "docs";
  return unit.startsWith("course:") ? "course" : "problems";
}

/** The ids of the parts of a unit: "problems:other" is the problems with no pattern. */
function patternOf(unit: string): string {
  return unit.slice("problems:".length);
}

function courseOf(unit: string): string {
  return unit.slice("course:".length);
}

/**
 * Current entity by kind and id (doc ids are `kind:id`), or null when missing or soft-deleted.
 */
export async function loadCurrent(db: ContentDb | ContentTx, entity: EntityKind, id: string): Promise<ContentEntity | null> {
  switch (entity) {
    case "problem": {
      const value = await loadProblem(db, id);
      return value ? { kind: "problem", value } : null;
    }
    case "lesson": {
      const value = await loadLesson(db, id);
      return value ? { kind: "lesson", value } : null;
    }
    case "course": {
      const value = await loadCourse(db, id);
      return value ? { kind: "course", value } : null;
    }
    case "doc": {
      const sep = id.indexOf(":");
      if (sep < 0) return null;
      const value = await loadDoc(db, id.slice(0, sep), id.slice(sep + 1));
      return value ? { kind: "doc", value } : null;
    }
  }
}

/** Every live entity of one unit, in a stable order (course first, then lessons by order; problems by id; docs by key). */
export async function unitEntities(db: ContentDb, unit: UnitId): Promise<ContentEntity[]> {
  const kind = unitKind(unit);
  const out: ContentEntity[] = [];
  if (kind === "course") {
    const id = courseOf(unit);
    const course = await loadCourse(db, id);
    if (course) out.push({ kind: "course", value: course });
    const rows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.courseId, id), eq(lessons.deleted, 0)))
      .orderBy(asc(lessons.ord), asc(lessons.id));
    for (const r of rows) {
      const lesson = await loadLesson(db, r.id);
      if (lesson) out.push({ kind: "lesson", value: lesson });
    }
  } else if (kind === "problems") {
    const pattern = patternOf(unit);
    const where =
      pattern === "other"
        ? or(isNull(problems.pattern), eq(problems.pattern, ""))
        : eq(problems.pattern, pattern);
    const rows = await db
      .select({ id: problems.id })
      .from(problems)
      .where(and(where, eq(problems.deleted, 0)))
      .orderBy(asc(problems.id));
    for (const r of rows) {
      const value = await loadProblem(db, r.id);
      if (value) out.push({ kind: "problem", value });
    }
  } else if (kind === "docs") {
    const rows = await db
      .select({ kind: docs.kind, id: docs.id })
      .from(docs)
      .where(eq(docs.deleted, 0))
      .orderBy(asc(docs.kind), asc(docs.id));
    for (const r of rows) {
      const value = await loadDoc(db, r.kind, r.id);
      if (value) out.push({ kind: "doc", value });
    }
  }
  return out;
}

/** Image ids referenced by the blocks of an entity. */
function assetIdsOf(entity: ContentEntity): string[] {
  const pages =
    entity.kind === "problem"
      ? [entity.value.statement, entity.value.solution]
      : entity.kind === "lesson"
        ? [entity.value.page]
        : [];
  const ids: string[] = [];
  for (const page of pages) for (const s of page.sections) for (const b of s.blocks) if (b.assetId) ids.push(b.assetId);
  return ids;
}

/** Loads the image rows (bytes as base64) for the given ids. Missing ids are skipped. */
export async function loadAssets(db: ContentDb, ids: string[]): Promise<Map<string, AssetRow>> {
  const out = new Map<string, AssetRow>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 50) {
    const rows = await db
      .select({ id: assets.id, mime: assets.mime, bytes: assets.bytes, width: assets.width, height: assets.height })
      .from(assets)
      .where(inArray(assets.id, unique.slice(i, i + 50)));
    for (const r of rows) {
      out.set(r.id, {
        id: r.id,
        mime: r.mime as AssetRow["mime"],
        base64: Buffer.from(r.bytes).toString("base64"),
        width: r.width,
        height: r.height,
      });
    }
  }
  return out;
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Units for the Settings list (plan 0115 step 2): sizes are the JSON bytes of each unit's entities. */
export async function listUnits(db: ContentDb): Promise<UnitInfo[]> {
  const units: { unit: UnitId; title: string; kind: UnitInfo["kind"]; revs: string[] }[] = [];

  const courseRows = await db.select({ id: courses.id, title: courses.title, rev: courses.rev }).from(courses).where(eq(courses.deleted, 0)).orderBy(asc(courses.ord), asc(courses.id));
  for (const c of courseRows) {
    const lessonRows = await db
      .select({ rev: lessons.rev })
      .from(lessons)
      .where(and(eq(lessons.courseId, c.id), eq(lessons.deleted, 0)));
    units.push({ unit: `course:${c.id}`, title: c.title, kind: "course", revs: [c.rev, ...lessonRows.map((l) => l.rev)] });
  }

  const problemRows = await db.select({ pattern: problems.pattern, rev: problems.rev }).from(problems).where(eq(problems.deleted, 0));
  const byPattern = new Map<string, string[]>();
  for (const p of problemRows) {
    const key = p.pattern || "other";
    const list = byPattern.get(key) ?? [];
    list.push(p.rev);
    byPattern.set(key, list);
  }
  // Pattern names come from the database (doc "dsa-groups"), not from the shared constants (round B rule).
  const groupDoc = await loadDoc(db, "dsa-groups", "main");
  const names = new Map<string, string>();
  for (const g of (groupDoc?.row.body as { patterns?: { id: string; name: string }[] }[] | undefined) ?? []) {
    for (const p of g.patterns ?? []) names.set(p.id, p.name);
  }
  const titleOf = (pattern: string) => (pattern === "other" ? "Other problems" : (names.get(pattern) ?? pattern));
  for (const [pattern, revs] of [...byPattern.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    units.push({ unit: `problems:${pattern}`, title: titleOf(pattern), kind: "problems", revs });
  }

  const docRows = await db.select({ rev: docs.rev }).from(docs).where(eq(docs.deleted, 0));
  if (docRows.length > 0) units.push({ unit: "docs", title: "Reading, revise and key numbers", kind: "docs", revs: docRows.map((d) => d.rev) });

  const out: UnitInfo[] = [];
  for (const u of units) {
    const entities = await unitEntities(db, u.unit);
    const bytes = entities.reduce((sum, e) => sum + byteLength(canonicalJson(e)), 0);
    out.push({ unit: u.unit, title: u.title, kind: u.kind, count: entities.length, bytes, rev: revOf(u.revs.sort()) });
  }
  return out;
}

/**
 * The pages of one unit: greedy packing by JSON size, each page at most UNIT_PAGE_BYTES including the images its entities
 * use. A single entity bigger than the limit gets a page of its own. Returns [] when the unit has no live entities.
 */
export async function unitPages(db: ContentDb, unit: UnitId): Promise<UnitPageBody[]> {
  const entities = await unitEntities(db, unit);
  if (entities.length === 0) return [];
  const imageIds = entities.flatMap(assetIdsOf);
  const imageRows = await loadAssets(db, imageIds);

  const pages: UnitPageBody[] = [];
  let cur: UnitPageBody = { entities: [], assets: [] };
  let curBytes = 0;
  let curAssets = new Set<string>();

  for (const e of entities) {
    const entityBytes = byteLength(canonicalJson(e)) + 1;
    const newAssets = [...new Set(assetIdsOf(e))].filter((id) => !curAssets.has(id) && imageRows.has(id));
    const assetBytes = newAssets.reduce((sum, id) => sum + (imageRows.get(id)?.base64.length ?? 0) + 120, 0);
    if (cur.entities.length > 0 && curBytes + entityBytes + assetBytes > UNIT_PAGE_BYTES) {
      pages.push(cur);
      cur = { entities: [], assets: [] };
      curBytes = 0;
      curAssets = new Set();
    }
    cur.entities.push(e);
    curBytes += entityBytes;
    for (const id of newAssets) {
      curAssets.add(id);
      cur.assets.push(imageRows.get(id) as AssetRow);
      curBytes += (imageRows.get(id)?.base64.length ?? 0) + 120;
    }
  }
  pages.push(cur);
  pages.forEach((p, i) => {
    if (i < pages.length - 1) p.next = i + 1;
  });
  return pages;
}

/** The 410 answer's reference point: the oldest change still kept (or the next version when none is kept). */
export async function oldestKeptVersion(db: ContentDb): Promise<number> {
  const [row] = await db.select({ v: min(changes.version) }).from(changes);
  if (row?.v !== null && row?.v !== undefined) return Number(row.v);
  return (await getContentVersion(db)) + 1;
}

export type ChangesRequest = { since: number; units: UnitId[] | null };
export type ChangesResult = { gone: true; oldest: number } | { gone: false; page: ChangesPageBody };

/**
 * The changes after `since` for the given units (null = all), merged per entity (plan 0115 step 3).
 * An entity's data is its current state, restricted to the parts its changes list, so the rev sent is the current rev.
 */
export async function buildChanges(db: ContentDb, req: ChangesRequest): Promise<ChangesResult> {
  const oldest = await oldestKeptVersion(db);
  if (req.since + 1 < oldest) return { gone: true, oldest };

  const current = await getContentVersion(db);
  const wanted = req.units ? new Set(req.units) : null;

  const included: (typeof changes.$inferSelect)[] = [];
  const entityKeys = new Set<string>();
  let cursor = req.since;
  let next: number | undefined;

  scan: while (true) {
    const batch = await db
      .select()
      .from(changes)
      .where(sql`${changes.version} > ${cursor}`)
      .orderBy(asc(changes.version))
      .limit(CHANGE_BATCH);
    if (batch.length === 0) break;
    for (const row of batch) {
      if (wanted && !(JSON.parse(row.unitsJson) as UnitId[]).some((u) => wanted.has(u))) {
        cursor = row.version;
        continue;
      }
      const key = `${row.entity}:${row.entityId}`;
      if (!entityKeys.has(key) && entityKeys.size >= CHANGE_ENTITY_LIMIT) {
        next = included[included.length - 1].version;
        break scan;
      }
      entityKeys.add(key);
      included.push(row);
      cursor = row.version;
    }
    if (batch.length < CHANGE_BATCH) break;
  }

  // Current state of each entity in the page, read once.
  const currentByKey = new Map<string, ContentEntity | null>();
  for (const row of included) {
    const key = `${row.entity}:${row.entityId}`;
    if (!currentByKey.has(key)) currentByKey.set(key, await loadCurrent(db, row.entity as EntityKind, row.entityId));
  }
  // An entity sent whole ("all") also sends the images it uses as asset parts. Without them a fresh copy would have
  // sections that point at images it does not hold.
  const partsOf = (row: typeof changes.$inferSelect, cur: ContentEntity | null): PartId[] => {
    const parts = JSON.parse(row.partsJson) as PartId[];
    if (!cur || !parts.includes("all")) return parts;
    return [...parts, ...assetIdsOf(cur).map((id) => `asset:${id}`)];
  };
  const assetIds = included.flatMap((row) => {
    const cur = currentByKey.get(`${row.entity}:${row.entityId}`) ?? null;
    return partsOf(row, cur)
      .filter((p) => p.startsWith("asset:"))
      .map((p) => p.slice("asset:".length));
  });
  const assetRows = await loadAssets(db, assetIds);

  // One entry per changed row (not yet merged).
  const rowEntries: ChangeEntry[] = included.map((row) => {
    const unitList = JSON.parse(row.unitsJson) as UnitId[];
    const cur = currentByKey.get(`${row.entity}:${row.entityId}`) ?? null;
    const base = { version: row.version, entity: row.entity as EntityKind, id: row.entityId, units: unitList, note: row.note, notify: row.notify === 1, at: row.at };
    if (!cur) return { ...base, op: "delete", rev: row.rev ?? "", parts: ["all"] };
    const parts = partsOf(row, cur);
    const data = extractParts(cur, parts) as Record<PartId, unknown>;
    for (const p of parts) {
      if (p.startsWith("asset:")) data[p] = assetRows.get(p.slice("asset:".length)) ?? null;
    }
    return { ...base, op: "upsert", rev: revOf(cur.value), parts, data };
  });

  // Byte cap (plan 0115 step 3): keep rows in version order while their sizes add up to CHANGE_PAGE_BYTES. The first row
  // is always kept. The sum counts each row's data, so a merged entity counts at least what it sends: the page stays
  // under the cap. Cutting at a row keeps the cursor exact: every row up to `next` is in this page.
  let kept = 0;
  let bytes = 0;
  for (const e of rowEntries) {
    const size = byteLength(canonicalJson(e));
    if (kept > 0 && bytes + size > CHANGE_PAGE_BYTES) break;
    bytes += size;
    kept++;
  }
  if (kept < included.length) next = included[kept - 1].version;

  const merged = mergeChanges(rowEntries.slice(0, kept)).sort((a, b) => a.version - b.version);
  const schema = (await getSchemaVersion(db)) || CONTENT_SCHEMA_VERSION;
  return {
    gone: false,
    page: { from: req.since, to: next ?? current, schema, changes: merged, ...(next !== undefined ? { next } : {}) },
  };
}

/** A 302 to the same URL with `v` set to the current version (no-store, as plan 0114 step 6). */
export function redirectToVersion(url: URL, current: number): Response {
  const target = new URL(url.toString());
  target.searchParams.set("v", String(current));
  return new Response(null, { status: 302, headers: { Location: target.pathname + target.search, "Cache-Control": "no-store" } });
}
