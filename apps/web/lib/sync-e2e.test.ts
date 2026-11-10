import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { MIGRATIONS } from "./db";
import { runSync, linkAccount } from "./sync-engine";
import worker, {
  type Env,
  type D1Database,
  type D1PreparedStatement,
  type D1Result,
} from "../../../packages/sync-worker/src/index";
import { signAccessToken } from "../../../packages/sync-worker/src/auth/jwt";
import { resetGuardState } from "../../../packages/sync-worker/src/guard/guard";

/**
 * Cloudflare D1 mock implementation backed by Node.js DatabaseSync.
 * Supports `.prepare().bind().first() / .run() / .all() / .raw()` and `.batch()`.
 */
function createD1Mock(db: DatabaseSync): D1Database {
  return {
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt: D1PreparedStatement & { query: string; args: unknown[] } = {
        query,
        args: bound,
        bind(...values: unknown[]) {
          bound = values.map((v) => (v === undefined ? null : v));
          stmt.args = bound;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          const s = db.prepare(query);
          const row = s.get(...(bound as any));
          return (row ?? null) as T | null;
        },
        async run(): Promise<D1Result> {
          const s = db.prepare(query);
          const res = s.run(...(bound as any));
          return { success: true, meta: { changes: Number(res.changes) } };
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          const s = db.prepare(query);
          const rows = s.all(...(bound as any));
          return { success: true, results: rows as T[] };
        },
        async raw(): Promise<unknown[]> {
          const s = db.prepare(query);
          return s.all(...(bound as any));
        },
      };
      return stmt;
    },
    async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      db.exec("BEGIN");
      try {
        for (const st of statements) {
          const s = st as unknown as { query: string; args: unknown[] };
          const prepared = db.prepare(s.query);
          const isSelect = s.query.trim().toUpperCase().startsWith("SELECT");
          if (isSelect) {
            const rows = prepared.all(...(s.args as any));
            results.push({ success: true, results: rows as T[] });
          } else {
            const res = prepared.run(...(s.args as any));
            results.push({ success: true, meta: { changes: Number(res.changes) } });
          }
        }
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return results;
    },
  };
}

/**
 * Creates an in-memory libSQL client representing a local device database
 * and executes all schema migrations including sync side tables and triggers.
 */
async function createLocalDb(): Promise<Client> {
  const client = createClient({ url: ":memory:" });
  for (const m of MIGRATIONS) {
    await client.executeMultiple(m);
  }
  return client;
}

/**
 * Sets up a Cloudflare Worker test environment with in-memory D1 database,
 * ECDSA P-256 JWT key pair, and test rate limiters.
 */
async function setupWorker(): Promise<{
  env: Env;
  rawDb: DatabaseSync;
  tokenFor: (userId: string) => Promise<string>;
  makeFetcher: (userId: string) => (path: string, init: RequestInit) => Promise<Response>;
}> {
  const repoRoot = path.resolve(__dirname, "../../..");
  const schemaSql = fs.readFileSync(path.join(repoRoot, "packages/sync-worker/schema.sql"), "utf8");
  const abuseSql = fs.readFileSync(path.join(repoRoot, "packages/sync-worker/migrations/0003_abuse.sql"), "utf8");

  const rawDb = new DatabaseSync(":memory:");
  rawDb.exec(schemaSql);
  rawDb.exec(abuseSql);
  const d1 = createD1Mock(rawDb);

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const pubJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  const env: Env = {
    DB: d1,
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
    JWT_PRIVATE_JWK: JSON.stringify(privJwk),
    JWT_PUBLIC_JWK: JSON.stringify(pubJwk),
    ADMIN_USER_IDS: "gh:admin",
    ALLOWED_ORIGIN: "http://localhost:3000",
    ALLOWED_REDIRECTS: "http://localhost:3000/auth/callback",
    RL_AUTH: { limit: async () => ({ success: true }) },
    RL_SYNC: { limit: async () => ({ success: true }) },
    RL_IP: { limit: async () => ({ success: true }) },
  };

  const tokenFor = async (userId: string) => {
    const { token } = await signAccessToken(env, { sub: userId, sid: "sess-" + userId, adm: false });
    return token;
  };

  const makeFetcher = (userId: string) => async (p: string, init: RequestInit) => {
    const token = await tokenFor(userId);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    const req = new Request(`http://localhost:3000${p}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body,
    });
    return worker.fetch(req, env);
  };

  return { env, rawDb, tokenFor, makeFetcher };
}

describe("Sync End-to-End Integration Tests", () => {
  beforeEach(() => {
    resetGuardState();
  });

  // a) Solve sync
  it("a) Solve sync: Device A marks a problem solved, pushes. Device B pulls and receives the solve", async () => {
    const { makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const deviceB = await createLocalDb();

    await linkAccount(userId, deviceA);
    await linkAccount(userId, deviceB);

    const fetcher = makeFetcher(userId);

    // Device A solves a problem
    await deviceA.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["two-sum", "editorial", "2026-11-10", 10, "manual"],
    });

    // Device A runs sync (pushes mutations)
    const resA = await runSync({
      db: deviceA,
      fetch: fetcher,
      getUserId: async () => userId,
    });
    expect(resA.state).toBe("synced");
    expect(resA.pushed).toBe(1);

    // Device B runs sync (pulls deltas)
    const resB = await runSync({
      db: deviceB,
      fetch: fetcher,
      getUserId: async () => userId,
    });
    expect(resB.state).toBe("synced");
    expect(resB.pulled).toBe(1);

    // Verify Device B has the problem solve
    const bRows = await deviceB.execute({
      sql: "SELECT * FROM problem_solves WHERE problem_id = ?",
      args: ["two-sum"],
    });
    expect(bRows.rows.length).toBe(1);
    expect(bRows.rows[0].kind).toBe("editorial");
    expect(bRows.rows[0].xp).toBe(10);
  });

  // b) Undo solve
  it("b) Undo solve: Device A marks solve deleted / undone, pushes. Device B pulls and the solve is removed", async () => {
    const { makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const deviceB = await createLocalDb();

    await linkAccount(userId, deviceA);
    await linkAccount(userId, deviceB);

    const fetcher = makeFetcher(userId);

    // Seed solve on Device A and sync to Device B
    await deviceA.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["lru-cache", "solution", "2026-11-10", 20, "manual"],
    });
    await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });
    await runSync({ db: deviceB, fetch: fetcher, getUserId: async () => userId });

    const beforeUndo = await deviceB.execute({
      sql: "SELECT * FROM problem_solves WHERE problem_id = ?",
      args: ["lru-cache"],
    });
    expect(beforeUndo.rows.length).toBe(1);

    // Device A deletes / undoes the solve
    await deviceA.execute({
      sql: "DELETE FROM problem_solves WHERE problem_id = ? AND kind = ?",
      args: ["lru-cache", "solution"],
    });

    // Device A pushes delete mutation
    const resA = await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });
    expect(resA.pushed).toBe(1);

    // Device B pulls deltas
    const resB = await runSync({ db: deviceB, fetch: fetcher, getUserId: async () => userId });
    expect(resB.pulled).toBe(1);

    // Verify solve is removed from Device B
    const afterUndo = await deviceB.execute({
      sql: "SELECT * FROM problem_solves WHERE problem_id = ?",
      args: ["lru-cache"],
    });
    expect(afterUndo.rows.length).toBe(0);
  });

  // c) Settings denylist
  it("c) Settings denylist: Device A saves settings. Only safe keys upload; extension_token & secrets never reach Worker or Device B", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const deviceB = await createLocalDb();

    await linkAccount(userId, deviceA);
    await linkAccount(userId, deviceB);

    const fetcher = makeFetcher(userId);

    // Device A saves allowed setting and denylisted/secret settings
    await deviceA.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ["theme", "dracula"] });
    await deviceA.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ["extension_token", "super-secret-token"] });
    await deviceA.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ["content_feed_url", "https://secret.com/feed"] });
    await deviceA.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ["api_secret_key", "sec_123"] });
    await deviceA.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ["db_password", "pass_456"] });

    // Verify local sync_dirty on Device A only queued safe keys
    const dirtyRows = await deviceA.execute("SELECT row_key FROM sync_dirty WHERE tbl = 'settings'");
    const queuedKeys = dirtyRows.rows.map((r) => String(r.row_key));
    expect(queuedKeys).toEqual(["theme"]);

    // Device A pushes
    const resA = await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });
    expect(resA.pushed).toBe(1);

    // Verify Worker D1 settings table contains theme and none of the secrets
    const cloudSettings = rawDb
      .prepare("SELECT key, value FROM settings WHERE user_id = ?")
      .all(userId) as Array<{ key: string; value: string }>;
    const cloudKeys = cloudSettings.map((s) => s.key);
    expect(cloudKeys).toEqual(["theme"]);

    // Device B pulls
    await runSync({ db: deviceB, fetch: fetcher, getUserId: async () => userId });

    // Verify Device B has theme and none of the secrets
    const bSettings = await deviceB.execute("SELECT key, value FROM settings");
    const bKeys = bSettings.rows.map((r) => String(r.key));
    expect(bKeys).toEqual(["theme"]);
    expect(bSettings.rows[0].value).toBe("dracula");
  });

  // d) Auto-increment tasks
  it("d) Auto-increment tasks: Two devices create tasks offline with same local id. Each gets independent sync_id", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const deviceB = await createLocalDb();

    await linkAccount(userId, deviceA);
    await linkAccount(userId, deviceB);

    const fetcher = makeFetcher(userId);

    // Both devices create a task offline; both get local id = 1
    await deviceA.execute({
      sql: "INSERT INTO tasks (date, scope, title, category, xp) VALUES (?, ?, ?, ?, ?)",
      args: ["2026-11-10", "daily", "Task created on Device A", "coding", 20],
    });
    await deviceB.execute({
      sql: "INSERT INTO tasks (date, scope, title, category, xp) VALUES (?, ?, ?, ?, ?)",
      args: ["2026-11-10", "daily", "Task created on Device B", "reading", 15],
    });

    const aLocalTask = await deviceA.execute("SELECT id, title FROM tasks");
    const bLocalTask = await deviceB.execute("SELECT id, title FROM tasks");
    expect(aLocalTask.rows[0].id).toBe(1);
    expect(bLocalTask.rows[0].id).toBe(1);

    // Check independent sync_ids assigned by triggers
    const aSyncId = (await deviceA.execute("SELECT sync_id FROM sync_ids WHERE tbl = 'tasks' AND local_id = 1")).rows[0].sync_id;
    const bSyncId = (await deviceB.execute("SELECT sync_id FROM sync_ids WHERE tbl = 'tasks' AND local_id = 1")).rows[0].sync_id;
    expect(aSyncId).not.toBe(bSyncId);

    // Device A syncs (pushes task A)
    await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });

    // Device B syncs (pulls task A, pushes task B)
    await runSync({ db: deviceB, fetch: fetcher, getUserId: async () => userId });

    // Device A syncs (pulls task B)
    await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });

    // Both devices now have both tasks without overwriting
    const aAllTasks = await deviceA.execute("SELECT title FROM tasks ORDER BY title");
    const bAllTasks = await deviceB.execute("SELECT title FROM tasks ORDER BY title");
    expect(aAllTasks.rows.map((r) => r.title)).toEqual(["Task created on Device A", "Task created on Device B"]);
    expect(bAllTasks.rows.map((r) => r.title)).toEqual(["Task created on Device A", "Task created on Device B"]);

    // Worker D1 has two separate tasks with distinct sync_ids
    const d1Tasks = rawDb.prepare("SELECT id, title FROM tasks WHERE user_id = ?").all(userId) as Array<{ id: string; title: string }>;
    expect(d1Tasks.length).toBe(2);
    expect(d1Tasks.map((t) => t.id).sort()).toEqual([aSyncId, bSyncId].sort());
  });

  // e) Collision merge
  it("e) Collision merge: Same generated task with identical (date, scope, template_key) on both devices merges cleanly", async () => {
    const { makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const deviceB = await createLocalDb();

    await linkAccount(userId, deviceA);
    await linkAccount(userId, deviceB);

    const fetcher = makeFetcher(userId);

    // Both devices generate identical recurring task with template_key
    await deviceA.execute({
      sql: "INSERT INTO tasks (date, scope, template_key, title, category, xp) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["2026-11-10", "daily", "daily_review_card", "Daily Review", "study", 10],
    });
    await deviceB.execute({
      sql: "INSERT INTO tasks (date, scope, template_key, title, category, xp) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["2026-11-10", "daily", "daily_review_card", "Daily Review", "study", 10],
    });

    // Device A syncs (pushes)
    await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });

    // Device B syncs (pulls Device A's task): should merge cleanly without failing tasks_generated_unique constraint
    const resB = await runSync({ db: deviceB, fetch: fetcher, getUserId: async () => userId });
    expect(resB.state).toBe("synced");

    // Device B should have exactly 1 task
    const bTasks = await deviceB.execute("SELECT id, template_key, title FROM tasks");
    expect(bTasks.rows.length).toBe(1);
    expect(bTasks.rows[0].template_key).toBe("daily_review_card");

    // Device A's sync_id was adopted on Device B
    const aSyncId = (await deviceA.execute("SELECT sync_id FROM sync_ids WHERE tbl = 'tasks'")).rows[0].sync_id;
    const bSyncId = (await deviceB.execute("SELECT sync_id FROM sync_ids WHERE tbl = 'tasks'")).rows[0].sync_id;
    expect(bSyncId).toBe(aSyncId);
  });

  // f) LWW note edits
  it("f) LWW note edits: Device A edits at T1. Device B edits same note at T2 (T2 > T1). T2 wins on both devices", async () => {
    const { makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const deviceB = await createLocalDb();

    await linkAccount(userId, deviceA);
    await linkAccount(userId, deviceB);

    const fetcher = makeFetcher(userId);

    // Device A writes note at T1 (timestamp 1000)
    await deviceA.execute({
      sql: "INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: ["problem_lww", "Edit from Device A (older)", "code_a", "ts", "2026-11-10T10:00:00Z"],
    });
    await deviceA.execute("UPDATE sync_dirty SET changed_at = 1000 WHERE tbl = 'problem_notes' AND row_key = 'problem_lww'");
    await deviceA.execute("UPDATE sync_stamps SET updated_at = 1000 WHERE tbl = 'problem_notes' AND row_key = 'problem_lww'");

    // Device B writes same note at T2 (timestamp 2000 > 1000)
    await deviceB.execute({
      sql: "INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: ["problem_lww", "Edit from Device B (newer)", "code_b", "ts", "2026-11-10T12:00:00Z"],
    });
    await deviceB.execute("UPDATE sync_dirty SET changed_at = 2000 WHERE tbl = 'problem_notes' AND row_key = 'problem_lww'");
    await deviceB.execute("UPDATE sync_stamps SET updated_at = 2000 WHERE tbl = 'problem_notes' AND row_key = 'problem_lww'");

    // Device A pushes first (T1)
    await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });

    // Device B pushes second (T2 wins in D1)
    await runSync({ db: deviceB, fetch: fetcher, getUserId: async () => userId });

    // Device A pulls T2
    await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });

    // Both devices now have Device B's version
    const aNote = await deviceA.execute("SELECT notes, code FROM problem_notes WHERE problem_id = 'problem_lww'");
    const bNote = await deviceB.execute("SELECT notes, code FROM problem_notes WHERE problem_id = 'problem_lww'");
    expect(aNote.rows[0].notes).toBe("Edit from Device B (newer)");
    expect(bNote.rows[0].notes).toBe("Edit from Device B (newer)");
  });

  // g) First link
  it("g) First link: Device A has pre-existing rows before linking. Linking queues and uploads all of them", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const fetcher = makeFetcher(userId);

    // Populate rows BEFORE linking
    await deviceA.execute({
      sql: "INSERT INTO tasks (date, scope, title, category, xp) VALUES (?, ?, ?, ?, ?)",
      args: ["2026-11-10", "daily", "Pre-link Task", "study", 15],
    });
    await deviceA.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["pre-problem", "editorial", "2026-11-10", 10, "manual"],
    });
    await deviceA.execute({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
      args: ["font_size", "14"],
    });
    await deviceA.execute({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
      args: ["extension_token", "do-not-sync-me"],
    });

    // Link account
    const linkResult = await linkAccount(userId, deviceA);
    expect(linkResult.queued).toBe(3); // 1 task + 1 solve + 1 safe setting

    // Verify sync_dirty has 3 queued items
    const dirtyCount = await deviceA.execute("SELECT count(*) AS n FROM sync_dirty");
    expect(dirtyCount.rows[0].n).toBe(3);

    // Sync uploads all pre-existing rows
    const resA = await runSync({ db: deviceA, fetch: fetcher, getUserId: async () => userId });
    expect(resA.state).toBe("synced");
    expect(resA.pushed).toBe(3);

    // sync_dirty is now empty
    const dirtyAfter = await deviceA.execute("SELECT count(*) AS n FROM sync_dirty");
    expect(dirtyAfter.rows[0].n).toBe(0);

    // Verify Worker D1 has all 3 rows
    const d1Tasks = rawDb.prepare("SELECT title FROM tasks WHERE user_id = ?").all(userId);
    const d1Solves = rawDb.prepare("SELECT problem_id FROM problem_solves WHERE user_id = ?").all(userId);
    const d1Settings = rawDb.prepare("SELECT key FROM settings WHERE user_id = ?").all(userId);
    expect(d1Tasks.length).toBe(1);
    expect(d1Solves.length).toBe(1);
    expect(d1Settings.length).toBe(1);
  });

  // h) Offline cursor case (crucial!)
  it("h) Offline cursor case: Device A solves offline at T_old < T_cursor. Worker stamps synced_at = T_now > T_cursor. Device B pulls solve", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userId = "gh:user123";

    const deviceA = await createLocalDb();
    const deviceB = await createLocalDb();

    await linkAccount(userId, deviceA);
    await linkAccount(userId, deviceB);

    const fetcher = makeFetcher(userId);

    // 1. Initial state: Device B syncs at T_cursor = 50000.
    // Record Device B's cursor at 50000.
    await deviceB.execute({
      sql: "INSERT OR REPLACE INTO sync_flags (k, v) VALUES ('last_synced_at', '50000'), ('head', '50000')",
    });

    // 2. Device A was offline: solves a problem at T_old = 10000 (well before T_cursor = 50000)
    await deviceA.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["offline-dp-problem", "manual", "2026-11-01", 30, "manual"],
    });
    await deviceA.execute("UPDATE sync_dirty SET changed_at = 10000 WHERE row_key = 'offline-dp-problem:manual'");
    await deviceA.execute("UPDATE sync_stamps SET updated_at = 10000 WHERE row_key = 'offline-dp-problem:manual'");

    // 3. Device A comes online later at T_now = 80000 and uploads solve
    const resA = await runSync({
      db: deviceA,
      fetch: fetcher,
      now: () => 80000,
      getUserId: async () => userId,
    });
    expect(resA.pushed).toBe(1);

    // Verify Worker D1 stored updated_at = 10000 but synced_at >= 80000 (fresh worker clock)
    const cloudSolve = rawDb
      .prepare("SELECT problem_id, updated_at, synced_at FROM problem_solves WHERE user_id = ? AND problem_id = ?")
      .get(userId, "offline-dp-problem") as { problem_id: string; updated_at: number; synced_at: number };
    expect(cloudSolve.updated_at).toBe(10000);
    expect(cloudSolve.synced_at).toBeGreaterThanOrEqual(80000);

    // 4. Device B syncs (pulls with last_synced_at based on its 50000 cursor).
    // Because Worker synced_at >= 80000 > 50000, Device B receives the solve!
    const resB = await runSync({
      db: deviceB,
      fetch: fetcher,
      now: () => 85000,
      getUserId: async () => userId,
    });
    expect(resB.state).toBe("synced");
    expect(resB.pulled).toBe(1);

    // Verify Device B has the solve!
    const bSolve = await deviceB.execute({
      sql: "SELECT * FROM problem_solves WHERE problem_id = ?",
      args: ["offline-dp-problem"],
    });
    expect(bSolve.rows.length).toBe(1);
    expect(bSolve.rows[0].problem_id).toBe("offline-dp-problem");
    expect(bSolve.rows[0].xp).toBe(30);
  });

  // i) Account isolation
  it("i) Account isolation: User 1 and User 2 sync with the same Worker. Neither receives rows from the other", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const user1 = "gh:user_alice";
    const user2 = "gh:user_bob";

    const device1 = await createLocalDb();
    const device2 = await createLocalDb();

    await linkAccount(user1, device1);
    await linkAccount(user2, device2);

    // User 1 adds solve on Device 1 and syncs
    await device1.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["alice-unique-problem", "manual", "2026-11-10", 10, "manual"],
    });
    await runSync({ db: device1, fetch: makeFetcher(user1), getUserId: async () => user1 });

    // User 2 adds solve on Device 2 and syncs
    await device2.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["bob-unique-problem", "manual", "2026-11-10", 25, "manual"],
    });
    await runSync({ db: device2, fetch: makeFetcher(user2), getUserId: async () => user2 });

    // Both sync again
    await runSync({ db: device1, fetch: makeFetcher(user1), getUserId: async () => user1 });
    await runSync({ db: device2, fetch: makeFetcher(user2), getUserId: async () => user2 });

    // Verify Device 1 only has Alice's solve
    const dev1Solves = await device1.execute("SELECT problem_id FROM problem_solves");
    expect(dev1Solves.rows.map((r) => r.problem_id)).toEqual(["alice-unique-problem"]);

    // Verify Device 2 only has Bob's solve
    const dev2Solves = await device2.execute("SELECT problem_id FROM problem_solves");
    expect(dev2Solves.rows.map((r) => r.problem_id)).toEqual(["bob-unique-problem"]);

    // Verify Cloud D1 has strict user_id separation
    const aliceCloud = rawDb.prepare("SELECT problem_id FROM problem_solves WHERE user_id = ?").all(user1) as Array<{ problem_id: string }>;
    const bobCloud = rawDb.prepare("SELECT problem_id FROM problem_solves WHERE user_id = ?").all(user2) as Array<{ problem_id: string }>;
    expect(aliceCloud.map((r) => r.problem_id)).toEqual(["alice-unique-problem"]);
    expect(bobCloud.map((r) => r.problem_id)).toEqual(["bob-unique-problem"]);
  });
});
