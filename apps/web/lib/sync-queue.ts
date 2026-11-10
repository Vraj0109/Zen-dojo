import { randomUUID } from "node:crypto";
import { extractClient, type AnyDbClient } from "./sync-schema";

export type MutationAction = "upsert" | "delete";

export interface RecordMutationOptions {
  tableName?: string;
  table_name?: string;
  rowId?: string | number;
  row_id?: string | number;
  action: MutationAction;
  payload?: Record<string, unknown> | string | null;
  clientTimestamp?: number;
  client_timestamp?: number;
  id?: string;
  userId?: string;
}

export interface SyncQueueItem {
  id: string;
  tableName: string;
  table_name: string;
  rowId: string;
  row_id: string;
  action: MutationAction;
  payload: string;
  clientTimestamp: number;
  client_timestamp: number;
  synced: number;
}

export interface CurrentUser {
  id: string;
  isGuest: boolean;
  email?: string;
}

let activeUser: CurrentUser | null = null;

/**
 * Configure the current authenticated user context for offline tracking / sync.
 */
export function setCurrentUser(user: CurrentUser | null): void {
  activeUser = user;
}

/**
 * currentUser() is module state; safe for single-user desktop or client process.
 * In hosted server requests, user is resolved per-request via getSession().
 * Defaults to offline guest ('local').
 */
export function currentUser(): CurrentUser {
  if (activeUser) {
    return activeUser;
  }
  if (typeof process !== "undefined" && process.env?.HABIT_USER_ID) {
    return { id: process.env.HABIT_USER_ID, isGuest: false };
  }
  return { id: "local", isGuest: true };
}

/**
 * Appends a local mutation to `local_sync_queue`.
 */
export async function recordMutation(
  db: AnyDbClient,
  options: RecordMutationOptions
): Promise<SyncQueueItem> {
  const client = extractClient(db);
  const id = options.id ?? randomUUID();
  const tableName = options.tableName ?? options.table_name;
  const rawRowId = options.rowId ?? options.row_id;

  if (!tableName) {
    throw new Error("Missing required field 'tableName' in recordMutation");
  }
  if (rawRowId === undefined || rawRowId === null) {
    throw new Error("Missing required field 'rowId' in recordMutation");
  }

  const rowId = String(rawRowId);
  const action = options.action;
  const clientTimestamp = options.clientTimestamp ?? options.client_timestamp ?? Date.now();

  const user = currentUser();
  const effectiveUserId = options.userId ?? user.id;
  const isEffectiveGuest = options.userId
    ? options.userId === "local"
    : Boolean(user.isGuest || user.id === "local");

  let payload: string;
  if (typeof options.payload === "string") {
    let parsed: Record<string, unknown> | null;
    try {
      parsed = JSON.parse(options.payload) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === "object") {
      if (!isEffectiveGuest && (!parsed.user_id || parsed.user_id === "local")) {
        parsed.user_id = effectiveUserId;
      }
      payload = JSON.stringify(parsed);
    } else {
      payload = options.payload;
    }
  } else if (options.payload !== undefined && options.payload !== null) {
    const payloadObj: Record<string, unknown> = { ...options.payload };
    if (!isEffectiveGuest && (!payloadObj.user_id || payloadObj.user_id === "local")) {
      payloadObj.user_id = effectiveUserId;
    }
    payload = JSON.stringify(payloadObj);
  } else if (action === "delete") {
    payload = JSON.stringify({
      id: rowId,
      ...(isEffectiveGuest ? {} : { user_id: effectiveUserId }),
      deleted_at: clientTimestamp,
    });
  } else {
    payload = JSON.stringify(isEffectiveGuest ? {} : { user_id: effectiveUserId });
  }

  await client.execute({
    sql: `INSERT INTO local_sync_queue (id, table_name, row_id, action, payload, client_timestamp, synced)
          VALUES (?, ?, ?, ?, ?, ?, 0)`,
    args: [id, tableName, rowId, action, payload, clientTimestamp],
  });

  return {
    id,
    tableName,
    table_name: tableName,
    rowId,
    row_id: rowId,
    action,
    payload,
    clientTimestamp,
    client_timestamp: clientTimestamp,
    synced: 0,
  };
}

/**
 * Retrieves un-synced entries from `local_sync_queue` in chronological order.
 */
export async function getPendingMutations(db: AnyDbClient): Promise<SyncQueueItem[]> {
  const client = extractClient(db);
  const result = await client.execute({
    sql: `SELECT id, table_name, row_id, action, payload, client_timestamp, synced
          FROM local_sync_queue
          WHERE synced = 0
          ORDER BY client_timestamp ASC`,
    args: [],
  });

  const rows = (result.rows ?? []) as Record<string, unknown>[];
  return rows.map((r) => {
    const tableName = String(r.table_name ?? r.tableName);
    const rowId = String(r.row_id ?? r.rowId);
    const clientTimestamp = Number(r.client_timestamp ?? r.clientTimestamp);
    return {
      id: String(r.id),
      tableName,
      table_name: tableName,
      rowId,
      row_id: rowId,
      action: r.action as MutationAction,
      payload: String(r.payload),
      clientTimestamp,
      client_timestamp: clientTimestamp,
      synced: Number(r.synced),
    };
  });
}

/**
 * Retrieves all mutations (both pending and synced) from `local_sync_queue`.
 */
export async function getAllMutations(db: AnyDbClient): Promise<SyncQueueItem[]> {
  const client = extractClient(db);
  const result = await client.execute({
    sql: `SELECT id, table_name, row_id, action, payload, client_timestamp, synced
          FROM local_sync_queue
          ORDER BY client_timestamp ASC`,
    args: [],
  });

  const rows = (result.rows ?? []) as Record<string, unknown>[];
  return rows.map((r) => {
    const tableName = String(r.table_name ?? r.tableName);
    const rowId = String(r.row_id ?? r.rowId);
    const clientTimestamp = Number(r.client_timestamp ?? r.clientTimestamp);
    return {
      id: String(r.id),
      tableName,
      table_name: tableName,
      rowId,
      row_id: rowId,
      action: r.action as MutationAction,
      payload: String(r.payload),
      clientTimestamp,
      client_timestamp: clientTimestamp,
      synced: Number(r.synced),
    };
  });
}

/**
 * Marks mutations as synced (`synced = 1`) or cleans them up (deletes them) if requested.
 */
export async function markMutationsSynced(
  db: AnyDbClient,
  ids: string[],
  options: { cleanup?: boolean } = {}
): Promise<number> {
  if (!ids || ids.length === 0) {
    return 0;
  }

  const client = extractClient(db);
  const placeholders = ids.map(() => "?").join(", ");

  if (options.cleanup) {
    const res = await client.execute({
      sql: `DELETE FROM local_sync_queue WHERE id IN (${placeholders})`,
      args: ids,
    });
    return res.rowsAffected ?? ids.length;
  } else {
    const res = await client.execute({
      sql: `UPDATE local_sync_queue SET synced = 1 WHERE id IN (${placeholders})`,
      args: ids,
    });
    return res.rowsAffected ?? ids.length;
  }
}

/**
 * Purges all already-synced items from `local_sync_queue`.
 */
export async function purgeSyncedMutations(db: AnyDbClient): Promise<number> {
  const client = extractClient(db);
  const res = await client.execute({
    sql: "DELETE FROM local_sync_queue WHERE synced = 1",
    args: [],
  });
  return res.rowsAffected ?? 0;
}

/**
 * Retrieves the last synchronization timestamp for a user.
 */
export async function getLastSyncedAt(
  db: AnyDbClient,
  userId: string = currentUser().id
): Promise<number> {
  const client = extractClient(db);
  const res = await client.execute({
    sql: "SELECT last_synced_at FROM sync_state WHERE user_id = ?",
    args: [userId],
  });
  const row = res.rows?.[0];
  if (!row) return 0;
  return Number(row.last_synced_at ?? row.lastSyncedAt ?? 0);
}

/**
 * Updates the last synchronization timestamp for a user.
 */
export async function setLastSyncedAt(
  db: AnyDbClient,
  timestamp: number,
  userId: string = currentUser().id
): Promise<void> {
  const client = extractClient(db);
  await client.execute({
    sql: `INSERT INTO sync_state (user_id, last_synced_at)
          VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
    args: [userId, timestamp],
  });
}
