import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  ITEMS_PACK_ID,
  JUDGE_PROBLEMS,
  PACK_FORMAT,
  PACK_VERSION,
  casesMissingOutput,
  itemCases,
  packProblemSpec,
  toLocalDate,
  validateItem,
  type ItemType,
  type PackItem,
  type PackProblem,
  type ProblemSpec,
  type StoredItem,
  type TestsItem,
} from "@habit/shared";
import { getDb } from "./db";
import { contentItems } from "./schema";
import { installPack, removePack } from "./packs";

// The content repository (plan 0030): single items added without a release, stored in `content_items`. It is the one place
// that merges stored content with the built-in content:
//  - problems, lessons and patches are kept in ONE pack (id "items") rebuilt from the table, so they show up and run through
//    the packs code (Learn courses, the Run button, progress) without a second implementation;
//  - "tests" items add cases to any problem when it runs (built-in or stored);
//  - "reading" items are stored and listed here;
//  - items with source "builtin" (content:seed) are full copies of shipped problems, and win over the shipped one.
// Built-in content is never changed. Deleting an item restores the built-in behaviour.

export interface ContentRow {
  id: string;
  type: ItemType;
  item: StoredItem;
  rev: string;
  source: string;
  updatedAt: string;
}

export type UpsertResult = { ok: true; id: string; type: ItemType; changed: boolean; warnings: string[] } | { ok: false; errors: string[] };

const revOf = (json: string) => createHash("sha256").update(json).digest("hex").slice(0, 12);

function parseRow(r: typeof contentItems.$inferSelect): ContentRow | null {
  try {
    return { id: r.id, type: r.type as ItemType, item: JSON.parse(r.body) as StoredItem, rev: r.rev, source: r.source, updatedAt: r.updatedAt };
  } catch {
    return null;
  }
}

/** Every stored item that is not deleted, newest id order. Pass a type to list one kind. */
export async function listItems(type?: ItemType): Promise<ContentRow[]> {
  const db = await getDb();
  const rows = await db.select().from(contentItems).where(type ? and(eq(contentItems.deleted, 0), eq(contentItems.type, type)) : eq(contentItems.deleted, 0));
  return rows.map(parseRow).filter((r): r is ContentRow => r !== null).sort((a, b) => a.id.localeCompare(b.id));
}

export async function getItem(id: string): Promise<ContentRow | null> {
  const db = await getDb();
  const r = await db.query.contentItems.findFirst({ where: and(eq(contentItems.id, id), eq(contentItems.deleted, 0)) });
  return r ? parseRow(r) : null;
}

/** Rebuilds the "items" pack from the stored problems, lessons and patches. */
async function syncItemsPack(): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const rows = (await listItems()).filter((r) => (r.type === "problem" || r.type === "lesson" || r.type === "patch") && r.source !== "builtin");
  if (rows.length === 0) {
    await removePack(ITEMS_PACK_ID);
    return { ok: true };
  }
  const items = rows.map((r) => r.item as PackItem);
  const result = await installPack({ format: PACK_FORMAT, version: PACK_VERSION, id: ITEMS_PACK_ID, title: "Added items", description: "Problems and lessons added one at a time (docs/content-editing.md).", sections: [{ title: "Added items", items }] });
  return result.ok ? { ok: true } : result;
}

/** Validates and stores one item. The same item again (same revision) changes nothing. Tests items need an output for every case. */
export async function upsertItem(raw: unknown, source = "local"): Promise<UpsertResult> {
  const check = validateItem(raw);
  if (!check.ok) return check;
  if (check.item.type === "tests") {
    const missing = casesMissingOutput(check.item);
    if (missing.length > 0) return { ok: false, errors: [`cases ${missing.map((i) => i + 1).join(", ")} have no "output". Add them, or use "pnpm content:add" which computes them from the problem's reference solution.`] };
  }
  const body = JSON.stringify(check.item);
  const rev = revOf(body);
  const db = await getDb();
  const before = await db.query.contentItems.findFirst({ where: eq(contentItems.id, check.id) });
  if (before && before.deleted === 0 && before.rev === rev) return { ok: true, id: check.id, type: check.type, changed: false, warnings: check.warnings };
  const row = { id: check.id, type: check.type, body, rev, source, updatedAt: toLocalDate(new Date()), deleted: 0 };
  if (before) await db.update(contentItems).set(row).where(eq(contentItems.id, check.id));
  else await db.insert(contentItems).values(row);
  if (check.type === "problem" || check.type === "lesson" || check.type === "patch") {
    const sync = await syncItemsPack();
    if (!sync.ok) {
      if (before) await db.update(contentItems).set(before).where(eq(contentItems.id, check.id));
      else await db.delete(contentItems).where(eq(contentItems.id, check.id));
      return sync;
    }
  }
  return { ok: true, id: check.id, type: check.type, changed: true, warnings: check.warnings };
}

/** Removes an item. Built-in content comes back by itself because it was never changed. False when there was no such item. */
export async function deleteItem(id: string): Promise<boolean> {
  const row = await getItem(id);
  if (!row) return false;
  const db = await getDb();
  await db.update(contentItems).set({ deleted: 1, updatedAt: toLocalDate(new Date()) }).where(eq(contentItems.id, id));
  if (row.type === "problem" || row.type === "lesson" || row.type === "patch") await syncItemsPack();
  return true;
}

// ---- reading the merged content --------------------------------------------------------------------------------------

/** The stored cases for a problem id (only cases that have an output). */
export async function getExtraTests(problemId: string): Promise<ReturnType<typeof itemCases>> {
  const row = await getItem(`tests:${problemId}`);
  return row?.item.type === "tests" ? itemCases(row.item as TestsItem) : [];
}

/** A spec with the stored extra cases appended to its tests. */
export async function withExtraTests(spec: ProblemSpec): Promise<ProblemSpec> {
  const extra = await getExtraTests(spec.id);
  return extra.length === 0 ? spec : { ...spec, tests: [...spec.tests, ...extra] };
}

/** The spec to run for any problem id: stored (a seeded copy wins over the shipped one), then built-in, then pack problems. */
export async function resolveProblemSpec(id: string, packSpec: (id: string) => Promise<ProblemSpec | null>): Promise<ProblemSpec | undefined> {
  let spec: ProblemSpec | undefined;
  if (id.startsWith("pack:")) spec = (await packSpec(id)) ?? undefined;
  else {
    const seeded = await getItem(`problem:${id}`);
    if (seeded && seeded.source === "builtin") spec = { ...packProblemSpec(seeded.item as PackProblem, "seed"), id, source: JUDGE_PROBLEMS[id]?.source ?? "other" };
    else spec = JUDGE_PROBLEMS[id];
  }
  return spec ? withExtraTests(spec) : undefined;
}

export async function listReading(): Promise<ContentRow[]> {
  return listItems("reading");
}

/** Writes every built-in function problem as a stored item with source "builtin" (pnpm content:seed). Returns how many. */
export async function seedBuiltinProblems(): Promise<number> {
  const db = await getDb();
  let n = 0;
  for (const spec of Object.values(JUDGE_PROBLEMS)) {
    if (spec.design) continue;
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(spec.id)) continue;
    const item: PackProblem = {
      type: "problem",
      id: spec.id,
      title: spec.title,
      statement: spec.statement,
      constraints: spec.constraints,
      fn: spec.fn,
      examples: spec.examples,
      tests: spec.tests,
      hints: spec.hints,
      ...(spec.unordered ? { unordered: true } : {}),
      solution: spec.solution,
    };
    const body = JSON.stringify(item);
    const row = { id: `problem:${spec.id}`, type: "problem", body, rev: revOf(body), source: "builtin", updatedAt: toLocalDate(new Date()), deleted: 0 };
    const existing = await db.query.contentItems.findFirst({ where: eq(contentItems.id, row.id) });
    if (existing && existing.source !== "builtin") continue; // never overwrite something you added yourself
    if (existing) await db.update(contentItems).set(row).where(eq(contentItems.id, row.id));
    else await db.insert(contentItems).values(row);
    n++;
  }
  return n;
}
