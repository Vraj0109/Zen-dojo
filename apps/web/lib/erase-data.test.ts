import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { eraseLocalData, getLocalSummary } from "./erase-data";
import { markSolved } from "./dsa";
import { saveNote } from "./notes";
import { saveRun } from "./solution-runs";
import { getTodayView } from "./tasks";
import type { AnyDbClient } from "./sync-schema";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12));
});
afterEach(() => vi.useRealTimers());

async function client() {
  return (await getDb()).$client;
}
async function n(table: string) {
  const r = await (await client()).execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(r.rows[0].n);
}
async function flag(k: string) {
  const r = await (await client()).execute({ sql: "SELECT v FROM sync_flags WHERE k = ?", args: [k] });
  return r.rows[0] ? String(r.rows[0].v) : null;
}

async function seed() {
  await getTodayView();
  await markSolved("lc-1");
  await saveNote("lc-1", { notes: "hash map", code: "class Solution {}", language: "Java" });
  await saveRun("lc-1", "cpp", "class Solution {};", { status: "done", passed: 3, total: 10 });
  const c = await client();
  await c.execute("INSERT INTO settings (key, value) VALUES ('extension_token', 'tok'), ('content_feed_url', 'https://x.test/f'), ('interview_date', '2027-01-01')");
  await c.execute("INSERT INTO content_packs (id, title, json, installed_on) VALUES ('p1', 'Pack', '{}', '2026-11-06')");
  await c.execute("INSERT INTO content_items (id, type, body, rev, updated_at) VALUES ('i1', 'problem', '{}', '1', '2026-11-06')");
  await c.execute("INSERT INTO sync_flags (k, v) VALUES ('account', 'gh:1'), ('head', '5'), ('last_synced_at', '9'), ('state', 'idle'), ('last_error', 'x')");
}

describe("eraseLocalData", () => {
  it("empties the progress tables and queues nothing", async () => {
    await seed();
    expect(await n("sync_dirty")).toBeGreaterThan(0);
    const { removed } = await eraseLocalData();
    for (const t of ["tasks", "problem_solves", "problem_notes", "solution_runs"]) expect(await n(t)).toBe(0);
    expect(removed.problem_solves).toBe(1);
    expect(removed.problem_notes).toBe(1);
    expect(await n("sync_dirty")).toBe(0);
    expect(await n("sync_stamps")).toBe(0);
    expect(await n("sync_ids")).toBe(0);
  });

  it("removes the account link and sync flags, and leaves applying at 0", async () => {
    await seed();
    await eraseLocalData();
    for (const k of ["account", "head", "last_synced_at", "state", "last_error"]) expect(await flag(k)).toBeNull();
    expect(await flag("applying")).toBe("0");
  });

  it("keeps all settings by default", async () => {
    await seed();
    const before = await n("settings");
    await eraseLocalData();
    expect(await n("settings")).toBe(before);
  });

  it("with keepSettings false, deletes settings except the protected ones", async () => {
    await seed();
    await eraseLocalData({ keepSettings: false });
    const r = await (await client()).execute("SELECT key FROM settings ORDER BY key");
    expect(r.rows.map((x) => String(x.key))).toEqual(["content_feed_url", "extension_token"]);
    expect(await n("sync_dirty")).toBe(0);
  });

  it("keeps imported content unless includeImported", async () => {
    await seed();
    await eraseLocalData();
    expect(await n("content_items")).toBe(1);
    expect(await n("content_packs")).toBe(1);
    const { removed } = await eraseLocalData({ includeImported: true });
    expect(await n("content_items")).toBe(0);
    expect(await n("content_packs")).toBe(0);
    expect(removed).toHaveProperty("content_items");
  });

  it("tracks a later change again", async () => {
    await seed();
    await eraseLocalData();
    await markSolved("lc-1");
    expect(await n("sync_dirty")).toBeGreaterThan(0);
  });

  it("a failed erase rolls back and leaves applying at 0", async () => {
    await seed();
    const c = await client();
    const failing = {
      execute: (s: Parameters<typeof c.execute>[0]) => c.execute(s),
      batch: (stmts: unknown[], mode?: "write") => c.batch([...(stmts as []), "DELETE FROM no_such_table"], mode),
    } as unknown as AnyDbClient;
    await expect(eraseLocalData({ db: failing })).rejects.toThrow();
    expect(await n("problem_solves")).toBe(1);
    expect(await flag("applying")).toBe("0");
    expect(await flag("account")).toBe("gh:1");
  });

  it("resets applying even if the batch dies after turning it on", async () => {
    await seed();
    const c = await client();
    const dying = {
      execute: (s: Parameters<typeof c.execute>[0]) => c.execute(s),
      batch: async () => {
        await c.execute("INSERT OR REPLACE INTO sync_flags (k, v) VALUES ('applying', '1')");
        throw new Error("connection lost");
      },
    } as unknown as AnyDbClient;
    await expect(eraseLocalData({ db: dying })).rejects.toThrow("connection lost");
    expect(await flag("applying")).toBe("0");
  });
});

describe("getLocalSummary", () => {
  it("counts what would be removed", async () => {
    await seed();
    const s = await getLocalSummary();
    expect(s.solves).toBe(1);
    expect(s.notes).toBe(1);
    expect(s.runs).toBe(1);
    expect(s.tasks).toBeGreaterThan(0);
    expect(s.other).toBeGreaterThanOrEqual(0);
  });
});
