// Abuse guard (plan 0049 B2). Rejects cheaply before D1 on the hot path:
// Rate Limiting bindings + an in-isolate ban cache. D1 is written only on ban, quota change and auth events.
import type { ExecutionContext, GuardEnv } from "./types";

export type Route = "auth" | "sync" | "other";

export const LIMITS = {
  banCacheMs: 30_000,
  failWindowMs: 10 * 60_000,
  failMax: 10, // failed token/refresh/state checks per IP per window
  strikes429Max: 5, // 429s per key per window before a ban
  banDurationsMs: [10 * 60_000, 60 * 60_000, 24 * 60 * 60_000],
  strikeDecayMs: 24 * 60 * 60_000,
  signupMax: 5,
  signupWindowMs: 60 * 60_000,
  maxLiveRows: 100_000,
  maxLiveBytes: 50 * 1024 * 1024,
  maxDailyWrites: 50_000,
  logRetentionMs: 14 * 24 * 60 * 60_000,
} as const;

const DAY_MS = 86_400_000;

// ---- in-isolate state ----
let banCache = new Map<string, number>(); // key -> banned_until (ms)
let banCacheLoadedAt = -Infinity;
let banLoad: Promise<void> | null = null;
const recentBans = new Map<string, { until: number; at: number }>();
const counters = new Map<string, { count: number; since: number }>();
let lastCleanup = -Infinity;

/** Test helper: clears all in-isolate state. */
export function resetGuardState(): void {
  banCache = new Map();
  banCacheLoadedAt = -Infinity;
  banLoad = null;
  recentBans.clear();
  counters.clear();
  lastCleanup = -Infinity;
}

export function clientIp(req: Request): string {
  const ip = req.headers.get("CF-Connecting-IP");
  return ip && ip.length <= 64 ? ip.trim() : "unknown";
}

function json(status: number, error: string, retryAfterSec?: number): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (retryAfterSec !== undefined) headers["Retry-After"] = String(Math.max(1, Math.ceil(retryAfterSec)));
  return new Response(JSON.stringify({ ok: false, error }), { status, headers });
}

async function refreshBans(env: GuardEnv, now: number): Promise<void> {
  if (now - banCacheLoadedAt < LIMITS.banCacheMs) return;
  if (!banLoad) {
    banLoad = (async () => {
      try {
        const res = await env.DB.prepare("SELECT key, banned_until FROM bans WHERE banned_until > ?")
          .bind(now)
          .all<{ key: string; banned_until: number }>();
        const next = new Map<string, number>();
        for (const r of res.results ?? []) next.set(r.key, r.banned_until);
        // keep bans made in this isolate that D1 might not show yet
        // (only very recent ones, so a manual unban in D1 still takes effect within 30 s)
        for (const [k, b] of recentBans) if (now - b.at < 5_000 && b.until > now && !next.has(k)) next.set(k, b.until);
        banCache = next;
      } catch {
        /* fail open, keep the old cache */
      } finally {
        banCacheLoadedAt = now;
        banLoad = null;
      }
    })();
  }
  await banLoad;
}

function bannedUntil(key: string, now: number): number {
  const until = banCache.get(key) ?? 0;
  return until > now ? until : 0;
}

/** Counts an event for `key` in a window; returns the new count. */
function bump(key: string, windowMs: number, now: number): number {
  const c = counters.get(key);
  if (!c || now - c.since > windowMs) {
    counters.set(key, { count: 1, since: now });
    return 1;
  }
  c.count += 1;
  return c.count;
}

async function cleanup(env: GuardEnv, now: number): Promise<void> {
  if (now - lastCleanup < 60 * 60_000) return;
  lastCleanup = now;
  await env.DB.prepare("DELETE FROM abuse_log WHERE at < ?").bind(now - LIMITS.logRetentionMs).run();
  await env.DB.prepare("DELETE FROM bans WHERE banned_until < ?").bind(now - LIMITS.strikeDecayMs).run();
}

/** Writes an escalating ban (10 min, 1 h, 24 h). Strikes reset after 24 h without an incident. */
async function applyBan(env: GuardEnv, key: string, reason: string, now: number): Promise<void> {
  let strikes = 1;
  try {
    const prev = await env.DB.prepare("SELECT strikes, banned_until FROM bans WHERE key = ?")
      .bind(key)
      .first<{ strikes: number; banned_until: number }>();
    if (prev && now - prev.banned_until < LIMITS.strikeDecayMs) strikes = prev.strikes + 1;
  } catch {
    /* use 1 */
  }
  const dur = LIMITS.banDurationsMs[Math.min(strikes, LIMITS.banDurationsMs.length) - 1];
  const until = now + dur;
  banCache.set(key, until); // effective immediately in this isolate
  recentBans.set(key, { until, at: now });
  counters.delete(`f:${key}`);
  counters.delete(`r:${key}`);
  try {
    await env.DB.prepare(
      "INSERT INTO bans (key, reason, banned_until, strikes, created_at) VALUES (?, ?, ?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET reason = excluded.reason, banned_until = excluded.banned_until, strikes = excluded.strikes",
    )
      .bind(key, reason, until, strikes, now)
      .run();
    await env.DB.prepare("INSERT INTO abuse_log (at, key, kind, detail) VALUES (?, ?, ?, ?)")
      .bind(now, key, "ban", `${reason}; strikes=${strikes}; minutes=${Math.round(dur / 60_000)}`)
      .run();
    await cleanup(env, now);
  } catch {
    /* the ban still holds in this isolate's cache */
  }
}

function rateLimited(env: GuardEnv, ctx: ExecutionContext, keys: string[], now: number, retry: number): Response {
  for (const key of keys) {
    if (bump(`r:${key}`, LIMITS.failWindowMs, now) >= LIMITS.strikes429Max) {
      ctx.waitUntil(applyBan(env, key, "repeated_429", now));
    }
  }
  return json(429, "rate_limited", retry);
}

/** Returns a Response to reject the request now, or null to continue. */
export async function guard(
  req: Request,
  env: GuardEnv,
  ctx: ExecutionContext,
  route: Route,
  userId?: string,
): Promise<Response | null> {
  const now = Date.now();
  const ip = clientIp(req);
  const ipKey = `ip:${ip}`;
  const userKey = userId ? `user:${userId}` : null;

  await refreshBans(env, now);
  const until = Math.max(bannedUntil(ipKey, now), userKey ? bannedUntil(userKey, now) : 0);
  if (until) return json(429, "temporarily_blocked", (until - now) / 1000);

  if (!(await env.RL_IP.limit({ key: ip })).success) return rateLimited(env, ctx, [ipKey], now, 60);
  if (route === "auth" && !(await env.RL_AUTH.limit({ key: ip })).success) return rateLimited(env, ctx, [ipKey], now, 60);
  if (route === "sync" && userId && !(await env.RL_SYNC.limit({ key: userId })).success) {
    return rateLimited(env, ctx, userKey ? [ipKey, userKey] : [ipKey], now, 60);
  }
  return null;
}

/** Call on a failed token / refresh-reuse / OAuth-state check. 10 in 10 minutes bans the IP. */
export async function noteAuthFailure(
  env: GuardEnv,
  ip: string,
  kind: "token" | "refresh-reuse" | "oauth-state",
): Promise<void> {
  const now = Date.now();
  const key = `ip:${ip}`;
  if (bump(`f:${key}`, LIMITS.failWindowMs, now) >= LIMITS.failMax) {
    await applyBan(env, key, `auth_failures:${kind}`, now);
  }
}

/**
 * Extra (not in the plan contract): call before creating a NEW account. Returns a 429 when this IP created
 * 5 accounts in the last hour; otherwise records the creation and returns null. Persisted in abuse_log.
 */
export async function checkAccountCreation(env: GuardEnv, ip: string): Promise<Response | null> {
  const now = Date.now();
  const key = `ip:${ip}`;
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM abuse_log WHERE key = ? AND kind = 'signup' AND at > ?")
      .bind(key, now - LIMITS.signupWindowMs)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= LIMITS.signupMax) return json(429, "rate_limited", LIMITS.signupWindowMs / 1000);
    await env.DB.prepare("INSERT INTO abuse_log (at, key, kind, detail) VALUES (?, ?, 'signup', '')").bind(now, key).run();
  } catch {
    /* fail open: sign-in must not break because logging failed */
  }
  return null;
}

/**
 * Per-user storage and daily-write quota. `mutations` and `bytes` are what this request wants to write.
 * rows_live and bytes_live are upper-bound estimates (every mutation counts as a new row); the integrator may
 * correct them with reconcileQuota(). No D1 query when the request writes nothing.
 */
export async function checkQuota(
  env: GuardEnv,
  userId: string,
  mutations: number,
  bytes: number,
): Promise<Response | null> {
  if (mutations <= 0 && bytes <= 0) return null;
  const now = Date.now();
  const day = Math.floor(now / DAY_MS);
  const retryDaily = ((day + 1) * DAY_MS - now) / 1000;
  const row = await env.DB.prepare("SELECT rows_live, bytes_live, day, writes_today FROM user_quota WHERE user_id = ?")
    .bind(userId)
    .first<{ rows_live: number; bytes_live: number; day: number; writes_today: number }>();
  const rows = row?.rows_live ?? 0;
  const live = row?.bytes_live ?? 0;
  const writes = row && row.day === day ? row.writes_today : 0;

  if (writes + mutations > LIMITS.maxDailyWrites) return json(429, "daily_quota", retryDaily);
  if (rows + mutations > LIMITS.maxLiveRows || live + bytes > LIMITS.maxLiveBytes) return json(413, "quota_exceeded");

  await env.DB.prepare(
    "INSERT INTO user_quota (user_id, rows_live, bytes_live, day, writes_today, updated_at) VALUES (?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(user_id) DO UPDATE SET rows_live = excluded.rows_live, bytes_live = excluded.bytes_live, " +
      "day = excluded.day, writes_today = excluded.writes_today, updated_at = excluded.updated_at",
  )
    .bind(userId, rows + mutations, live + bytes, day, writes + mutations, now)
    .run();
  return null;
}

/** Extra: set the true live row/byte counts (e.g. after a measured COUNT/SUM) without touching daily writes. */
export async function reconcileQuota(env: GuardEnv, userId: string, rowsLive: number, bytesLive: number): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO user_quota (user_id, rows_live, bytes_live, day, writes_today, updated_at) VALUES (?, ?, ?, 0, 0, ?) " +
      "ON CONFLICT(user_id) DO UPDATE SET rows_live = excluded.rows_live, bytes_live = excluded.bytes_live, updated_at = excluded.updated_at",
  )
    .bind(userId, rowsLive, bytesLive, Date.now())
    .run();
}
