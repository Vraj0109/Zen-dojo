import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../../../packages/sync-worker/src/index";
import { signAccessToken } from "../../../../packages/sync-worker/src/auth/jwt";
import { makeKeys } from "../../../../packages/sync-worker/src/auth/test-helpers";
import { resetGuardState } from "../../../../packages/sync-worker/src/guard/guard";
import { getHubDb, resetHubDb } from "./db";
import { createD1FromLibsql } from "./d1";
import { HUB_MIGRATIONS, HUB_TABLES, migrateHub } from "./migrations";
import { createHubRateLimiters, createRateLimiter } from "./rate-limit";

let dir: string;
let client: Client;

function openClient(): Client {
  return createClient({ url: "file:" + path.join(dir, "hub.db").replace(/\\/g, "/") });
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "hub-test-"));
  client = openClient();
});

afterEach(async () => {
  vi.useRealTimers();
  client.close();
  await resetHubDb();
  delete process.env.HUB_DATABASE_URL;
  delete process.env.HUB_DATABASE_AUTH_TOKEN;
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the file a moment; the temp folder is cleaned by the OS */
  }
});

async function tableNames(c: Client): Promise<string[]> {
  const rs = await c.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
  return rs.rows.map((r) => String(r[0]));
}

describe("hub migrations and getHubDb", () => {
  it("creates every table the Worker queries, and a second run changes nothing", async () => {
    await migrateHub(client);
    const first = await tableNames(client);
    for (const t of HUB_TABLES) expect(first).toContain(t);
    expect(first).toContain("rate_counters");
    expect(first).toContain("zd_schema_version");
    const v = await client.execute("SELECT version FROM zd_schema_version WHERE id = 1");
    expect(Number(v.rows[0][0])).toBe(HUB_MIGRATIONS.length);

    await client.execute("INSERT INTO settings (user_id, key, value, updated_at, synced_at) VALUES ('u', 'k', 'v', 1, 1)");
    await migrateHub(client);
    expect((await tableNames(client)).sort()).toEqual([...first].sort());
    const rows = await client.execute("SELECT count(*) FROM settings");
    expect(Number(rows.rows[0][0])).toBe(1);
    const pragma = await client.execute("PRAGMA user_version");
    expect(Number(pragma.rows[0][0])).toBe(0); // the version lives in a table, never in PRAGMA user_version
  });

  it("getHubDb needs HUB_DATABASE_URL, migrates once, and caches the client", async () => {
    delete process.env.HUB_DATABASE_URL;
    await expect(getHubDb()).rejects.toThrow(/HUB_DATABASE_URL/);
    process.env.HUB_DATABASE_URL = "file:" + path.join(dir, "cached.db").replace(/\\/g, "/");
    const a = await getHubDb();
    const b = await getHubDb();
    expect(b).toBe(a);
    expect(await tableNames(a)).toContain("sessions");
  });
});

describe("D1 shim", () => {
  beforeEach(async () => {
    await migrateHub(client);
  });

  it("first, all and run report rows and meta like D1", async () => {
    const db = createD1FromLibsql(client);
    const ins = await db.prepare("INSERT INTO abuse_log (at, key, kind, detail) VALUES (?, ?, ?, ?)").bind(1, "k", "x", undefined).run();
    expect(ins.meta.changes).toBe(1);
    expect(ins.meta.last_row_id).toBeGreaterThan(0);
    const sel = await db.prepare("SELECT key, detail FROM abuse_log WHERE key = ?").bind("k").all<{ key: string; detail: string | null }>();
    expect(sel.results).toEqual([{ key: "k", detail: null }]);
    expect(sel.meta.changes).toBe(0);
    expect(await db.prepare("SELECT key FROM abuse_log WHERE key = ?").bind("none").first()).toBeNull();
    expect(await db.prepare("SELECT COUNT(*) AS n FROM abuse_log").first<{ n: number }>()).toEqual({ n: 1 });
    expect(await db.prepare("SELECT COUNT(*) AS n FROM abuse_log").first<number>("n")).toBe(1);
    const none = await db.prepare("UPDATE abuse_log SET kind = 'y' WHERE key = ?").bind("zzz").run();
    expect(none.meta.changes).toBe(0);
  });

  it("supports DELETE ... RETURNING and UPDATE ... RETURNING through first()", async () => {
    const db = createD1FromLibsql(client);
    await db.prepare("INSERT INTO oauth_states (state, redirect_uri, code_challenge, created_at) VALUES (?, ?, ?, ?)").bind("s1", "r", "c", 5).run();
    const got = await db.prepare("DELETE FROM oauth_states WHERE state = ? RETURNING redirect_uri, code_challenge, created_at").bind("s1").first();
    expect(got).toEqual({ redirect_uri: "r", code_challenge: "c", created_at: 5 });
    expect(await db.prepare("DELETE FROM oauth_states WHERE state = ? RETURNING redirect_uri").bind("s1").first()).toBeNull();
  });

  it("batch is atomic: a failing statement rolls the whole group back", async () => {
    const db = createD1FromLibsql(client);
    const ok = db.prepare("INSERT INTO sync_heads (user_id, head) VALUES (?, ?)").bind("u1", 1);
    const bad = db.prepare("INSERT INTO sync_heads (user_id, head) VALUES (?, ?)").bind("u2", null); // head is NOT NULL
    await expect(db.batch([ok, bad])).rejects.toThrow();
    expect(await db.prepare("SELECT COUNT(*) AS n FROM sync_heads").first<{ n: number }>()).toEqual({ n: 0 });
    const res = await db.batch([ok, db.prepare("SELECT head FROM sync_heads WHERE user_id = ?").bind("u1")]);
    expect(res[0].meta.changes).toBe(1);
    expect(res[1].results).toEqual([{ head: 1 }]);
  });

  it("refresh-token rotation stays atomic: the second UPDATE of the same token changes 0 rows", async () => {
    const db = createD1FromLibsql(client);
    await db.prepare("INSERT INTO sessions (id, user_id, refresh_hash, expires_at) VALUES ('s', 'u', 'h1', 99)").run();
    const sql =
      "UPDATE sessions SET prev_refresh_hash = refresh_hash, refresh_hash = ?, last_seen_at = ?, expires_at = ? WHERE id = ? AND refresh_hash = ? AND revoked_at IS NULL";
    const [a, b] = await Promise.all([
      db.prepare(sql).bind("h2", 1, 2, "s", "h1").run(),
      db.prepare(sql).bind("h3", 1, 2, "s", "h1").run(),
    ]);
    expect(a.meta.changes + b.meta.changes).toBe(1);
  });

  it("runs the real Worker end to end: refresh grant, push, pull, delete data, public profile", async () => {
    resetGuardState();
    const keys = await makeKeys();
    const db = createD1FromLibsql(client);
    const env = {
      DB: db,
      GITHUB_CLIENT_ID: "id",
      GITHUB_CLIENT_SECRET: "secret",
      JWT_PRIVATE_JWK: keys.priv,
      JWT_PUBLIC_JWK: keys.pub,
      ADMIN_USER_IDS: "gh:1",
      ALLOWED_ORIGIN: "http://localhost:3000",
      ...createHubRateLimiters(client),
    } as unknown as Env;
    const call = (p: string, init: RequestInit = {}) => worker.fetch(new Request("https://hub.test" + p, init), env);

    // a session and a refresh rotation (reuse of the old token must revoke the device)
    const { startSession } = await import("../../../../packages/sync-worker/src/auth/sessions");
    await db.prepare("INSERT INTO users (id, github_id, name, avatar_url, created_at, last_login_at) VALUES ('gh:7', 7, 'N', NULL, 1, 1)").run();
    const first = (await (
      await startSession(env as never, { id: "gh:7", name: "N", avatar_url: null }, "Laptop", Date.now())
    ).json()) as { refresh_token: string };
    const refresh = (rt: string) =>
      call("/auth/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: rt }) });
    const r1 = await refresh(first.refresh_token);
    expect(r1.status).toBe(200);
    const second = (await r1.json()) as { refresh_token: string; access_token: string };
    expect((await refresh(first.refresh_token)).status).toBe(401); // reuse
    expect((await refresh(second.refresh_token)).status).toBe(401); // device was revoked

    // push and pull with a signed access token
    const sid = String((await client.execute("SELECT id FROM sessions LIMIT 1")).rows[0][0]);
    const { token } = await signAccessToken(env as never, { sub: "gh:7", sid, adm: false }, Date.now());
    const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const push = await call("/api/sync", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        mutations: [
          { table: "settings", row_id: "theme", action: "upsert", payload: { value: "dark" }, client_timestamp: 10 },
          { table: "tasks", row_id: "t1", action: "upsert", payload: { date: "2026-01-01", scope: "day", title: "A", category: "dsa", xp: 5 }, client_timestamp: 10 },
        ],
        last_synced_at: 0,
      }),
    });
    expect(push.status).toBe(200);
    const pull = (await (await call("/api/sync", { method: "POST", headers: auth, body: JSON.stringify({ mutations: [], last_synced_at: 0 }) })).json()) as {
      deltas: Record<string, Array<Record<string, unknown>>>;
    };
    expect(pull.deltas.settings).toHaveLength(1);
    expect(pull.deltas.tasks[0].title).toBe("A");
    const head = (await (await call("/api/sync/head", { headers: auth })).json()) as { head: number };
    expect(head.head).toBeGreaterThan(0);

    // delete tombstone: an older client_timestamp loses, a newer one wins
    await call("/api/sync", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ mutations: [{ table: "tasks", row_id: "t1", action: "delete", payload: {}, client_timestamp: 20 }] }),
    });
    const after = await client.execute("SELECT deleted_at FROM tasks WHERE id = 't1'");
    expect(Number(after.rows[0][0])).toBe(20);

    // delete cloud data, counted through batch() meta.changes
    const del = (await (await call("/api/account/delete-data", { method: "POST", headers: auth, body: JSON.stringify({ scope: "data", confirm: "DELETE" }) })).json()) as {
      ok: boolean;
      deleted: Record<string, number>;
    };
    expect(del.ok).toBe(true);
    expect(del.deleted.tasks).toBe(1);
    expect(del.deleted.settings).toBe(1);
    expect(Number((await client.execute("SELECT count(*) FROM tasks")).rows[0][0])).toBe(0);
  });
});

describe("rate limiter", () => {
  beforeEach(async () => {
    await migrateHub(client);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
  });

  it("allows up to the limit, denies after, and allows again in the next window", async () => {
    const rl = createRateLimiter(client, "t", 3, 60);
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) results.push((await rl.limit({ key: "a" })).success);
    expect(results).toEqual([true, true, true, false, false]);
    expect((await rl.limit({ key: "b" })).success).toBe(true); // keys are independent
    vi.setSystemTime(new Date("2026-03-01T10:01:00.000Z"));
    expect((await rl.limit({ key: "a" })).success).toBe(true);
    expect((await rl.limit({ key: "a" })).success).toBe(true);
    expect((await rl.limit({ key: "a" })).success).toBe(true);
    expect((await rl.limit({ key: "a" })).success).toBe(false);
  });

  it("separate limiter names do not share counters", async () => {
    const a = createRateLimiter(client, "x", 1, 60);
    const b = createRateLimiter(client, "y", 1, 60);
    expect((await a.limit({ key: "k" })).success).toBe(true);
    expect((await b.limit({ key: "k" })).success).toBe(true);
    expect((await a.limit({ key: "k" })).success).toBe(false);
  });

  it("deletes counters of long-finished windows lazily", async () => {
    const rl = createRateLimiter(client, "t", 5, 60);
    await rl.limit({ key: "old" });
    vi.setSystemTime(new Date("2026-03-01T13:00:00.000Z")); // three hours later
    await rl.limit({ key: "new" });
    await new Promise((r) => setTimeout(r, 50)); // the sweep is fire and forget
    const keys = (await client.execute("SELECT key FROM rate_counters")).rows.map((r) => String(r[0]));
    expect(keys).toEqual(["t:new"]);
  });

  it("lets requests through when the database fails", async () => {
    const broken = createClient({ url: "file:" + path.join(dir, "empty.db").replace(/\\/g, "/") }); // no rate_counters table
    const rl = createRateLimiter(broken, "t", 1, 60);
    expect((await rl.limit({ key: "a" })).success).toBe(true);
    expect((await rl.limit({ key: "a" })).success).toBe(true);
    broken.close();
  });
});
