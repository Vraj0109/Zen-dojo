import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { PACK_LIMITS, packItems, packProblemSpec, toLocalDate, validatePack, type Pack, type ProblemSpec } from "@habit/shared";
import { getDb } from "./db";
import { contentPacks, packProgress } from "./schema";

// Content packs stored in the database: imported problems and lessons (format in docs/content-packs.md). They show up in
// Learn as courses of their own, and their problems run in the same Run-button workspace as the built-in ones.

export interface PackSummary {
  id: string;
  title: string;
  description: string;
  lessons: number;
  problems: number;
  done: number;
  installedOn: string;
}

export type InstallResult = { ok: true; id: string; replaced: boolean; warnings: string[] } | { ok: false; errors: string[] };

function parseStored(json: string): Pack | null {
  try {
    const r = validatePack(JSON.parse(json));
    return r.ok ? r.pack : null;
  } catch {
    return null;
  }
}

/** Validates and stores a pack. Installing the same id again replaces the content and keeps your progress on items that still exist. */
export async function installPack(raw: unknown): Promise<InstallResult> {
  const check = validatePack(raw);
  if (!check.ok) return check;
  const json = JSON.stringify(check.pack);
  if (json.length > PACK_LIMITS.bytes) return { ok: false, errors: ["That pack is too large (over 2 MB)."] };
  const db = await getDb();
  const existing = await db.query.contentPacks.findFirst({ where: eq(contentPacks.id, check.pack.id) });
  const row = { id: check.pack.id, title: check.pack.title, description: check.pack.description, json, installedOn: toLocalDate(new Date()) };
  if (existing) {
    await db.update(contentPacks).set(row).where(eq(contentPacks.id, row.id));
    const keep = packItems(check.pack).map((i) => i.id);
    const done = await db.select().from(packProgress).where(eq(packProgress.packId, row.id));
    const stale = done.filter((d) => !keep.includes(d.itemId)).map((d) => d.itemId);
    if (stale.length > 0) await db.delete(packProgress).where(and(eq(packProgress.packId, row.id), inArray(packProgress.itemId, stale)));
  } else {
    await db.insert(contentPacks).values(row);
  }
  return { ok: true, id: row.id, replaced: Boolean(existing), warnings: check.warnings };
}

export async function removePack(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(packProgress).where(eq(packProgress.packId, id));
  await db.delete(contentPacks).where(eq(contentPacks.id, id));
}

export async function getPack(id: string): Promise<Pack | null> {
  const db = await getDb();
  const row = await db.query.contentPacks.findFirst({ where: eq(contentPacks.id, id) });
  return row ? parseStored(row.json) : null;
}

export async function getPackProgress(id: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select().from(packProgress).where(eq(packProgress.packId, id));
  return new Set(rows.map((r) => r.itemId));
}

export async function listPacks(): Promise<PackSummary[]> {
  const db = await getDb();
  const rows = await db.select().from(contentPacks);
  const out: PackSummary[] = [];
  for (const r of rows.sort((a, b) => a.title.localeCompare(b.title))) {
    const pack = parseStored(r.json);
    if (!pack) continue;
    const items = packItems(pack);
    const done = await getPackProgress(r.id);
    out.push({
      id: r.id,
      title: r.title,
      description: r.description,
      lessons: items.filter((i) => i.type === "lesson").length,
      problems: items.filter((i) => i.type === "problem").length,
      done: items.filter((i) => done.has(i.id)).length,
      installedOn: r.installedOn,
    });
  }
  return out;
}

/** One heading of items that packs added to a built-in study area. */
export interface AddedGroup {
  /** The heading: the pack's target.section, or the pack's title */
  section: string;
  /** True when the heading names a section the area already has (the items then join that section) */
  items: { packId: string; packTitle: string; id: string; title: string; type: "lesson" | "problem"; done: boolean }[];
}

/** Items of packs that name this study area as their target, grouped by heading. Removing the pack removes them. */
export async function getAddedItems(areaId: string): Promise<AddedGroup[]> {
  const db = await getDb();
  const rows = await db.select().from(contentPacks);
  const groups = new Map<string, AddedGroup>();
  for (const r of rows.sort((a, b) => a.title.localeCompare(b.title))) {
    const pack = parseStored(r.json);
    if (!pack?.target || pack.target.area !== areaId) continue;
    const done = await getPackProgress(pack.id);
    const heading = pack.target.section ?? pack.title;
    const group = groups.get(heading) ?? { section: heading, items: [] };
    for (const i of packItems(pack)) group.items.push({ packId: pack.id, packTitle: pack.title, id: i.id, title: i.title, type: i.type, done: done.has(i.id) });
    groups.set(heading, group);
  }
  return [...groups.values()];
}

export async function setPackItemDone(packId: string, itemId: string, done: boolean): Promise<void> {
  const pack = await getPack(packId);
  if (!pack || !packItems(pack).some((i) => i.id === itemId)) return;
  const db = await getDb();
  if (done) await db.insert(packProgress).values({ packId, itemId, doneOn: toLocalDate(new Date()) }).onConflictDoNothing();
  else await db.delete(packProgress).where(and(eq(packProgress.packId, packId), eq(packProgress.itemId, itemId)));
}

/** The runnable spec for ids like "pack:my-graphs:bfs-shortest-path", or null. */
export async function getPackProblemSpec(runId: string): Promise<ProblemSpec | null> {
  const m = /^pack:([a-z0-9-]+):([a-z0-9-]+)$/.exec(runId);
  if (!m) return null;
  const pack = await getPack(m[1]);
  const item = pack && packItems(pack).find((i) => i.id === m[2]);
  return pack && item?.type === "problem" ? packProblemSpec(item, pack.id) : null;
}

/** True for an address the app is willing to download from: http(s), no login in it, no odd characters, a sensible length. */
export function safeDownloadUrl(text: string): URL | null {
  if (text.length > 2000 || /[\u0000-\u0020\u007f]/.test(text.trim().replace(/ /g, "%20")) ) return null;
  let u: URL;
  try {
    u = new URL(text.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  return u;
}

export const DOWNLOAD_LIMITS = { bytes: PACK_LIMITS.bytes, redirects: 3, ms: 15_000 } as const;

/**
 * Downloads text from a web address (a pack, or a content feed). Only http(s); at most 3 redirects, each one checked the
 * same way; at most 2 MB (counted while reading, not trusted from the headers); 15 seconds in all.
 */
export async function fetchLimitedText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const u = safeDownloadUrl(url);
  if (!u) return { ok: false, error: "That is not a usable web address. Only plain http and https addresses work." };
  let currentUrl: URL = u;
  const signal = AbortSignal.timeout(DOWNLOAD_LIMITS.ms);
  try {
    for (let hop = 0; ; hop++) {
      const res: Response = await fetch(currentUrl, { redirect: "manual", signal, headers: { Accept: "application/json, text/plain", "User-Agent": "Zen Dojo" } });
      if (res.status >= 300 && res.status < 400) {
        const to = res.headers.get("location");
        if (hop >= DOWNLOAD_LIMITS.redirects) return { ok: false, error: "The address redirects too many times." };
        const next = to ? safeDownloadUrl(new URL(to, currentUrl).href) : null;
        if (!next) return { ok: false, error: "The address redirects somewhere that is not allowed." };
        currentUrl = next;
        continue;
      }
      if (!res.ok) return { ok: false, error: `The server answered ${res.status}.` };
      if (Number(res.headers.get("content-length") ?? 0) > DOWNLOAD_LIMITS.bytes) return { ok: false, error: "That file is over 2 MB." };
      const reader = res.body?.getReader();
      if (!reader) return { ok: false, error: "The server sent no content." };
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > DOWNLOAD_LIMITS.bytes) {
          await reader.cancel().catch(() => {});
          return { ok: false, error: "That file is over 2 MB." };
        }
        chunks.push(value);
      }
      return { ok: true, text: Buffer.concat(chunks).toString("utf8") };
    }
  } catch {
    return { ok: false, error: "Could not download that address. Check it and your connection." };
  }
}

/** Downloads a pack from a web address (for example a raw file on GitHub). */
export const fetchPackText = fetchLimitedText;

/** The stored pack as pretty JSON, to hand to a friend (it imports on any other install). */
export async function exportPackJson(id: string): Promise<string | null> {
  const pack = await getPack(id);
  return pack ? JSON.stringify(pack, null, 2) + "\n" : null;
}
