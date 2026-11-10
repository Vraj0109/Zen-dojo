import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applySyncSchema } from "./sync-schema";
import {
  getLastSyncedAt,
  getPendingMutations,
  recordMutation,
  setCurrentUser,
} from "./sync-queue";
import {
  SyncManager,
  applyIncomingDeltas,
  type SyncStatus,
} from "./sync-manager";

describe("SyncManager & Client Sync Protocol", () => {
  let db: ReturnType<typeof createClient>;

  beforeEach(async () => {
    db = createClient({ url: ":memory:" });
    setCurrentUser(null);
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
    `);
    await applySyncSchema(db);
  });

  afterEach(() => {
    db.close();
    setCurrentUser(null);
    vi.restoreAllMocks();
  });

  describe("online/offline status transitions & subscriptions", () => {
    it("initializes with idle status when online", () => {
      const manager = new SyncManager({ autoStart: false });
      expect(manager.getStatus()).toBe("idle");
      expect(manager.isOffline()).toBe(false);
      manager.destroy();
    });

    it("accurately transitions between online and offline states", () => {
      const manager = new SyncManager({ autoStart: false });
      const statuses: SyncStatus[] = [];

      const unsub = manager.subscribe((status) => {
        statuses.push(status);
      });

      expect(statuses).toEqual(["idle"]);

      // Go offline
      manager.setOnlineState(false);
      expect(manager.getStatus()).toBe("offline");
      expect(manager.isOffline()).toBe(true);
      expect(statuses).toEqual(["idle", "offline"]);

      // Go online
      manager.setOnlineState(true);
      expect(manager.isOffline()).toBe(false);
      expect(statuses[statuses.length - 1]).toBe("idle");

      unsub();
      manager.destroy();
    });

    it("stops receiving updates after unsubscribing", () => {
      const manager = new SyncManager({ autoStart: false });
      const updates: SyncStatus[] = [];

      const unsub = manager.subscribe((s) => updates.push(s));
      expect(updates).toEqual(["idle"]);

      unsub();
      manager.setStatus("offline");
      expect(updates).toEqual(["idle"]); // no new update pushed
      manager.destroy();
    });

    it("aborts flushSyncQueue immediately when offline without network call", async () => {
      const fetchMock = vi.fn();
      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
      });

      manager.setOnlineState(false);
      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("offline");
      expect(result.reason).toBe("offline");
      expect(fetchMock).not.toHaveBeenCalled();
      manager.destroy();
    });
  });

  describe("flushSyncQueue mutation packaging & protocol", () => {
    it("packages pending mutations and sends POST /api/sync with last_synced_at", async () => {
      setCurrentUser({ id: "gh:test-user", isGuest: false });

      // 1. Create mutations in local_sync_queue
      await recordMutation(db, {
        tableName: "tasks",
        rowId: "task-101",
        action: "upsert",
        payload: { title: "Study B-Trees", category: "dsa", xp: 30 },
        clientTimestamp: 1794000100000,
      });

      await recordMutation(db, {
        tableName: "settings",
        rowId: "theme",
        action: "upsert",
        payload: { key: "theme", value: "nord" },
        clientTimestamp: 1794000200000,
      });

      let capturedPayload: any = null;

      const fetchMock = vi.fn().mockImplementation(async (url: string, init: any) => {
        capturedPayload = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            synced_ids: ["task-101", "theme"], // server acknowledging mutations
            server_timestamp: 1794000500000,
            deltas: {},
          }),
        };
      });

      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
        apiEndpoint: "/api/sync",
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(true);
      expect(result.status).toBe("synced");
      expect(result.mutationsCount).toBe(2);

      // Verify POST call details
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, req] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/sync");
      expect(req.method).toBe("POST");
      expect(req.headers["Content-Type"]).toBe("application/json");

      // Verify captured payload structure
      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.last_synced_at).toBe(0);
      expect(capturedPayload.mutations).toHaveLength(2);

      const m1 = capturedPayload.mutations[0];
      expect(m1.table_name).toBe("tasks");
      expect(m1.row_id).toBe("task-101");
      expect(m1.action).toBe("upsert");
      expect(m1.payload).toEqual({ title: "Study B-Trees", category: "dsa", xp: 30, user_id: "gh:test-user" });
      expect(m1.client_timestamp).toBe(1794000100000);

      // Verify local_sync_queue marked as synced
      const pendingAfter = await getPendingMutations(db);
      expect(pendingAfter).toHaveLength(0);

      // Verify last_synced_at updated in sync_state
      const lastSynced = await getLastSyncedAt(db, "gh:test-user");
      expect(lastSynced).toBe(1794000500000);

      manager.destroy();
    });

    it("handles server error responses and updates status to error", async () => {
      setCurrentUser({ id: "gh:test-user", isGuest: false });

      await recordMutation(db, {
        tableName: "tasks",
        rowId: "task-err",
        action: "upsert",
        payload: { title: "Error Task" },
      });

      const fetchMock = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server sync crashed" }),
      }));

      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("error");
      expect(manager.getStatus()).toBe("error");

      // Mutations should NOT be acknowledged
      const pending = await getPendingMutations(db);
      expect(pending).toHaveLength(1);

      manager.destroy();
    });
  });

  describe("incoming deltas ingestion & Last-Write-Wins (LWW)", () => {
    it("inserts new records from server deltas into local tables", async () => {
      const deltas = {
        tasks: [
          {
            id: "task-remote-1",
            title: "Remote Task from Cloud",
            user_id: "local",
            updated_at: 1794000800000,
            deleted_at: null,
          },
        ],
        settings: [
          {
            key: "zen_mode",
            value: "true",
            user_id: "local",
            updated_at: 1794000850000,
            deleted_at: null,
          },
        ],
      };

      const res = await applyIncomingDeltas(db, deltas);
      expect(res.applied).toBe(2);
      expect(res.skipped).toBe(0);

      // Verify task in local DB
      const taskRow = await db.execute("SELECT * FROM tasks WHERE id = 'task-remote-1'");
      expect(taskRow.rows).toHaveLength(1);
      expect(taskRow.rows[0].title).toBe("Remote Task from Cloud");
      expect(Number(taskRow.rows[0].updated_at)).toBe(1794000800000);

      // Verify settings in local DB
      const settingsRow = await db.execute("SELECT * FROM settings WHERE key = 'zen_mode'");
      expect(settingsRow.rows).toHaveLength(1);
      expect(settingsRow.rows[0].value).toBe("true");
    });

    it("respects Last-Write-Wins (LWW) conflict resolution", async () => {
      // Setup existing row with updated_at = 2000
      await db.execute({
        sql: `INSERT INTO tasks (id, title, user_id, updated_at) VALUES (?, ?, ?, ?)`,
        args: ["task-lww", "Local New Title", "local", 2000],
      });

      // 1. Incoming delta is OLDER (updated_at = 1500) -> should be skipped!
      const olderDelta = {
        tasks: [
          {
            id: "task-lww",
            title: "Stale Remote Title",
            user_id: "local",
            updated_at: 1500,
          },
        ],
      };

      const resOlder = await applyIncomingDeltas(db, olderDelta);
      expect(resOlder.applied).toBe(0);
      expect(resOlder.skipped).toBe(1);

      const checkLocal = await db.execute("SELECT title FROM tasks WHERE id = 'task-lww'");
      expect(checkLocal.rows[0].title).toBe("Local New Title"); // Retained local!

      // 2. Incoming delta is NEWER (updated_at = 3000) -> should overwrite local!
      const newerDelta = {
        tasks: [
          {
            id: "task-lww",
            title: "Fresh Remote Title",
            user_id: "local",
            updated_at: 3000,
          },
        ],
      };

      const resNewer = await applyIncomingDeltas(db, newerDelta);
      expect(resNewer.applied).toBe(1);
      expect(resNewer.skipped).toBe(0);

      const checkOverwritten = await db.execute("SELECT title, updated_at FROM tasks WHERE id = 'task-lww'");
      expect(checkOverwritten.rows[0].title).toBe("Fresh Remote Title");
      expect(Number(checkOverwritten.rows[0].updated_at)).toBe(3000);
    });

    it("applies soft deletes with tombstones from remote deltas", async () => {
      await db.execute({
        sql: `INSERT INTO tasks (id, title, user_id, updated_at) VALUES (?, ?, ?, ?)`,
        args: ["task-del", "To Be Deleted", "local", 1000],
      });

      const deleteDelta = {
        tasks: [
          {
            id: "task-del",
            user_id: "local",
            updated_at: 2000,
            deleted_at: 2000,
          },
        ],
      };

      const res = await applyIncomingDeltas(db, deleteDelta);
      expect(res.applied).toBe(1);

      const row = await db.execute("SELECT deleted_at, updated_at FROM tasks WHERE id = 'task-del'");
      expect(Number(row.rows[0].deleted_at)).toBe(2000);
      expect(Number(row.rows[0].updated_at)).toBe(2000);
    });

    it("integrates deltas ingestion seamlessly into flushSyncQueue", async () => {
      setCurrentUser({ id: "gh:test-user", isGuest: false });

      const fetchMock = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          server_timestamp: 1794000999000,
          synced_ids: [],
          deltas: {
            tasks: [
              {
                id: "t-pulled",
                title: "Pulled from another device",
                user_id: "local",
                updated_at: 1794000999000,
              },
            ],
          },
        }),
      }));

      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(true);
      expect(result.deltasApplied).toBe(1);

      const row = await db.execute("SELECT title FROM tasks WHERE id = 't-pulled'");
      expect(row.rows).toHaveLength(1);
      expect(row.rows[0].title).toBe("Pulled from another device");

      manager.destroy();
    });
  });

  describe("authentication and error handling (Plan 0049 F3)", () => {
    it("signed-out user does not make network calls and transitions to signed-out", async () => {
      setCurrentUser(null); // Defaults to { id: "local", isGuest: true }

      const fetchMock = vi.fn();
      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("signed-out");
      expect(manager.getStatus()).toBe("signed-out");
      expect(fetchMock).not.toHaveBeenCalled();

      manager.destroy();
    });

    it("401 response transitions to signed-out and halts background timer", async () => {
      setCurrentUser({ id: "gh:user-expired", isGuest: false });

      const fetchMock = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Unauthorized session" }),
      }));

      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
      });

      manager.startBackgroundSync(5000);
      expect(manager.getBackgroundTimer()).not.toBeNull();

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("signed-out");
      expect(manager.getStatus()).toBe("signed-out");

      // Verify timer is stopped to avoid spinning in a retry loop
      expect(manager.getBackgroundTimer()).toBeNull();

      manager.destroy();
    });

    it("429 response respects Retry-After and sets throttled", async () => {
      setCurrentUser({ id: "gh:rate-limited", isGuest: false });

      const fetchMock = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          get: (name: string) => (name.toLowerCase() === "retry-after" ? "30" : null),
        },
        json: async () => ({ error: "Rate limit exceeded" }),
      }));

      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("throttled");
      expect(manager.getStatus()).toBe("throttled");
      expect(manager.getRetryAttempts()).toBe(1);
      expect(manager.getRetryTimer()).not.toBeNull();

      manager.destroy();
    });

    it("413 response sets error (quota_exceeded) and does not retry", async () => {
      setCurrentUser({ id: "gh:quota-overflow", isGuest: false });

      const fetchMock = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 413,
        statusText: "Payload Too Large",
        json: async () => ({ error: "quota_exceeded" }),
      }));

      const manager = new SyncManager({
        db,
        autoStart: false,
        fetchFn: fetchMock as any,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("error");
      expect(result.error).toBe("quota_exceeded");
      expect(manager.getStatus()).toBe("error");
      expect(manager.getRetryTimer()).toBeNull();

      manager.destroy();
    });

    it("queue mutations respect active authenticated user id vs guest local", async () => {
      // 1. Guest local mutation
      setCurrentUser(null);
      const mGuest = await recordMutation(db, {
        tableName: "tasks",
        rowId: "task-guest",
        action: "upsert",
        payload: { title: "Guest Task" },
      });
      const parsedGuest = JSON.parse(mGuest.payload);
      expect(parsedGuest.user_id).toBeUndefined();

      // 2. Authenticated user mutation
      setCurrentUser({ id: "gh:active-user-99", isGuest: false });
      const mAuth = await recordMutation(db, {
        tableName: "tasks",
        rowId: "task-auth",
        action: "upsert",
        payload: { title: "Auth Task" },
      });
      const parsedAuth = JSON.parse(mAuth.payload);
      expect(parsedAuth.user_id).toBe("gh:active-user-99");
    });
  });
});
