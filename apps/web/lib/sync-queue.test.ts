import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  USER_SYNC_TABLES,
  applySyncSchema,
  hasSyncColumns,
} from "./sync-schema";
import {
  currentUser,
  getLastSyncedAt,
  getPendingMutations,
  markMutationsSynced,
  purgeSyncedMutations,
  recordMutation,
  setCurrentUser,
  setLastSyncedAt,
} from "./sync-queue";

describe("sync-schema & sync-queue", () => {
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    client = createClient({ url: ":memory:" });
    setCurrentUser(null);
  });

  afterEach(() => {
    client.close();
    setCurrentUser(null);
  });

  describe("schema migrations & multi-tenancy columns", () => {
    it("creates local_sync_queue and sync_state and configures all user tables", async () => {
      // Simulate existing user tables without sync columns
      await client.execute(`
        CREATE TABLE tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'todo'
        );
        CREATE TABLE problem_solves (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          problem_id TEXT NOT NULL,
          solved_on TEXT NOT NULL
        );
      `);

      // Run schema sync migration
      await applySyncSchema(client);

      // Verify all tables in USER_SYNC_TABLES exist and have user_id, updated_at, deleted_at
      for (const table of USER_SYNC_TABLES) {
        const check = await hasSyncColumns(client, table);
        expect(check.hasUserId, `Table ${table} should have user_id`).toBe(true);
        expect(check.hasUpdatedAt, `Table ${table} should have updated_at`).toBe(true);
        expect(check.hasDeletedAt, `Table ${table} should have deleted_at`).toBe(true);
      }

      // Verify defaults on tasks
      await client.execute("INSERT INTO tasks (title) VALUES ('Complete Assignment')");
      const { rows } = await client.execute("SELECT * FROM tasks WHERE title = 'Complete Assignment'");
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row.user_id).toBe("local");
      expect(typeof row.updated_at).toBe("number");
      expect(row.updated_at).toBeGreaterThan(0);
      expect(row.deleted_at).toBeNull();
    });

    it("is idempotent and safe to run multiple times", async () => {
      await applySyncSchema(client);
      await expect(applySyncSchema(client)).resolves.not.toThrow();
    });
  });

  describe("current user", () => {
    it("defaults to guest 'local'", () => {
      expect(currentUser()).toEqual({ id: "local", isGuest: true });
    });

    it("returns active authenticated user when set", () => {
      setCurrentUser({ id: "usr_abc123", email: "user@example.com", isGuest: false });
      expect(currentUser()).toEqual({
        id: "usr_abc123",
        email: "user@example.com",
        isGuest: false,
      });
    });
  });

  describe("local mutation queue", () => {
    beforeEach(async () => {
      await applySyncSchema(client);
    });

    it("records upsert mutations into local_sync_queue", async () => {
      const taskPayload = {
        title: "Master Dynamic Programming",
        category: "dsa",
        xp: 25,
        status: "done",
      };

      const mutation = await recordMutation(client, {
        tableName: "tasks",
        rowId: 101,
        action: "upsert",
        payload: taskPayload,
      });

      expect(mutation.id).toBeDefined();
      expect(mutation.tableName).toBe("tasks");
      expect(mutation.rowId).toBe("101");
      expect(mutation.action).toBe("upsert");
      expect(JSON.parse(mutation.payload)).toEqual(taskPayload);
      expect(mutation.synced).toBe(0);

      // Verify row in database
      const res = await client.execute({
        sql: "SELECT * FROM local_sync_queue WHERE id = ?",
        args: [mutation.id],
      });
      expect(res.rows).toHaveLength(1);
      const dbRow = res.rows[0];
      expect(dbRow.table_name).toBe("tasks");
      expect(dbRow.row_id).toBe("101");
      expect(dbRow.action).toBe("upsert");
      expect(dbRow.synced).toBe(0);
      expect(JSON.parse(String(dbRow.payload))).toEqual(taskPayload);
    });

    it("retrieves pending mutations and marks them as synced", async () => {
      const m1 = await recordMutation(client, {
        tableName: "tasks",
        rowId: "task-1",
        action: "upsert",
        payload: { title: "Task 1" },
        clientTimestamp: 1000,
      });

      const m2 = await recordMutation(client, {
        tableName: "problem_solves",
        rowId: "solve-1",
        action: "upsert",
        payload: { problemId: "lc-1", xp: 10 },
        clientTimestamp: 2000,
      });

      const m3 = await recordMutation(client, {
        tableName: "settings",
        rowId: "theme",
        action: "upsert",
        payload: { value: "dark" },
        clientTimestamp: 3000,
      });

      // Retrieve pending mutations
      const pendingBefore = await getPendingMutations(client);
      expect(pendingBefore).toHaveLength(3);
      expect(pendingBefore.map((m) => m.id)).toEqual([m1.id, m2.id, m3.id]);

      // Mark m1 and m2 as synced
      const affected = await markMutationsSynced(client, [m1.id, m2.id]);
      expect(affected).toBe(2);

      // Verify only m3 is still pending
      const pendingAfter = await getPendingMutations(client);
      expect(pendingAfter).toHaveLength(1);
      expect(pendingAfter[0].id).toBe(m3.id);

      // Verify m1 and m2 have synced = 1 in database
      const rows = await client.execute({
        sql: "SELECT id, synced FROM local_sync_queue WHERE id IN (?, ?)",
        args: [m1.id, m2.id],
      });
      expect(rows.rows.every((r) => r.synced === 1)).toBe(true);
    });

    it("supports cleaning up synced mutations", async () => {
      const m1 = await recordMutation(client, {
        tableName: "tasks",
        rowId: "task-cleanup",
        action: "upsert",
        payload: { title: "Clean me" },
      });

      await markMutationsSynced(client, [m1.id], { cleanup: true });

      const res = await client.execute({
        sql: "SELECT * FROM local_sync_queue WHERE id = ?",
        args: [m1.id],
      });
      expect(res.rows).toHaveLength(0);
    });

    it("purges all synced mutations with purgeSyncedMutations", async () => {
      const m1 = await recordMutation(client, {
        tableName: "tasks",
        rowId: "t-1",
        action: "upsert",
        payload: { title: "T1" },
      });
      const m2 = await recordMutation(client, {
        tableName: "tasks",
        rowId: "t-2",
        action: "upsert",
        payload: { title: "T2" },
      });

      await markMutationsSynced(client, [m1.id]);
      const purged = await purgeSyncedMutations(client);
      expect(purged).toBe(1);

      const pending = await getPendingMutations(client);
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(m2.id);
    });

    it("records soft delete payloads with tombstone timestamps", async () => {
      const deleteTimestamp = 1794000000000;
      const m = await recordMutation(client, {
        tableName: "tasks",
        rowId: "task-to-delete-42",
        action: "delete",
        payload: {
          id: "task-to-delete-42",
          deleted_at: deleteTimestamp,
        },
      });

      expect(m.action).toBe("delete");
      expect(m.rowId).toBe("task-to-delete-42");
      const parsed = JSON.parse(m.payload);
      expect(parsed.id).toBe("task-to-delete-42");
      expect(parsed.deleted_at).toBe(deleteTimestamp);

      // Test default soft delete payload generation when payload is omitted
      const mDefault = await recordMutation(client, {
        tableName: "problem_solves",
        rowId: "solve-to-delete-99",
        action: "delete",
        clientTimestamp: 1794111222000,
      });

      const parsedDefault = JSON.parse(mDefault.payload);
      expect(parsedDefault.id).toBe("solve-to-delete-99");
      expect(parsedDefault.deleted_at).toBe(1794111222000);
    });

    it("tracks user sync state checkpoint", async () => {
      const initial = await getLastSyncedAt(client, "user_1");
      expect(initial).toBe(0);

      const syncTime = 1794291000000;
      await setLastSyncedAt(client, syncTime, "user_1");

      const updated = await getLastSyncedAt(client, "user_1");
      expect(updated).toBe(syncTime);

      // Another user has independent checkpoint
      expect(await getLastSyncedAt(client, "user_2")).toBe(0);
    });
  });
});
