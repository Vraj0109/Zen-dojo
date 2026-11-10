import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockWorkerFetch = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSession: () => mockGetSession(),
  workerFetch: (...args: unknown[]) => mockWorkerFetch(...args),
}));

const mockGetDb = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: () => mockGetDb(),
}));

const mockRunSync = vi.fn();
const mockLinkAccount = vi.fn();
const mockGetSyncStatus = vi.fn();
const mockUnlinkAccount = vi.fn();

vi.mock("@/lib/sync-engine", () => ({
  runSync: (opts?: unknown) => mockRunSync(opts),
  linkAccount: (userId: string, db?: unknown) => mockLinkAccount(userId, db),
  getSyncStatus: (db?: unknown) => mockGetSyncStatus(db),
  unlinkAccount: (db?: unknown) => mockUnlinkAccount(db),
}));

import { POST as runPost } from "./run/route";
import { GET as statusGet } from "./status/route";
import { GET as headGet } from "./head/route";
import { POST as linkPost } from "./link/route";
import { POST as unlinkPost } from "./unlink/route";

const FAKE_SESSION = {
  userId: "gh:alice_123",
  name: "Alice",
  avatarUrl: null,
  admin: false,
  expiresAt: Date.now() + 900_000,
  sessionId: "session_secret_token_abc_xyz",
};

const FAKE_DB = {
  $client: {
    execute: vi.fn(),
    batch: vi.fn(),
  },
};

function makeReq(url: string, opts?: { method?: string; origin?: string; host?: string }): Request {
  const host = opts?.host ?? "localhost:3000";
  const origin = opts?.origin ?? `http://${host}`;
  return new Request(url, {
    method: opts?.method ?? "GET",
    headers: {
      host,
      origin,
    },
  });
}

describe("Sync API routes", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(FAKE_DB);
    consoleSpy = {
      log: vi.spyOn(console, "log"),
      error: vi.spyOn(console, "error"),
      warn: vi.spyOn(console, "warn"),
      info: vi.spyOn(console, "info"),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function assertNoTokensOrRowDataLogged() {
    const allLoggedArgs = [
      ...consoleSpy.log.mock.calls,
      ...consoleSpy.error.mock.calls,
      ...consoleSpy.warn.mock.calls,
      ...consoleSpy.info.mock.calls,
    ].flat();

    const loggedText = allLoggedArgs.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ");

    expect(loggedText).not.toContain("session_secret_token_abc_xyz");
    expect(loggedText).not.toContain("secret_row_content");
  }

  describe("POST /api/sync/run", () => {
    it("returns 403 on origin mismatch", async () => {
      const req = makeReq("http://localhost:3000/api/sync/run", {
        method: "POST",
        origin: "http://evil.com",
      });
      const res = await runPost(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ ok: false, error: "forbidden" });
    });

    it("returns 401 when not signed in", async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const req = makeReq("http://localhost:3000/api/sync/run", { method: "POST" });
      const res = await runPost(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    });

    it("returns sync result on success", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockRunSync.mockResolvedValueOnce({
        state: "synced",
        pushed: 3,
        pulled: 2,
      });

      const req = makeReq("http://localhost:3000/api/sync/run", { method: "POST" });
      const res = await runPost(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        state: "synced",
        pushed: 3,
        pulled: 2,
      });
      expect(mockRunSync).toHaveBeenCalledWith({ db: FAKE_DB });
      assertNoTokensOrRowDataLogged();
    });

    it("catches errors safely and returns 500 error state", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockRunSync.mockRejectedValueOnce(new Error("Database disk full with secret_row_content"));

      const req = makeReq("http://localhost:3000/api/sync/run", { method: "POST" });
      const res = await runPost(req);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        state: "error",
        pushed: 0,
        pulled: 0,
        message: "Sync failed",
      });
      assertNoTokensOrRowDataLogged();
    });
  });

  describe("GET /api/sync/status", () => {
    it("returns 403 on origin mismatch", async () => {
      const req = makeReq("http://localhost:3000/api/sync/status", {
        origin: "http://attacker.com",
      });
      const res = await statusGet(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ ok: false, error: "forbidden" });
    });

    it("returns signed-out state when there is no session without 401 error", async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const req = makeReq("http://localhost:3000/api/sync/status");
      const res = await statusGet(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        account: null,
        state: "signed-out",
        lastSyncedAt: null,
        pending: 0,
      });
      expect(mockGetSyncStatus).not.toHaveBeenCalled();
    });

    it("returns sync status when signed in", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockGetSyncStatus.mockResolvedValueOnce({
        account: "gh:alice_123",
        state: "idle",
        lastSyncedAt: 1700000000000,
        pending: 4,
      });

      const req = makeReq("http://localhost:3000/api/sync/status");
      const res = await statusGet(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        account: "gh:alice_123",
        state: "idle",
        lastSyncedAt: 1700000000000,
        pending: 4,
      });
      expect(mockGetSyncStatus).toHaveBeenCalledWith(FAKE_DB);
      assertNoTokensOrRowDataLogged();
    });

    it("returns 500 when getSyncStatus fails", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockGetSyncStatus.mockRejectedValueOnce(new Error("Unexpected error"));

      const req = makeReq("http://localhost:3000/api/sync/status");
      const res = await statusGet(req);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        account: null,
        state: "error",
        lastSyncedAt: null,
        pending: 0,
        message: "Failed to read sync status",
      });
    });
  });

  describe("GET /api/sync/head", () => {
    it("returns 403 on origin mismatch", async () => {
      const req = makeReq("http://localhost:3000/api/sync/head", {
        origin: "http://malicious.org",
      });
      const res = await headGet(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ ok: false, error: "forbidden" });
    });

    it("returns 401 when not signed in", async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const req = makeReq("http://localhost:3000/api/sync/head");
      const res = await headGet(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    });

    it("forwards to worker and returns head", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockWorkerFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, head: 12345 }), { status: 200 }),
      );

      const req = makeReq("http://localhost:3000/api/sync/head");
      const res = await headGet(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, head: 12345 });
      expect(mockWorkerFetch).toHaveBeenCalledWith("/api/sync/head");
      assertNoTokensOrRowDataLogged();
    });

    it("passes worker error status through and forwards Retry-After", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockWorkerFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
          status: 429,
          headers: { "Retry-After": "30" },
        }),
      );

      const req = makeReq("http://localhost:3000/api/sync/head");
      const res = await headGet(req);
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("30");
      expect(await res.json()).toEqual({ ok: false, error: "rate_limited" });
    });

    it("returns 500 when workerFetch throws", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockWorkerFetch.mockRejectedValueOnce(new Error("Network failed"));

      const req = makeReq("http://localhost:3000/api/sync/head");
      const res = await headGet(req);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, error: "failed_to_fetch_head" });
    });
  });

  describe("POST /api/sync/link", () => {
    it("returns 403 on origin mismatch", async () => {
      const req = makeReq("http://localhost:3000/api/sync/link", {
        method: "POST",
        origin: "http://attacker.com",
      });
      const res = await linkPost(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ ok: false, error: "forbidden" });
    });

    it("returns 401 when not signed in", async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const req = makeReq("http://localhost:3000/api/sync/link", { method: "POST" });
      const res = await linkPost(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    });

    it("links account and returns queued count on success", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockLinkAccount.mockResolvedValueOnce({ queued: 42 });

      const req = makeReq("http://localhost:3000/api/sync/link", { method: "POST" });
      const res = await linkPost(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, queued: 42 });
      expect(mockLinkAccount).toHaveBeenCalledWith("gh:alice_123", FAKE_DB);
      assertNoTokensOrRowDataLogged();
    });

    it("returns 409 on account mismatch", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      const mismatchErr = new Error("account-mismatch");
      mismatchErr.name = "account-mismatch";
      mockLinkAccount.mockRejectedValueOnce(mismatchErr);

      const req = makeReq("http://localhost:3000/api/sync/link", { method: "POST" });
      const res = await linkPost(req);
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        ok: false,
        error: "account-mismatch",
        message: "account-mismatch",
      });
      assertNoTokensOrRowDataLogged();
    });

    it("returns 500 on unexpected link error", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockLinkAccount.mockRejectedValueOnce(new Error("DB transaction failed"));

      const req = makeReq("http://localhost:3000/api/sync/link", { method: "POST" });
      const res = await linkPost(req);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, error: "internal_error" });
    });
  });

  describe("POST /api/sync/unlink", () => {
    it("returns 403 on origin mismatch", async () => {
      const req = makeReq("http://localhost:3000/api/sync/unlink", {
        method: "POST",
        origin: "http://evil.com",
      });
      const res = await unlinkPost(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ ok: false, error: "forbidden" });
    });

    it("returns 401 when not signed in", async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const req = makeReq("http://localhost:3000/api/sync/unlink", { method: "POST" });
      const res = await unlinkPost(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    });

    it("unlinks account and returns ok on success", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockUnlinkAccount.mockResolvedValueOnce(undefined);

      const req = makeReq("http://localhost:3000/api/sync/unlink", { method: "POST" });
      const res = await unlinkPost(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockUnlinkAccount).toHaveBeenCalledWith(FAKE_DB);
      assertNoTokensOrRowDataLogged();
    });

    it("returns 500 on unexpected unlink error", async () => {
      mockGetSession.mockResolvedValueOnce(FAKE_SESSION);
      mockUnlinkAccount.mockRejectedValueOnce(new Error("DB failure"));

      const req = makeReq("http://localhost:3000/api/sync/unlink", { method: "POST" });
      const res = await unlinkPost(req);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, error: "internal_error" });
    });
  });
});
