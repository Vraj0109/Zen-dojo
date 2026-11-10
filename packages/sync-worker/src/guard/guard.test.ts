import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkAccountCreation, checkQuota, clientIp, guard, noteAuthFailure, resetGuardState } from "./guard";
import type { GuardEnv } from "./types";

type Ban = { key: string; reason: string; banned_until: number; strikes: number };

function fakeEnv(limits: { ip?: boolean; auth?: boolean; sync?: boolean } = {}) {
  const bans = new Map<string, Ban>();
  const quota = new Map<string, { rows_live: number; bytes_live: number; day: number; writes_today: number }>();
  const log: { at: number; key: string; kind: string; detail: string }[] = [];
  const state = { queries: 0, allow: { ip: true, auth: true, sync: true, ...limits } };

  const prepare = (sql: string) => {
    let args: unknown[] = [];
    const stmt = {
      bind(...v: unknown[]) {
        args = v;
        return stmt;
      },
      async first<T>() {
        state.queries++;
        if (sql.includes("FROM bans")) return (bans.get(args[0] as string) ?? null) as T | null;
        if (sql.includes("FROM user_quota")) return (quota.get(args[0] as string) ?? null) as T | null;
        if (sql.includes("COUNT(*)")) {
          const n = log.filter((l) => l.key === args[0] && l.kind === "signup" && l.at > (args[1] as number)).length;
          return { n } as T;
        }
        return null;
      },
      async all<T>() {
        state.queries++;
        const now = args[0] as number;
        return { results: [...bans.values()].filter((b) => b.banned_until > now) as T[] };
      },
      async run() {
        state.queries++;
        if (sql.startsWith("INSERT INTO bans")) {
          const [key, reason, until, strikes] = args as [string, string, number, number];
          bans.set(key, { key, reason, banned_until: until, strikes });
        } else if (sql.startsWith("INSERT INTO abuse_log")) {
          if (sql.includes("'signup'")) log.push({ at: args[0] as number, key: args[1] as string, kind: "signup", detail: "" });
          else log.push({ at: args[0] as number, key: args[1] as string, kind: args[2] as string, detail: args[3] as string });
        } else if (sql.startsWith("INSERT INTO user_quota")) {
          const [id, rows, bytes, day, writes] = args as [string, number, number, number, number];
          quota.set(id, { rows_live: rows, bytes_live: bytes, day, writes_today: writes });
        } else if (sql.startsWith("DELETE FROM abuse_log")) {
          for (let i = log.length - 1; i >= 0; i--) if (log[i].at < (args[0] as number)) log.splice(i, 1);
        }
        return {};
      },
    };
    return stmt;
  };

  const limiter = (key: "ip" | "auth" | "sync") => ({
    limit: async (_o: { key: string }) => ({ success: state.allow[key] }),
  });
  const env: GuardEnv = { DB: { prepare } as GuardEnv["DB"], RL_AUTH: limiter("auth"), RL_SYNC: limiter("sync"), RL_IP: limiter("ip") };
  return { env, bans, quota, log, state };
}

const ctx = () => {
  const pending: Promise<unknown>[] = [];
  return { waitUntil: (p: Promise<unknown>) => void pending.push(p), flush: () => Promise.all(pending) };
};
const req = (ip = "1.2.3.4") => new Request("https://w.example/auth/x", { headers: { "CF-Connecting-IP": ip } });

beforeEach(() => {
  resetGuardState();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("clientIp", () => {
  it("reads CF-Connecting-IP", () => {
    expect(clientIp(req("9.9.9.9"))).toBe("9.9.9.9");
    expect(clientIp(new Request("https://x/"))).toBe("unknown");
  });
});

describe("rate limits", () => {
  it("passes when all limiters allow", async () => {
    const { env } = fakeEnv();
    expect(await guard(req(), env, ctx(), "auth")).toBeNull();
  });
  it("auth route: RL_AUTH exceed gives 429 with Retry-After and a generic body", async () => {
    const { env } = fakeEnv({ auth: false });
    const res = await guard(req(), env, ctx(), "auth");
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("60");
    expect(await res?.json()).toEqual({ ok: false, error: "rate_limited" });
  });
  it("auth limiter is not applied to the sync route, sync limiter is per user", async () => {
    const { env } = fakeEnv({ auth: false });
    expect(await guard(req(), env, ctx(), "sync", "gh:1")).toBeNull();
    const s = fakeEnv({ sync: false });
    expect((await guard(req(), s.env, ctx(), "sync", "gh:1"))?.status).toBe(429);
    expect(await guard(req(), s.env, ctx(), "other")).toBeNull();
  });
  it("any route: RL_IP exceed gives 429", async () => {
    const { env } = fakeEnv({ ip: false });
    for (const r of ["auth", "sync", "other"] as const) {
      const res = await guard(req(), env, ctx(), r, "gh:1");
      expect(res?.status).toBe(429);
      expect(res?.headers.get("Retry-After")).toBeTruthy();
    }
  });
});

describe("repeated 429s escalate to a ban", () => {
  it("5 rate-limited requests in 10 minutes ban the IP for 10 minutes, then 1 h, then 24 h", async () => {
    const { env, bans } = fakeEnv({ ip: false });
    const c = ctx();
    for (let i = 0; i < 5; i++) await guard(req(), env, c, "other");
    await c.flush();
    expect(bans.get("ip:1.2.3.4")?.strikes).toBe(1);
    expect(bans.get("ip:1.2.3.4")!.banned_until - Date.now()).toBe(10 * 60_000);

    vi.advanceTimersByTime(11 * 60_000);
    resetGuardState();
    for (let i = 0; i < 5; i++) await guard(req(), env, c, "other");
    await c.flush();
    expect(bans.get("ip:1.2.3.4")?.strikes).toBe(2);
    expect(bans.get("ip:1.2.3.4")!.banned_until - Date.now()).toBe(60 * 60_000);

    vi.advanceTimersByTime(61 * 60_000);
    resetGuardState();
    for (let i = 0; i < 5; i++) await guard(req(), env, c, "other");
    await c.flush();
    expect(bans.get("ip:1.2.3.4")?.strikes).toBe(3);
    expect(bans.get("ip:1.2.3.4")!.banned_until - Date.now()).toBe(24 * 60 * 60_000);
  });
  it("strikes decay after 24 h without an incident", async () => {
    const { env, bans } = fakeEnv();
    bans.set("ip:1.2.3.4", { key: "ip:1.2.3.4", reason: "x", banned_until: Date.now() - 25 * 3_600_000, strikes: 3 });
    for (let i = 0; i < 10; i++) await noteAuthFailure(env, "1.2.3.4", "token");
    expect(bans.get("ip:1.2.3.4")?.strikes).toBe(1);
  });
});

describe("failed auth checks", () => {
  it("9 failures do not ban, the 10th bans for 10 minutes and logs it", async () => {
    const { env, bans, log } = fakeEnv();
    for (let i = 0; i < 9; i++) await noteAuthFailure(env, "5.5.5.5", "oauth-state");
    expect(bans.size).toBe(0);
    await noteAuthFailure(env, "5.5.5.5", "refresh-reuse");
    expect(bans.get("ip:5.5.5.5")!.banned_until - Date.now()).toBe(10 * 60_000);
    expect(log.some((l) => l.kind === "ban" && l.key === "ip:5.5.5.5")).toBe(true);
    const res = await guard(req("5.5.5.5"), env, ctx(), "auth");
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await res?.json()).error).toBe("temporarily_blocked");
  });
  it("failures outside the 10 minute window do not add up", async () => {
    const { env, bans } = fakeEnv();
    for (let i = 0; i < 9; i++) await noteAuthFailure(env, "6.6.6.6", "token");
    vi.advanceTimersByTime(11 * 60_000);
    await noteAuthFailure(env, "6.6.6.6", "token");
    expect(bans.size).toBe(0);
  });
});

describe("ban cache", () => {
  it("a banned IP costs zero D1 queries once the cache is warm", async () => {
    const { env, bans, state } = fakeEnv();
    bans.set("ip:7.7.7.7", { key: "ip:7.7.7.7", reason: "x", banned_until: Date.now() + 600_000, strikes: 1 });
    expect((await guard(req("7.7.7.7"), env, ctx(), "auth"))?.status).toBe(429); // warms the cache (1 query)
    const before = state.queries;
    for (let i = 0; i < 50; i++) expect((await guard(req("7.7.7.7"), env, ctx(), "sync", "gh:1"))?.status).toBe(429);
    expect(state.queries).toBe(before);
    // clean IPs also cost nothing while warm
    expect(await guard(req("8.8.8.8"), env, ctx(), "other")).toBeNull();
    expect(state.queries).toBe(before);
  });
  it("refreshes at most every 30 s and picks up manual unbans", async () => {
    const { env, bans, state } = fakeEnv();
    bans.set("ip:7.7.7.7", { key: "ip:7.7.7.7", reason: "x", banned_until: Date.now() + 3_600_000, strikes: 1 });
    await guard(req("7.7.7.7"), env, ctx(), "other");
    expect(state.queries).toBe(1);
    bans.clear();
    vi.advanceTimersByTime(20_000);
    expect((await guard(req("7.7.7.7"), env, ctx(), "other"))?.status).toBe(429);
    expect(state.queries).toBe(1);
    vi.advanceTimersByTime(11_000);
    expect(await guard(req("7.7.7.7"), env, ctx(), "other")).toBeNull();
    expect(state.queries).toBe(2);
  });
  it("a user ban rejects the user on the sync route", async () => {
    const { env, bans } = fakeEnv();
    bans.set("user:gh:9", { key: "user:gh:9", reason: "x", banned_until: Date.now() + 600_000, strikes: 1 });
    expect((await guard(req(), env, ctx(), "sync", "gh:9"))?.status).toBe(429);
    expect(await guard(req(), env, ctx(), "sync", "gh:10")).toBeNull();
  });
});

describe("account creation limit", () => {
  it("allows 5 per hour per IP, the 6th is 429, other IPs and later hours are fine", async () => {
    const { env } = fakeEnv();
    for (let i = 0; i < 5; i++) expect(await checkAccountCreation(env, "2.2.2.2")).toBeNull();
    const res = await checkAccountCreation(env, "2.2.2.2");
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("3600");
    expect(await checkAccountCreation(env, "3.3.3.3")).toBeNull();
    vi.advanceTimersByTime(61 * 60_000);
    expect(await checkAccountCreation(env, "2.2.2.2")).toBeNull();
  });
});

describe("quota", () => {
  it("writes nothing and queries nothing for an empty request", async () => {
    const { env, state } = fakeEnv();
    expect(await checkQuota(env, "gh:1", 0, 0)).toBeNull();
    expect(state.queries).toBe(0);
  });
  it("counts writes and bytes", async () => {
    const { env, quota } = fakeEnv();
    expect(await checkQuota(env, "gh:1", 10, 1000)).toBeNull();
    expect(await checkQuota(env, "gh:1", 5, 500)).toBeNull();
    expect(quota.get("gh:1")).toMatchObject({ rows_live: 15, bytes_live: 1500, writes_today: 15 });
  });
  it("100,000 live rows: overflow is 413 quota_exceeded", async () => {
    const { env, quota } = fakeEnv();
    const day = Math.floor(Date.now() / 86_400_000);
    quota.set("gh:1", { rows_live: 99_990, bytes_live: 0, day, writes_today: 0 });
    expect(await checkQuota(env, "gh:1", 10, 1)).toBeNull();
    const res = await checkQuota(env, "gh:1", 1, 1);
    expect(res?.status).toBe(413);
    expect(await res?.json()).toEqual({ ok: false, error: "quota_exceeded" });
  });
  it("50 MB payload: overflow is 413 quota_exceeded", async () => {
    const { env, quota } = fakeEnv();
    quota.set("gh:1", { rows_live: 1, bytes_live: 50 * 1024 * 1024 - 10, day: 0, writes_today: 0 });
    expect(await checkQuota(env, "gh:1", 1, 10)).toBeNull();
    expect((await checkQuota(env, "gh:1", 1, 1))?.status).toBe(413);
  });
  it("50,000 writes per UTC day: overflow is 429 daily_quota with Retry-After, resets next UTC day", async () => {
    const { env, quota } = fakeEnv();
    const day = Math.floor(Date.now() / 86_400_000);
    quota.set("gh:1", { rows_live: 10, bytes_live: 10, day, writes_today: 49_999 });
    expect(await checkQuota(env, "gh:1", 1, 1)).toBeNull();
    const res = await checkQuota(env, "gh:1", 1, 1);
    expect(res?.status).toBe(429);
    expect((await res?.json()).error).toBe("daily_quota");
    expect(Number(res?.headers.get("Retry-After"))).toBe(12 * 3600); // noon UTC -> midnight
    vi.advanceTimersByTime(13 * 3600_000);
    expect(await checkQuota(env, "gh:1", 1, 1)).toBeNull();
    expect(quota.get("gh:1")?.writes_today).toBe(1);
  });
});
