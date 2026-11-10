// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SyncManager,
  parseRetryAfter,
  type SyncStatus,
  type SyncRunResponse,
  type SyncStatusResponse,
} from "./sync-manager";

const flushPromises = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

describe("SyncManager Thin Poller (Plan 0050)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("online/offline status transitions & subscriptions", () => {
    it("initializes with idle status when online", () => {
      const manager = new SyncManager({ autoStart: false });
      expect(manager.getStatus()).toBe("idle");
      expect(manager.isOffline()).toBe(false);
      manager.destroy();
    });

    it("accurately transitions between online and offline states", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async (): Promise<SyncRunResponse> => ({ state: "synced" }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });
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

      // Go online: should transition through idle
      manager.setOnlineState(true);
      expect(manager.isOffline()).toBe(false);
      expect(statuses).toContain("idle");

      await flushPromises();
      expect(manager.getStatus()).toBe("synced");

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
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      manager.setOnlineState(false);
      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("offline");
      expect(result.reason).toBe("offline");
      expect(fetchMock).not.toHaveBeenCalled();
      manager.destroy();
    });

    it("triggers flushSyncQueue when coming back online", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async (): Promise<SyncRunResponse> => ({
          state: "synced",
          pushed: 1,
          pulled: 0,
        }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      manager.setOnlineState(false);
      expect(manager.isOffline()).toBe(true);

      manager.setOnlineState(true);
      await flushPromises();

      expect(fetchMock).toHaveBeenCalledWith("/api/sync/run", expect.objectContaining({ method: "POST" }));
      manager.destroy();
    });
  });

  describe("polling & sync triggers", () => {
    it("calls POST /api/sync/run and updates status to synced", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async (): Promise<SyncRunResponse> => ({
          state: "synced",
          pushed: 3,
          pulled: 2,
        }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
        runEndpoint: "/api/sync/run",
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(true);
      expect(result.status).toBe("synced");
      expect(result.pushed).toBe(3);
      expect(result.pulled).toBe(2);
      expect(manager.getStatus()).toBe("synced");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const info = manager.getStatusInfo();
      expect(info.pending).toBe(0);
      expect(info.lastSyncedAt).toBeGreaterThan(0);

      manager.destroy();
    });

    it("every 5 s checks GET /api/sync/status and runs sync if pending > 0", async () => {
      let statusCallCount = 0;
      let runCallCount = 0;

      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url === "/api/sync/status") {
          statusCallCount++;
          const pending = statusCallCount === 1 ? 0 : 5;
          return {
            ok: true,
            status: 200,
            json: async (): Promise<SyncStatusResponse> => ({
              account: "user-123",
              state: "idle",
              pending,
              lastSyncedAt: 1000,
            }),
          };
        }
        if (url === "/api/sync/run") {
          runCallCount++;
          return {
            ok: true,
            status: 200,
            json: async (): Promise<SyncRunResponse> => ({
              state: "synced",
              pushed: 5,
              pulled: 0,
            }),
          };
        }
        throw new Error(`Unexpected url: ${url}`);
      });

      const manager = new SyncManager({
        autoStart: false,
        statusIntervalMs: 5000,
        syncIntervalMs: 30000,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      manager.start();
      await flushPromises();
      expect(runCallCount).toBe(1); // from initial start

      // First tick (5s): pending === 0 -> only status is checked, no extra run
      await vi.advanceTimersByTimeAsync(5000);
      await flushPromises();
      expect(statusCallCount).toBe(1);
      expect(runCallCount).toBe(1);

      // Second tick (5s more): pending === 5 -> triggers POST /api/sync/run
      await vi.advanceTimersByTimeAsync(5000);
      await flushPromises();
      expect(statusCallCount).toBe(2);
      expect(runCallCount).toBe(2);

      manager.destroy();
    });

    it("every 30 s triggers POST /api/sync/run", async () => {
      let runCalls = 0;
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url === "/api/sync/run") {
          runCalls++;
          return {
            ok: true,
            status: 200,
            json: async (): Promise<SyncRunResponse> => ({
              state: "synced",
              pushed: 0,
              pulled: 0,
            }),
          };
        }
        if (url === "/api/sync/status") {
          return {
            ok: true,
            status: 200,
            json: async (): Promise<SyncStatusResponse> => ({
              pending: 0,
              state: "idle",
            }),
          };
        }
        throw new Error(`Unexpected url: ${url}`);
      });

      const manager = new SyncManager({
        autoStart: false,
        statusIntervalMs: 5000,
        syncIntervalMs: 30000,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      manager.start();
      await flushPromises();
      runCalls = 0; // reset initial start call

      await vi.advanceTimersByTimeAsync(30000);
      await flushPromises();
      expect(runCalls).toBe(1);

      await vi.advanceTimersByTimeAsync(30000);
      await flushPromises();
      expect(runCalls).toBe(2);

      manager.destroy();
    });

    it("stops timers when document becomes hidden and resumes when visible", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ state: "synced", pending: 0 }),
      });

      let hidden = false;
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => hidden,
      });

      const manager = new SyncManager({
        autoStart: false,
        statusIntervalMs: 5000,
        syncIntervalMs: 30000,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      manager.start();
      await flushPromises();
      expect(manager.getStatusTimer()).not.toBeNull();
      expect(manager.getSyncTimer()).not.toBeNull();

      // Tab becomes hidden
      hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));

      expect(manager.getStatusTimer()).toBeNull();
      expect(manager.getSyncTimer()).toBeNull();

      // Advancing time should not fire timers
      fetchMock.mockClear();
      await vi.advanceTimersByTimeAsync(60000);
      expect(fetchMock).not.toHaveBeenCalled();

      // Tab becomes visible again
      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));

      expect(manager.getStatusTimer()).not.toBeNull();
      expect(manager.getSyncTimer()).not.toBeNull();
      expect(fetchMock).toHaveBeenCalledWith("/api/sync/run", expect.objectContaining({ method: "POST" }));

      manager.destroy();
    });

    it("triggers sync run immediately on window focus", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ state: "synced" }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      manager.start();
      await flushPromises();
      fetchMock.mockClear();

      window.dispatchEvent(new Event("focus"));
      await flushPromises();
      expect(fetchMock).toHaveBeenCalledWith("/api/sync/run", expect.objectContaining({ method: "POST" }));

      manager.destroy();
    });
  });

  describe("auth & error handling", () => {
    it("handles 401 unauthorized: transitions to signed-out and halts timers", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Unauthorized" }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      manager.start();
      expect(manager.getStatusTimer()).not.toBeNull();

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("signed-out");
      expect(manager.getStatus()).toBe("signed-out");

      // Timers should be halted
      expect(manager.getStatusTimer()).toBeNull();
      expect(manager.getSyncTimer()).toBeNull();

      manager.destroy();
    });

    it("handles 429 throttled with Retry-After header and schedules backoff", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          get: (name: string) => (name.toLowerCase() === "retry-after" ? "10" : null),
        },
        json: async () => ({ error: "Rate limit exceeded" }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("throttled");
      expect(manager.getStatus()).toBe("throttled");
      expect(manager.getRetryAttempts()).toBe(1);
      expect(manager.getRetryTimer()).not.toBeNull();

      manager.destroy();
    });

    it("handles non-retryable 403 or 413 without scheduling backoff timer", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        statusText: "Payload Too Large",
        json: async () => ({ error: "quota_exceeded" }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("error");
      expect(result.error).toBe("quota_exceeded");
      expect(manager.getStatus()).toBe("error");
      expect(manager.getRetryTimer()).toBeNull();

      manager.destroy();
    });

    it("handles server 500 error: sets error and schedules exponential backoff", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Crash" }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("error");
      expect(manager.getStatus()).toBe("error");
      expect(manager.getRetryAttempts()).toBe(1);
      expect(manager.getRetryTimer()).not.toBeNull();

      manager.destroy();
    });

    it("sets account-mismatch status when server responds with account-mismatch", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async (): Promise<SyncRunResponse> => ({
          state: "account-mismatch",
          message: "This device is linked to another account.",
          pushed: 0,
          pulled: 0,
        }),
      });

      const manager = new SyncManager({
        autoStart: false,
        fetchFn: fetchMock as unknown as typeof fetch,
      });

      const result = await manager.flushSyncQueue();

      expect(result.success).toBe(false);
      expect(result.status).toBe("account-mismatch");
      expect(manager.getStatus()).toBe("account-mismatch");

      manager.destroy();
    });
  });

  describe("parseRetryAfter helper", () => {
    it("parses integer seconds correctly", () => {
      expect(parseRetryAfter("30")).toBe(30000);
      expect(parseRetryAfter("0")).toBe(0);
      expect(parseRetryAfter("  15  ")).toBe(15000);
    });

    it("parses HTTP-date strings correctly", () => {
      const now = Date.now();
      const target = new Date(now + 45000).toUTCString();
      const delay = parseRetryAfter(target);
      expect(delay).toBeGreaterThanOrEqual(44000);
      expect(delay).toBeLessThanOrEqual(46000);
    });

    it("returns null for invalid or empty inputs", () => {
      expect(parseRetryAfter(null)).toBeNull();
      expect(parseRetryAfter(undefined)).toBeNull();
      expect(parseRetryAfter("")).toBeNull();
      expect(parseRetryAfter("invalid-date-string")).toBeNull();
    });
  });
});
