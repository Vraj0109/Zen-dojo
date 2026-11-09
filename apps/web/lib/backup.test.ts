import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as restoreRoute } from "@/app/api/backup/restore/route";
import { BACKUP_FORMAT, BACKUP_TABLES, exportBackup, restoreBackup } from "./backup";
import { MIGRATIONS, getDb } from "./db";
import { getDsaView, markSolved } from "./dsa";
import { getExtensionToken } from "./leetcode/extension";
import { getNote, saveNote } from "./notes";
import { getRuns, saveRun } from "./solution-runs";
import { getConceptDetail, logPractice, saveConcept } from "./study";
import { getTodayView } from "./tasks";

const fresh = (url = ":memory:") => {
  process.env.DATABASE_URL = url;
  delete (globalThis as { habitDb?: unknown }).habitDb;
};

beforeEach(() => {
  fresh();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

async function seed() {
  await getTodayView();
  await markSolved("lc-1");
  await saveNote("lc-1", { notes: "hash map, it's O(n)", code: "class Solution {}", language: "Java" });
  await saveConcept("sd-caching", { confidence: 4, checked: [0, 1], notes: "TTL" });
  await logPractice("sdd-chat", { minutes: 40, scores: { req: 4 }, notes: "", link: "" });
  await saveRun("lc-1", "cpp", "class Solution {};", { status: "done", passed: 3, total: 10 });
  await getExtensionToken();
}

describe("backup", () => {
  it("covers every table in the schema", async () => {
    await getTodayView();
    const rs = await (await getDb()).$client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
    expect(rs.rows.map((r) => String(r[0])).sort()).toEqual([...BACKUP_TABLES].sort());
  });

  it("exports every table, without the extension key", async () => {
    await seed();
    const b = await exportBackup();
    expect(b).toMatchObject({ format: BACKUP_FORMAT, schemaVersion: MIGRATIONS.length });
    expect(Object.keys(b.tables).sort()).toEqual([...BACKUP_TABLES].sort());
    expect(b.tables.problem_solves).toHaveLength(1);
    expect(b.tables.concept_progress![0]).toMatchObject({ concept_id: "sd-caching", confidence: 4, checked: "[0,1]" });
    expect(b.tables.settings!.some((r) => r.key === "extension_token")).toBe(false);
  });

  it("round-trips into a new database and keeps that database's own pairing key", async () => {
    await seed();
    const backup = JSON.parse(JSON.stringify(await exportBackup()));

    fresh();
    const otherKey = await getExtensionToken();
    await markSolved("lc-560"); // replaced by the restore
    const r = await restoreBackup(backup);
    expect(r).toMatchObject({ ok: true, safetyCopy: null });

    expect((await getDsaView()).totals).toMatchObject({ solved: 1 });
    expect(await getNote("lc-1")).toMatchObject({ notes: "hash map, it's O(n)", language: "Java" });
    expect((await getConceptDetail("sd-caching"))!.progress).toMatchObject({ confidence: 4, checked: [0, 1] });
    expect(await getRuns("lc-1")).toEqual([{ problemId: "lc-1", lang: "cpp", code: "class Solution {};", ranOn: "2026-11-06", status: "done", passed: 3, total: 10 }]);
    expect(await getExtensionToken()).toBe(otherKey);
    expect(await exportBackup()).toMatchObject({ tables: backup.tables });
  });

  it("refuses bad files and changes nothing", async () => {
    await seed();
    const before = await exportBackup();
    expect(await restoreBackup(null)).toMatchObject({ ok: false });
    expect(await restoreBackup({ format: "other" })).toMatchObject({ ok: false, error: expect.stringContaining("isn't a Zen Dojo backup") });
    expect(await restoreBackup({ ...before, schemaVersion: 999 })).toMatchObject({ ok: false, error: expect.stringContaining("newer version") });
    expect(await restoreBackup({ ...before, tables: { tasks: "nope" } })).toMatchObject({ ok: false });
    expect(await restoreBackup({ ...before, tables: { tasks: [{ title: { nested: 1 } }] } })).toMatchObject({ ok: false });
    // a row that violates the schema rolls back the whole restore
    const bad = await restoreBackup({ ...before, tables: { ...before.tables, problem_solves: [{ problem_id: "lc-1" }] } });
    expect(bad).toMatchObject({ ok: false, error: expect.stringContaining("nothing was changed") });
    expect(await exportBackup()).toMatchObject({ tables: before.tables });
  });

  it("ignores unknown columns and accepts older backups without newer tables", async () => {
    const r = await restoreBackup({
      format: BACKUP_FORMAT,
      schemaVersion: 2,
      exportedAt: "",
      tables: { problem_solves: [{ problem_id: "lc-1", kind: "solve", solved_on: "2026-11-01", xp: 5, source: "manual", hacker: "x" }] },
    });
    expect(r).toMatchObject({ ok: true, rows: 1 });
    expect((await getDsaView()).totals.solved).toBe(1);
  });

  it("saves a safety copy next to a file database before restoring", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "habit-backup-"));
    try {
      fresh("file:" + path.join(dir, "habit.db").replaceAll("\\", "/"));
      await seed();
      const r = await restoreBackup(await exportBackup());
      expect(r.ok).toBe(true);
      expect(readdirSync(path.join(dir, "backups")).some((f) => f.startsWith("before-restore-") && f.endsWith(".json"))).toBe(true);
      ((globalThis as { habitDb?: { db: { $client: { close(): void } } } }).habitDb)?.db.$client.close();
    } finally {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
      } catch {
        // Windows may still hold the file briefly
      }
    }
  });
});

describe("restore route", () => {
  const post = (form: FormData, origin: string | null) =>
    restoreRoute(new Request("http://localhost:3000/api/backup/restore", { method: "POST", body: form, headers: origin ? { Origin: origin } : {} }));
  const formWith = (content: string, confirm = true) => {
    const f = new FormData();
    f.set("file", new File([content], "b.json", { type: "application/json" }));
    if (confirm) f.set("confirm", "yes");
    return f;
  };

  it("only accepts posts from the app itself", async () => {
    await seed();
    const body = JSON.stringify(await exportBackup());
    expect((await post(formWith(body), "https://evil.example")).status).toBe(403);
    expect((await post(formWith(body), null)).status).toBe(403);
    const ok = await post(formWith(body), "http://localhost:3000");
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toMatch(/\/settings\?restored=\d+/);
  });

  it("needs confirmation and a valid file", async () => {
    const error = (r: Response) => new URL(r.headers.get("location")!).searchParams.get("error");
    expect(error(await post(formWith("{}", false), "http://localhost:3000"))).toContain("Tick the box");
    expect(error(await post(formWith("{nope"), "http://localhost:3000"))).toContain("isn't valid JSON");
    expect(error(await post(formWith('{"format":"x"}'), "http://localhost:3000"))).toContain("isn't a Zen Dojo backup");
  });
});
