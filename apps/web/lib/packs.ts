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

/** Downloads a pack from a web address (for example a raw file on GitHub). Only http(s), at most 2 MB, 15 seconds. */
export async function fetchPackText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, error: "That is not a web address." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, error: "Only http and https addresses work." };
  try {
    const res = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json, text/plain", "User-Agent": "Zen Forge" } });
    if (!res.ok) return { ok: false, error: `The server answered ${res.status}.` };
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > PACK_LIMITS.bytes) return { ok: false, error: "That file is over 2 MB." };
    const text = await res.text();
    if (text.length > PACK_LIMITS.bytes) return { ok: false, error: "That file is over 2 MB." };
    return { ok: true, text };
  } catch {
    return { ok: false, error: "Could not download that address. Check it and your connection." };
  }
}
