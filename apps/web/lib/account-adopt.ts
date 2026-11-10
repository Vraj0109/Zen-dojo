import { randomUUID } from "node:crypto";
import {
  USER_SYNC_TABLES,
  extractClient,
  type AnyDbClient,
  CREATE_LOCAL_SYNC_QUEUE_SQL,
} from "./sync-schema";

export const SYNC_TABLES = USER_SYNC_TABLES;

export interface AdoptResult {
  adoptedCount: number;
}

/**
 * Pure decision function for displaying the first sign-in local data adoption prompt.
 */
export function shouldPromptAdoption({
  isGuest,
  hasLocalData,
  isDismissed,
}: {
  isGuest: boolean;
  hasLocalData: boolean;
  isDismissed: boolean;
}): boolean {
  return !isGuest && hasLocalData && !isDismissed;
}

/**
 * Checks if any row in any of the sync tables has `user_id = 'local'`.
 */
export async function hasLocalData(
  db: AnyDbClient,
  tables: readonly string[] = SYNC_TABLES
): Promise<boolean> {
  if (!db) return false;
  const client = extractClient(db);

  for (const table of tables) {
    try {
      const tableCheck = await client.execute({
        sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        args: [table],
      });
      if (!tableCheck.rows || tableCheck.rows.length === 0) continue;

      const info = await client.execute(`PRAGMA table_info(${table})`);
      const cols = new Set((info.rows ?? []).map((r: any) => String(r.name).toLowerCase()));
      if (!cols.has("user_id")) continue;

      const res = await client.execute({
        sql: `SELECT 1 FROM ${table} WHERE user_id = 'local' LIMIT 1`,
        args: [],
      });
      if (res.rows && res.rows.length > 0) {
        return true;
      }
    } catch {
      // Continue inspecting other tables
    }
  }

  return false;
}

/**
 * Adopts local data by re-owning every row where user_id = 'local' to userId
 * and enqueuing upsert mutations in local_sync_queue within a transaction/batch.
 * Idempotent: returns { adoptedCount: 0 } when no rows have user_id = 'local'.
 * Never deletes rows on failure.
 */
export async function adoptLocalData(
  db: AnyDbClient,
  userId: string,
  tables: readonly string[] = SYNC_TABLES
): Promise<AdoptResult> {
  if (!db) {
    throw new Error("Database instance cannot be null or undefined");
  }
  if (!userId || userId === "local") {
    throw new Error("A valid target userId must be provided to adopt local data");
  }

  const client = extractClient(db);

  // Ensure local_sync_queue exists
  if (typeof client.executeMultiple === "function") {
    await client.executeMultiple(CREATE_LOCAL_SYNC_QUEUE_SQL);
  } else {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS local_sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        client_timestamp INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      )
    `);
  }

  const statements: Array<{ sql: string; args?: any[] }> = [];
  let totalAdopted = 0;
  const now = Date.now();

  for (const table of tables) {
    const tableCheck = await client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      args: [table],
    });
    if (!tableCheck.rows || tableCheck.rows.length === 0) continue;

    const info = await client.execute(`PRAGMA table_info(${table})`);
    const cols = new Set((info.rows ?? []).map((r: any) => String(r.name).toLowerCase()));
    if (!cols.has("user_id")) continue;

    const pkCols = (info.rows ?? [])
      .filter((r: any) => Number(r.pk) > 0)
      .sort((a: any, b: any) => Number(a.pk) - Number(b.pk))
      .map((r: any) => String(r.name));

    const res = await client.execute({
      sql: `SELECT * FROM ${table} WHERE user_id = 'local'`,
      args: [],
    });
    const rows = (res.rows ?? []) as any[];
    if (rows.length === 0) continue;

    totalAdopted += rows.length;

    for (const row of rows) {
      let rowId: string;
      if (row.id !== undefined && row.id !== null) {
        rowId = String(row.id);
      } else if (row.key !== undefined && row.key !== null) {
        rowId = String(row.key);
      } else if (pkCols.length > 0) {
        rowId = pkCols.map((c: string) => String(row[c])).join(":");
      } else {
        rowId = randomUUID();
      }

      const payloadObj: Record<string, any> = {
        ...row,
        user_id: userId,
      };
      if (cols.has("updated_at")) {
        payloadObj.updated_at = now;
      }

      statements.push({
        sql: `INSERT INTO local_sync_queue (id, table_name, row_id, action, payload, client_timestamp, synced)
              VALUES (?, ?, ?, 'upsert', ?, ?, 0)`,
        args: [randomUUID(), table, rowId, JSON.stringify(payloadObj), now],
      });
    }

    if (cols.has("updated_at")) {
      statements.push({
        sql: `UPDATE ${table} SET user_id = ?, updated_at = ? WHERE user_id = 'local'`,
        args: [userId, now],
      });
    } else {
      statements.push({
        sql: `UPDATE ${table} SET user_id = ? WHERE user_id = 'local'`,
        args: [userId],
      });
    }
  }

  if (totalAdopted === 0 || statements.length === 0) {
    return { adoptedCount: 0 };
  }

  // Execute atomically in a transaction or batch
  const anyClient = client as any;
  if (typeof anyClient.transaction === "function") {
    const tx = await anyClient.transaction("write");
    try {
      for (const stmt of statements) {
        await tx.execute(stmt);
      }
      await tx.commit();
    } catch (err) {
      try {
        await tx.rollback();
      } catch {}
      throw err;
    }
  } else if (typeof anyClient.batch === "function") {
    await anyClient.batch(statements, "write");
  } else {
    await client.execute("BEGIN IMMEDIATE");
    try {
      for (const stmt of statements) {
        await client.execute(stmt);
      }
      await client.execute("COMMIT");
    } catch (err) {
      try {
        await client.execute("ROLLBACK");
      } catch {}
      throw err;
    }
  }

  return { adoptedCount: totalAdopted };
}
