// Per-user hosted database on Cloudflare: the logic that runs INSIDE a SQLite-backed Durable Object (one object per
// user). It is plain TypeScript over a tiny storage interface so it can be tested in Node against a fake of
// `ctx.storage` (user-db-core.test.ts). The Durable Object class that wires it to the real storage is user-do.ts.
// Facts this relies on and the pages they were checked on: docs/hosted-architecture.md ("Durable Object storage").

/** The subset of `SqlStorageCursor` used here. */
export interface SqlCursorLike {
  columnNames: Iterable<string>;
  raw(): Iterable<unknown[]>;
  rowsWritten: number;
}

/** The subset of `ctx.storage` used here (`sql`, `transactionSync`, and the synchronous key-value API). */
export interface UserDbStorage {
  sql: { exec(query: string, ...bindings: unknown[]): SqlCursorLike };
  transactionSync<T>(fn: () => T): T;
  kv: { get(key: string): unknown; put(key: string, value: unknown): void; delete(key: string): unknown };
}

/** What crosses the Worker to Durable Object boundary (structured-cloneable). */
export interface WireResult {
  columns: string[];
  rows: unknown[][];
  rowsAffected: number;
  /** null when the statement did not insert. Numbers above 2^53 lose precision (Durable Object limitation). */
  lastInsertRowid: number | null;
}

export interface WireStatement {
  sql: string;
  args?: unknown[];
}

const VERSION_KEY = "zd_user_version";
const WRITE_START = /^\s*(?:insert|replace|update|delete)\b/i;
const INSERT_START = /^\s*(?:insert|replace)\b/i;
const VERSION_READ = /^\s*pragma\s+user_version\s*;?\s*$/i;

/** Durable Object SQL binds strings, numbers, null and ArrayBuffer only; map what libSQL callers may pass. */
export function toBinding(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (ArrayBuffer.isView(v)) return (v.buffer as ArrayBuffer).slice(v.byteOffset, v.byteOffset + v.byteLength);
  return v;
}

export class UserDbCore {
  constructor(private readonly storage: UserDbStorage) {}

  /** Number of migrations applied (what `PRAGMA user_version` is for libSQL databases). */
  schemaVersion(): number {
    const v = this.storage.kv.get(VERSION_KEY);
    return typeof v === "number" ? v : 0;
  }

  /**
   * Applies every migration from the stored version on, each together with its version bump in one transaction, so a
   * failing migration leaves the database at the previous version. Safe to call twice (runs once).
   */
  migrate(migrations: string[]): number {
    let v = this.schemaVersion();
    for (; v < migrations.length; v++) {
      const sql = migrations[v];
      this.storage.transactionSync(() => {
        this.storage.sql.exec(sql);
        this.storage.kv.put(VERSION_KEY, v + 1);
      });
    }
    return v;
  }

  private run(stmt: WireStatement): WireResult {
    if (VERSION_READ.test(stmt.sql)) {
      return { columns: ["user_version"], rows: [[this.schemaVersion()]], rowsAffected: 0, lastInsertRowid: null };
    }
    const args = (stmt.args ?? []).map(toBinding);
    const cursor = this.storage.sql.exec(stmt.sql, ...args);
    const columns = Array.from(cursor.columnNames);
    const rows = Array.from(cursor.raw());
    let rowsAffected = 0;
    let lastInsertRowid: number | null = null;
    if (columns.length === 0 && WRITE_START.test(stmt.sql)) {
      try {
        const info = Array.from(this.storage.sql.exec("SELECT changes(), last_insert_rowid()").raw())[0] ?? [];
        rowsAffected = Number(info[0] ?? 0);
        if (INSERT_START.test(stmt.sql)) lastInsertRowid = Number(info[1] ?? 0);
      } catch {
        rowsAffected = cursor.rowsWritten; // counts index rows too, but never wrong about "something changed"
      }
    }
    return { columns, rows, rowsAffected, lastInsertRowid };
  }

  /** One statement. Reads and writes outside `batch` are auto-committed by the runtime. */
  exec(stmt: WireStatement): WireResult {
    return this.run(stmt);
  }

  /** Several statements as one transaction: any failure rolls all of them back (and rethrows). */
  batch(stmts: WireStatement[]): WireResult[] {
    return this.storage.transactionSync(() => stmts.map((s) => this.run(s)));
  }

  /** A script of several statements (libSQL `executeMultiple`). Leading BEGIN and trailing COMMIT are dropped: the transaction is ours. */
  execMulti(script: string): void {
    const body = script
      .replace(/^\s*BEGIN(?:\s+(?:IMMEDIATE|DEFERRED|EXCLUSIVE))?(?:\s+TRANSACTION)?\s*;/i, "")
      .replace(/\bCOMMIT(?:\s+TRANSACTION)?\s*;?\s*$/i, "");
    this.storage.transactionSync(() => {
      this.storage.sql.exec(body);
    });
  }

  /**
   * Delete-my-data (plan 0054) for the hosted copy: drops every user table (their indexes and triggers go with them)
   * and resets the schema version, so the next request migrates a fresh database. Returns how many tables were dropped.
   */
  dropAll(): { dropped: number } {
    const names = Array.from(
      this.storage.sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").raw(),
    ).map((r) => String(r[0]));
    this.storage.transactionSync(() => {
      for (const n of names) this.storage.sql.exec(`DROP TABLE IF EXISTS "${n.replaceAll('"', '""')}"`);
      this.storage.kv.delete(VERSION_KEY);
    });
    return { dropped: names.length };
  }
}
