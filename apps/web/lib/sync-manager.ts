import { extractClient, type AnyDbClient } from "./sync-schema";
import {
  currentUser,
  getLastSyncedAt,
  getPendingMutations,
  markMutationsSynced,
  setLastSyncedAt,
  type SyncQueueItem,
} from "./sync-queue";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export interface SyncManagerOptions {
  db?: AnyDbClient;
  apiEndpoint?: string;
  intervalMs?: number;
  fetchFn?: typeof fetch;
  autoStart?: boolean;
  userId?: string;
}

export interface FlushSyncOptions {
  db?: AnyDbClient;
  userId?: string;
  throwOnError?: boolean;
}

export interface FlushResult {
  success: boolean;
  status: SyncStatus;
  mutationsCount?: number;
  deltasApplied?: number;
  deltasSkipped?: number;
  lastSyncedAt?: number;
  error?: string;
  reason?: string;
}

export interface SyncPayload {
  mutations: Array<{
    id: string;
    table: string;
    table_name: string;
    row_id: string;
    rowId: string;
    action: string;
    payload: any;
    client_timestamp: number;
    clientTimestamp: number;
  }>;
  last_synced_at: number;
}

export interface SyncResponse {
  deltas?: Record<string, any[]>;
  synced_ids?: string[];
  server_timestamp?: number;
  serverTimestamp?: number;
  last_synced_at?: number;
  error?: string;
}

/**
 * Converts camelCase or snake_case string to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Ingests incoming deltas from server into local SQLite database using Last-Write-Wins (LWW).
 */
export async function applyIncomingDeltas(
  db: AnyDbClient,
  deltas: Record<string, any[]>
): Promise<{ applied: number; skipped: number }> {
  if (!deltas || typeof deltas !== "object") {
    return { applied: 0, skipped: 0 };
  }

  const client = extractClient(db);
  let applied = 0;
  let skipped = 0;

  for (const [rawTableName, rows] of Object.entries(deltas)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;

    // Sanitize table name
    const tableName = rawTableName.trim();
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      skipped += rows.length;
      continue;
    }

    // Inspect columns of the local table
    let tableInfo: any;
    try {
      tableInfo = await client.execute(`PRAGMA table_info(${tableName})`);
    } catch {
      // Table doesn't exist locally
      skipped += rows.length;
      continue;
    }

    const tableRows = (tableInfo.rows ?? []) as any[];
    if (tableRows.length === 0) {
      skipped += rows.length;
      continue;
    }

    const columnNames = new Set(tableRows.map((r) => String(r.name).toLowerCase()));
    const pkCols = tableRows
      .filter((r) => Number(r.pk) > 0)
      .sort((a, b) => Number(a.pk) - Number(b.pk))
      .map((r) => String(r.name));

    for (const rawRow of rows) {
      if (!rawRow || typeof rawRow !== "object") {
        skipped++;
        continue;
      }

      // Resolve primary key filter
      let whereCols: string[] = [];
      let whereArgs: any[] = [];

      if (pkCols.length > 0) {
        let hasAllPk = true;
        for (const pk of pkCols) {
          const pkCamel = toCamelCase(pk);
          const pkSnake = toSnakeCase(pk);
          const val = rawRow[pk] ?? rawRow[pkCamel] ?? rawRow[pkSnake];
          if (val === undefined || val === null) {
            hasAllPk = false;
            break;
          }
          whereCols.push(pk);
          whereArgs.push(val);
        }
        if (!hasAllPk) {
          whereCols = [];
          whereArgs = [];
        }
      }

      // Fallback heuristics for composite or single PKs if PRAGMA didn't report them
      if (whereCols.length === 0) {
        if (tableName === "solution_runs" && (rawRow.problem_id || rawRow.problemId) && rawRow.lang) {
          whereCols = ["problem_id", "lang"];
          whereArgs = [rawRow.problem_id ?? rawRow.problemId, rawRow.lang];
        } else if (tableName === "pack_progress" && (rawRow.pack_id || rawRow.packId) && (rawRow.item_id || rawRow.itemId)) {
          whereCols = ["pack_id", "item_id"];
          whereArgs = [rawRow.pack_id ?? rawRow.packId, rawRow.item_id ?? rawRow.itemId];
        } else if (tableName === "site_time" && rawRow.day && rawRow.slug) {
          whereCols = ["day", "slug"];
          whereArgs = [rawRow.day, rawRow.slug];
        } else if (rawRow.id !== undefined && rawRow.id !== null) {
          whereCols = ["id"];
          whereArgs = [rawRow.id];
        } else if (tableName === "settings" && (rawRow.key !== undefined || rawRow.id !== undefined)) {
          whereCols = ["key"];
          whereArgs = [rawRow.key ?? rawRow.id];
        }
      }

      if (whereCols.length === 0) {
        skipped++;
        continue;
      }

      const whereClause = whereCols.map((c) => `${c} = ?`).join(" AND ");

      // Check existing row in local database
      let localRow: any = null;
      try {
        const res = await client.execute({
          sql: `SELECT updated_at, deleted_at FROM ${tableName} WHERE ${whereClause}`,
          args: whereArgs,
        });
        localRow = res.rows?.[0];
      } catch {
        // query error
      }

      const incomingUpdatedAt = Number(
        rawRow.updated_at ?? rawRow.updatedAt ?? rawRow.client_timestamp ?? rawRow.clientTimestamp ?? 0
      );

      // Last-Write-Wins: if local row is newer or equal, skip
      if (localRow) {
        const localUpdatedAt = Number(localRow.updated_at ?? localRow.updatedAt ?? 0);
        if (incomingUpdatedAt > 0 && localUpdatedAt >= incomingUpdatedAt) {
          skipped++;
          continue;
        }
      }

      // Prepare column map matching local table columns
      const updateData: Record<string, any> = {};
      for (const [key, val] of Object.entries(rawRow)) {
        const snakeKey = toSnakeCase(key);
        let targetCol: string | null = null;

        if (columnNames.has(key.toLowerCase())) {
          targetCol = key.toLowerCase();
        } else if (columnNames.has(snakeKey.toLowerCase())) {
          targetCol = snakeKey.toLowerCase();
        }

        if (targetCol) {
          if (val !== null && typeof val === "object") {
            updateData[targetCol] = JSON.stringify(val);
          } else {
            updateData[targetCol] = val;
          }
        }
      }

      // Ensure updated_at is stored
      if (incomingUpdatedAt > 0 && columnNames.has("updated_at") && updateData.updated_at === undefined) {
        updateData.updated_at = incomingUpdatedAt;
      }

      // Soft delete handling
      const isDeleted = rawRow.deleted_at !== undefined && rawRow.deleted_at !== null;
      if (isDeleted && columnNames.has("deleted_at")) {
        updateData.deleted_at = rawRow.deleted_at;
      }

      const cols = Object.keys(updateData);
      if (cols.length === 0) {
        skipped++;
        continue;
      }

      try {
        if (localRow) {
          // Update existing row
          const setClause = cols.map((c) => `${c} = ?`).join(", ");
          const vals = cols.map((c) => updateData[c]);
          await client.execute({
            sql: `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`,
            args: [...vals, ...whereArgs],
          });
          applied++;
        } else {
          // Insert new row
          const colList = cols.join(", ");
          const placeholders = cols.map(() => "?").join(", ");
          const vals = cols.map((c) => updateData[c]);
          await client.execute({
            sql: `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders})`,
            args: vals,
          });
          applied++;
        }
      } catch (err) {
        console.error(`Failed to ingest delta row for table ${tableName}:`, err);
        skipped++;
      }
    }
  }

  return { applied, skipped };
}

/**
 * Offline-first Client Sync Manager.
 * Coordinates network status monitoring, periodic background synchronization,
 * flushing queued offline mutations, and applying server deltas.
 */
export class SyncManager {
  private db: AnyDbClient | null = null;
  private apiEndpoint: string = "/api/sync";
  private intervalMs: number = 60000;
  private status: SyncStatus = "idle";
  private subscribers = new Set<(status: SyncStatus) => void>();
  private timer: any = null;
  private isSyncing = false;
  private inFlightSync: Promise<FlushResult> | null = null;
  private isOnlineOverride: boolean | null = null;
  private fetchFn: typeof fetch;
  private configuredUserId?: string;

  constructor(options: SyncManagerOptions = {}) {
    this.db = options.db ?? null;
    this.apiEndpoint = options.apiEndpoint ?? "/api/sync";
    this.intervalMs = options.intervalMs ?? 60000;
    this.configuredUserId = options.userId;

    this.fetchFn =
      options.fetchFn ??
      (typeof fetch !== "undefined"
        ? fetch.bind(globalThis)
        : (async () => {
            throw new Error("No fetch implementation available");
          }) as any);

    // Initial status check
    if (this.isOffline()) {
      this.status = "offline";
    } else {
      this.status = "idle";
    }

    if (options.autoStart !== false && typeof window !== "undefined") {
      this.setupNetworkListeners();
      this.startBackgroundSync();
    }
  }

  public setDb(db: AnyDbClient): void {
    this.db = db;
  }

  public getDb(): AnyDbClient | null {
    return this.db;
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Set online/offline override (useful for testing or manual toggling).
   */
  public setOnlineState(online: boolean): void {
    this.isOnlineOverride = online;
    if (online) {
      if (this.status === "offline") {
        this.setStatus("idle");
      }
      this.flushSyncQueue().catch(() => {});
    } else {
      this.setStatus("offline");
    }
  }

  public isOffline(): boolean {
    if (this.isOnlineOverride !== null) {
      return !this.isOnlineOverride;
    }
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return !navigator.onLine;
    }
    return false;
  }

  public setStatus(newStatus: SyncStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const sub of this.subscribers) {
      try {
        sub(newStatus);
      } catch (err) {
        console.error("SyncManager subscriber error:", err);
      }
    }
  }

  public subscribe(callback: (status: SyncStatus) => void): () => void {
    this.subscribers.add(callback);
    callback(this.status);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private handleOnline = (): void => {
    if (this.status === "offline") {
      this.setStatus("idle");
    }
    this.flushSyncQueue().catch(() => {});
  };

  private handleOffline = (): void => {
    this.setStatus("offline");
  };

  public setupNetworkListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  public removeNetworkListeners(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
  }

  public startBackgroundSync(intervalMs: number = this.intervalMs): void {
    this.stopBackgroundSync();
    this.intervalMs = intervalMs;
    if (typeof setInterval !== "undefined") {
      this.timer = setInterval(() => {
        if (!this.isOffline() && !this.isSyncing) {
          this.flushSyncQueue().catch(() => {});
        }
      }, this.intervalMs);
    }
  }

  public stopBackgroundSync(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Flushes local mutation queue and pulls cloud deltas.
   */
  public async flushSyncQueue(options: FlushSyncOptions = {}): Promise<FlushResult> {
    if (this.isOffline()) {
      this.setStatus("offline");
      return { success: false, status: "offline", reason: "offline" };
    }

    if (this.isSyncing && this.inFlightSync) {
      return this.inFlightSync;
    }

    const runSync = async (): Promise<FlushResult> => {
      this.isSyncing = true;
      this.setStatus("syncing");

      const db = options.db ?? this.db;
      if (!db) {
        // If no database client is available, retain idle and return
        this.setStatus("idle");
        return { success: false, status: "idle", reason: "no_db" };
      }

      const userId = options.userId ?? this.configuredUserId ?? currentUser().id;

      try {
        // 1. Read pending mutations from local_sync_queue
        const pending: SyncQueueItem[] = await getPendingMutations(db);

        // 2. Read last_synced_at checkpoint
        const lastSyncedAt = await getLastSyncedAt(db, userId);

        // 3. Package mutations payload
        const mutationsPayload = pending.map((m) => {
          let parsedPayload: any;
          try {
            parsedPayload = typeof m.payload === "string" ? JSON.parse(m.payload) : m.payload;
          } catch {
            parsedPayload = m.payload;
          }
          return {
            id: m.id,
            table: m.tableName,
            table_name: m.tableName,
            row_id: m.rowId,
            rowId: m.rowId,
            action: m.action,
            payload: parsedPayload,
            client_timestamp: m.clientTimestamp,
            clientTimestamp: m.clientTimestamp,
          };
        });

        const syncPayload: SyncPayload = {
          mutations: mutationsPayload,
          last_synced_at: lastSyncedAt,
        };

        // 4. Send POST /api/sync
        const res = await this.fetchFn(this.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(syncPayload),
        });

        if (!res.ok) {
          throw new Error(`Sync request failed with status ${res.status}: ${res.statusText}`);
        }

        const data: SyncResponse = await res.json();

        // 5. Ingest incoming deltas with updated_at LWW comparison
        let deltasResult = { applied: 0, skipped: 0 };
        if (data.deltas && typeof data.deltas === "object") {
          deltasResult = await applyIncomingDeltas(db, data.deltas);
        }

        // 6. Delete or mark acknowledged records in local_sync_queue
        let ackIds: string[];
        if (Array.isArray(data.synced_ids)) {
          const ackSet = new Set(data.synced_ids);
          ackIds = pending
            .filter((m) => ackSet.has(m.id) || ackSet.has(m.rowId))
            .map((m) => m.id);
        } else {
          ackIds = pending.map((m) => m.id);
        }

        if (ackIds.length > 0) {
          await markMutationsSynced(db, ackIds);
        }

        // 7. Update last_synced_at in sync_state
        const newTimestamp = Number(
          data.server_timestamp ?? data.serverTimestamp ?? data.last_synced_at ?? Date.now()
        );
        await setLastSyncedAt(db, newTimestamp, userId);

        // 8. Update state to synced
        this.setStatus("synced");

        return {
          success: true,
          status: "synced",
          mutationsCount: pending.length,
          deltasApplied: deltasResult.applied,
          deltasSkipped: deltasResult.skipped,
          lastSyncedAt: newTimestamp,
        };
      } catch (err: any) {
        if (this.isOffline()) {
          this.setStatus("offline");
        } else {
          this.setStatus("error");
        }

        if (options.throwOnError) {
          throw err;
        }

        return {
          success: false,
          status: this.status,
          error: err?.message ? String(err.message) : String(err),
        };
      } finally {
        this.isSyncing = false;
        this.inFlightSync = null;
      }
    };

    this.inFlightSync = runSync();
    return this.inFlightSync;
  }

  public destroy(): void {
    this.stopBackgroundSync();
    this.removeNetworkListeners();
    this.subscribers.clear();
  }
}

/**
 * Global default SyncManager singleton
 */
export const syncManager = new SyncManager();

export function subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
  return syncManager.subscribe(callback);
}

export function getSyncStatus(): SyncStatus {
  return syncManager.getStatus();
}

export function flushSyncQueue(options?: FlushSyncOptions): Promise<FlushResult> {
  return syncManager.flushSyncQueue(options);
}

export function setSyncDb(db: AnyDbClient): void {
  syncManager.setDb(db);
}
