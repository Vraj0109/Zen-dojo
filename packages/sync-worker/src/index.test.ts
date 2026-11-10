import { beforeEach, describe, expect, it } from "vitest";
import worker, { type Env, type D1Database, type D1PreparedStatement, type D1Result } from "./index";
import { signAccessToken } from "./auth/jwt";
import { resetGuardState } from "./guard/guard";

type Row = Record<string, unknown>;

class MockD1 implements D1Database {
  tables: Map<string, Map<string, Row>> = new Map();
  bans: Map<string, { key: string; reason: string; banned_until: number; strikes: number }> = new Map();
  userQuota: Map<string, { rows_live: number; bytes_live: number; day: number; writes_today: number }> = new Map();
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
        const match = /SELECT \* FROM (\w+) WHERE user_id = \? AND updated_at > \? ORDER BY updated_at ASC LIMIT (\d+)/i.exec(q);
        if (match) {
          const tableName = match[1];
          const limit = Number(match[2]);
          const userId = a[0] as string;
          const since = a[1] as number;

          const table = this.getTable(tableName);
          const rows = [...table.values()]
            .filter((r) => r.user_id === userId && (r.updated_at as number) > since)
            .sort((x, y) => (x.updated_at as number) - (y.updated_at as number))
            .slice(0, limit);

          results.push({ success: true, results: rows as T[] });
          continue;
        }
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
        const match = /UPDATE (\w+) SET deleted_at = \?, updated_at = \? WHERE user_id = \? AND (\w+) = \? AND updated_at <= \?/i.exec(q);
        if (match) {
          const tableName = match[1];
          const pkCol = match[2];
          const [deletedAt, updatedAt, userId, rowId, maxUpdatedAt] = a as [number, number, string, string, number];

          const table = this.getTable(tableName);
          const key = `${userId}:${rowId}`;
          const existing = table.get(key);

          if (existing && (existing.updated_at as number) <= maxUpdatedAt) {
            existing.deleted_at = deletedAt;
            existing.updated_at = updatedAt;
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
      first: parentStmt.first.bind(parentStmt),
      run: parentStmt.run.bind(parentStmt),
      all: parentStmt.all.bind(parentStmt),
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
});
