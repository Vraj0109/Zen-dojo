import { beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error -- this @types/node has no declarations for node:sqlite (it exists at runtime)
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { MIGRATIONS } from "../db";
import { linkAccount, runSync } from "../sync-engine";
import { resetHostedSyncState, syncAfterMutation, syncOnRequest } from "./sync";
import worker, {
  type Env,
  type D1Database,
  type D1PreparedStatement,
  type D1Result,
} from "../../../../packages/sync-worker/src/index";
import { signAccessToken } from "../../../../packages/sync-worker/src/auth/jwt";
import { resetGuardState } from "../../../../packages/sync-worker/src/guard/guard";

type SqlArgs = never[]; // node:sqlite bind values, kept loose because its types are not available here

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
  makeFetcher: (userId: string) => (path: string, init: RequestInit) => Promise<Response>;
}> {
  const repoRoot = path.resolve(__dirname, "../../../..");
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


describe("hosted sync (plan 0058 step 5)", () => {
  beforeEach(() => {
    resetGuardState();
    resetHostedSyncState();
  });

  it("first sign-in links the empty database and pulls what a desktop wrote", async () => {
    const { makeFetcher } = await setupWorker();
    const userId = "gh:user123";
    const fetch = makeFetcher(userId);
    const desktop = await createLocalDb();
    await linkAccount(userId, desktop);
    await desktop.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["two-sum", "editorial", "2026-11-10", 10, "manual"],
    });
    await runSync({ db: desktop, fetch, getUserId: async () => userId });

    const hosted = await createLocalDb();
    const res = await syncOnRequest(userId, { db: hosted, fetch });
    expect(res.state).toBe("synced");
    expect(res.pulled).toBe(1);
    const rows = await hosted.execute("SELECT problem_id, xp FROM problem_solves");
    expect(rows.rows.map((r) => [r.problem_id, r.xp])).toEqual([["two-sum", 10]]);
  });

  it("throttles on-request syncs per user (20 s) but not other users", async () => {
    const { makeFetcher } = await setupWorker();
    const db = await createLocalDb();
    let t = 1_000_000;
    const deps = { db, fetch: makeFetcher("gh:a"), now: () => t };
    expect((await syncOnRequest("gh:a", deps)).state).toBe("synced");
    expect((await syncOnRequest("gh:a", deps)).state).toBe("throttled");
    t += 19_000;
    expect((await syncOnRequest("gh:a", deps)).state).toBe("throttled");
    t += 2_000;
    expect((await syncOnRequest("gh:a", deps)).state).toBe("synced");
    const other = await createLocalDb();
    expect((await syncOnRequest("gh:b", { db: other, fetch: makeFetcher("gh:b"), now: () => t })).state).toBe("synced");
  });

  it("a hosted write reaches the Worker after syncAfterMutation", async () => {
    const { rawDb, makeFetcher } = await setupWorker();
    const userId = "gh:user123";
    const fetch = makeFetcher(userId);
    const hosted = await createLocalDb();
    await syncOnRequest(userId, { db: hosted, fetch });
    await hosted.execute({
      sql: "INSERT INTO problem_solves (problem_id, kind, solved_on, xp, source) VALUES (?, ?, ?, ?, ?)",
      args: ["web-solve", "manual", "2026-11-11", 5, "manual"],
    });
    const res = await syncAfterMutation(userId, { db: hosted, fetch });
    expect(res.state).toBe("synced");
    expect(res.pushed).toBe(1);
    const cloud = rawDb.prepare("SELECT problem_id FROM problem_solves WHERE user_id = ?").all(userId) as Array<{ problem_id: string }>;
    expect(cloud.map((r) => r.problem_id)).toEqual(["web-solve"]);
  });

  it("reports account-mismatch instead of throwing", async () => {
    const { makeFetcher } = await setupWorker();
    const db = await createLocalDb();
    await linkAccount("gh:one", db);
    const res = await syncOnRequest("gh:two", { db, fetch: makeFetcher("gh:two") });
    expect(res.state).toBe("account-mismatch");
  });

  it("never throws when the Worker is unreachable", async () => {
    const db = await createLocalDb();
    const res = await syncOnRequest("gh:a", { db, fetch: async () => { throw new Error("down"); } });
    expect(res.state).toBe("error");
  });
});
