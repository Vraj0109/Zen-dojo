// D1 shim (plan 0073 A2): makes a libSQL client (Turso over HTTPS, or a local file in tests) look like the Cloudflare D1
// binding the sync Worker was written for. Only the surface the Worker uses, plus exec/raw for safety.
// No PRAGMA user_version and no BEGIN scripts (Turso refuses both over HTTPS): batch() is one atomic client.batch(..., "write").
// Type-only imports, so scripts/hub-import.mjs can load this file directly.
import type { Client, InStatement, ResultSet } from "@libsql/client";

export interface D1Meta {
  changes: number;
  last_row_id: number;
  rows_read: number;
  rows_written: number;
  duration: number;
  changed_db: boolean;
  size_after: number;
}

export interface D1Result<T = Record<string, unknown>> {
  success: true;
  results: T[];
  meta: D1Meta;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<{ count: number; duration: number }>;
}

type Bound = { sql: string; args: unknown[] };
const BOUND = Symbol("hubD1Statement");

function toArg(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
}

function toResult<T>(sql: string, rs: ResultSet): D1Result<T> {
  const cols = rs.columns;
  const results = rs.rows.map((row) => {
    const o: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      o[c] = row[i];
    });
    return o as T;
  });
  // A SELECT leaves rowsAffected at whatever the connection saw last; D1 reports 0 there.
  const isRead = /^\s*(SELECT|WITH|EXPLAIN)\b/i.test(sql) && !/\bRETURNING\b/i.test(sql);
  const changes = isRead ? 0 : rs.rowsAffected;
  return {
    success: true,
    results,
    meta: {
      changes,
      last_row_id: changes > 0 && rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0,
      rows_read: results.length,
      rows_written: changes,
      duration: 0,
      changed_db: changes > 0,
      size_after: 0,
    },
  };
}

function statement(client: Client, sql: string, args: unknown[]): D1PreparedStatement {
  const run = async <T>(): Promise<D1Result<T>> => toResult<T>(sql, await client.execute({ sql, args: args as never }));
  const stmt: D1PreparedStatement & { [BOUND]: Bound } = {
    [BOUND]: { sql, args },
    bind: (...values: unknown[]) => statement(client, sql, values.map(toArg)),
    first: async <T>(column?: string): Promise<T | null> => {
      const r = await run<Record<string, unknown>>();
      const row = r.results[0];
      if (!row) return null;
      return (column === undefined ? row : (row[column] ?? null)) as T;
    },
    run,
    all: run,
    raw: async <T>() => {
      const rs = await client.execute({ sql, args: args as never });
      return rs.rows.map((r) => Array.from(r as unknown as ArrayLike<unknown>)) as T[];
    },
  };
  return stmt;
}

/** Wraps a libSQL client as the D1 binding the Worker expects. */
export function createD1FromLibsql(client: Client): D1Database {
  return {
    prepare: (sql: string) => statement(client, sql, []),
    async batch<T>(statements: D1PreparedStatement[]) {
      if (statements.length === 0) return [];
      const stmts: InStatement[] = statements.map((s) => {
        const b = (s as unknown as { [BOUND]?: Bound })[BOUND];
        if (!b) throw new Error("hub d1: batch() got a statement that was not prepared by this database");
        return { sql: b.sql, args: b.args as never };
      });
      // "write" runs every statement in one transaction: all or nothing.
      const sets = await client.batch(stmts, "write");
      return sets.map((rs, i) => toResult<T>((stmts[i] as { sql: string }).sql, rs));
    },
    async exec(sql: string) {
      const start = Date.now();
      await client.executeMultiple(sql);
      return { count: sql.split(";").filter((s) => s.trim()).length, duration: Date.now() - start };
    },
  };
}
