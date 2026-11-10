import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adoptLocalData,
  hasLocalData,
  shouldPromptAdoption,
  SYNC_TABLES,
} from "./account-adopt";
import { applySyncSchema } from "./sync-schema";
import { getPendingMutations } from "./sync-queue";

describe("account-adopt (local data adoption)", () => {
  let db: ReturnType<typeof createClient>;

  beforeEach(async () => {
    db = createClient({ url: ":memory:" });
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        xp INTEGER,
        status TEXT NOT NULL DEFAULT 'todo'
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL
      );
    `);
    await applySyncSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("hasLocalData", () => {
    it("returns false on a fresh database with no rows", async () => {
      const hasData = await hasLocalData(db);
      expect(hasData).toBe(false);
    });

    it("returns true when any table has user_id = 'local'", async () => {
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["task-1", "Learn Rust", "local"],
      });
      const hasData = await hasLocalData(db);
      expect(hasData).toBe(true);
    });

    it("returns false if rows exist but belong to another user", async () => {
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["task-remote", "Remote Task", "gh:42"],
      });
      const hasData = await hasLocalData(db);
      expect(hasData).toBe(false);
    });
  });

  describe("adoptLocalData", () => {
    it("re-owns all local rows to target userId and queues upserts in local_sync_queue", async () => {
      // 1. Insert local rows across tables
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["t-1", "Local Task 1", "local"],
      });
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["t-2", "Local Task 2", "local"],
      });
      await db.execute({
        sql: "INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?)",
        args: ["theme", "dark", "local"],
      });

      // 2. Also insert a row belonging to a different user to verify it is untouched
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["t-other", "Other User Task", "gh:999"],
      });

      expect(await hasLocalData(db)).toBe(true);

      // 3. Adopt local data to target user
      const result = await adoptLocalData(db, "gh:1001");
      expect(result.adoptedCount).toBe(3);

      // 4. Verify local rows were updated to gh:1001
      const adoptedTasks = await db.execute({
        sql: "SELECT id, title, user_id FROM tasks WHERE user_id = ?",
        args: ["gh:1001"],
      });
      expect(adoptedTasks.rows).toHaveLength(2);

      const adoptedSettings = await db.execute({
        sql: "SELECT key, value, user_id FROM settings WHERE user_id = ?",
        args: ["gh:1001"],
      });
      expect(adoptedSettings.rows).toHaveLength(1);
      expect(adoptedSettings.rows[0].key).toBe("theme");

      // 5. Verify other user's rows are completely untouched
      const otherTasks = await db.execute({
        sql: "SELECT id, user_id FROM tasks WHERE user_id = ?",
        args: ["gh:999"],
      });
      expect(otherTasks.rows).toHaveLength(1);
      expect(otherTasks.rows[0].id).toBe("t-other");

      // 6. Verify local_sync_queue has queued upserts for all adopted rows
      const pending = await getPendingMutations(db);
      expect(pending).toHaveLength(3);

      const taskMutations = pending.filter((m) => m.tableName === "tasks");
      expect(taskMutations).toHaveLength(2);
      expect(taskMutations.map((m) => m.rowId).sort()).toEqual(["t-1", "t-2"]);
      expect(taskMutations.every((m) => m.action === "upsert")).toBe(true);

      // Payloads must reflect target user id
      for (const m of taskMutations) {
        const payload = JSON.parse(m.payload);
        expect(payload.user_id).toBe("gh:1001");
      }

      const settingsMutation = pending.find((m) => m.tableName === "settings");
      expect(settingsMutation).toBeDefined();
      expect(settingsMutation?.rowId).toBe("theme");
      const settingsPayload = JSON.parse(settingsMutation!.payload);
      expect(settingsPayload.user_id).toBe("gh:1001");

      // 7. Verify hasLocalData is now false
      expect(await hasLocalData(db)).toBe(false);
    });

    it("is idempotent: subsequent calls return { adoptedCount: 0 } without duplicating queue rows", async () => {
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["t-1", "Local Task", "local"],
      });

      const firstResult = await adoptLocalData(db, "gh:555");
      expect(firstResult.adoptedCount).toBe(1);

      const secondResult = await adoptLocalData(db, "gh:555");
      expect(secondResult.adoptedCount).toBe(0);

      const pending = await getPendingMutations(db);
      expect(pending).toHaveLength(1);
    });

    it("skips tables that have no rows or do not exist", async () => {
      // Notes table exists but has no rows
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["t-solo", "Solo Task", "local"],
      });

      const result = await adoptLocalData(db, "gh:777");
      expect(result.adoptedCount).toBe(1);

      const pending = await getPendingMutations(db);
      expect(pending).toHaveLength(1);
      expect(pending[0].tableName).toBe("tasks");
    });

    it("rejects invalid target userId and does not modify anything", async () => {
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["t-1", "Local Task", "local"],
      });

      await expect(adoptLocalData(db, "")).rejects.toThrow("valid target userId");
      await expect(adoptLocalData(db, "local")).rejects.toThrow("valid target userId");

      expect(await hasLocalData(db)).toBe(true);
    });

    it("rolls back transaction on error and never deletes data", async () => {
      await db.execute({
        sql: "INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)",
        args: ["t-1", "Precious Local Task", "local"],
      });

      // Intentionally cause transaction failure by intercepting transaction
      const origTransaction = db.transaction.bind(db);
      db.transaction = (async (mode: any) => {
        const tx = await origTransaction(mode);
        const origExecute = tx.execute.bind(tx);
        tx.execute = (async (stmt: any) => {
          if (typeof stmt === "object" && typeof stmt.sql === "string" && stmt.sql.includes("local_sync_queue")) {
            throw new Error("Simulated disk error during queue insertion");
          }
          return origExecute(stmt);
        }) as any;
        return tx;
      }) as any;

      await expect(adoptLocalData(db, "gh:fail")).rejects.toThrow("Simulated disk error");

      // Restore client
      db.transaction = origTransaction;

      // Verify that precious local data is NOT lost or deleted!
      const checkTasks = await db.execute("SELECT * FROM tasks WHERE id = 't-1'");
      expect(checkTasks.rows).toHaveLength(1);
      expect(checkTasks.rows[0].title).toBe("Precious Local Task");
      expect(checkTasks.rows[0].user_id).toBe("local");
    });
  });

  describe("shouldPromptAdoption (pure decision function)", () => {
    it("returns false for guest user even if local data exists", () => {
      expect(
        shouldPromptAdoption({
          isGuest: true,
          hasLocalData: true,
          isDismissed: false,
        })
      ).toBe(false);
    });

    it("returns false if user has no local data", () => {
      expect(
        shouldPromptAdoption({
          isGuest: false,
          hasLocalData: false,
          isDismissed: false,
        })
      ).toBe(false);
    });

    it("returns false if user already dismissed the prompt", () => {
      expect(
        shouldPromptAdoption({
          isGuest: false,
          hasLocalData: true,
          isDismissed: true,
        })
      ).toBe(false);
    });

    it("returns true for signed-in user with local data that hasn't dismissed yet", () => {
      expect(
        shouldPromptAdoption({
          isGuest: false,
          hasLocalData: true,
          isDismissed: false,
        })
      ).toBe(true);
    });
  });
});
