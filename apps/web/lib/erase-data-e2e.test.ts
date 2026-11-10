import { describe, it, expect, beforeEach } from "vitest";
// @ts-expect-error -- this @types/node has no declarations for node:sqlite (it exists at runtime)
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { MIGRATIONS } from "./db";
import { runSync, linkAccount } from "./sync-engine";
import { eraseLocalData } from "./erase-data";
import worker, {
  type Env,
  type D1Database,
  type D1PreparedStatement,
  type D1Result,
} from "../../../packages/sync-worker/src/index";
import { signAccessToken } from "../../../packages/sync-worker/src/auth/jwt";
import { resetGuardState } from "../../../packages/sync-worker/src/guard/guard";

type SqlArgs = never[]; // node:sqlite bind values

/**
 * Cloudflare D1 mock implementation backed by Node.js DatabaseSync.
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
          const row = s.get(...(bound as SqlArgs));
          return (row ?? null) as T | null;
        },
        async run(): Promise<D1Result> {
          const s = db.prepare(query);
          const res = s.run(...(bound as SqlArgs));
          return { success: true, meta: { changes: Number(res.changes) } };
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          const s = db.prepare(query);
          const rows = s.all(...(bound as SqlArgs));
          return { success: true, results: rows as T[] };
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
            const rows = prepared.all(...(s.args as SqlArgs));
            results.push({ success: true, results: rows as T[] });
          } else {
            const res = prepared.run(...(s.args as SqlArgs));
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
  makeFetcher: (userId: string) => (path: string, init?: RequestInit) => Promise<Response>;
}> {
  const repoRoot = path.resolve(__dirname, "../../..");
  const schemaSql = fs.readFileSync(path.join(repoRoot, "packages/sync-worker/schema.sql"), "utf8");
  const authSql = fs.readFileSync(path.join(repoRoot, "packages/sync-worker/migrations/0002_auth.sql"), "utf8");
  const abuseSql = fs.readFileSync(path.join(repoRoot, "packages/sync-worker/migrations/0003_abuse.sql"), "utf8");

  const rawDb = new DatabaseSync(":memory:");
  rawDb.exec(schemaSql);
  rawDb.exec(authSql);
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

  const makeFetcher = (userId: string) => async (p: string, init: RequestInit = {}) => {
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

describe("Erase Data End-to-End Integration Tests", () => {
  beforeEach(() => {
    resetGuardState();
  });

  // a) Local erase keeps cloud data safe
  it("a) Local erase keeps cloud data safe", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userId = "gh:user123";
    const deviceA = await createLocalDb();
    await linkAccount(userId, deviceA);
    const fetcher = makeFetcher(userId);

    // Device A solves a problem and writes a note
    await deviceA.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["two-sum", "editorial", "2026-11-10", 10, "manual"],
    });
    await deviceA.execute({
      sql: "INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: ["two-sum", "Two sum hash map note", "function twoSum() {}", "typescript", 1000],
    });

    // Run sync on Device A: pushes mutations to cloud
    const resSync = await runSync({
      db: deviceA,
      fetch: fetcher,
      getUserId: async () => userId,
    });
    expect(resSync.state).toBe("synced");
    expect(resSync.pushed).toBe(2);

    // Verify rows exist in cloud D1 (problem_solves, notes)
    const cloudSolvesBefore = rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(userId) as Array<{ problem_id: string }>;
    expect(cloudSolvesBefore.length).toBe(1);
    expect(cloudSolvesBefore[0].problem_id).toBe("two-sum");

    const cloudNotesBefore = rawDb.prepare("SELECT * FROM notes WHERE user_id = ?").all(userId) as Array<{ problem_id: string }>;
    expect(cloudNotesBefore.length).toBe(1);
    expect(cloudNotesBefore[0].problem_id).toBe("two-sum");

    // Run eraseLocalData on Device A
    const eraseResult = await eraseLocalData({ db: deviceA });
    expect(eraseResult.removed.problem_solves).toBe(1);
    expect(eraseResult.removed.problem_notes).toBe(1);

    // Verify: local tables (problem_solves, problem_notes) are empty
    const localSolves = await deviceA.execute("SELECT * FROM problem_solves");
    expect(localSolves.rows.length).toBe(0);
    const localNotes = await deviceA.execute("SELECT * FROM problem_notes");
    expect(localNotes.rows.length).toBe(0);

    // Verify: sync_dirty table is EMPTY! (Triggers were silenced via sync_flags.applying = '1')
    const localDirty = await deviceA.execute("SELECT * FROM sync_dirty");
    expect(localDirty.rows.length).toBe(0);

    // Verify: sync_flags entry for account is cleared
    const accountFlag = await deviceA.execute("SELECT v FROM sync_flags WHERE k = 'account'");
    expect(accountFlag.rows.length).toBe(0);

    // Run sync on Device A: verify it does not push deletions, and Cloud D1 rows are STILL INTACT!
    const resSyncAfter = await runSync({
      db: deviceA,
      fetch: fetcher,
      getUserId: async () => userId,
    });
    expect(resSyncAfter.pushed).toBe(0);

    const cloudSolvesAfter = rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ? AND deleted_at IS NULL").all(userId) as Array<{ problem_id: string }>;
    expect(cloudSolvesAfter.length).toBe(1);
    expect(cloudSolvesAfter[0].problem_id).toBe("two-sum");

    const cloudNotesAfter = rawDb.prepare("SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL").all(userId) as Array<{ problem_id: string }>;
    expect(cloudNotesAfter.length).toBe(1);
    expect(cloudNotesAfter[0].problem_id).toBe("two-sum");
  });

  // b) Cloud delete leaves local data safe
  it("b) Cloud delete leaves local data safe", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userId = "gh:user456";
    const deviceA = await createLocalDb();
    await linkAccount(userId, deviceA);
    const fetcher = makeFetcher(userId);

    // User has local solves and notes on Device A, synced to Cloud D1
    await deviceA.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["lru-cache", "solution", "2026-11-10", 20, "manual"],
    });
    await deviceA.execute({
      sql: "INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: ["lru-cache", "LRU Cache Doubly Linked List", "class LRUCache {}", "typescript", 1000],
    });

    const resSync = await runSync({
      db: deviceA,
      fetch: fetcher,
      getUserId: async () => userId,
    });
    expect(resSync.state).toBe("synced");
    expect(resSync.pushed).toBe(2);

    // Verify Cloud D1 has rows
    expect((rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(userId)).length).toBe(1);
    expect((rawDb.prepare("SELECT * FROM notes WHERE user_id = ?").all(userId)).length).toBe(1);
    expect((rawDb.prepare("SELECT * FROM sync_heads WHERE user_id = ?").all(userId)).length).toBe(1);

    // Send Worker request POST /api/account/delete-data with Bearer token and body { scope: "data", confirm: "DELETE" }
    const delRes = await fetcher("/api/account/delete-data", {
      method: "POST",
      body: JSON.stringify({ scope: "data", confirm: "DELETE" }),
    });
    expect(delRes.status).toBe(200);
    const delJson = (await delRes.json()) as { ok: boolean; deleted: Record<string, number> };
    expect(delJson.ok).toBe(true);
    expect(delJson.deleted.problem_solves).toBe(1);
    expect(delJson.deleted.notes).toBe(1);
    expect(delJson.deleted.sync_heads).toBe(1);

    // Verify: Cloud D1 user rows in problem_solves, notes, sync_heads, etc. are deleted for that user
    expect((rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(userId)).length).toBe(0);
    expect((rawDb.prepare("SELECT * FROM notes WHERE user_id = ?").all(userId)).length).toBe(0);
    expect((rawDb.prepare("SELECT * FROM sync_heads WHERE user_id = ?").all(userId)).length).toBe(0);

    // Verify: Device A's local database is untouched and still contains all solves and notes!
    const localSolves = await deviceA.execute("SELECT * FROM problem_solves WHERE problem_id = 'lru-cache'");
    expect(localSolves.rows.length).toBe(1);
    const localNotes = await deviceA.execute("SELECT * FROM problem_notes WHERE problem_id = 'lru-cache'");
    expect(localNotes.rows.length).toBe(1);
  });

  // c) Multi-user account isolation on cloud delete
  it("c) Multi-user account isolation on cloud delete", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const user1 = "gh:alice";
    const user2 = "gh:bob";

    const device1 = await createLocalDb();
    const device2 = await createLocalDb();
    await linkAccount(user1, device1);
    await linkAccount(user2, device2);

    const fetcher1 = makeFetcher(user1);
    const fetcher2 = makeFetcher(user2);

    // User 1 solves problem
    await device1.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["alice-problem", "editorial", "2026-11-10", 10, "manual"],
    });
    await device1.execute({
      sql: "INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: ["alice-problem", "Alice note", "code1", "typescript", 1000],
    });
    await runSync({ db: device1, fetch: fetcher1, getUserId: async () => user1 });

    // User 2 solves problem
    await device2.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["bob-problem", "solution", "2026-11-10", 15, "manual"],
    });
    await device2.execute({
      sql: "INSERT INTO problem_notes (problem_id, notes, code, language, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: ["bob-problem", "Bob note", "code2", "typescript", 1000],
    });
    await runSync({ db: device2, fetch: fetcher2, getUserId: async () => user2 });

    // Verify both exist in Cloud D1
    expect((rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(user1)).length).toBe(1);
    expect((rawDb.prepare("SELECT * FROM notes WHERE user_id = ?").all(user1)).length).toBe(1);
    expect((rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(user2)).length).toBe(1);
    expect((rawDb.prepare("SELECT * FROM notes WHERE user_id = ?").all(user2)).length).toBe(1);

    // User 1 requests cloud data deletion
    const delRes = await fetcher1("/api/account/delete-data", {
      method: "POST",
      body: JSON.stringify({ scope: "data", confirm: "DELETE" }),
    });
    expect(delRes.status).toBe(200);

    // Verify: User 1's rows are deleted, but User 2's rows remain completely intact
    const u1Solves = rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(user1);
    expect(u1Solves.length).toBe(0);
    const u1Notes = rawDb.prepare("SELECT * FROM notes WHERE user_id = ?").all(user1);
    expect(u1Notes.length).toBe(0);

    const u2Solves = rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(user2) as Array<{ problem_id: string }>;
    expect(u2Solves.length).toBe(1);
    expect(u2Solves[0].problem_id).toBe("bob-problem");
    const u2Notes = rawDb.prepare("SELECT * FROM notes WHERE user_id = ?").all(user2) as Array<{ problem_id: string }>;
    expect(u2Notes.length).toBe(1);
    expect(u2Notes[0].problem_id).toBe("bob-problem");
  });

  // d) Scope "account" vs "data"
  it("d) Scope 'account' vs 'data'", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userA = "gh:scope-account";
    const userB = "gh:scope-data";

    const fetcherA = makeFetcher(userA);
    const fetcherB = makeFetcher(userB);

    // Seed users and sessions in Cloud D1
    rawDb.prepare("INSERT INTO users (id, github_id, name, created_at) VALUES (?, ?, ?, ?)").run(
      userA,
      1001,
      "Alice Account",
      Date.now(),
    );
    rawDb.prepare("INSERT INTO sessions (id, user_id, refresh_hash, expires_at) VALUES (?, ?, ?, ?)").run(
      "sess-A",
      userA,
      "hash-A",
      Date.now() + 60000,
    );

    rawDb.prepare("INSERT INTO users (id, github_id, name, created_at) VALUES (?, ?, ?, ?)").run(
      userB,
      1002,
      "Bob Data",
      Date.now(),
    );
    rawDb.prepare("INSERT INTO sessions (id, user_id, refresh_hash, expires_at) VALUES (?, ?, ?, ?)").run(
      "sess-B",
      userB,
      "hash-B",
      Date.now() + 60000,
    );

    // Seed some synced data in problem_solves
    rawDb.prepare(
      "INSERT INTO problem_solves (user_id, id, problem_id, kind, solved_on, xp, source, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(userA, "pA:editorial", "pA", "editorial", "2026-11-10", 10, "manual", Date.now(), Date.now());
    rawDb.prepare(
      "INSERT INTO problem_solves (user_id, id, problem_id, kind, solved_on, xp, source, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(userB, "pB:editorial", "pB", "editorial", "2026-11-10", 10, "manual", Date.now(), Date.now());

    // 1. scope: "data" deletes synced rows but preserves user and session records
    const resB = await fetcherB("/api/account/delete-data", {
      method: "POST",
      body: JSON.stringify({ scope: "data", confirm: "DELETE" }),
    });
    expect(resB.status).toBe(200);

    expect((rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(userB)).length).toBe(0);
    expect((rawDb.prepare("SELECT * FROM users WHERE id = ?").all(userB)).length).toBe(1);
    expect((rawDb.prepare("SELECT * FROM sessions WHERE user_id = ?").all(userB)).length).toBe(1);

    // 2. scope: "account" deletes synced rows AND user and session records
    const resA = await fetcherA("/api/account/delete-data", {
      method: "POST",
      body: JSON.stringify({ scope: "account", confirm: "DELETE" }),
    });
    expect(resA.status).toBe(200);

    expect((rawDb.prepare("SELECT * FROM problem_solves WHERE user_id = ?").all(userA)).length).toBe(0);
    expect((rawDb.prepare("SELECT * FROM users WHERE id = ?").all(userA)).length).toBe(0);
    expect((rawDb.prepare("SELECT * FROM sessions WHERE user_id = ?").all(userA)).length).toBe(0);

    // User B's user and session records remain intact
    expect((rawDb.prepare("SELECT * FROM users WHERE id = ?").all(userB)).length).toBe(1);
    expect((rawDb.prepare("SELECT * FROM sessions WHERE user_id = ?").all(userB)).length).toBe(1);
  });

  // e) Rejects invalid confirmation or malformed request
  it("e) Rejects invalid confirmation or unknown scope", async () => {
    const { makeFetcher } = await setupWorker();
    const fetcher = makeFetcher("gh:reject-user");

    const resWrongConfirm = await fetcher("/api/account/delete-data", {
      method: "POST",
      body: JSON.stringify({ scope: "data", confirm: "delete" }), // case-sensitive check
    });
    expect(resWrongConfirm.status).toBe(400);

    const resMissingConfirm = await fetcher("/api/account/delete-data", {
      method: "POST",
      body: JSON.stringify({ scope: "data" }),
    });
    expect(resMissingConfirm.status).toBe(400);

    const resWrongScope = await fetcher("/api/account/delete-data", {
      method: "POST",
      body: JSON.stringify({ scope: "invalid_scope", confirm: "DELETE" }),
    });
    expect(resWrongScope.status).toBe(400);
  });
});
