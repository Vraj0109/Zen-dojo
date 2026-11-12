import { beforeEach, describe, expect, it } from "vitest";
import worker, { type Env, type D1Database, type D1PreparedStatement, type D1Result } from "./index";
import { signAccessToken } from "./auth/jwt";
import { resetGuardState } from "./guard/guard";

interface Row {
  user_id: string;
  public_id: string;
  data: string;
  updated_at: number;
}

/** Minimal D1 stand-in: only the public_profiles statements (everything else returns empty). */
class ProfileD1 implements D1Database {
  rows = new Map<string, Row>();
  prepare(query: string): D1PreparedStatement {
    const q = query.replace(/\s+/g, " ").trim();
    let args: unknown[] = [];
    const stmt: D1PreparedStatement = {
      bind: (...v: unknown[]) => {
        args = v;
        return stmt;
      },
      first: async <T = unknown>() => {
        if (q.startsWith("SELECT data, updated_at FROM public_profiles WHERE public_id")) {
          const r = [...this.rows.values()].find((x) => x.public_id === args[0]);
          return (r ? { data: r.data, updated_at: r.updated_at } : null) as T | null;
        }
        if (q.startsWith("SELECT public_id, updated_at FROM public_profiles WHERE user_id")) {
          const r = this.rows.get(args[0] as string);
          return (r ? { public_id: r.public_id, updated_at: r.updated_at } : null) as T | null;
        }
        if (q.startsWith("SELECT public_id FROM public_profiles WHERE user_id")) {
          const r = this.rows.get(args[0] as string);
          return (r ? { public_id: r.public_id } : null) as T | null;
        }
        return null;
      },
      run: async (): Promise<D1Result> => {
        if (q.startsWith("INSERT INTO public_profiles")) {
          const [user_id, public_id, data, updated_at] = args as [string, string, string, number];
          const ex = this.rows.get(user_id);
          // ON CONFLICT keeps the existing public_id
          this.rows.set(user_id, { user_id, public_id: ex?.public_id ?? public_id, data, updated_at });
        } else if (q.startsWith("DELETE FROM public_profiles WHERE user_id")) {
          this.rows.delete(args[0] as string);
        }
        return { success: true };
      },
      all: async <T = unknown>(): Promise<D1Result<T>> => ({ success: true, results: [] }),
    };
    return stmt;
  }
  async batch<T = Record<string, unknown>>(): Promise<D1Result<T>[]> {
    return [];
  }
}

const GOOD = {
  name: "Ada",
  level: 3,
  xp: 1200,
  streak: 4,
  bestStreak: 9,
  totalSolved: 42,
  solvedByDifficulty: { easy: 20, medium: 18, hard: 4 },
  planWeeksDone: 2,
  courses: [{ id: "pattern-two-pointers", title: "DSA: Two pointers", kind: "pattern", done: 3, total: 5, completedOn: null }],
  generatedOn: "2026-11-12",
  activeDays: 30,
  hours: 12.5,
  totalProblems: 201,
  heatmap: [[{ date: "2026-11-09", xp: 20, level: 2, future: false }]],
  badges: [{ id: "first", title: "First", description: "Solve one", earned: true, value: 1, target: 1 }],
};

let env: Env;
let db: ProfileD1;
let tokenA: string;
let tokenB: string;

const call = (method: string, path: string, token?: string, body?: unknown) =>
  worker.fetch(
    new Request(`https://sync.example${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    }),
    env,
  );

beforeEach(async () => {
  resetGuardState();
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  db = new ProfileD1();
  env = {
    DB: db,
    GITHUB_CLIENT_ID: "x",
    GITHUB_CLIENT_SECRET: "x",
    JWT_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey("jwk", kp.privateKey)),
    JWT_PUBLIC_JWK: JSON.stringify(await crypto.subtle.exportKey("jwk", kp.publicKey)),
    RL_AUTH: { limit: async () => ({ success: true }) },
    RL_SYNC: { limit: async () => ({ success: true }) },
    RL_IP: { limit: async () => ({ success: true }) },
  };
  tokenA = (await signAccessToken(env, { sub: "gh:1001", sid: "sA", adm: false })).token;
  tokenB = (await signAccessToken(env, { sub: "gh:2002", sid: "sB", adm: false })).token;
});

describe("public profile", () => {
  it("requires a token for PUT, GET and DELETE of the owner route", async () => {
    expect((await call("PUT", "/api/profile/public", undefined, { data: GOOD })).status).toBe(401);
    expect((await call("GET", "/api/profile/public")).status).toBe(401);
    expect((await call("DELETE", "/api/profile/public")).status).toBe(401);
  });

  it("stores a valid snapshot and serves it publicly under a random id", async () => {
    const put = await call("PUT", "/api/profile/public", tokenA, { data: GOOD });
    expect(put.status).toBe(200);
    const { id } = (await put.json()) as { id: string };
    expect(id).toMatch(/^[A-Za-z0-9_-]{16,40}$/);
    expect(id).not.toContain("1001");

    const res = await call("GET", `/api/public/u/${id}`); // no token
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
    expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
    const body = (await res.json()) as { ok: boolean; data: typeof GOOD };
    expect(body.data).toEqual(GOOD);
    expect(JSON.stringify(body)).not.toContain("gh:1001");
  });

  it("keeps the same public id on update and replaces the data", async () => {
    const a = (await (await call("PUT", "/api/profile/public", tokenA, { data: GOOD })).json()) as { id: string };
    const b = (await (await call("PUT", "/api/profile/public", tokenA, { data: { ...GOOD, streak: 5 } })).json()) as { id: string };
    expect(b.id).toBe(a.id);
    const pub = (await (await call("GET", `/api/public/u/${a.id}`)).json()) as { data: { streak: number } };
    expect(pub.data.streak).toBe(5);
  });

  it("rejects unknown fields (top level, nested and body)", async () => {
    for (const bad of [
      { data: { ...GOOD, email: "a@b.c" } },
      { data: { ...GOOD, courses: [{ ...GOOD.courses[0], notes: "secret" }] } },
      { data: { ...GOOD, solvedByDifficulty: { easy: 1, medium: 1, hard: 1, token: "x" } } },
      { data: GOOD, extra: 1 },
    ]) {
      const res = await call("PUT", "/api/profile/public", tokenA, bad);
      expect(res.status).toBe(400);
    }
    expect(db.rows.size).toBe(0);
  });

  it("rejects wrong types, bad dates, control characters and oversize lists", async () => {
    const bads = [
      { ...GOOD, name: "" },
      { ...GOOD, name: "x".repeat(61) },
      { ...GOOD, name: "bad\u0000name" },
      { ...GOOD, xp: -1 },
      { ...GOOD, xp: "5" },
      { ...GOOD, generatedOn: "yesterday" },
      { ...GOOD, courses: Array.from({ length: 201 }, () => GOOD.courses[0]) },
      { ...GOOD, courses: [{ ...GOOD.courses[0], kind: "other" }] },
      { ...GOOD, heatmap: [[{ date: "2026-11-09", xp: 1, level: 9, future: false }]] },
    ];
    for (const data of bads) expect((await call("PUT", "/api/profile/public", tokenA, { data })).status).toBe(400);
  });

  it("rejects malformed JSON and bodies over the size cap", async () => {
    expect((await call("PUT", "/api/profile/public", tokenA, "{nope")).status).toBe(400);
    const big = { data: { ...GOOD, courses: [], pad: "x".repeat(70_000) } };
    expect((await call("PUT", "/api/profile/public", tokenA, big)).status).toBe(413);
  });

  it("turning it off deletes the snapshot and the link then returns 404", async () => {
    const { id } = (await (await call("PUT", "/api/profile/public", tokenA, { data: GOOD })).json()) as { id: string };
    const del = await call("DELETE", "/api/profile/public", tokenA);
    expect(del.status).toBe(200);
    expect(db.rows.size).toBe(0);
    expect((await call("GET", `/api/public/u/${id}`)).status).toBe(404);
    const status = (await (await call("GET", "/api/profile/public", tokenA)).json()) as { enabled: boolean };
    expect(status.enabled).toBe(false);
  });

  it("does not let another user overwrite or delete someone else's profile", async () => {
    const { id } = (await (await call("PUT", "/api/profile/public", tokenA, { data: GOOD })).json()) as { id: string };
    const b = (await (await call("PUT", "/api/profile/public", tokenB, { data: { ...GOOD, name: "Mallory" } })).json()) as { id: string };
    expect(b.id).not.toBe(id);
    await call("DELETE", "/api/profile/public", tokenB);
    const pub = (await (await call("GET", `/api/public/u/${id}`)).json()) as { data: { name: string } };
    expect(pub.data.name).toBe("Ada");
    // a client-supplied id or user id in the body is rejected, not honoured
    expect((await call("PUT", "/api/profile/public", tokenB, { data: GOOD, id })).status).toBe(400);
  });

  it("returns 404 for unknown or malformed public ids and 405 for non-GET", async () => {
    expect((await call("GET", "/api/public/u/doesnotexist1234567")).status).toBe(404);
    expect((await call("GET", "/api/public/u/gh:1001")).status).toBe(404);
    expect((await call("POST", "/api/public/u/doesnotexist1234567")).status).toBe(405);
  });
});
