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

const READ_START = /^\s*(?:select|pragma|with|explain|values)\b/i;

export type DoClient = Client & {
  /** Runs pending migrations inside the Durable Object (once per database). */
  applyMigrations(migrations: string[]): Promise<void>;
  /** Delete-my-data: drops every table of this user's database. */
  dropAll(): Promise<{ dropped: number }>;
};

export function createDoClient(stub: UserDbStub): DoClient {
  let closed = false;
  const execute = async (stmt: InStatement) => toResultSet(await stub.exec(toWire(stmt)));
  const batch = async (stmts: InStatement[]) => (await stub.batch(stmts.map(toWire))).map(toResultSet);
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
