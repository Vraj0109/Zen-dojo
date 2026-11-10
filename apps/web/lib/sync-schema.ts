import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Client } from "@libsql/client";

/**
 * Standard user tables subject to multi-tenant offline synchronization.
 */
export const USER_SYNC_TABLES = [
  "tasks",
  "problem_solves",
  "settings",
  "notes",
  "solution_runs",
  "pack_progress",
  "practice_sessions",
  "timer_rows",
] as const;

export type UserSyncTable = (typeof USER_SYNC_TABLES)[number] | (string & {});

/**
 * Drizzle schema for local offline mutation queue.
 */
export const localSyncQueue = sqliteTable("local_sync_queue", {
  id: text("id").primaryKey(),
  tableName: text("table_name").notNull(),
  rowId: text("row_id").notNull(),
  action: text("action").notNull(), // 'upsert' | 'delete'
  payload: text("payload").notNull(),
  clientTimestamp: integer("client_timestamp").notNull(),
  synced: integer("synced").notNull().default(0),
});

/**
 * Drizzle schema for user synchronization state checkpoint.
 */
export const syncState = sqliteTable("sync_state", {
  userId: text("user_id").primaryKey(),
  lastSyncedAt: integer("last_synced_at").notNull().default(0),
});

/**
 * SQL statement for creating `local_sync_queue` table.
 */
export const CREATE_LOCAL_SYNC_QUEUE_SQL = `
CREATE TABLE IF NOT EXISTS local_sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  client_timestamp INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS local_sync_queue_synced ON local_sync_queue (synced);
CREATE INDEX IF NOT EXISTS local_sync_queue_ts ON local_sync_queue (client_timestamp);
`.trim();

/**
 * SQL statement for creating `sync_state` table.
 */
export const CREATE_SYNC_STATE_SQL = `
CREATE TABLE IF NOT EXISTS sync_state (
  user_id TEXT PRIMARY KEY,
  last_synced_at INTEGER NOT NULL DEFAULT 0
);
`.trim();

/**
 * Generate ALTER TABLE statements to add sync columns:
 * - user_id TEXT NOT NULL DEFAULT 'local'
 * - updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
 * - deleted_at INTEGER
 */
export function getAddSyncColumnsSql(tableName: string): string[] {
  return [
    `ALTER TABLE ${tableName} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local'`,
    `ALTER TABLE ${tableName} ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)`,
    `ALTER TABLE ${tableName} ADD COLUMN deleted_at INTEGER`,
  ];
}

/**
 * Generate a combined migration script adding sync tracking to all user tables.
 */
export function generateSyncMigrationSql(tables: readonly string[] = USER_SYNC_TABLES): string {
  const alterStatements = tables.flatMap((t) => [
    `ALTER TABLE ${t} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local';`,
    `ALTER TABLE ${t} ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000);`,
    `ALTER TABLE ${t} ADD COLUMN deleted_at INTEGER;`,
  ]);

  return [CREATE_LOCAL_SYNC_QUEUE_SQL, CREATE_SYNC_STATE_SQL, ...alterStatements].join("\n");
}

export type AnyDbClient =
  | Client
  | { $client: Client }
  | { execute: (stmt: any) => Promise<any>; executeMultiple?: (sql: string) => Promise<any> }
  | any;

/**
 * Extract underlying executable client from Drizzle instance or raw client.
 */
export function extractClient(db: AnyDbClient): {
  execute: (stmt: any) => Promise<any>;
  executeMultiple?: (sql: string) => Promise<any>;
} {
  if (!db) {
    throw new Error("Database instance cannot be null or undefined");
  }
  if (db.$client && typeof db.$client.execute === "function") {
    return db.$client;
  }
  if (typeof db.execute === "function") {
    return db;
  }
  throw new Error("Provided database object does not provide an execute method or $client");
}

/**
 * Check if a table has the required sync columns.
 */
export async function hasSyncColumns(
  db: AnyDbClient,
  tableName: string
): Promise<{ hasUserId: boolean; hasUpdatedAt: boolean; hasDeletedAt: boolean }> {
  const client = extractClient(db);
  const info = await client.execute(`PRAGMA table_info(${tableName})`);
  const cols = new Set((info.rows ?? []).map((r: any) => String(r.name).toLowerCase()));

  return {
    hasUserId: cols.has("user_id"),
    hasUpdatedAt: cols.has("updated_at"),
    hasDeletedAt: cols.has("deleted_at"),
  };
}

/**
 * Applies the sync schema and user column migrations idempotently.
 * Missing tables will be created with primary key and sync columns.
 * Existing tables will have missing sync columns appended via ALTER TABLE.
 */
export async function applySyncSchema(
  db: AnyDbClient,
  tables: readonly string[] = USER_SYNC_TABLES
): Promise<void> {
  const client = extractClient(db);

  if (typeof client.executeMultiple === "function") {
    await client.executeMultiple(`${CREATE_LOCAL_SYNC_QUEUE_SQL}\n${CREATE_SYNC_STATE_SQL}`);
  } else {
    await client.execute(CREATE_LOCAL_SYNC_QUEUE_SQL);
    await client.execute(CREATE_SYNC_STATE_SQL);
  }

  for (const table of tables) {
    const tableCheck = await client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      args: [table],
    });

    const rows = tableCheck.rows ?? [];
    if (rows.length === 0) {
      // Create table if it doesn't exist
      await client.execute(
        `CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL DEFAULT 'local',
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
          deleted_at INTEGER
        )`
      );
      continue;
    }

    const { hasUserId, hasUpdatedAt, hasDeletedAt } = await hasSyncColumns(client, table);

    if (!hasUserId) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local'`);
    }
    if (!hasUpdatedAt) {
      await client.execute(
        `ALTER TABLE ${table} ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)`
      );
    }
    if (!hasDeletedAt) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN deleted_at INTEGER`);
    }
  }
}
