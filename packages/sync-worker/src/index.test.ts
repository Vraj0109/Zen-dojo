import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env, type D1Database, type D1PreparedStatement, type D1Result } from "./index";
import { signAccessToken } from "./auth/jwt";
import { resetGuardState } from "./guard/guard";

type Row = Record<string, unknown>;

class MockD1 implements D1Database {
  tables: Map<string, Map<string, Row>> = new Map();
  bans: Map<string, { key: string; reason: string; banned_until: number; strikes: number }> = new Map();
  userQuota: Map<string, { rows_live: number; bytes_live: number; day: number; writes_today: number }> = new Map();
  heads: Map<string, number> = new Map();
  abuseLog: Array<{ at: number; key: string; kind: string; detail: string }> = [];

  private getTable(name: string): Map<string, Row> {
    let t = this.tables.get(name);
    if (!t) {
      t = new Map();
      this.tables.set(name, t);
    }
    return t;
  }

  prepare(query: string): D1PreparedStatement {
    const q = query.replace(/\s+/g, " ").trim();
    let boundArgs: unknown[] = [];

    const stmt: D1PreparedStatement = {
      bind(...values: unknown[]) {
        boundArgs = values;
        return stmt;
      },
      first: async <T = unknown>(): Promise<T | null> => {
        if (q.includes("FROM bans WHERE key = ?")) {
          const key = boundArgs[0] as string;
          return (this.bans.get(key) ?? null) as T | null;
        }
        if (q.includes("FROM sync_heads WHERE user_id = ?")) {
          const userId = boundArgs[0] as string;
          return (this.heads.has(userId) ? { head: this.heads.get(userId) } : null) as T | null;
        }
        if (q.includes("FROM user_quota WHERE user_id = ?")) {
          const userId = boundArgs[0] as string;
          return (this.userQuota.get(userId) ?? null) as T | null;
        }
        return null;
      },
      run: async (): Promise<D1Result> => {
        if (q.startsWith("INSERT INTO bans")) {
          const [key, reason, banned_until, strikes] = boundArgs as [string, string, number, number];
          this.bans.set(key, { key, reason, banned_until, strikes });
        } else if (q.startsWith("INSERT INTO abuse_log")) {
          const [at, key, kind, detail] = boundArgs as [number, string, string, string];
          this.abuseLog.push({ at, key, kind, detail });
        } else if (q.startsWith("INSERT INTO user_quota")) {
          const [userId, rowsLive, bytesLive, day, writesToday] = boundArgs as [string, number, number, number, number];
          this.userQuota.set(userId, { rows_live: rowsLive, bytes_live: bytesLive, day, writes_today: writesToday });
        }
        return { success: true };
      },
      all: async <T = unknown>(): Promise<D1Result<T>> => {
        if (q.includes("FROM bans WHERE banned_until > ?")) {
          const now = boundArgs[0] as number;
          const active = [...this.bans.values()].filter((b) => b.banned_until > now);
          return { success: true, results: active as T[] };
        }
        return { success: true, results: [] };
      },
    };
    return stmt;
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      // Execute statement logic
      const s = stmt as unknown as { query: string; args: unknown[] };
      const q = s.query;
      const a = s.args;

      if (q.startsWith("SELECT * FROM")) {
        const match = /SELECT \* FROM (\w+) WHERE user_id = \? AND synced_at > \? ORDER BY synced_at ASC LIMIT (\d+)/i.exec(q);
        if (match) {
          const tableName = match[1];
          const limit = Number(match[2]);
          const userId = a[0] as string;
          const since = a[1] as number;

          const table = this.getTable(tableName);
          const rows = [...table.values()]
            .filter((r) => r.user_id === userId && (r.synced_at as number) > since)
            .sort((x, y) => (x.synced_at as number) - (y.synced_at as number))
            .slice(0, limit);

          results.push({ success: true, results: rows as T[] });
          continue;
        }
      }

      if (q.startsWith("INSERT INTO sync_heads")) {
        const [userId, head] = a as [string, number];
        this.heads.set(userId, Math.max(this.heads.get(userId) ?? 0, head));
        results.push({ success: true, results: [] });
        continue;
      }

      if (q.startsWith("INSERT INTO")) {
        const match = /INSERT INTO (\w+) \((.+?)\) VALUES \((.+?)\) ON CONFLICT \(user_id, (\w+)\) DO UPDATE SET (.+?) WHERE (.+?)\.updated_at <= excluded\.updated_at/i.exec(q);
        if (match) {
          const tableName = match[1];
          const colNames = match[2].split(",").map((c) => c.trim());
          const pkCol = match[4];

          const row: Row = {};
          colNames.forEach((col, idx) => {
            row[col] = a[idx];
          });

          const table = this.getTable(tableName);
          const key = `${row.user_id}:${row[pkCol]}`;
          const existing = table.get(key);

          if (!existing || (existing.updated_at as number) <= (row.updated_at as number)) {
            table.set(key, { ...existing, ...row });
          }
          results.push({ success: true, results: [] });
          continue;
        }
      }

      if (q.startsWith("UPDATE")) {
        const match = /UPDATE (\w+) SET deleted_at = \?, updated_at = \?, synced_at = \? WHERE user_id = \? AND (\w+) = \? AND updated_at <= \?/i.exec(q);
        if (match) {
          const tableName = match[1];
          const pkCol = match[2];
          const [deletedAt, updatedAt, syncedAt, userId, rowId, maxUpdatedAt] = a as [
            number,
            number,
            number,
            string,
            string,
            number,
          ];

          const table = this.getTable(tableName);
          const key = `${userId}:${rowId}`;
          const existing = table.get(key);

          if (existing && (existing.updated_at as number) <= maxUpdatedAt) {
            existing.deleted_at = deletedAt;
            existing.updated_at = updatedAt;
            existing.synced_at = syncedAt;
          }
          results.push({ success: true, results: [] });
          continue;
        }
      }

      results.push({ success: true, results: [] });
    }
    return results;
  }
}

// Wrapper to capture query & args on prepare
class TrackingMockD1 extends MockD1 {
  /** Every statement run, as read or write plus its query; used to count reads and writes. */
  ops: Array<{ kind: "read" | "write"; query: string }> = [];

  override async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    for (const st of statements) {
      const query = (st as unknown as { query: string }).query;
      this.ops.push({ kind: query.startsWith("SELECT") ? "read" : "write", query });
    }
    return super.batch<T>(statements);
  }

  override prepare(query: string): D1PreparedStatement {
    const parentStmt = super.prepare(query);
    const q = query.replace(/\s+/g, " ").trim();
    let currentArgs: unknown[] = [];

    const tracking: D1PreparedStatement & { query: string; args: unknown[] } = {
      query: q,
      args: currentArgs,
      bind(...values: unknown[]) {
        currentArgs = values;
        tracking.args = values;
        parentStmt.bind(...values);
        return tracking;
      },
      first: (<T = unknown>() => {
        this.ops.push({ kind: "read", query: q });
        return parentStmt.first<T>();
      }) as D1PreparedStatement["first"],
      run: () => {
        this.ops.push({ kind: "write", query: q });
        return parentStmt.run();
      },
      all: (<T = unknown>() => {
        this.ops.push({ kind: "read", query: q });
        return parentStmt.all<T>();
      }) as D1PreparedStatement["all"],
    };
    return tracking;
  }
}

let testEnv: Env;
let mockDb: TrackingMockD1;

async function setupEnv(): Promise<Env> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const pubJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  mockDb = new TrackingMockD1();

  return {
    DB: mockDb,
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
    JWT_PRIVATE_JWK: JSON.stringify(privJwk),
    JWT_PUBLIC_JWK: JSON.stringify(pubJwk),
    ADMIN_USER_IDS: "gh:1001",
    ALLOWED_ORIGIN: "http://localhost:3000",
    ALLOWED_REDIRECTS: "http://localhost:3000/auth/callback",
    RL_AUTH: { limit: async () => ({ success: true }) },
    RL_SYNC: { limit: async () => ({ success: true }) },
    RL_IP: { limit: async () => ({ success: true }) },
  };
}

describe("Sync Worker Index & Integration", () => {
  beforeEach(async () => {
    resetGuardState();
    testEnv = await setupEnv();
  });

  describe("Authentication", () => {
    it("returns 401 when no Authorization header is provided", async () => {
      const req = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations: [] }),
      });
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(401);
      const json = await res.json() as Record<string, unknown>;
      expect(json.ok).toBe(false);
      expect(json.error).toBe("unauthorized");
    });

    it("returns 401 for an invalid Bearer token", async () => {
      const req = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: {
          "Authorization": "Bearer invalid.token.value",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mutations: [] }),
      });
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(401);
      const json = await res.json() as Record<string, unknown>;
      expect(json.ok).toBe(false);
      expect(json.error).toBe("unauthorized");
    });

    it("rejects banned IP before authentication", async () => {
      // Seed an active ban for IP 1.2.3.4
      mockDb.bans.set("ip:1.2.3.4", {
        key: "ip:1.2.3.4",
        reason: "abuse",
        banned_until: Date.now() + 600_000,
        strikes: 1,
      });

      const req = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: {
          "CF-Connecting-IP": "1.2.3.4",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mutations: [] }),
      });

      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(429);
      const json = await res.json() as Record<string, unknown>;
      expect(json.error).toBe("temporarily_blocked");
      expect(res.headers.get("Retry-After")).toBeTruthy();
    });
  });

  describe("User Isolation", () => {
    it("prevents User B from reading User A's data and ignores x-user-id header", async () => {
      const { token: tokenUserA } = await signAccessToken(testEnv, { sub: "gh:userA", sid: "sA", adm: false });
      const { token: tokenUserB } = await signAccessToken(testEnv, { sub: "gh:userB", sid: "sB", adm: false });

      // User A creates a task
      const pushA = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenUserA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mutations: [
            {
              table: "tasks",
              row_id: "task-1",
              action: "upsert",
              payload: { title: "User A Task", xp: 10 },
              client_timestamp: 1000,
            },
          ],
        }),
      });
      const resA = await worker.fetch(pushA, testEnv);
      expect(resA.status).toBe(200);

      // User B syncs - tries to impersonate User A via x-user-id
      const pullB = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenUserB}`,
          "Content-Type": "application/json",
          "x-user-id": "gh:userA", // Must be ignored!
        },
        body: JSON.stringify({
          last_synced_at: 0,
        }),
      });
      const resB = await worker.fetch(pullB, testEnv);
      expect(resB.status).toBe(200);
      const jsonB = await resB.json() as Record<string, any>;
      // User B must receive 0 tasks!
      expect(jsonB.deltas.tasks).toEqual([]);

      // User A syncs - receives their own task
      const pullA = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenUserA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          last_synced_at: 0,
        }),
      });
      const resA2 = await worker.fetch(pullA, testEnv);
      expect(resA2.status).toBe(200);
      const jsonA = await resA2.json() as Record<string, any>;
      expect(jsonA.deltas.tasks.length).toBe(1);
      expect(jsonA.deltas.tasks[0].id).toBe("task-1");
      expect(jsonA.deltas.tasks[0].user_id).toBe("gh:userA");
    });
  });

  describe("LWW (Last-Write-Wins) Sync Semantics", () => {
    it("updates when timestamp is newer and ignores stale updates/deletes", async () => {
      const { token } = await signAccessToken(testEnv, { sub: "gh:tester", sid: "s1", adm: false });

      // 1. Initial insert at t=100
      await worker.fetch(
        new Request("https://sync.example/api/sync", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            mutations: [
              {
                table: "tasks",
                row_id: "task-1",
                action: "upsert",
                payload: { title: "Version 1", xp: 10 },
                client_timestamp: 100,
              },
            ],
          }),
        }),
        testEnv,
      );

      // 2. Newer update at t=200
      await worker.fetch(
        new Request("https://sync.example/api/sync", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            mutations: [
              {
                table: "tasks",
                row_id: "task-1",
                action: "upsert",
                payload: { title: "Version 2", xp: 20 },
                client_timestamp: 200,
              },
            ],
          }),
        }),
        testEnv,
      );

      // Verify row is Version 2
      const table = mockDb.tables.get("tasks")!;
      expect(table.get("gh:tester:task-1")?.title).toBe("Version 2");
      expect(table.get("gh:tester:task-1")?.updated_at).toBe(200);

      // 3. Stale update at t=150 (must be ignored)
      await worker.fetch(
        new Request("https://sync.example/api/sync", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            mutations: [
              {
                table: "tasks",
                row_id: "task-1",
                action: "upsert",
                payload: { title: "Stale Version", xp: 15 },
                client_timestamp: 150,
              },
            ],
          }),
        }),
        testEnv,
      );
      expect(table.get("gh:tester:task-1")?.title).toBe("Version 2");
      expect(table.get("gh:tester:task-1")?.updated_at).toBe(200);

      // 4. Delete at t=300
      await worker.fetch(
        new Request("https://sync.example/api/sync", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            mutations: [
              {
                table: "tasks",
                row_id: "task-1",
                action: "delete",
                payload: {},
                client_timestamp: 300,
              },
            ],
          }),
        }),
        testEnv,
      );
      expect(table.get("gh:tester:task-1")?.deleted_at).toBe(300);
      expect(table.get("gh:tester:task-1")?.updated_at).toBe(300);

      // 5. Stale update at t=250 (must be ignored)
      await worker.fetch(
        new Request("https://sync.example/api/sync", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            mutations: [
              {
                table: "tasks",
                row_id: "task-1",
                action: "upsert",
                payload: { title: "Reborn Attempt" },
                client_timestamp: 250,
              },
            ],
          }),
        }),
        testEnv,
      );
      expect(table.get("gh:tester:task-1")?.deleted_at).toBe(300);
    });
  });

  describe("CORS, Security Headers & Routing", () => {
    it("handles CORS OPTIONS preflight with allowed origin", async () => {
      const req = new Request("https://sync.example/api/sync", {
        method: "OPTIONS",
        headers: {
          "Origin": "http://localhost:3000",
          "Access-Control-Request-Method": "POST",
        },
      });
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    });

    it("applies security headers to sync responses", async () => {
      const { token } = await signAccessToken(testEnv, { sub: "gh:tester", sid: "s1", adm: false });
      const req = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await worker.fetch(req, testEnv);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("routes /.well-known/jwks.json to handleAuth", async () => {
      const req = new Request("https://sync.example/.well-known/jwks.json", {
        method: "GET",
      });
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(200);
      const jwks = await res.json() as Record<string, any>;
      expect(jwks.keys).toBeDefined();
      expect(jwks.keys.length).toBeGreaterThan(0);
    });
  });

  describe("Pagination", () => {
    it("returns has_more: false when items are within limit", async () => {
      const { token } = await signAccessToken(testEnv, { sub: "gh:tester", sid: "s1", adm: false });
      const req = new Request("https://sync.example/api/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ last_synced_at: 0 }),
      });
      const res = await worker.fetch(req, testEnv);
      const json = await res.json() as Record<string, any>;
      expect(json.ok).toBe(true);
      expect(json.has_more).toBe(false);
      expect(typeof json.next_since).toBe("number");
    });
  });

  describe("Cursor, head and table coverage (plan 0050)", () => {
    let BASE = 0;
    const COLS: Record<string, string[]> = {
      tasks: ["date", "scope", "template_key", "title", "category", "xp", "minutes", "status", "done_on"],
      problem_solves: ["problem_id", "kind", "solved_on", "xp", "source"],
      settings: ["value"],
      notes: ["problem_id", "notes", "code", "language"],
      solution_runs: ["problem_id", "lang", "code", "ran_on", "status", "passed", "total", "failed_cases"],
      pack_progress: ["pack_id", "item_id", "done_on"],
      practice_sessions: ["item_id", "practiced_on", "minutes", "scores", "score", "notes", "link", "xp"],
      timer_rows: ["item_id", "focused_on", "minutes"],
    };
    const pkOf = (table: string) => (table === "settings" ? "key" : "id");

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      BASE = Date.now();
      vi.setSystemTime(BASE);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    async function tokenFor(sub: string): Promise<string> {
      return (await signAccessToken(testEnv, { sub, sid: "s-" + sub, adm: false })).token;
    }
    async function sync(token: string, body: Record<string, unknown>): Promise<Record<string, any>> {
      const res = await worker.fetch(
        new Request("https://sync.example/api/sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        testEnv,
      );
      expect(res.status).toBe(200);
      return (await res.json()) as Record<string, any>;
    }
    async function head(token: string): Promise<Response> {
      return worker.fetch(
        new Request("https://sync.example/api/sync/head", { headers: { Authorization: `Bearer ${token}` } }),
        testEnv,
      );
    }

    it("accepts exactly the planned columns for each of the eight tables", async () => {
      const token = await tokenFor("gh:cols");
      const mutations = Object.entries(COLS).map(([table, cols]) => ({
        table,
        row_id: "r1",
        action: "upsert",
        payload: Object.fromEntries(cols.map((c) => [c, "v-" + c])),
        client_timestamp: 500,
      }));
      await sync(token, { mutations });
      for (const [table, cols] of Object.entries(COLS)) {
        const row = mockDb.tables.get(table)!.get("gh:cols:r1")!;
        const stored = Object.keys(row).filter(
          (k) => !["user_id", "id", "key", "updated_at", "deleted_at", "synced_at"].includes(k),
        );
        expect(stored.sort(), table).toEqual([...cols].sort());
      }
    });

    it("round-trips an upsert and a delete for every table", async () => {
      const token = await tokenFor("gh:rt");
      let clock = BASE;
      for (const [table, cols] of Object.entries(COLS)) {
        const rowId = "row-" + table;
        vi.setSystemTime((clock += 1000));
        const first = await sync(token, { last_synced_at: 0 });
        const payload = Object.fromEntries(cols.map((c) => [c, "v-" + c]));
        vi.setSystemTime((clock += 1000));
        await sync(token, {
          mutations: [{ table, row_id: rowId, action: "upsert", payload, client_timestamp: 10 }],
        });
        vi.setSystemTime((clock += 1000));
        const pulled = await sync(token, { last_synced_at: first.server_timestamp });
        const rows = (pulled.deltas[table] as Array<Record<string, unknown>>).filter((r) => r[pkOf(table)] === rowId);
        expect(rows.length, table).toBe(1);
        for (const c of cols) expect(rows[0][c], `${table}.${c}`).toBe("v-" + c);
        expect(rows[0].deleted_at).toBeNull();

        vi.setSystemTime((clock += 1000));
        await sync(token, {
          mutations: [{ table, row_id: rowId, action: "delete", payload: {}, client_timestamp: 20 }],
        });
        vi.setSystemTime((clock += 1000));
        const afterDelete = await sync(token, { last_synced_at: pulled.server_timestamp });
        const gone = (afterDelete.deltas[table] as Array<Record<string, unknown>>).find((r) => r[pkOf(table)] === rowId);
        expect(gone?.deleted_at, table).toBe(20);
      }
    });

    it("drops payload columns that are not on the allow-list", async () => {
      const token = await tokenFor("gh:drop");
      await sync(token, {
        mutations: [
          {
            table: "tasks",
            row_id: "t1",
            action: "upsert",
            payload: { title: "ok", user_id: "gh:someone-else", updated_at: 1, synced_at: 1, bogus: "x", id: "evil" },
            client_timestamp: 700,
          },
        ],
      });
      expect(mockDb.tables.get("tasks")!.has("gh:someone-else:t1")).toBe(false);
      const row = mockDb.tables.get("tasks")!.get("gh:drop:t1")!;
      expect(row.title).toBe("ok");
      expect(row.user_id).toBe("gh:drop");
      expect(row.id).toBe("t1");
      expect(row.updated_at).toBe(700);
      expect(row.bogus).toBeUndefined();
      expect(row.synced_at).not.toBe(1);
    });

    it("delivers a row uploaded late with an old updated_at to a device whose cursor is already past it", async () => {
      const token = await tokenFor("gh:offline");
      // Device B syncs at server time T1 and stores that as its cursor.
      vi.setSystemTime(BASE);
      const bFirst = await sync(token, { last_synced_at: 0 });
      const cursorB = bFirst.server_timestamp as number;
      expect(bFirst.deltas.problem_solves).toEqual([]);

      // Device A solved a problem offline an hour before that and uploads it only now.
      vi.setSystemTime(BASE + 60_000);
      await sync(token, {
        mutations: [
          {
            table: "problem_solves",
            row_id: "two-sum:solve",
            action: "upsert",
            payload: { problem_id: "two-sum", kind: "solve", solved_on: "2026-11-10", xp: 20, source: "manual" },
            client_timestamp: BASE - 3_600_000,
          },
        ],
      });

      // B pulls with its old cursor and still gets the row, because pulls use synced_at (server time).
      vi.setSystemTime(BASE + 120_000);
      const bSecond = await sync(token, { last_synced_at: cursorB });
      const rows = bSecond.deltas.problem_solves as Array<Record<string, unknown>>;
      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe("two-sum:solve");
      expect(rows[0].updated_at).toBe(BASE - 3_600_000);
      expect(rows[0].synced_at).toBe(BASE + 60_000);
      expect(bSecond.server_timestamp).toBeGreaterThanOrEqual(rows[0].synced_at as number);
    });

    it("raises the head with each push and reads it with one read and no writes", async () => {
      const token = await tokenFor("gh:head");
      vi.setSystemTime(BASE);
      const empty = await head(token);
      expect(empty.status).toBe(200);
      expect(await empty.json()).toEqual({ ok: true, head: 0 });

      vi.setSystemTime(BASE + 5000);
      await sync(token, {
        mutations: [{ table: "settings", row_id: "theme", action: "upsert", payload: { value: "dark" }, client_timestamp: 1 }],
      });
      expect(mockDb.heads.get("gh:head")).toBe(BASE + 5000);

      mockDb.ops.length = 0;
      const res = await head(token);
      expect(await res.json()).toEqual({ ok: true, head: BASE + 5000 });
      const dataOps = mockDb.ops.filter((o) => !/bans|user_quota|abuse_log/.test(o.query));
      expect(dataOps).toEqual([{ kind: "read", query: "SELECT head FROM sync_heads WHERE user_id = ?" }]);
      expect(dataOps.filter((o) => o.kind === "write")).toEqual([]);

      // A pull-only request does not move the head.
      vi.setSystemTime(BASE + 9000);
      await sync(token, { last_synced_at: 0 });
      expect(mockDb.heads.get("gh:head")).toBe(BASE + 5000);
    });

    it("requires a valid token and GET for the head route, and keeps users apart", async () => {
      const a = await tokenFor("gh:headA");
      const b = await tokenFor("gh:headB");
      vi.setSystemTime(BASE);
      await sync(a, {
        mutations: [{ table: "tasks", row_id: "t", action: "upsert", payload: { title: "x" }, client_timestamp: 1 }],
      });
      expect(await (await head(a)).json()).toEqual({ ok: true, head: BASE });
      expect(await (await head(b)).json()).toEqual({ ok: true, head: 0 });
      const bPull = await sync(b, { last_synced_at: 0 });
      for (const t of Object.keys(COLS)) expect(bPull.deltas[t]).toEqual([]);

      const noAuth = await worker.fetch(new Request("https://sync.example/api/sync/head"), testEnv);
      expect(noAuth.status).toBe(401);
      const post = await worker.fetch(
        new Request("https://sync.example/api/sync/head", { method: "POST", headers: { Authorization: `Bearer ${a}` } }),
        testEnv,
      );
      expect(post.status).toBe(405);
    });
  });
});
