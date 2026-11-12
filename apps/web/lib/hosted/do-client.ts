import type { Client, InStatement, ResultSet, Row, Transaction } from "@libsql/client";
import type { WireResult, WireStatement } from "./user-db-core";

// Worker side of the per-user Durable Object database: an object with the part of the libSQL `Client` interface the
// app uses (Drizzle, the sync engine, backup, erase, adopt), backed by RPC to the user's `UserDb` Durable Object.
// Supported: execute, batch (atomic), executeMultiple, transaction (buffered, see below), `PRAGMA user_version`.
// Not supported: named arguments, reads inside `transaction()` (use `batch`), `sync()`, `migrate()`.

/** What the adapter calls on the Durable Object stub (RPC methods of `UserDb` in user-do.ts). */
export interface UserDbStub {
  exec(stmt: WireStatement): Promise<WireResult>;
  batch(stmts: WireStatement[]): Promise<WireResult[]>;
  execMulti(script: string): Promise<void>;
  schemaVersion(): Promise<number>;
  migrate(migrations: string[]): Promise<number>;
  dropAll(): Promise<{ dropped: number }>;
}

/** The slice of `DurableObjectNamespace` the app needs; the real binding satisfies it. */
export interface UserDbNamespace {
  idFromName(name: string): unknown;
  get(id: never): UserDbStub;
}

function toWire(stmt: InStatement): WireStatement {
  if (typeof stmt === "string") return { sql: stmt };
  const args = stmt.args;
  if (args && !Array.isArray(args)) throw new Error("Named arguments are not supported on the hosted database; use positional ?");
  return { sql: stmt.sql, args: args as unknown[] | undefined };
}

/** libSQL rows are arrays that also answer to their column names. */
function makeRow(columns: string[], values: unknown[]): Row {
  const row = values.slice() as unknown as Record<string, unknown>;
  columns.forEach((c, i) => {
    if (!Object.prototype.hasOwnProperty.call(row, c)) {
      Object.defineProperty(row, c, { value: values[i], enumerable: true, configurable: true, writable: true });
    }
  });
  return row as unknown as Row;
}

export function toResultSet(w: WireResult): ResultSet {
  return {
    columns: w.columns,
    columnTypes: w.columns.map(() => ""),
    rows: w.rows.map((r) => makeRow(w.columns, r)),
    rowsAffected: w.rowsAffected,
    lastInsertRowid: w.lastInsertRowid === null ? undefined : BigInt(w.lastInsertRowid),
    toJSON() {
      return { columns: this.columns, rows: this.rows.map((r) => Array.from(r)), rowsAffected: this.rowsAffected, lastInsertRowid: this.lastInsertRowid === undefined ? null : String(this.lastInsertRowid) };
    },
  };
}

/** A Durable Object allows 100 bound parameters per statement; stay under it. */
const MAX_PARAMS = 90;

/**
 * Splits a big multi-row Drizzle insert ("insert into t (a, b) values (?, ?), (?, ?), ...") into several inserts that
 * each stay under the parameter limit. Returns null when the statement is small enough or is not a plain multi-row
 * insert (it is then sent unchanged). Callers run the pieces as one atomic batch.
 */
export function splitMultiRowInsert(wire: WireStatement): WireStatement[] | null {
  const args = wire.args ?? [];
  if (args.length <= MAX_PARAMS) return null;
  const m = /^(\s*insert\s+(?:or\s+\w+\s+)?into\s+[^(]+\([^)]*\)\s*values\s*)(\([\s\S]*\))(\s*(?:on\s+conflict\b[\s\S]*|returning\b[\s\S]*)?)$/i.exec(wire.sql);
  if (!m) return null;
  const body = m[2];
  const tuples: string[] = [];
  let depth = 0;
  let quote = false;
  let start = -1;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      if (c === "'") quote = false;
      continue;
    }
    if (c === "'") quote = true;
    else if (c === "(") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === ")") {
      depth--;
      if (depth === 0) tuples.push(body.slice(start, i + 1));
    }
  }
  if (tuples.length < 2) return null;
  const counts = tuples.map((t) => (t.match(/\?/g) ?? []).length);
  if (counts.reduce((a, b) => a + b, 0) !== args.length || Math.max(...counts) > MAX_PARAMS) return null;
  const out: WireStatement[] = [];
  let i = 0;
  let argPos = 0;
  while (i < tuples.length) {
    let n = 0;
    let params = 0;
    while (i + n < tuples.length && params + counts[i + n] <= MAX_PARAMS) params += counts[i + n++];
    out.push({ sql: m[1] + tuples.slice(i, i + n).join(", ") + m[3], args: args.slice(argPos, argPos + params) });
    argPos += params;
    i += n;
  }
  return out;
}

const READ_START = /^\s*(?:select|pragma|with|explain|values)\b/i;

export type DoClient = Client & {
  /** Runs pending migrations inside the Durable Object (once per database). */
  applyMigrations(migrations: string[]): Promise<void>;
  /** Delete-my-data: drops every table of this user's database. */
  dropAll(): Promise<{ dropped: number }>;
};

export function createDoClient(stub: UserDbStub): DoClient {
  let closed = false;
  const merge = (results: WireResult[]): WireResult => {
    if (results.length === 1) return results[0];
    const last = results[results.length - 1];
    return { columns: last.columns, rows: results.flatMap((r) => r.rows), rowsAffected: results.reduce((acc, r) => acc + r.rowsAffected, 0), lastInsertRowid: last.lastInsertRowid };
  };
  // Statements to send for each original one (a big multi-row insert becomes several), then folded back to one result each.
  const batch = async (stmts: InStatement[]) => {
    const groups = stmts.map((st) => {
      const w = toWire(st);
      return splitMultiRowInsert(w) ?? [w];
    });
    const results = await stub.batch(groups.flat());
    let at = 0;
    return groups.map((g) => {
      const slice = results.slice(at, at + g.length);
      at += g.length;
      return toResultSet(merge(slice));
    });
  };
  const execute = async (stmt: InStatement) => {
    const wire = toWire(stmt);
    if (!splitMultiRowInsert(wire)) return toResultSet(await stub.exec(wire));
    return (await batch([stmt]))[0];
  };
  const executeMultiple = (script: string) => stub.execMulti(script);

  /**
   * A transaction cannot stay open across Worker to Durable Object calls. This one buffers writes and sends them as one
   * atomic batch on commit; the result of each `execute` is empty. Reading inside it throws instead of guessing.
   */
  const transaction = async (): Promise<Transaction> => {
    const queue: InStatement[] = [];
    let done = false;
    const empty = () => toResultSet({ columns: [], rows: [], rowsAffected: 0, lastInsertRowid: null });
    const enqueue = (stmt: InStatement) => {
      const sql = typeof stmt === "string" ? stmt : stmt.sql;
      if (READ_START.test(sql)) throw new Error("Reads inside a hosted transaction are not supported; use batch() or read before it");
      queue.push(stmt);
    };
    const tx: Transaction = {
      execute: async (stmt) => {
        enqueue(stmt);
        return empty();
      },
      batch: async (stmts) => {
        stmts.forEach(enqueue);
        return stmts.map(empty);
      },
      executeMultiple: async (sql) => {
        queue.push(sql);
      },
      commit: async () => {
        if (done) return;
        done = true;
        if (queue.length) await batch(queue);
      },
      rollback: async () => {
        done = true;
        queue.length = 0;
      },
      close: () => {
        done = true;
      },
      get closed() {
        return done;
      },
    } as Transaction;
    return tx;
  };

  const client = {
    execute,
    batch,
    executeMultiple,
    transaction,
    migrate: async (stmts: InStatement[]) => batch(stmts),
    sync: async () => undefined,
    close: () => {
      closed = true;
    },
    get closed() {
      return closed;
    },
    protocol: "http",
    async applyMigrations(migrations: string[]) {
      if ((await stub.schemaVersion()) < migrations.length) await stub.migrate(migrations);
    },
    dropAll: () => stub.dropAll(),
  };
  return client as unknown as DoClient;
}
