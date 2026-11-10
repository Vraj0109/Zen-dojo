/**
 * Zen Dojo sync Worker (plan 0044). One endpoint: POST /api/sync.
 *
 * Table -> primary key column (D1 schema is expected to use PRIMARY KEY (user_id, <pk>)
 * or a UNIQUE index on those two columns, so ids from different users never collide):
 *
 *   table              pk column   notes
 *   -----------------  ----------  ------------------------------------------
 *   tasks              id
 *   problem_solves     id
 *   settings           key         row_id is the setting key
 *   notes              id
 *   solution_runs      id
 *   pack_progress      id
 *   practice_sessions  id
 *   timer_rows         id
 *
 * Every table also has user_id, updated_at (ms) and deleted_at (ms, tombstone).
 * Conflict rule: last write wins on updated_at; a mutation older than the stored row is ignored.
 */

// Minimal local D1 types so this file stands alone without @cloudflare/workers-types.
interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface Env {
  DB: D1Database;
  SYNC_TOKEN?: string;
  ALLOWED_ORIGIN?: string;
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
const MAX_PULL_ROWS = 5000;

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

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN.split(",").map((s) => s.trim()) : [];
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const ok = allowed.length > 0 ? allowed.includes("*") || allowed.includes(origin) : isLocal;
  const h: Record<string, string> = {
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-user-id",
    "access-control-max-age": "86400",
    vary: "origin",
  };
  if (ok) h["access-control-allow-origin"] = allowed.includes("*") ? "*" : origin;
  return h;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...cors },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Walk the longer length so timing does not reveal where the strings differ.
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function authenticate(req: Request, env: Env): string {
  const expected = env.SYNC_TOKEN;
  if (!expected) throw new HttpError(401, "Unauthorized");
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
  if (!m || !timingSafeEqual(m[1], expected)) throw new HttpError(401, "Unauthorized");
  const userId = (req.headers.get("x-user-id") ?? "").trim();
  if (!/^[A-Za-z0-9_.@:-]{1,128}$/.test(userId)) throw new HttpError(400, "Missing or invalid x-user-id");
  return userId;
}

async function readBody(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Malformed JSON");
  }
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
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new HttpError(400, "mutations must be an array");
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

function buildStatement(db: D1Database, userId: string, m: Mutation): D1PreparedStatement {
  // Table and pk names come only from the PK allowlist; column names only from COLUMNS. All values are bound.
  const pk = PK[m.table];
  if (m.action === "delete") {
    return db
      .prepare(
        `UPDATE ${m.table} SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND ${pk} = ? AND updated_at <= ?`,
      )
      .bind(m.client_timestamp, m.client_timestamp, userId, m.row_id, m.client_timestamp);
  }
  const allowed = COLUMNS[m.table];
  const cols = Object.keys(m.payload).filter((c) => allowed.includes(c));
  const insertCols = ["user_id", pk, ...cols, "updated_at", "deleted_at"];
  const values: unknown[] = [userId, m.row_id, ...cols.map((c) => bindable(m.payload[c])), m.client_timestamp, null];
  const placeholders = insertCols.map(() => "?").join(", ");
  const sets = [...cols, "updated_at", "deleted_at"].map((c) => `${c} = excluded.${c}`).join(", ");
  return db
    .prepare(
      `INSERT INTO ${m.table} (${insertCols.join(", ")}) VALUES (${placeholders}) ` +
        `ON CONFLICT (user_id, ${pk}) DO UPDATE SET ${sets} WHERE ${m.table}.updated_at <= excluded.updated_at`,
    )
    .bind(...values);
}

async function handleSync(req: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const userId = authenticate(req, env);
  const body = await readBody(req);
  if (!isObject(body)) throw new HttpError(400, "Body must be a JSON object");
  const mutations = parseMutations(body.mutations);
  const since = body.last_synced_at === undefined ? 0 : body.last_synced_at;
  if (typeof since !== "number" || !Number.isFinite(since) || since < 0) {
    throw new HttpError(400, "last_synced_at must be a non-negative number");
  }

  // Taken before the push so rows written by this request are sent back next time (harmless: LWW is idempotent).
  const serverTimestamp = Date.now();

  if (mutations.length > 0) {
    await env.DB.batch(mutations.map((m) => buildStatement(env.DB, userId, m)));
  }

  const pulls = await env.DB.batch(
    TABLES.map((t) =>
      env.DB.prepare(
        `SELECT * FROM ${t} WHERE user_id = ? AND updated_at > ? ORDER BY updated_at LIMIT ${MAX_PULL_ROWS}`,
      ).bind(userId, since),
    ),
  );
  const deltas: Record<string, unknown[]> = {};
  TABLES.forEach((t, i) => {
    deltas[t] = pulls[i].results ?? [];
  });

  return json({ ok: true, deltas, server_timestamp: serverTimestamp }, 200, cors);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname !== "/api/sync") throw new HttpError(404, "Not found");
      if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
      return await handleSync(req, env, cors);
    } catch (err) {
      if (err instanceof HttpError) return json({ ok: false, error: err.message }, err.status, cors);
      console.error("sync failed", err instanceof Error ? err.message : "unknown error");
      return json({ ok: false, error: "Internal error" }, 500, cors);
    }
  },
};
