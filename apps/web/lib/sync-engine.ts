// Plan 0050: the server-side sync engine. It reads the rows that the triggers queued in `sync_dirty`, talks to the
// Worker, and writes pulled rows into the local tables. Order of a run: head check, pull, then push.
// Never log row data, tokens or account ids here: messages shown to the user are plain sentences.

import type { Client, InStatement, InValue, Row } from "@libsql/client";
import { getDb } from "./db";
import { extractClient, type AnyDbClient } from "./sync-schema";
import { SYNC_TABLE_MAP, isSyncableSettingKey, type SyncTableDef } from "./sync-triggers";

export type SyncRunResult = {
  state: "synced" | "signed-out" | "account-mismatch" | "throttled" | "error";
  pushed: number;
  pulled: number;
  message?: string;
};

type FetchFn = (path: string, init: RequestInit) => Promise<Response>;

export type RunSyncOptions = {
  db?: AnyDbClient;
  fetch?: FetchFn;
  now?: () => number;
  /** Who is signed in. Defaults to the session user (read lazily so tests can inject it). */
  getUserId?: () => Promise<string | null>;
};

type Cfg = SyncTableDef & { pk: "id" | "key" };

const CFG: readonly Cfg[] = SYNC_TABLE_MAP.map((t) => ({ ...t, pk: t.cloud === "settings" ? "key" : "id" }));
const BY_LOCAL = new Map(CFG.map((t) => [t.local, t]));
const BY_CLOUD = new Map(CFG.map((t) => [t.cloud, t]));

const BATCH_SIZE = 200;
const OVERLAP_MS = 2000;
const MAX_PAGES = 200;
const IN_CHUNK = 400;

/** Values used when a pulled row has null for a column that is NOT NULL locally. */
const DEFAULTS: Record<string, Record<string, InValue>> = {
  tasks: { date: "", scope: "", title: "", category: "", xp: 0, status: "todo" },
  problem_solves: { problem_id: "", kind: "", solved_on: "", xp: 0, source: "manual" },
  settings: { value: "" },
  problem_notes: { notes: "", code: "", language: "" },
  solution_runs: { code: "", ran_on: "", status: "", passed: 0, total: 0, failed_cases: "" },
  pack_progress: { done_on: "" },
  practice_sessions: { item_id: "", practiced_on: "", scores: "{}", score: 0, notes: "", xp: 0 },
  focus_sessions: { item_id: "", focused_on: "", minutes: 0 },
  reading_progress: { notes: "" },
  reading_custom: { item_id: "", title: "", url: "", added_on: "" },
  problem_struggles: { problem_id: "", kind: "", reason: "", logged_on: "" },
  boss_fights: { fought_on: "", results: "", notes: "" },
};

type RawClient = Pick<Client, "execute" | "batch">;

function rawClient(db: AnyDbClient): RawClient {
  const c = extractClient(db) as unknown as RawClient;
  if (typeof c.batch !== "function") throw new Error("The sync engine needs a libSQL client.");
  return c;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toValue(v: unknown): InValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return JSON.stringify(v);
}

// ---- flags ----

async function getFlag(c: RawClient, k: string): Promise<string | null> {
  const r = await c.execute({ sql: "SELECT v FROM sync_flags WHERE k = ?", args: [k] });
  const v = r.rows[0]?.v;
  return v === null || v === undefined ? null : String(v);
}

function setFlagStmt(k: string, v: string | null): InStatement {
  if (v === null) return { sql: "DELETE FROM sync_flags WHERE k = ?", args: [k] };
  return { sql: "INSERT OR REPLACE INTO sync_flags (k, v) VALUES (?, ?)", args: [k, v] };
}

async function setFlags(c: RawClient, entries: Record<string, string | null>): Promise<void> {
  await c.batch(
    Object.entries(entries).map(([k, v]) => setFlagStmt(k, v)),
    "write",
  );
}

async function countDirty(c: RawClient): Promise<number> {
  const r = await c.execute("SELECT count(*) AS n FROM sync_dirty");
  return num(r.rows[0]?.n);
}

// ---- keys ----

function splitKey(cfg: Cfg, key: string, row?: Record<string, unknown>): string[] {
  if (cfg.key === "single") return [key];
  const i = key.indexOf(":");
  const parts = i < 0 ? [key, ""] : [key.slice(0, i), key.slice(i + 1)];
  return cfg.keyCols.map((col, n) => {
    const v = row?.[col];
    return typeof v === "string" ? v : parts[n];
  });
}

function keyWhere(cfg: Cfg): string {
  return cfg.keyCols.map((c) => `${c} = ?`).join(" AND ");
}

// ---- push: mutation building ----

type Dirty = { tbl: string; row_key: string; changed_at: number; deleted: number };
type Mutation = {
  table: string;
  row_id: string;
  action: "upsert" | "delete";
  payload: Record<string, unknown>;
  client_timestamp: number;
};

async function buildMutations(c: RawClient, dirty: Dirty[]): Promise<Mutation[]> {
  const out: Mutation[] = [];
  const reads: { d: Dirty; cfg: Cfg }[] = [];
  for (const d of dirty) {
    const cfg = BY_LOCAL.get(d.tbl);
    if (!cfg) continue;
    if (cfg.local === "settings" && !isSyncableSettingKey(d.row_key)) continue;
    if (d.deleted) {
      out.push({ table: cfg.cloud, row_id: d.row_key, action: "delete", payload: {}, client_timestamp: d.changed_at });
    } else {
      reads.push({ d, cfg });
    }
  }
  if (reads.length > 0) {
    const stmts: InStatement[] = reads.map(({ d, cfg }) =>
      cfg.key === "sync_id"
        ? {
            sql: `SELECT t.* FROM ${cfg.local} t JOIN sync_ids s ON s.tbl = ? AND s.local_id = t.id WHERE s.sync_id = ?`,
            args: [cfg.local, d.row_key],
          }
        : { sql: `SELECT * FROM ${cfg.local} WHERE ${keyWhere(cfg)}`, args: splitKey(cfg, d.row_key) },
    );
    const results = await c.batch(stmts, "read");
    reads.forEach(({ d, cfg }, i) => {
      const row: Row | undefined = results[i]?.rows[0];
      if (!row) {
        // The row is gone (deleted after it was queued): tell the cloud.
        out.push({ table: cfg.cloud, row_id: d.row_key, action: "delete", payload: {}, client_timestamp: d.changed_at });
        return;
      }
      const payload: Record<string, unknown> = {};
      for (const col of cfg.cols) payload[col] = row[col] ?? null;
      out.push({ table: cfg.cloud, row_id: d.row_key, action: "upsert", payload, client_timestamp: d.changed_at });
    });
  }
  return out;
}

// ---- pull: applying rows ----

type Stamp = { updated_at: number };

async function readStamps(c: RawClient, local: string, keys: string[]): Promise<Map<string, Stamp>> {
  const map = new Map<string, Stamp>();
  for (let i = 0; i < keys.length; i += IN_CHUNK) {
    const chunk = keys.slice(i, i + IN_CHUNK);
    const r = await c.execute({
      sql: `SELECT row_key, updated_at FROM sync_stamps WHERE tbl = ? AND row_key IN (${chunk.map(() => "?").join(",")})`,
      args: [local, ...chunk],
    });
    for (const row of r.rows) map.set(String(row.row_key), { updated_at: num(row.updated_at) });
  }
  return map;
}

function rowValues(cfg: Cfg, row: Record<string, unknown>): Record<string, InValue> {
  const defs = DEFAULTS[cfg.local] ?? {};
  const out: Record<string, InValue> = {};
  for (const col of cfg.cols) {
    let v = toValue(row[col]);
    if (v === null && col in defs) v = defs[col];
    out[col] = v;
  }
  return out;
}

/** The statements for one pulled row, or null when it is skipped. */
function rowStatements(cfg: Cfg, row: Record<string, unknown>, stamps: Map<string, Stamp>, now: number): InStatement[] | null {
  const rawKey = row[cfg.pk];
  if (typeof rawKey !== "string" && typeof rawKey !== "number") return null;
  const key = String(rawKey);
  if (cfg.local === "settings" && !isSyncableSettingKey(key)) return null;
  const updatedAt = num(row.updated_at);
  const deletedAt = row.deleted_at === null || row.deleted_at === undefined ? null : num(row.deleted_at);
  const stamp = stamps.get(key);
  if (stamp && stamp.updated_at > updatedAt) return null;

  const stmts: InStatement[] = [];
  const isIdTable = cfg.key === "sync_id";

  if (deletedAt !== null) {
    if (isIdTable) {
      stmts.push({
        sql: `DELETE FROM ${cfg.local} WHERE id = (SELECT local_id FROM sync_ids WHERE tbl = ? AND sync_id = ?)`,
        args: [cfg.local, key],
      });
    } else {
      stmts.push({ sql: `DELETE FROM ${cfg.local} WHERE ${keyWhere(cfg)}`, args: splitKey(cfg, key, row) });
    }
  } else {
    const vals = rowValues(cfg, row);
    if (isIdTable) {
      const sets = cfg.cols.map((col) => `${col} = ?`).join(", ");
      const colVals = cfg.cols.map((col) => vals[col]);
      stmts.push({
        sql: `UPDATE OR IGNORE ${cfg.local} SET ${sets} WHERE id = (SELECT local_id FROM sync_ids WHERE tbl = ? AND sync_id = ?)`,
        args: [...colVals, cfg.local, key],
      });
      let collision = "";
      let collisionArgs: InValue[] = [];
      if (cfg.local === "tasks" && vals.template_key !== null) {
        // A generated task already exists on this device for the same day, scope and template: keep it and
        // record the pulled id as its id.
        const where = "date = ? AND scope = ? AND template_key = ?";
        collisionArgs = [vals.date, vals.scope, vals.template_key];
        collision = ` AND NOT EXISTS (SELECT 1 FROM tasks WHERE ${where})`;
        const oldKey = `(SELECT sync_id FROM sync_ids WHERE tbl = 'tasks' AND local_id = (SELECT id FROM tasks WHERE ${where}))`;
        const unknown = "NOT EXISTS (SELECT 1 FROM sync_ids WHERE sync_id = ?)";
        stmts.push({
          sql: `DELETE FROM sync_dirty WHERE tbl = 'tasks' AND row_key = ${oldKey} AND ${unknown}`,
          args: [...collisionArgs, key],
        });
        stmts.push({
          sql: `DELETE FROM sync_stamps WHERE tbl = 'tasks' AND row_key = ${oldKey} AND ${unknown}`,
          args: [...collisionArgs, key],
        });
        stmts.push({
          sql: `UPDATE sync_ids SET sync_id = ? WHERE tbl = 'tasks' AND local_id = (SELECT id FROM tasks WHERE ${where}) AND ${unknown}`,
          args: [key, ...collisionArgs, key],
        });
      }
      stmts.push({
        sql:
          `INSERT INTO ${cfg.local} (${cfg.cols.join(", ")}) SELECT ${cfg.cols.map(() => "?").join(", ")} ` +
          `WHERE NOT EXISTS (SELECT 1 FROM sync_ids WHERE tbl = ? AND sync_id = ?)${collision}`,
        args: [...colVals, cfg.local, key, ...collisionArgs],
      });
      stmts.push({
        sql:
          `INSERT INTO sync_ids (tbl, local_id, sync_id) SELECT ?, last_insert_rowid(), ? ` +
          `WHERE changes() > 0 AND NOT EXISTS (SELECT 1 FROM sync_ids WHERE sync_id = ?)`,
        args: [cfg.local, key, key],
      });
    } else {
      const keyVals = splitKey(cfg, key, row);
      const cols = [...cfg.keyCols];
      const values: InValue[] = [...keyVals];
      for (const col of cfg.cols) {
        if (cols.includes(col)) continue;
        cols.push(col);
        values.push(vals[col]);
      }
      if (cfg.local === "problem_notes") {
        cols.push("updated_at");
        values.push(new Date(now).toISOString());
      }
      const dataCols = cols.filter((col) => !cfg.keyCols.includes(col));
      const dataVals = values.slice(cfg.keyCols.length);
      stmts.push({
        sql: `UPDATE ${cfg.local} SET ${dataCols.map((col) => `${col} = ?`).join(", ")} WHERE ${keyWhere(cfg)}`,
        args: [...dataVals, ...keyVals],
      });
      stmts.push({
        sql:
          `INSERT INTO ${cfg.local} (${cols.join(", ")}) SELECT ${cols.map(() => "?").join(", ")} ` +
          `WHERE NOT EXISTS (SELECT 1 FROM ${cfg.local} WHERE ${keyWhere(cfg)})`,
        args: [...values, ...keyVals],
      });
    }
  }

  stmts.push({
    sql:
      "INSERT INTO sync_stamps (tbl, row_key, updated_at, deleted_at) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT (tbl, row_key) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = excluded.deleted_at",
    args: [cfg.local, key, updatedAt, deletedAt],
  });
  stmts.push({ sql: "DELETE FROM sync_dirty WHERE tbl = ? AND row_key = ?", args: [cfg.local, key] });
  return stmts;
}

const APPLYING_ON = setFlagStmt("applying", "1");
const APPLYING_OFF = setFlagStmt("applying", "0");

/** Writes one page of deltas in a single transaction with triggers silenced. Returns the number of rows applied. */
async function applyDeltas(c: RawClient, deltas: unknown, now: number): Promise<number> {
  if (!isObj(deltas)) return 0;
  const perRow: InStatement[][] = [];
  for (const [cloud, rows] of Object.entries(deltas)) {
    const cfg = BY_CLOUD.get(cloud);
    if (!cfg || !Array.isArray(rows)) continue;
    const objs = rows.filter(isObj);
    const keys = objs
      .map((r) => r[cfg.pk])
      .filter((k): k is string | number => typeof k === "string" || typeof k === "number")
      .map(String);
    const stamps = await readStamps(c, cfg.local, keys);
    for (const row of objs) {
      const s = rowStatements(cfg, row, stamps, now);
      if (s) perRow.push(s);
    }
  }
  if (perRow.length === 0) return 0;
  try {
    await c.batch([APPLYING_ON, ...perRow.flat(), APPLYING_OFF], "write");
    return perRow.length;
  } catch {
    // One bad row must not block the rest: retry row by row and skip the ones that still fail.
    let applied = 0;
    for (const stmts of perRow) {
      try {
        await c.batch([APPLYING_ON, ...stmts, APPLYING_OFF], "write");
        applied++;
      } catch {
        // skipped; never log row data
      }
    }
    return applied;
  }
}

// ---- HTTP ----

type Failure = { fail: SyncRunResult };

async function call(fetcher: FetchFn, path: string, init: RequestInit): Promise<Record<string, unknown> | Failure> {
  let res: Response;
  try {
    res = await fetcher(path, init);
  } catch {
    return { fail: { state: "error", pushed: 0, pulled: 0, message: "Could not reach the sync server." } };
  }
  if (res.status === 401) {
    return { fail: { state: "signed-out", pushed: 0, pulled: 0, message: "Your session ended. Sign in again to keep syncing." } };
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.status === 429) {
    const m = isObj(body) && typeof body.message === "string" && body.message.length < 200 ? body.message : null;
    return { fail: { state: "throttled", pushed: 0, pulled: 0, message: m ?? "Sync is busy right now. It will try again soon." } };
  }
  if (!res.ok || !isObj(body) || body.ok === false) {
    return { fail: { state: "error", pushed: 0, pulled: 0, message: `Sync failed (server answered ${res.status}).` } };
  }
  return body;
}

function isFailure(v: Record<string, unknown> | Failure): v is Failure {
  return "fail" in v && isObj((v as Failure).fail);
}

// ---- run ----

const inflight = new WeakMap<object, Promise<SyncRunResult>>();

export async function runSync(opts: RunSyncOptions = {}): Promise<SyncRunResult> {
  const db = opts.db ?? ((await getDb()) as unknown as AnyDbClient);
  const c = rawClient(db);
  const running = inflight.get(c);
  if (running) return running;
  const p = doRun(c, opts).finally(() => inflight.delete(c));
  inflight.set(c, p);
  return p;
}

async function finish(c: RawClient, r: SyncRunResult): Promise<SyncRunResult> {
  try {
    await setFlags(c, {
      state: r.state,
      last_error: r.state === "synced" ? null : (r.message ?? null),
    });
  } catch {
    // status is best effort
  }
  return r;
}

async function doRun(c: RawClient, opts: RunSyncOptions): Promise<SyncRunResult> {
  const now = opts.now ?? Date.now;
  let pushed = 0;
  let pulled = 0;
  try {
    const getUserId =
      opts.getUserId ??
      (async () => {
        const { getSession } = await import("./auth/session");
        return (await getSession())?.userId ?? null;
      });
    const userId = await getUserId();
    if (!userId) {
      return finish(c, { state: "signed-out", pushed, pulled, message: "Sign in to sync this device." });
    }
    const account = await getFlag(c, "account");
    if (!account) {
      return { state: "synced", pushed, pulled, message: "This device is not linked to an account yet." };
    }
    if (account !== userId) {
      return finish(c, {
        state: "account-mismatch",
        pushed,
        pulled,
        message: "This device is linked to another account.",
      });
    }

    const fetcher: FetchFn =
      opts.fetch ??
      (async (path, init) => {
        const { workerFetch } = await import("./auth/session");
        return workerFetch(path, init);
      });
    const withCounts = (f: SyncRunResult): SyncRunResult => ({ ...f, pushed, pulled });

    // 1. Head check: one tiny read tells us whether anything changed in the cloud.
    const headRes = await call(fetcher, "/api/sync/head", { method: "GET" });
    if (isFailure(headRes)) return finish(c, withCounts(headRes.fail));
    const head = num(headRes.head);
    const storedHeadRaw = await getFlag(c, "head");
    const needPull = storedHeadRaw === null || num(storedHeadRaw) !== head;

    // 2. Pull.
    if (needPull) {
      const cursor = num(await getFlag(c, "last_synced_at"));
      let since = Math.max(0, cursor - OVERLAP_MS);
      let lastTs = cursor;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await call(fetcher, "/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mutations: [], last_synced_at: since }),
        });
        if (isFailure(res)) return finish(c, withCounts(res.fail));
        pulled += await applyDeltas(c, res.deltas, now());
        lastTs = num(res.server_timestamp) || lastTs;
        if (res.has_more !== true) break;
        since = num(res.next_since);
      }
      await setFlags(c, { last_synced_at: String(lastTs), head: String(head) });
    }

    // 3. Push the rows that changed here.
    const dirtyRes = await c.execute("SELECT tbl, row_key, changed_at, deleted FROM sync_dirty ORDER BY changed_at, tbl, row_key");
    const dirty: Dirty[] = dirtyRes.rows.map((r) => ({
      tbl: String(r.tbl),
      row_key: String(r.row_key),
      changed_at: num(r.changed_at),
      deleted: num(r.deleted),
    }));
    for (let i = 0; i < dirty.length; i += BATCH_SIZE) {
      const chunk = dirty.slice(i, i + BATCH_SIZE);
      const mutations = await buildMutations(c, chunk);
      if (mutations.length > 0) {
        // The reply to a push carries no rows we need (a huge cursor makes it empty); the next head check pulls.
        const res = await call(fetcher, "/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mutations, last_synced_at: Number.MAX_SAFE_INTEGER }),
        });
        if (isFailure(res)) return finish(c, withCounts(res.fail));
        pushed += mutations.length;
      }
      // Clear only what has not changed since it was read: an edit during the request stays queued.
      await c.batch(
        chunk.map((d) => ({
          sql: "DELETE FROM sync_dirty WHERE tbl = ? AND row_key = ? AND changed_at = ?",
          args: [d.tbl, d.row_key, d.changed_at],
        })),
        "write",
      );
    }

    return finish(c, { state: "synced", pushed, pulled });
  } catch {
    return finish(c, { state: "error", pushed, pulled, message: "Sync stopped because of an unexpected problem. It will try again." });
  }
}

// ---- link / unlink / status ----

function accountMismatch(): Error {
  const e = new Error("account-mismatch");
  e.name = "account-mismatch";
  return e;
}

function dirtyKeyExpr(cfg: Cfg): string {
  if (cfg.key === "sync_id") return "s.sync_id";
  return cfg.keyCols.map((col) => `t.${col}`).join(" || ':' || ");
}

/** Queues every existing row of the synced tables and links this database to the account. Throws "account-mismatch". */
export async function linkAccount(userId: string, db?: AnyDbClient): Promise<{ queued: number }> {
  const c = rawClient(db ?? ((await getDb()) as unknown as AnyDbClient));
  const current = await getFlag(c, "account");
  if (current && current !== userId) throw accountMismatch();

  const now = Date.now();
  const stmts: InStatement[] = [];
  const counted: number[] = [];
  const dirtyUpsert =
    "ON CONFLICT (tbl, row_key) DO UPDATE SET changed_at = excluded.changed_at, deleted = 0";
  const stampUpsert = "ON CONFLICT (tbl, row_key) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = NULL";

  for (const cfg of CFG) {
    if (cfg.local === "settings") {
      const r = await c.execute("SELECT key FROM settings");
      for (const row of r.rows) {
        const key = String(row.key);
        if (!isSyncableSettingKey(key)) continue;
        counted.push(stmts.length);
        stmts.push({
          sql: `INSERT INTO sync_dirty (tbl, row_key, changed_at, deleted) VALUES ('settings', ?, ?, 0) ${dirtyUpsert}`,
          args: [key, now],
        });
        stmts.push({
          sql: `INSERT INTO sync_stamps (tbl, row_key, updated_at, deleted_at) VALUES ('settings', ?, ?, NULL) ${stampUpsert}`,
          args: [key, now],
        });
      }
      continue;
    }
    let from = `FROM ${cfg.local} t`;
    if (cfg.key === "sync_id") {
      stmts.push({
        sql:
          `INSERT OR IGNORE INTO sync_ids (tbl, local_id, sync_id) SELECT ?, id, lower(hex(randomblob(16))) FROM ${cfg.local} ` +
          `WHERE id NOT IN (SELECT local_id FROM sync_ids WHERE tbl = ?)`,
        args: [cfg.local, cfg.local],
      });
      from = `FROM ${cfg.local} t JOIN sync_ids s ON s.tbl = '${cfg.local}' AND s.local_id = t.id`;
    }
    const key = dirtyKeyExpr(cfg);
    counted.push(stmts.length);
    stmts.push({
      sql: `INSERT INTO sync_dirty (tbl, row_key, changed_at, deleted) SELECT '${cfg.local}', ${key}, ?, 0 ${from} WHERE 1 ${dirtyUpsert}`,
      args: [now],
    });
    stmts.push({
      sql: `INSERT INTO sync_stamps (tbl, row_key, updated_at, deleted_at) SELECT '${cfg.local}', ${key}, ?, NULL ${from} WHERE 1 ${stampUpsert}`,
      args: [now],
    });
  }
  stmts.push(setFlagStmt("account", userId));
  stmts.push(setFlagStmt("state", "idle"));
  stmts.push(setFlagStmt("last_error", null));
  const results = await c.batch(stmts, "write");
  const queued = counted.reduce((sum, i) => sum + (results[i]?.rowsAffected ?? 0), 0);
  return { queued };
}

/** Forgets the account and the queue. Your own rows stay as they are. */
export async function unlinkAccount(db?: AnyDbClient): Promise<void> {
  const c = rawClient(db ?? ((await getDb()) as unknown as AnyDbClient));
  await c.batch(
    [
      "DELETE FROM sync_dirty",
      "DELETE FROM sync_stamps",
      "DELETE FROM sync_flags WHERE k IN ('account', 'last_synced_at', 'head', 'state', 'last_error')",
    ],
    "write",
  );
}

export async function getSyncStatus(
  db?: AnyDbClient,
): Promise<{ account: string | null; state: string; lastSyncedAt: number | null; pending: number; message?: string }> {
  const c = rawClient(db ?? ((await getDb()) as unknown as AnyDbClient));
  const [account, state, last, message, pending] = await Promise.all([
    getFlag(c, "account"),
    getFlag(c, "state"),
    getFlag(c, "last_synced_at"),
    getFlag(c, "last_error"),
    countDirty(c),
  ]);
  const lastSyncedAt = last === null || num(last) === 0 ? null : num(last);
  return {
    account,
    state: state ?? "idle",
    lastSyncedAt,
    pending,
    ...(message ? { message } : {}),
  };
}
