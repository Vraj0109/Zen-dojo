import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS } from "./db";
import { SYNC_SETTINGS_DENYLIST, SYNC_TABLE_MAP, isSyncableSettingKey, syncMigrationSql, syncMigrationSqlV2 } from "./sync-triggers";

let c: Client;

async function migrate(upTo = MIGRATIONS.length) {
  for (let i = 0; i < upTo; i++) await c.executeMultiple(MIGRATIONS[i]);
}

type R = Record<string, unknown>;
async function all(sql: string): Promise<R[]> {
  const rs = await c.execute(sql);
  return rs.rows.map((r) => Object.fromEntries(rs.columns.map((col, i) => [col, r[i]])));
}
const dirty = () => all("SELECT tbl, row_key, deleted FROM sync_dirty ORDER BY tbl, row_key");
const stamps = () => all("SELECT tbl, row_key, deleted_at IS NOT NULL AS gone FROM sync_stamps ORDER BY tbl, row_key");
const clearTracking = () => c.executeMultiple("DELETE FROM sync_dirty; DELETE FROM sync_stamps;");
const syncId = async (tbl: string, id: number) => String((await all(`SELECT sync_id FROM sync_ids WHERE tbl = '${tbl}' AND local_id = ${id}`))[0]?.sync_id);

beforeEach(async () => {
  c = createClient({ url: ":memory:" });
  await migrate();
});
afterEach(() => c.close());

describe("sync table map and settings denylist", () => {
  it("covers the twelve tables with their cloud names", () => {
    expect(SYNC_TABLE_MAP.map((t) => [t.local, t.cloud])).toEqual([
      ["tasks", "tasks"],
      ["problem_solves", "problem_solves"],
      ["settings", "settings"],
      ["problem_notes", "notes"],
      ["solution_runs", "solution_runs"],
      ["pack_progress", "pack_progress"],
      ["practice_sessions", "practice_sessions"],
      ["focus_sessions", "timer_rows"],
      ["reading_progress", "reading_progress"],
      ["reading_custom", "reading_custom"],
      ["problem_struggles", "problem_struggles"],
      ["boss_fights", "boss_fights"],
    ]);
  });

  it("only lists columns that exist locally", async () => {
    for (const t of SYNC_TABLE_MAP) {
      const info = await all(`PRAGMA table_info(${t.local})`);
      const names = new Set(info.map((r) => String(r.name)));
      for (const col of [...t.cols, ...t.keyCols]) expect(names.has(col), `${t.local}.${col}`).toBe(true);
    }
  });

  it("refuses private settings", () => {
    expect(SYNC_SETTINGS_DENYLIST).toEqual(expect.arrayContaining(["extension_token", "content_feed_url"]));
    for (const k of ["ai_enabled", "ai_model", "ai_ollama_url", "ai_provider", "ai_cloud_consent", "extension_token", "content_feed_url", "api_token", "client_secret", "my_Key", "PASSWORD_hint"]) {
      expect(isSyncableSettingKey(k), k).toBe(false);
    }
    for (const k of ["interview_date", "theme", "daily_goal"]) expect(isSyncableSettingKey(k), k).toBe(true);
  });
});

describe("migration", () => {
  it("creates the side tables and triggers", async () => {
    const t = await all("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'sync_%' ORDER BY name");
    expect(t.map((r) => r.name)).toEqual(["sync_dirty", "sync_flags", "sync_ids", "sync_stamps"]);
    const trg = await all("SELECT count(*) AS n FROM sqlite_master WHERE type = 'trigger'");
    expect(Number(trg[0].n)).toBe(SYNC_TABLE_MAP.length * 3);
  });

  it("are the last two migrations and can run twice", async () => {
    expect(MIGRATIONS[MIGRATIONS.length - 2]).toBe(syncMigrationSql());
    expect(MIGRATIONS[MIGRATIONS.length - 1]).toBe(syncMigrationSqlV2());
    await c.executeMultiple(syncMigrationSql());
    await c.executeMultiple(syncMigrationSqlV2());
    await c.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
    expect(await dirty()).toEqual([{ tbl: "settings", row_key: "theme", deleted: 0 }]);
  });

  it("leaves every user table's rows unchanged on an upgraded database", async () => {
    c.close();
    c = createClient({ url: ":memory:" });
    await migrate(MIGRATIONS.length - 2);
    await c.executeMultiple(`
      INSERT INTO tasks (date, scope, template_key, title, category, xp) VALUES ('2026-11-01', 'day', 'k1', 'T', 'dsa', 10);
      INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('lc-1', 'solve', '2026-11-01', 5);
      INSERT INTO settings (key, value) VALUES ('extension_token', 'abc'), ('theme', 'dark');
      INSERT INTO problem_notes (problem_id, notes, updated_at) VALUES ('lc-1', 'n', 'x');
      INSERT INTO solution_runs (problem_id, lang, code, ran_on, status, passed, total) VALUES ('lc-1', 'cpp', 'c', '2026-11-01', 'done', 1, 2);
      INSERT INTO pack_progress (pack_id, item_id, done_on) VALUES ('p', 'i', '2026-11-01');
      INSERT INTO practice_sessions (item_id, practiced_on, score, xp) VALUES ('sdd-chat', '2026-11-01', 3.5, 20);
      INSERT INTO focus_sessions (item_id, focused_on, minutes) VALUES ('lc-1', '2026-11-01', 25);
    `);
    const tables = (await all("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")).map((r) => String(r.name));
    const snapshot = async () => {
      const out: Record<string, R[]> = {};
      for (const t of tables) out[t] = await all(`SELECT * FROM ${t}`);
      return out;
    };
    const before = await snapshot();
    await c.executeMultiple(MIGRATIONS[MIGRATIONS.length - 2]);
    await c.executeMultiple(MIGRATIONS[MIGRATIONS.length - 1]);
    const after = await snapshot();
    for (const t of tables) expect(after[t], t).toEqual(before[t]);
    expect(Object.keys(after).filter((t) => t.startsWith("sync_"))).toEqual([]);
    // Existing rows are not queued by the migration; linking does that.
    expect(await all("SELECT count(*) AS n FROM sync_dirty")).toEqual([{ n: 0 }]);
  });
});

describe("second sync migration (reading, stuck list, boss fights)", () => {
  async function upgraded(linked: boolean) {
    c.close();
    c = createClient({ url: ":memory:" });
    await migrate(MIGRATIONS.length - 1);
    await c.executeMultiple(`
      INSERT INTO reading_progress (reading_id, done_on, notes) VALUES ('r1', '2026-11-01', 'n');
      INSERT INTO reading_custom (item_id, title, url, added_on) VALUES ('i', 'T', 'https://x', '2026-11-01');
      INSERT INTO problem_struggles (problem_id, kind, logged_on) VALUES ('lc-1', 'solve', '2026-11-01');
      INSERT INTO boss_fights (fought_on, results) VALUES ('2026-11-01', '[]');
    `);
    if (linked) await c.execute("INSERT INTO sync_flags (k, v) VALUES ('account', 'u1')");
    await clearTracking();
    await c.executeMultiple(MIGRATIONS[MIGRATIONS.length - 1]);
  }

  it("queues existing rows once when the device is already linked, without duplicates", async () => {
    await upgraded(true);
    const d = await dirty();
    expect(d.map((r) => r.tbl).sort()).toEqual(["boss_fights", "problem_struggles", "reading_custom", "reading_progress"]);
    expect(d.find((r) => r.tbl === "reading_progress")?.row_key).toBe("r1");
    await c.executeMultiple(MIGRATIONS[MIGRATIONS.length - 1]);
    expect(await dirty()).toHaveLength(4);
    expect(await all("SELECT count(*) AS n FROM sync_ids WHERE tbl IN ('reading_custom','problem_struggles','boss_fights')")).toEqual([{ n: 3 }]);
  });

  it("queues nothing when the device is not linked (linkAccount does it later)", async () => {
    await upgraded(false);
    expect(await dirty()).toEqual([]);
  });

  it("tracks inserts, updates and deletes", async () => {
    await upgraded(false);
    await c.execute("UPDATE boss_fights SET minutes = 30");
    await c.execute("DELETE FROM reading_progress WHERE reading_id = 'r1'");
    const d = await dirty();
    expect(d.find((r) => r.tbl === "reading_progress")).toEqual({ tbl: "reading_progress", row_key: "r1", deleted: 1 });
    expect(d.find((r) => r.tbl === "boss_fights")?.deleted).toBe(0);
  });
});

describe("triggers", () => {
  it("tasks: insert creates a sync id and queues it; update re-queues; delete leaves a tombstone", async () => {
    await c.execute("INSERT INTO tasks (date, scope, template_key, title, category, xp) VALUES ('2026-11-01', 'day', 'a', 'T', 'dsa', 10)");
    const id = await syncId("tasks", 1);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(await dirty()).toEqual([{ tbl: "tasks", row_key: id, deleted: 0 }]);
    expect(await stamps()).toEqual([{ tbl: "tasks", row_key: id, gone: 0 }]);

    await clearTracking();
    await c.execute("UPDATE tasks SET status = 'done', done_on = '2026-11-01' WHERE id = 1");
    expect(await dirty()).toEqual([{ tbl: "tasks", row_key: id, deleted: 0 }]);
    expect(await syncId("tasks", 1)).toBe(id);

    await clearTracking();
    await c.execute("DELETE FROM tasks WHERE id = 1");
    expect(await dirty()).toEqual([{ tbl: "tasks", row_key: id, deleted: 1 }]);
    expect(await stamps()).toEqual([{ tbl: "tasks", row_key: id, gone: 1 }]);
  });

  it("practice_sessions and focus_sessions get their own sync ids", async () => {
    await c.execute("INSERT INTO practice_sessions (item_id, practiced_on, score, xp) VALUES ('x', '2026-11-01', 3, 5)");
    await c.execute("INSERT INTO focus_sessions (item_id, focused_on, minutes) VALUES ('x', '2026-11-01', 25)");
    const p = await syncId("practice_sessions", 1);
    const f = await syncId("focus_sessions", 1);
    expect(p).not.toBe(f);
    expect(await dirty()).toEqual(
      [
        { tbl: "focus_sessions", row_key: f, deleted: 0 },
        { tbl: "practice_sessions", row_key: p, deleted: 0 },
      ],
    );
    await clearTracking();
    await c.execute("UPDATE practice_sessions SET minutes = 30");
    await c.execute("UPDATE focus_sessions SET minutes = 30");
    expect((await dirty()).map((r) => r.deleted)).toEqual([0, 0]);
    await clearTracking();
    await c.execute("DELETE FROM practice_sessions");
    await c.execute("DELETE FROM focus_sessions");
    expect((await dirty()).map((r) => r.deleted)).toEqual([1, 1]);
  });

  it("a row that existed before the migration still deletes cleanly and gets a sync id", async () => {
    c.close();
    c = createClient({ url: ":memory:" });
    await migrate(MIGRATIONS.length - 1);
    await c.execute("INSERT INTO tasks (date, scope, template_key, title, category, xp) VALUES ('2026-11-01', 'day', 'a', 'T', 'dsa', 10)");
    await c.executeMultiple(MIGRATIONS[MIGRATIONS.length - 1]);
    await c.execute("DELETE FROM tasks WHERE id = 1");
    const id = await syncId("tasks", 1);
    expect(await dirty()).toEqual([{ tbl: "tasks", row_key: id, deleted: 1 }]);
  });

  it("problem_solves: composite key; changing it retires the old key", async () => {
    await c.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('lc-1', 'solve', '2026-11-01', 5)");
    expect(await dirty()).toEqual([{ tbl: "problem_solves", row_key: "lc-1:solve", deleted: 0 }]);
    await clearTracking();
    await c.execute("UPDATE problem_solves SET xp = 9");
    expect(await dirty()).toEqual([{ tbl: "problem_solves", row_key: "lc-1:solve", deleted: 0 }]);
    await clearTracking();
    await c.execute("UPDATE problem_solves SET kind = 'review'");
    expect(await dirty()).toEqual([
      { tbl: "problem_solves", row_key: "lc-1:review", deleted: 0 },
      { tbl: "problem_solves", row_key: "lc-1:solve", deleted: 1 },
    ]);
    await clearTracking();
    await c.execute("DELETE FROM problem_solves");
    expect(await dirty()).toEqual([{ tbl: "problem_solves", row_key: "lc-1:review", deleted: 1 }]);
    expect(await stamps()).toEqual([{ tbl: "problem_solves", row_key: "lc-1:review", gone: 1 }]);
  });

  it("a deleted key that comes back is live again", async () => {
    await c.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('lc-1', 'solve', '2026-11-01', 5)");
    await c.execute("DELETE FROM problem_solves");
    expect((await dirty())[0].deleted).toBe(1);
    await c.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('lc-1', 'solve', '2026-11-02', 5)");
    expect(await dirty()).toEqual([{ tbl: "problem_solves", row_key: "lc-1:solve", deleted: 0 }]);
    expect(await stamps()).toEqual([{ tbl: "problem_solves", row_key: "lc-1:solve", gone: 0 }]);
  });

  it("settings: syncable keys are tracked, private keys never are", async () => {
    await c.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
    await c.execute("UPDATE settings SET value = 'light' WHERE key = 'theme'");
    expect(await dirty()).toEqual([{ tbl: "settings", row_key: "theme", deleted: 0 }]);
    await clearTracking();
    await c.execute("DELETE FROM settings WHERE key = 'theme'");
    expect(await dirty()).toEqual([{ tbl: "settings", row_key: "theme", deleted: 1 }]);

    await clearTracking();
    for (const key of ["ai_enabled", "ai_model", "ai_ollama_url", "ai_provider", "ai_cloud_consent", "extension_token", "content_feed_url", "my_api_token", "client_secret", "private_key", "db_password"]) {
      await c.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, 'v')", args: [key] });
      await c.execute({ sql: "UPDATE settings SET value = 'w' WHERE key = ?", args: [key] });
      await c.execute({ sql: "DELETE FROM settings WHERE key = ?", args: [key] });
    }
    expect(await dirty()).toEqual([]);
    expect(await stamps()).toEqual([]);
  });

  it("settings: renaming a key into the denylist retires the old key and queues nothing new", async () => {
    await c.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
    await clearTracking();
    await c.execute("UPDATE settings SET key = 'theme_token' WHERE key = 'theme'");
    expect(await dirty()).toEqual([{ tbl: "settings", row_key: "theme", deleted: 1 }]);
  });

  it("problem_notes uses the problem id and syncs without touching its own updated_at column", async () => {
    await c.execute("INSERT INTO problem_notes (problem_id, notes, updated_at) VALUES ('lc-1', 'n', 'x')");
    expect(await dirty()).toEqual([{ tbl: "problem_notes", row_key: "lc-1", deleted: 0 }]);
    await clearTracking();
    await c.execute("UPDATE problem_notes SET notes = 'm'");
    expect(await dirty()).toEqual([{ tbl: "problem_notes", row_key: "lc-1", deleted: 0 }]);
    await clearTracking();
    await c.execute("DELETE FROM problem_notes");
    expect(await dirty()).toEqual([{ tbl: "problem_notes", row_key: "lc-1", deleted: 1 }]);
    expect((await all("SELECT count(*) AS n FROM problem_notes"))[0].n).toBe(0);
  });

  it("solution_runs: key is problem and language", async () => {
    await c.execute("INSERT INTO solution_runs (problem_id, lang, code, ran_on, status, passed, total) VALUES ('lc-1', 'cpp', 'c', '2026-11-01', 'done', 1, 2)");
    expect(await dirty()).toEqual([{ tbl: "solution_runs", row_key: "lc-1:cpp", deleted: 0 }]);
    await clearTracking();
    await c.execute("UPDATE solution_runs SET passed = 2");
    expect(await dirty()).toEqual([{ tbl: "solution_runs", row_key: "lc-1:cpp", deleted: 0 }]);
    await clearTracking();
    await c.execute("UPDATE solution_runs SET lang = 'java'");
    expect(await dirty()).toEqual([
      { tbl: "solution_runs", row_key: "lc-1:cpp", deleted: 1 },
      { tbl: "solution_runs", row_key: "lc-1:java", deleted: 0 },
    ]);
    await clearTracking();
    await c.execute("DELETE FROM solution_runs");
    expect(await dirty()).toEqual([{ tbl: "solution_runs", row_key: "lc-1:java", deleted: 1 }]);
  });

  it("pack_progress: key is pack and item", async () => {
    await c.execute("INSERT INTO pack_progress (pack_id, item_id, done_on) VALUES ('p', 'i', '2026-11-01')");
    expect(await dirty()).toEqual([{ tbl: "pack_progress", row_key: "p:i", deleted: 0 }]);
    await clearTracking();
    await c.execute("UPDATE pack_progress SET done_on = '2026-11-02'");
    expect(await dirty()).toEqual([{ tbl: "pack_progress", row_key: "p:i", deleted: 0 }]);
    await clearTracking();
    await c.execute("UPDATE pack_progress SET item_id = 'j'");
    expect(await dirty()).toEqual([
      { tbl: "pack_progress", row_key: "p:i", deleted: 1 },
      { tbl: "pack_progress", row_key: "p:j", deleted: 0 },
    ]);
    await clearTracking();
    await c.execute("DELETE FROM pack_progress");
    expect(await dirty()).toEqual([{ tbl: "pack_progress", row_key: "p:j", deleted: 1 }]);
  });

  it("stamps use millisecond wall-clock time", async () => {
    const before = Date.now();
    await c.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
    const [d] = await all("SELECT changed_at FROM sync_dirty");
    const [s] = await all("SELECT updated_at FROM sync_stamps");
    // SQLite stamps inside the trigger, so under machine load it can drift from JS Date.now() by a few ms either way.
    // 50 ms still proves milliseconds (seconds would be off by up to 1000) and wall-clock time.
    const SLACK_MS = 50;
    for (const v of [Number(d.changed_at), Number(s.updated_at)]) {
      expect(v).toBeGreaterThanOrEqual(before - SLACK_MS);
      expect(v).toBeLessThanOrEqual(Date.now() + SLACK_MS);
    }
  });

  it("stays quiet for every table while applying = 1, and resumes after", async () => {
    await c.execute("INSERT INTO sync_flags (k, v) VALUES ('applying', '1')");
    await c.executeMultiple(`
      INSERT INTO tasks (date, scope, template_key, title, category, xp) VALUES ('2026-11-01', 'day', 'a', 'T', 'dsa', 10);
      INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('lc-1', 'solve', '2026-11-01', 5);
      INSERT INTO settings (key, value) VALUES ('theme', 'dark');
      INSERT INTO problem_notes (problem_id, notes, updated_at) VALUES ('lc-1', 'n', 'x');
      INSERT INTO solution_runs (problem_id, lang, code, ran_on, status, passed, total) VALUES ('lc-1', 'cpp', 'c', '2026-11-01', 'done', 1, 2);
      INSERT INTO pack_progress (pack_id, item_id, done_on) VALUES ('p', 'i', '2026-11-01');
      INSERT INTO practice_sessions (item_id, practiced_on, score, xp) VALUES ('x', '2026-11-01', 3, 5);
      INSERT INTO focus_sessions (item_id, focused_on, minutes) VALUES ('x', '2026-11-01', 25);
      UPDATE tasks SET status = 'done';
      UPDATE problem_solves SET xp = 6;
      UPDATE settings SET value = 'light';
      UPDATE problem_notes SET notes = 'm';
      UPDATE solution_runs SET passed = 2;
      UPDATE pack_progress SET done_on = '2026-11-02';
      UPDATE practice_sessions SET xp = 6;
      UPDATE focus_sessions SET minutes = 30;
      DELETE FROM tasks; DELETE FROM problem_solves; DELETE FROM settings; DELETE FROM problem_notes;
      DELETE FROM solution_runs; DELETE FROM pack_progress; DELETE FROM practice_sessions; DELETE FROM focus_sessions;
    `);
    expect(await dirty()).toEqual([]);
    expect(await stamps()).toEqual([]);
    expect(await all("SELECT * FROM sync_ids")).toEqual([]);

    await c.execute("UPDATE sync_flags SET v = '0' WHERE k = 'applying'");
    await c.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
    expect(await dirty()).toHaveLength(1);
  });
});
