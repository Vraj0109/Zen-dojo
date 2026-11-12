import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS } from "./db";
import { getSyncStatus, linkAccount, runSync, unlinkAccount } from "./sync-engine";
import { syncMigrationSql, syncMigrationSqlV2 } from "./sync-triggers";

// ---- a tiny in-memory Worker (same rules as packages/sync-worker: last write wins on updated_at, pull by synced_at) ----

type CloudRow = Record<string, unknown>;
type Call = { method: string; path: string; body: { mutations?: Array<Record<string, unknown>>; last_synced_at?: number } | null };

const CLOUD_TABLES = ["tasks", "problem_solves", "settings", "notes", "solution_runs", "pack_progress", "practice_sessions", "timer_rows"];

class FakeWorker {
  clock = 1_000_000;
  head = 0;
  pageLimit = 2000;
  tables: Record<string, Map<string, CloudRow>> = Object.fromEntries(CLOUD_TABLES.map((t) => [t, new Map()]));
  calls: Call[] = [];
  failWith: { status: number; body?: unknown } | null = null;
  onPush: (() => Promise<void>) | null = null;
  delayMs = 0;

  pk(table: string): string {
    return table === "settings" ? "key" : "id";
  }

  /** Seed a row as if another device had pushed it. */
  put(table: string, id: string, payload: CloudRow, updatedAt: number, deletedAt: number | null = null): void {
    this.clock += 1000;
    this.tables[table].set(id, { [this.pk(table)]: id, ...payload, updated_at: updatedAt, deleted_at: deletedAt, synced_at: this.clock });
    this.head = this.clock;
  }

  fetch = async (path: string, init: RequestInit): Promise<Response> => {
    const method = init.method ?? "GET";
    const body = init.body ? (JSON.parse(String(init.body)) as Call["body"]) : null;
    this.calls.push({ method, path, body });
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.failWith) {
      return new Response(JSON.stringify(this.failWith.body ?? { ok: false }), { status: this.failWith.status });
    }
    if (path === "/api/sync/head") return new Response(JSON.stringify({ ok: true, head: this.head }), { status: 200 });
    this.clock += 1000;
    const muts = body?.mutations ?? [];
    if (muts.length > 0) {
      if (this.onPush) await this.onPush();
      for (const m of muts) {
        const table = String(m.table);
        const id = String(m.row_id);
        const ts = Number(m.client_timestamp);
        const existing = this.tables[table].get(id);
        if (m.action === "delete") {
          if (existing && Number(existing.updated_at) <= ts) {
            this.tables[table].set(id, { ...existing, deleted_at: ts, updated_at: ts, synced_at: this.clock });
          }
        } else if (!existing || Number(existing.updated_at) <= ts) {
          this.tables[table].set(id, {
            [this.pk(table)]: id,
            ...(m.payload as CloudRow),
            updated_at: ts,
            deleted_at: null,
            synced_at: this.clock,
          });
        }
      }
      this.head = this.clock;
    }
    const since = Number(body?.last_synced_at ?? 0);
    const deltas: Record<string, CloudRow[]> = {};
    let hasMore = false;
    const cursors: number[] = [];
    for (const t of CLOUD_TABLES) {
      const rows = [...this.tables[t].values()]
        .filter((r) => Number(r.synced_at) > since)
        .sort((a, b) => Number(a.synced_at) - Number(b.synced_at));
      if (rows.length > this.pageLimit) {
        hasMore = true;
        deltas[t] = rows.slice(0, this.pageLimit);
        cursors.push(Number(deltas[t][deltas[t].length - 1].synced_at));
      } else {
        deltas[t] = rows;
      }
    }
    const next = hasMore ? Math.min(...cursors) : this.clock;
    return new Response(
      JSON.stringify({ ok: true, deltas, server_timestamp: this.clock, has_more: hasMore, next_since: next }),
      { status: 200 },
    );
  };

  pushes(): Call[] {
    return this.calls.filter((c) => c.path === "/api/sync" && (c.body?.mutations?.length ?? 0) > 0);
  }
  pulls(): Call[] {
    return this.calls.filter((c) => c.path === "/api/sync" && (c.body?.mutations?.length ?? 0) === 0);
  }
}

// ---- local database ----

async function newDb(): Promise<Client> {
  const client = createClient({ url: ":memory:" });
  for (const m of MIGRATIONS) {
    if (!m.includes("sync_dirty")) await client.executeMultiple(m);
  }
  await client.executeMultiple(syncMigrationSql());
  await client.executeMultiple(syncMigrationSqlV2());
  return client;
}

async function one(c: Client, sql: string, args: Array<string | number> = []): Promise<Record<string, unknown> | undefined> {
  const r = await c.execute({ sql, args });
  return r.rows[0] as unknown as Record<string, unknown> | undefined;
}
async function count(c: Client, sql: string, args: Array<string | number> = []): Promise<number> {
  return Number((await one(c, sql, args))?.n ?? 0);
}

async function insertTask(c: Client, key: string | null, title = "Task"): Promise<void> {
  await c.execute({
    sql: "INSERT INTO tasks (date, scope, template_key, title, category, xp) VALUES ('2026-11-10', 'day', ?, ?, 'dsa', 10)",
    args: [key, title],
  });
}

const USER = "user-1";

describe("sync engine", () => {
  let db: Client;
  let w: FakeWorker;
  const run = (extra: { fetch?: FakeWorker["fetch"]; user?: string | null; db?: Client } = {}) =>
    runSync({
      db: extra.db ?? db,
      fetch: extra.fetch ?? w.fetch,
      getUserId: async () => (extra.user === undefined ? USER : extra.user),
    });

  beforeEach(async () => {
    db = await newDb();
    w = new FakeWorker();
  });
  afterEach(() => db.close());

  describe("push: mutations", () => {
    it("builds the payload for each of the eight tables and marks deletes", async () => {
      await insertTask(db, "k1");
      await db.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('two-sum', 'dsa', '2026-11-09', 20)");
      await db.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
      await db.execute("INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES ('two-sum', 'hash it', 'x', 'cpp', 'now')");
      await db.execute(
        "INSERT INTO solution_runs (problem_id, lang, code, ran_on, status, passed, total, failed_cases) VALUES ('two-sum', 'cpp', 'c', '2026-11-09', 'pass', 3, 3, '')",
      );
      await db.execute("INSERT INTO pack_progress (pack_id, item_id, done_on) VALUES ('p1', 'i1', '2026-11-09')");
      await db.execute("INSERT INTO practice_sessions (item_id, practiced_on, score, xp, notes) VALUES ('lld-1', '2026-11-09', 4.5, 30, 'n')");
      await db.execute("INSERT INTO focus_sessions (item_id, focused_on, minutes) VALUES ('t1', '2026-11-09', 25)");
      await db.execute("INSERT INTO pack_progress (pack_id, item_id, done_on) VALUES ('p1', 'gone', '2026-11-09')");
      await db.execute("DELETE FROM pack_progress WHERE item_id = 'gone'");
      await linkAccount(USER, db);

      const r = await run();
      expect(r).toMatchObject({ state: "synced", pushed: 9, pulled: 0 });
      const sent = w.pushes().flatMap((c) => c.body?.mutations ?? []);
      const by = (t: string) => sent.filter((m) => m.table === t);

      const task = by("tasks")[0];
      expect(task.action).toBe("upsert");
      expect(String(task.row_id)).toMatch(/^[0-9a-f]{32}$/);
      expect(task.payload).toEqual({
        date: "2026-11-10", scope: "day", template_key: "k1", title: "Task", category: "dsa", xp: 10, minutes: null, status: "todo", done_on: null,
      });
      expect(by("problem_solves")[0]).toMatchObject({
        row_id: "two-sum:dsa",
        payload: { problem_id: "two-sum", kind: "dsa", solved_on: "2026-11-09", xp: 20, source: "manual" },
      });
      expect(by("settings")[0]).toMatchObject({ row_id: "theme", payload: { value: "dark" } });
      expect(by("notes")[0]).toMatchObject({ row_id: "two-sum", payload: { problem_id: "two-sum", notes: "hash it", code: "x", language: "cpp" } });
      expect(by("solution_runs")[0]).toMatchObject({
        row_id: "two-sum:cpp",
        payload: { problem_id: "two-sum", lang: "cpp", code: "c", ran_on: "2026-11-09", status: "pass", passed: 3, total: 3, failed_cases: "" },
      });
      expect(by("pack_progress").find((m) => m.row_id === "p1:i1")?.payload).toEqual({ pack_id: "p1", item_id: "i1", done_on: "2026-11-09" });
      expect(by("practice_sessions")[0].payload).toMatchObject({ item_id: "lld-1", practiced_on: "2026-11-09", score: 4.5, xp: 30, notes: "n", link: null });
      expect(by("timer_rows")[0].payload).toEqual({ item_id: "t1", focused_on: "2026-11-09", minutes: 25 });
      expect(by("pack_progress").find((m) => m.row_id === "p1:gone")).toMatchObject({ action: "delete" });
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(0);
      expect(w.tables.timer_rows.size).toBe(1);
    });

    it("never uploads machine-private settings", async () => {
      await db.execute("INSERT INTO settings (key, value) VALUES ('extension_token', 'secret'), ('content_feed_url', 'http://x'), ('api_key', 'k'), ('theme', 'dark')");
      await linkAccount(USER, db);
      // A queued denylisted row (as an older build might have left) is dropped, not sent.
      await db.execute("INSERT INTO sync_dirty (tbl, row_key, changed_at, deleted) VALUES ('settings', 'extension_token', 1, 0)");
      await run();
      const keys = w.pushes().flatMap((c) => c.body?.mutations ?? []).map((m) => m.row_id);
      expect(keys).toEqual(["theme"]);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(0);
    });

    it("sends at most 200 mutations per request", async () => {
      await db.batch(
        Array.from({ length: 450 }, (_, i) => ({ sql: "INSERT INTO pack_progress (pack_id, item_id, done_on) VALUES ('p', ?, 'd')", args: [`i${i}`] })),
        "write",
      );
      await linkAccount(USER, db);
      const r = await run();
      expect(r.pushed).toBe(450);
      expect(w.pushes().map((c) => c.body?.mutations?.length)).toEqual([200, 200, 50]);
      expect(w.tables.pack_progress.size).toBe(450);
    });
  });

  describe("run order and head check", () => {
    it("first run pulls then pushes; head unchanged and nothing dirty makes a single head request", async () => {
      await insertTask(db, "k");
      await linkAccount(USER, db);
      await run();
      expect(w.calls.map((c) => `${c.method} ${c.path}`)).toEqual(["GET /api/sync/head", "POST /api/sync", "POST /api/sync"]);
      expect(w.pulls()).toHaveLength(1);
      expect(w.pushes()).toHaveLength(1);

      // our own push moved the head: one more pull, harmless
      w.calls = [];
      await run();
      expect(w.pulls()).toHaveLength(1);
      expect(w.pushes()).toHaveLength(0);

      w.calls = [];
      const r = await run();
      expect(r).toEqual({ state: "synced", pushed: 0, pulled: 0 });
      expect(w.calls.map((c) => `${c.method} ${c.path}`)).toEqual(["GET /api/sync/head"]);
    });

    it("head unchanged but rows dirty: no pull, only a push", async () => {
      await linkAccount(USER, db);
      await run();
      await run();
      await run();
      w.calls = [];
      await db.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
      const r = await run();
      expect(r.pushed).toBe(1);
      expect(w.pulls()).toHaveLength(0);
      expect(w.pushes()).toHaveLength(1);
    });

    it("asks for the stored cursor minus 2 seconds and re-applying the overlap changes nothing", async () => {
      w.put("settings", "theme", { value: "dark" }, 5000);
      await linkAccount(USER, db);
      await run();
      const cursor = Number((await one(db, "SELECT v FROM sync_flags WHERE k = 'last_synced_at'"))?.v);
      expect(cursor).toBe(w.clock);
      expect(w.pulls()[0].body?.last_synced_at).toBe(0);

      w.put("settings", "lang", { value: "cpp" }, 6000); // a change on another device
      w.calls = [];
      const r = await run();
      expect(w.pulls()[0].body?.last_synced_at).toBe(cursor - 2000);
      expect(r.pulled).toBe(2); // "theme" is inside the overlap and arrives again
      expect(await count(db, "SELECT count(*) AS n FROM settings")).toBe(2);
      expect((await one(db, "SELECT value AS v FROM settings WHERE key='theme'"))?.v).toBe("dark");
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(0);
    });

    it("follows has_more pages", async () => {
      w.pageLimit = 2;
      for (let i = 0; i < 5; i++) w.put("pack_progress", `p:i${i}`, { pack_id: "p", item_id: `i${i}`, done_on: "d" }, 100 + i);
      await linkAccount(USER, db);
      await run();
      expect(await count(db, "SELECT count(*) AS n FROM pack_progress")).toBe(5);
      expect(w.pulls().length).toBeGreaterThan(1);
    });
  });

  describe("push, clear, edit in flight", () => {
    it("pushes then clears the queue", async () => {
      await db.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('p', 'dsa', '2026-11-09', 5)");
      await linkAccount(USER, db);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(1);
      const r = await run();
      expect(r).toMatchObject({ state: "synced", pushed: 1 });
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(0);
      expect(w.tables.problem_solves.get("p:dsa")).toMatchObject({ solved_on: "2026-11-09", xp: 5 });
      const st = await getSyncStatus(db);
      expect(st).toMatchObject({ account: USER, state: "synced", pending: 0 });
      expect(st.lastSyncedAt).toBeGreaterThan(0);
    });

    it("keeps a row queued when it is edited while the request is in flight", async () => {
      await db.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')");
      await linkAccount(USER, db);
      await db.execute("UPDATE sync_dirty SET changed_at = changed_at - 5000");
      w.onPush = async () => {
        await db.execute("UPDATE settings SET value = 'light' WHERE key = 'theme'");
      };
      await run();
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty WHERE row_key = 'theme'")).toBe(1);
      w.onPush = null;
      await run();
      expect(w.tables.settings.get("theme")).toMatchObject({ value: "light" });
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(0);
    });
  });

  describe("pull: apply", () => {
    it("inserts new rows, maps their ids and does not upload them again", async () => {
      w.put("tasks", "abc123", { date: "2026-11-10", scope: "day", template_key: null, title: "From B", category: "dsa", xp: 7, minutes: null, status: "done", done_on: "2026-11-10" }, 5000);
      w.put("problem_solves", "two-sum:dsa", { problem_id: "two-sum", kind: "dsa", solved_on: "2026-11-09", xp: 20, source: "manual" }, 5000);
      w.put("settings", "theme", { value: "dark" }, 5000);
      w.put("notes", "two-sum", { problem_id: "two-sum", notes: "n", code: "c", language: "cpp" }, 5000);
      w.put("timer_rows", "tt1", { item_id: "x", focused_on: "2026-11-09", minutes: 25 }, 5000);
      w.put("practice_sessions", "pp1", { item_id: "y", practiced_on: "2026-11-09", minutes: null, scores: "{}", score: 3, notes: "", link: null, xp: 4 }, 5000);
      await linkAccount(USER, db);
      const r = await run();
      expect(r).toMatchObject({ state: "synced", pulled: 6, pushed: 0 });
      expect((await one(db, "SELECT title, status FROM tasks"))).toMatchObject({ title: "From B", status: "done" });
      expect(await one(db, "SELECT sync_id AS s FROM sync_ids WHERE tbl='tasks'")).toMatchObject({ s: "abc123" });
      expect(await one(db, "SELECT sync_id AS s FROM sync_ids WHERE tbl='focus_sessions'")).toMatchObject({ s: "tt1" });
      expect(await one(db, "SELECT notes AS n FROM problem_notes WHERE problem_id='two-sum'")).toMatchObject({ n: "n" });
      expect(await count(db, "SELECT count(*) AS n FROM problem_solves")).toBe(1);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(0);
      expect(w.pushes()).toHaveLength(0);
      expect(await count(db, "SELECT count(*) AS n FROM sync_stamps")).toBe(6);
    });

    it("updates an existing row from a newer pulled row and ignores an older one", async () => {
      await db.execute("INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES ('a', 'local', '', '', 'x')");
      await db.execute("INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES ('b', 'local', '', '', 'x')");
      await linkAccount(USER, db);
      const stamp = Number((await one(db, "SELECT updated_at AS u FROM sync_stamps WHERE row_key = 'a'"))?.u);
      w.put("notes", "a", { problem_id: "a", notes: "remote-new", code: "", language: "" }, stamp + 60_000);
      w.put("notes", "b", { problem_id: "b", notes: "remote-old", code: "", language: "" }, stamp - 60_000);
      await run();
      expect((await one(db, "SELECT notes AS n FROM problem_notes WHERE problem_id='a'"))?.n).toBe("remote-new");
      expect((await one(db, "SELECT notes AS n FROM problem_notes WHERE problem_id='b'"))?.n).toBe("local");
      // b is still waiting to upload and wins in the cloud (later updated_at)
      expect(w.tables.notes.get("b")).toMatchObject({ notes: "local" });
    });

    it("applies tombstones as deletes", async () => {
      await db.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('p', 'dsa', 'd', 1)");
      await insertTask(db, null, "gone");
      await linkAccount(USER, db);
      await run();
      const sid = String((await one(db, "SELECT sync_id AS s FROM sync_ids WHERE tbl='tasks'"))?.s);
      const later = Date.now() + 100_000;
      w.put("problem_solves", "p:dsa", { problem_id: "p", kind: "dsa", solved_on: "d", xp: 1 }, later, later);
      w.put("tasks", sid, { date: "2026-11-10", scope: "day", template_key: null, title: "gone", category: "dsa", xp: 10, minutes: null, status: "todo", done_on: null }, later, later);
      const r = await run();
      expect(r.pulled).toBe(2);
      expect(await count(db, "SELECT count(*) AS n FROM problem_solves")).toBe(0);
      expect(await count(db, "SELECT count(*) AS n FROM tasks")).toBe(0);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(0);
    });

    it("sends a local delete as a tombstone", async () => {
      await db.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('p', 'dsa', 'd', 1)");
      await linkAccount(USER, db);
      await run();
      await db.execute("UPDATE sync_stamps SET updated_at = updated_at - 10000"); // keep ordering explicit
      // The delete must be strictly newer than the copy the first run uploaded, or newer-wins treats it as stale (a tie in the
      // same millisecond made this test fail now and then).
      await new Promise((resolve) => setTimeout(resolve, 15));
      await db.execute("DELETE FROM problem_solves WHERE problem_id = 'p'");
      await run();
      expect(w.tables.problem_solves.get("p:dsa")?.deleted_at).not.toBeNull();
    });

    it("merges a pulled generated task that collides with a local one", async () => {
      await insertTask(db, "week1-mon", "Local");
      await linkAccount(USER, db);
      const localSid = String((await one(db, "SELECT sync_id AS s FROM sync_ids WHERE tbl='tasks'"))?.s);
      w.put("tasks", "remote-id", { date: "2026-11-10", scope: "day", template_key: "week1-mon", title: "Remote", category: "dsa", xp: 10, minutes: null, status: "todo", done_on: null }, Date.now() + 60_000);
      const r = await run();
      expect(r.state).toBe("synced");
      expect(await count(db, "SELECT count(*) AS n FROM tasks")).toBe(1);
      expect((await one(db, "SELECT title FROM tasks"))?.title).toBe("Local"); // local row is kept
      expect(await count(db, "SELECT count(*) AS n FROM sync_ids WHERE tbl='tasks'")).toBe(1);
      expect((await one(db, "SELECT sync_id AS s FROM sync_ids WHERE tbl='tasks'"))?.s).toBe("remote-id");
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty WHERE row_key = ?", [localSid])).toBe(0);
      // and a later pull of the same row is stable
      w.put("tasks", "remote-id", { date: "2026-11-10", scope: "day", template_key: "week1-mon", title: "Remote", category: "dsa", xp: 10, minutes: null, status: "done", done_on: "2026-11-10" }, Date.now() + 120_000);
      await run();
      expect(await count(db, "SELECT count(*) AS n FROM tasks")).toBe(1);
      expect((await one(db, "SELECT status FROM tasks"))?.status).toBe("done");
    });

    it("never writes a denylisted setting from the cloud", async () => {
      w.put("settings", "extension_token", { value: "evil" }, 5000);
      w.put("settings", "theme", { value: "dark" }, 5000);
      await linkAccount(USER, db);
      await run();
      expect(await count(db, "SELECT count(*) AS n FROM settings WHERE key = 'extension_token'")).toBe(0);
      expect(await count(db, "SELECT count(*) AS n FROM settings WHERE key = 'theme'")).toBe(1);
    });

    it("survives a row that violates a local constraint", async () => {
      // two cloud rows with the same generated key but unknown ids in the same page, plus a good row
      w.put("tasks", "id-a", { date: "d", scope: "day", template_key: "k", title: "A", category: "c", xp: 1, minutes: null, status: "todo", done_on: null }, 5000);
      w.put("tasks", "id-b", { date: "d", scope: "day", template_key: "k", title: "B", category: "c", xp: 1, minutes: null, status: "todo", done_on: null }, 5000);
      w.put("settings", "theme", { value: "dark" }, 5000);
      await linkAccount(USER, db);
      const r = await run();
      expect(r.state).toBe("synced");
      expect(await count(db, "SELECT count(*) AS n FROM tasks")).toBe(1);
      expect(await count(db, "SELECT count(*) AS n FROM settings")).toBe(1);
    });
  });

  describe("errors and guards", () => {
    it("401 gives signed-out", async () => {
      await linkAccount(USER, db);
      w.failWith = { status: 401 };
      const r = await run();
      expect(r.state).toBe("signed-out");
      expect((await getSyncStatus(db)).state).toBe("signed-out");
    });

    it("no session gives signed-out without calling the Worker", async () => {
      await linkAccount(USER, db);
      const r = await run({ user: null });
      expect(r.state).toBe("signed-out");
      expect(w.calls).toHaveLength(0);
    });

    it("429 gives throttled with a plain message", async () => {
      await linkAccount(USER, db);
      w.failWith = { status: 429, body: { ok: false, message: "Too many requests. Try again in a minute." } };
      const r = await run();
      expect(r).toMatchObject({ state: "throttled", message: "Too many requests. Try again in a minute." });
      w.failWith = { status: 429 };
      expect((await run()).message).toMatch(/busy/i);
    });

    it("other failures give error, and a network failure gives error", async () => {
      await linkAccount(USER, db);
      w.failWith = { status: 500 };
      expect((await run()).state).toBe("error");
      const r = await run({
        fetch: async () => {
          throw new Error("offline");
        },
      });
      expect(r).toMatchObject({ state: "error", message: "Could not reach the sync server." });
      expect((await getSyncStatus(db)).message).toBe("Could not reach the sync server.");
    });

    it("refuses another account and does not call the Worker", async () => {
      await linkAccount("someone-else", db);
      const r = await run();
      expect(r.state).toBe("account-mismatch");
      expect(r.message).toMatch(/another account/);
      expect(w.calls).toHaveLength(0);
    });

    it("does nothing when the device is not linked", async () => {
      const r = await run();
      expect(r).toMatchObject({ state: "synced", pushed: 0, pulled: 0 });
      expect(w.calls).toHaveLength(0);
    });

    it("runs one at a time", async () => {
      await linkAccount(USER, db);
      w.delayMs = 20;
      const [a, b] = await Promise.all([run(), run()]);
      expect(a).toBe(b);
      expect(w.calls.filter((c) => c.path === "/api/sync/head")).toHaveLength(1);
    });
  });

  describe("link, unlink, status", () => {
    async function seedOldData(): Promise<void> {
      await insertTask(db, "a");
      await insertTask(db, null);
      await db.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('p1', 'dsa', 'd', 1), ('p2', 'dsa', 'd', 1)");
      await db.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark'), ('lang', 'cpp'), ('extension_token', 't')");
      await db.execute("INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES ('p1', '', '', '', 'x')");
      await db.execute("INSERT INTO solution_runs (problem_id, lang, code, ran_on, status, passed, total) VALUES ('p1', 'cpp', '', 'd', 's', 1, 1)");
      await db.execute("INSERT INTO pack_progress (pack_id, item_id, done_on) VALUES ('p', 'i', 'd')");
      await db.execute("INSERT INTO practice_sessions (item_id, practiced_on, score, xp) VALUES ('i', 'd', 1, 1)");
      await db.execute("INSERT INTO focus_sessions (item_id, focused_on, minutes) VALUES ('i', 'd', 5)");
      // pretend these rows existed before the triggers did
      await db.execute("DELETE FROM sync_dirty");
      await db.execute("DELETE FROM sync_stamps");
      await db.execute("DELETE FROM sync_ids");
    }

    it("queues every existing row of the eight tables, creating missing sync ids", async () => {
      await seedOldData();
      const { queued } = await linkAccount(USER, db);
      expect(queued).toBe(2 + 2 + 2 + 1 + 1 + 1 + 1 + 1);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(queued);
      expect(await count(db, "SELECT count(*) AS n FROM sync_stamps")).toBe(queued);
      expect(await count(db, "SELECT count(*) AS n FROM sync_ids")).toBe(4);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty WHERE row_key = 'extension_token'")).toBe(0);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty WHERE tbl = 'problem_solves' AND row_key = 'p1:dsa'")).toBe(1);
      expect((await getSyncStatus(db)).account).toBe(USER);

      const r = await run();
      expect(r.pushed).toBe(queued);
      expect(w.tables.tasks.size).toBe(2);
      expect(w.tables.timer_rows.size).toBe(1);
      expect(w.tables.settings.has("extension_token")).toBe(false);
    });

    it("is idempotent", async () => {
      await seedOldData();
      const first = await linkAccount(USER, db);
      const ids = await count(db, "SELECT count(*) AS n FROM sync_ids");
      const second = await linkAccount(USER, db);
      expect(second.queued).toBe(first.queued);
      expect(await count(db, "SELECT count(*) AS n FROM sync_dirty")).toBe(first.queued);
      expect(await count(db, "SELECT count(*) AS n FROM sync_ids")).toBe(ids);
    });

    it("refuses a different account", async () => {
      await linkAccount(USER, db);
      await expect(linkAccount("other", db)).rejects.toThrow("account-mismatch");
      expect((await getSyncStatus(db)).account).toBe(USER);
    });

    it("unlink clears account, queue and stamps but keeps user rows", async () => {
      await seedOldData();
      await linkAccount(USER, db);
      await unlinkAccount(db);
      expect(await getSyncStatus(db)).toEqual({ account: null, state: "idle", lastSyncedAt: null, pending: 0 });
      expect(await count(db, "SELECT count(*) AS n FROM sync_stamps")).toBe(0);
      expect(await count(db, "SELECT count(*) AS n FROM tasks")).toBe(2);
      expect(await count(db, "SELECT count(*) AS n FROM problem_solves")).toBe(2);
      expect(await count(db, "SELECT count(*) AS n FROM settings")).toBe(3);
      // a different account may link now
      await expect(linkAccount("other", db)).resolves.toMatchObject({ queued: 11 });
    });
  });
});
