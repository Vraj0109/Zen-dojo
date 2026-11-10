import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockWorkerFetch = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getSession: () => mockGetSession(),
  workerFetch: (...a: unknown[]) => mockWorkerFetch(...a),
}));

const mockUnlink = vi.fn();
const mockStatus = vi.fn();
vi.mock("@/lib/sync-engine", () => ({
  unlinkAccount: (...a: unknown[]) => mockUnlink(...a),
  getSyncStatus: (...a: unknown[]) => mockStatus(...a),
}));

const mockErase = vi.fn();
const mockSummary = vi.fn();
vi.mock("@/lib/erase-data", () => ({
  eraseLocalData: (...a: unknown[]) => mockErase(...a),
  getLocalSummary: (...a: unknown[]) => mockSummary(...a),
}));

import { POST as cloudDelete } from "./cloud-delete/route";
import { POST as localErase } from "./local-erase/route";
import { GET as localSummary } from "./local-summary/route";

const SESSION = { userId: "gh:1", name: "Alice", avatarUrl: null, admin: false, expiresAt: 0, sessionId: "s" };

function req(url: string, method: string, body?: unknown, origin = "http://localhost:3000") {
  return new Request(url, {
    method,
    headers: { host: "localhost:3000", origin, "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
const cloud = (body?: unknown, origin?: string) => req("http://localhost:3000/api/account/cloud-delete", "POST", body, origin);
const local = (body?: unknown, origin?: string) => req("http://localhost:3000/api/account/local-erase", "POST", body, origin);
const workerJson = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

beforeEach(() => {
  vi.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
});

describe("GET local-summary", () => {
  it("403 cross-origin", async () => {
    const res = await localSummary(req("http://localhost:3000/api/account/local-summary", "GET", undefined, "http://evil.test"));
    expect(res.status).toBe(403);
  });
  it("returns counts and link state", async () => {
    const counts = { solves: 1, notes: 2, runs: 3, tasks: 4, other: 5 };
    mockSummary.mockResolvedValue(counts);
    mockStatus.mockResolvedValue({ account: "gh:1", state: "idle", lastSyncedAt: null, pending: 0 });
    const res = await localSummary(req("http://localhost:3000/api/account/local-summary", "GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, counts, linked: true, account: "gh:1" });
  });
  it("unlinked device", async () => {
    mockSummary.mockResolvedValue({ solves: 0, notes: 0, runs: 0, tasks: 0, other: 0 });
    mockStatus.mockResolvedValue({ account: null, state: "idle", lastSyncedAt: null, pending: 0 });
    const body = await (await localSummary(req("http://localhost:3000/api/account/local-summary", "GET"))).json();
    expect(body).toMatchObject({ linked: false, account: null });
  });
});

describe("POST local-erase", () => {
  it("403 cross-origin", async () => {
    const res = await localErase(local({ confirm: "DELETE" }, "http://evil.test"));
    expect(res.status).toBe(403);
    expect(mockErase).not.toHaveBeenCalled();
  });
  it.each([[{}], [{ confirm: "delete" }], [{ confirm: true }], ["not json"], [{ confirm: "DELETE", keepSettings: "yes" }]])(
    "400 for bad body %j",
    async (body) => {
      const res = await localErase(local(body));
      expect(res.status).toBe(400);
      expect((await res.json()).ok).toBe(false);
      expect(mockErase).not.toHaveBeenCalled();
    },
  );
  it("works signed out and passes options", async () => {
    mockGetSession.mockResolvedValue(null);
    mockErase.mockResolvedValue({ removed: { problem_solves: 2 } });
    const res = await localErase(local({ confirm: "DELETE", keepSettings: false, includeImported: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, removed: { problem_solves: 2 } });
    expect(mockErase).toHaveBeenCalledWith({ keepSettings: false, includeImported: true });
  });
  it("500 with a plain error when the erase fails", async () => {
    mockErase.mockRejectedValue(new Error("secret detail"));
    const res = await localErase(local({ confirm: "DELETE" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret detail");
  });
});

describe("POST cloud-delete", () => {
  it("403 cross-origin", async () => {
    expect((await cloudDelete(cloud({ scope: "data", confirm: "DELETE" }, "http://evil.test"))).status).toBe(403);
    expect(mockWorkerFetch).not.toHaveBeenCalled();
  });
  it("401 signed out", async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await cloudDelete(cloud({ scope: "data", confirm: "DELETE" }))).status).toBe(401);
    expect(mockWorkerFetch).not.toHaveBeenCalled();
  });
  it.each([[{ scope: "data" }], [{ scope: "data", confirm: "yes" }], [{ scope: "everything", confirm: "DELETE" }], [{ confirm: "DELETE" }], ["{"]])(
    "400 for bad body %j",
    async (body) => {
      expect((await cloudDelete(cloud(body))).status).toBe(400);
      expect(mockWorkerFetch).not.toHaveBeenCalled();
    },
  );
  it.each(["data", "account"])("success for scope %s calls the Worker and unlinks", async (scope) => {
    mockWorkerFetch.mockResolvedValue(workerJson({ ok: true, deleted: { problem_solves: 3 } }));
    const res = await cloudDelete(cloud({ scope, confirm: "DELETE" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deleted: { problem_solves: 3 } });
    const [path, init] = mockWorkerFetch.mock.calls[0];
    expect(path).toBe("/api/account/delete-data");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ scope, confirm: "DELETE" });
    expect(mockUnlink).toHaveBeenCalledTimes(1);
  });
  it("passes 429 and Retry-After through, without unlinking", async () => {
    mockWorkerFetch.mockResolvedValue(workerJson({ ok: false, error: "rate_limited" }, 429, { "Retry-After": "120" }));
    const res = await cloudDelete(cloud({ scope: "data", confirm: "DELETE" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    expect(await res.json()).toEqual({ ok: false, error: "rate_limited" });
    expect(mockUnlink).not.toHaveBeenCalled();
  });
  it("forwards other Worker failures without unlinking", async () => {
    mockWorkerFetch.mockResolvedValue(workerJson({ error: "unauthorized" }, 401));
    const res = await cloudDelete(cloud({ scope: "account", confirm: "DELETE" }));
    expect(res.status).toBe(401);
    expect(mockUnlink).not.toHaveBeenCalled();
  });
  it("500 when the Worker call throws, without unlinking", async () => {
    mockWorkerFetch.mockRejectedValue(new Error("network down"));
    const res = await cloudDelete(cloud({ scope: "data", confirm: "DELETE" }));
    expect(res.status).toBe(500);
    expect(mockUnlink).not.toHaveBeenCalled();
  });
});
