/**
 * Zen Dojo sync Worker (plan 0049).
 * Handles authentication routes (/auth/*, /.well-known/jwks.json) and /api/sync.
 */

import { handleAuth, verifyAccessToken } from "./auth/routes";
import { guard, checkQuota, noteAuthFailure, checkAccountCreation, clientIp, type Route } from "./guard/guard";
import { checkCors, readBodyLimited, securityHeaders } from "./guard/headers";
import type { RateLimiter } from "./guard/types";

export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_PRIVATE_JWK: string;
  JWT_PUBLIC_JWK: string;
  ADMIN_USER_IDS?: string;
  ALLOWED_REDIRECTS?: string;
  ALLOWED_ORIGIN?: string;
  RL_AUTH: RateLimiter;
  RL_SYNC: RateLimiter;
  RL_IP: RateLimiter;
}

type Action = "upsert" | "delete";
interface Mutation {
  table: string;
  row_id: string;
  action: Action;
  payload: Record<string, unknown>;
  client_timestamp: number;
}

const MAX_BODY_BYTES = 1_000_000;
const MAX_MUTATIONS = 500;
const PULL_LIMIT = 2000;

const PK: Record<string, string> = {
  tasks: "id",
  problem_solves: "id",
  settings: "key",
  notes: "id",
  solution_runs: "id",
  pack_progress: "id",
  practice_sessions: "id",
  timer_rows: "id",
};

// Writable data columns per table (never includes user_id, updated_at, deleted_at, or the pk).
const COLUMNS: Record<string, readonly string[]> = {
  tasks: ["date", "scope", "template_key", "title", "category", "xp", "minutes", "status", "done_on"],
  problem_solves: ["problem_id", "kind", "solved_on", "xp", "source"],
  settings: ["value"],
  notes: ["problem_id", "notes", "code", "language"],
  solution_runs: ["problem_id", "lang", "code", "ran_on", "status", "passed", "total", "failed_cases"],
  pack_progress: ["pack_id", "item_id", "done_on"],
  practice_sessions: ["item_id", "practiced_on", "minutes", "scores", "score", "notes", "link", "xp"],
  timer_rows: ["item_id", "focused_on", "minutes"],
};

const TABLES = Object.keys(PK);

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function applyHeaders(res: Response, pathname: string, corsHeaders?: Headers): Response {
  const h = securityHeaders(pathname, res.headers);
  if (corsHeaders) {
    corsHeaders.forEach((val, key) => {
      h.set(key, val);
    });
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: h,
  });
}

function json(body: unknown, status: number, pathname: string, corsHeaders?: Headers): Response {
  const h = securityHeaders(pathname, corsHeaders);
  h.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), {
    status,
    headers: h,
  });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function bindable(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return JSON.stringify(v);
}

function parseMutations(raw: unknown): Mutation[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new HttpError(400, "mutations_must_be_array");
  if (raw.length > MAX_MUTATIONS) throw new HttpError(413, `At most ${MAX_MUTATIONS} mutations per request`);
  return raw.map((m: unknown, i: number): Mutation => {
    if (!isObject(m)) throw new HttpError(400, `mutations[${i}] must be an object`);
    const { table, row_id, action, payload, client_timestamp } = m;
    if (typeof table !== "string" || !Object.prototype.hasOwnProperty.call(PK, table)) {
      throw new HttpError(400, `mutations[${i}]: unknown table`);
    }
    if (typeof row_id !== "string" && typeof row_id !== "number") {
      throw new HttpError(400, `mutations[${i}]: row_id required`);
    }
    if (action !== "upsert" && action !== "delete") {
      throw new HttpError(400, `mutations[${i}]: action must be upsert or delete`);
    }
    if (typeof client_timestamp !== "number" || !Number.isFinite(client_timestamp) || client_timestamp < 0) {
      throw new HttpError(400, `mutations[${i}]: client_timestamp must be a number`);
    }
    let body: Record<string, unknown> = {};
    if (typeof payload === "string") {
      try {
        const parsed: unknown = JSON.parse(payload);
        if (isObject(parsed)) body = parsed;
      } catch {
        throw new HttpError(400, `mutations[${i}]: payload is not valid JSON`);
      }
    } else if (isObject(payload)) {
      body = payload;
    } else if (payload !== undefined && payload !== null) {
      throw new HttpError(400, `mutations[${i}]: payload must be an object`);
    }
    return { table, row_id: String(row_id), action, payload: body, client_timestamp: Math.floor(client_timestamp) };
  });
}

function buildStatement(db: D1Database, userId: string, m: Mutation, syncedAt: number): D1PreparedStatement {
  const pk = PK[m.table];
  if (m.action === "delete") {
    return db
      .prepare(
        `UPDATE ${m.table} SET deleted_at = ?, updated_at = ?, synced_at = ? WHERE user_id = ? AND ${pk} = ? AND updated_at <= ?`,
      )
      .bind(m.client_timestamp, m.client_timestamp, syncedAt, userId, m.row_id, m.client_timestamp);
  }
  const allowed = COLUMNS[m.table];
  const cols = Object.keys(m.payload).filter((c) => allowed.includes(c));
  const insertCols = ["user_id", pk, ...cols, "updated_at", "deleted_at", "synced_at"];
  const values: unknown[] = [
    userId,
    m.row_id,
    ...cols.map((c) => bindable(m.payload[c])),
    m.client_timestamp,
    null,
    syncedAt,
  ];
  const placeholders = insertCols.map(() => "?").join(", ");
  const sets = [...cols, "updated_at", "deleted_at", "synced_at"].map((c) => `${c} = excluded.${c}`).join(", ");
  return db
    .prepare(
      `INSERT INTO ${m.table} (${insertCols.join(", ")}) VALUES (${placeholders}) ` +
        `ON CONFLICT (user_id, ${pk}) DO UPDATE SET ${sets} WHERE ${m.table}.updated_at <= excluded.updated_at`,
    )
    .bind(...values);
}

function headStatement(db: D1Database, userId: string, head: number): D1PreparedStatement {
  return db
    .prepare(
      "INSERT INTO sync_heads (user_id, head) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET head = MAX(sync_heads.head, excluded.head)",
    )
    .bind(userId, head);
}

/** Verifies the Bearer token and applies the per-user guard. Returns the user id or a ready response. */
async function authenticate(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string,
  corsHeaders: Headers,
): Promise<{ userId: string } | { reject: Response }> {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9._-]+)$/i.exec(authHeader);
  const token = match ? match[1] : null;
  const claims = token ? await verifyAccessToken(token, env) : null;
  if (!claims) {
    await noteAuthFailure(env, clientIp(req), "token");
    return { reject: json({ ok: false, error: "unauthorized" }, 401, pathname, corsHeaders) };
  }
  const syncGuardReject = await guard(req, env, ctx, "sync", claims.sub);
  if (syncGuardReject) {
    return { reject: applyHeaders(syncGuardReject, pathname, corsHeaders) };
  }
  return { userId: claims.sub };
}

async function handleHead(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string,
  corsHeaders: Headers,
): Promise<Response> {
  const auth = await authenticate(req, env, ctx, pathname, corsHeaders);
  if ("reject" in auth) return auth.reject;
  // One read of one row; no writes.
  const row = await env.DB.prepare("SELECT head FROM sync_heads WHERE user_id = ?")
    .bind(auth.userId)
    .first<{ head: number }>();
  const head = row && typeof row.head === "number" ? row.head : 0;
  return json({ ok: true, head }, 200, pathname, corsHeaders);
}

async function handleSync(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string,
  corsHeaders: Headers,
): Promise<Response> {
  // 1-2. Verify the Bearer token, then the per-user rate limit and ban check
  const auth = await authenticate(req, env, ctx, pathname, corsHeaders);
  if ("reject" in auth) return auth.reject;
  const userId = auth.userId;

  // 3. Read body bounded
  const bodyRes = await readBodyLimited(req, MAX_BODY_BYTES);
  if (!bodyRes.ok) {
    const status = bodyRes.reason === "too_large" ? 413 : 400;
    const error = bodyRes.reason === "too_large" ? "request_body_too_large" : "unreadable_body";
    return json({ ok: false, error }, status, pathname, corsHeaders);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyRes.text);
  } catch {
    return json({ ok: false, error: "malformed_json" }, 400, pathname, corsHeaders);
  }
  if (!isObject(body)) {
    return json({ ok: false, error: "body_must_be_object" }, 400, pathname, corsHeaders);
  }

  const mutations = parseMutations(body.mutations);
  const since = body.last_synced_at === undefined ? 0 : body.last_synced_at;
  if (typeof since !== "number" || !Number.isFinite(since) || since < 0) {
    return json({ ok: false, error: "invalid_last_synced_at" }, 400, pathname, corsHeaders);
  }

  // 4. Quota check
  const quotaReject = await checkQuota(env, userId, mutations.length, bodyRes.bytes.byteLength);
  if (quotaReject) {
    return applyHeaders(quotaReject, pathname, corsHeaders);
  }

  // 5. Execute mutations. Every written row gets synced_at = this request's server time, and the user's head is
  // raised to the same value in the same batch. serverTimestamp is read after the batch has run.
  const syncedAt = Date.now();
  if (mutations.length > 0) {
    await env.DB.batch([
      ...mutations.map((m) => buildStatement(env.DB, userId, m, syncedAt)),
      headStatement(env.DB, userId, syncedAt),
    ]);
  }
  const serverTimestamp = Math.max(Date.now(), syncedAt);

  // 6. Pull rows with pagination
  const pulls = await env.DB.batch(
    TABLES.map((t) =>
      env.DB.prepare(
        `SELECT * FROM ${t} WHERE user_id = ? AND synced_at > ? ORDER BY synced_at ASC LIMIT ${PULL_LIMIT + 1}`,
      ).bind(userId, since),
    ),
  );

  let hasMore = false;
  const truncatedCursors: number[] = [];
  const deltas: Record<string, unknown[]> = {};

  TABLES.forEach((t, i) => {
    const rows = (pulls[i]?.results ?? []) as Array<Record<string, unknown>>;
    if (rows.length > PULL_LIMIT) {
      hasMore = true;
      const pageRows = rows.slice(0, PULL_LIMIT);
      deltas[t] = pageRows;
      const last = pageRows[pageRows.length - 1];
      if (last && typeof last.synced_at === "number") {
        truncatedCursors.push(last.synced_at);
      }
    } else {
      deltas[t] = rows;
    }
  });

  // Rows of one push share a synced_at, so resume one ms early (re-sending a row is harmless) unless that makes no progress.
  let nextSince = serverTimestamp;
  if (hasMore && truncatedCursors.length > 0) {
    const lowest = Math.min(...truncatedCursors);
    nextSince = lowest - 1 > since ? lowest - 1 : lowest;
  }

  return json(
    {
      ok: true,
      deltas,
      server_timestamp: serverTimestamp,
      has_more: hasMore,
      next_since: nextSince,
    },
    200,
    pathname,
    corsHeaders,
  );
}

const DELETE_LIMIT = 3;
const DELETE_WINDOW_MS = 3_600_000;

/** POST /api/account/delete-data: removes the caller's cloud rows (scope "data") or also the account (scope "account"). */
async function handleDeleteData(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string,
  corsHeaders: Headers,
): Promise<Response> {
  const auth = await authenticate(req, env, ctx, pathname, corsHeaders);
  if ("reject" in auth) return auth.reject;
  const userId = auth.userId;

  const bodyRes = await readBodyLimited(req, 4_096);
  if (!bodyRes.ok) {
    return json({ ok: false, error: "unreadable_body" }, bodyRes.reason === "too_large" ? 413 : 400, pathname, corsHeaders);
  }
  let body: unknown;
  try {
    body = JSON.parse(bodyRes.text);
  } catch {
    return json({ ok: false, error: "malformed_json" }, 400, pathname, corsHeaders);
  }
  if (!isObject(body) || (body.scope !== "data" && body.scope !== "account") || body.confirm !== "DELETE") {
    return json({ ok: false, error: 'Send {"scope":"data"|"account","confirm":"DELETE"}.' }, 400, pathname, corsHeaders);
  }
  const scope = body.scope;

  // At most 3 successful calls per user per hour, counted in abuse_log (a security record that is never deleted here).
  const key = `user:${userId}`;
  const now = Date.now();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n, MIN(at) AS oldest FROM abuse_log WHERE key = ? AND kind = 'delete-data' AND at > ?",
  )
    .bind(key, now - DELETE_WINDOW_MS)
    .first<{ n: number; oldest: number | null }>();
  if (recent && recent.n >= DELETE_LIMIT) {
    const retry = Math.max(1, Math.ceil(((recent.oldest ?? now) + DELETE_WINDOW_MS - now) / 1000));
    const res = json({ ok: false, error: "rate_limited" }, 429, pathname, corsHeaders);
    res.headers.set("Retry-After", String(retry));
    return res;
  }

  const targets: Array<[string, string]> = [
    ...TABLES.map((t): [string, string] => [t, "user_id"]),
    ["sync_heads", "user_id"],
    ["user_quota", "user_id"],
  ];
  if (scope === "account") targets.push(["sessions", "user_id"], ["users", "id"]);
  const results = await env.DB.batch(
    targets.map(([table, col]) => env.DB.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).bind(userId)),
  );
  const deleted: Record<string, number> = {};
  targets.forEach(([table], i) => {
    deleted[table] = results[i]?.meta?.changes ?? 0;
  });

  await env.DB.prepare("INSERT INTO abuse_log (at, key, kind, detail) VALUES (?, ?, ?, ?)")
    .bind(now, key, "delete-data", scope)
    .run();

  return json({ ok: true, deleted }, 200, pathname, corsHeaders);
}

export default {
  async fetch(req: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const executionCtx: ExecutionContext = ctx ?? {
      waitUntil(p: Promise<unknown>) {
        p.catch(() => {});
      },
    };

    const url = new URL(req.url);
    const pathname = url.pathname;
    const cors = checkCors(req, env.ALLOWED_ORIGIN);

    // 1. CORS Preflight
    if (req.method === "OPTIONS") {
      if (!cors.allowed) return new Response(null, { status: 403 });
      const h = securityHeaders(pathname, cors.headers);
      return new Response(null, { status: 204, headers: h });
    }

    // 2. Initial Guard check (IP rate limits, bans)
    let route: Route = "other";
    if (pathname.startsWith("/auth/") || pathname === "/.well-known/jwks.json") {
      route = "auth";
    } else if (pathname === "/api/sync" || pathname === "/api/sync/head" || pathname === "/api/account/delete-data") {
      route = "sync";
    }

    const guardReject = await guard(req, env, executionCtx, route);
    if (guardReject) {
      return applyHeaders(guardReject, pathname, cors.headers);
    }

    // 3. Auth routes & JWKS
    if (pathname.startsWith("/auth/") || pathname === "/.well-known/jwks.json") {
      const authRes = await handleAuth(req, env, executionCtx, { noteAuthFailure, checkAccountCreation });
      if (authRes) {
        return applyHeaders(authRes, pathname, cors.headers);
      }
      return json({ ok: false, error: "not_found" }, 404, pathname, cors.headers);
    }

    // 4. API Sync route
    if (pathname === "/api/sync/head") {
      if (req.method !== "GET") {
        return json({ ok: false, error: "method_not_allowed" }, 405, pathname, cors.headers);
      }
      try {
        return await handleHead(req, env, executionCtx, pathname, cors.headers);
      } catch {
        return json({ ok: false, error: "internal_error" }, 500, pathname, cors.headers);
      }
    }

    if (pathname === "/api/account/delete-data") {
      if (req.method !== "POST") {
        return json({ ok: false, error: "method_not_allowed" }, 405, pathname, cors.headers);
      }
      try {
        return await handleDeleteData(req, env, executionCtx, pathname, cors.headers);
      } catch {
        return json({ ok: false, error: "internal_error" }, 500, pathname, cors.headers);
      }
    }

    if (pathname !== "/api/sync") {
      return json({ ok: false, error: "not_found" }, 404, pathname, cors.headers);
    }

    if (req.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405, pathname, cors.headers);
    }

    try {
      return await handleSync(req, env, executionCtx, pathname, cors.headers);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ ok: false, error: err.message }, err.status, pathname, cors.headers);
      }
      return json({ ok: false, error: "internal_error" }, 500, pathname, cors.headers);
    }
  },
};
