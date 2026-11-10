import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockWorkerFetch = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSession: () => mockGetSession(),
  workerFetch: (path: string, init?: RequestInit) => mockWorkerFetch(path, init),
}));

import { POST } from "./route";

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 403 on origin mismatch", async () => {
    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://evil.com",
      },
      body: JSON.stringify({ mutations: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when user is not signed in", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ mutations: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "unauthorized" });
  });

  it("returns 413 when request body exceeds 1 MB cap", async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: "gh:100",
      name: "Alice",
      avatarUrl: null,
      admin: false,
      expiresAt: 2000,
      sessionId: "s1",
    });

    // Create a body larger than 1 MB (1024 * 1024 + 10 bytes)
    const largeData = new Uint8Array(1024 * 1024 + 10);
    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
      body: largeData,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "payload_too_large" });
  });

  it("forwards body to worker without client cookies or x-user-id header", async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: "gh:100",
      name: "Alice",
      avatarUrl: null,
      admin: false,
      expiresAt: 2000,
      sessionId: "s1",
    });

    let forwardedInit: RequestInit | undefined;
    mockWorkerFetch.mockImplementation(async (path, init) => {
      forwardedInit = init;
      return new Response(JSON.stringify({ ok: true, pulled: {} }), { status: 200 });
    });

    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        cookie: "some_secret_cookie=val",
        "x-user-id": "gh:victim_user",
        authorization: "Bearer client_injected_token",
      },
      body: JSON.stringify({ mutations: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockWorkerFetch).toHaveBeenCalled();
    const forwardedHeaders = new Headers(forwardedInit?.headers);
    expect(forwardedHeaders.get("cookie")).toBeNull();
    expect(forwardedHeaders.get("x-user-id")).toBeNull();
    expect(forwardedHeaders.get("authorization")).toBeNull(); // workerFetch adds its own Authorization
    expect(forwardedHeaders.get("content-type")).toBe("application/json");
  });

  it("passes 429 response through with Retry-After header", async () => {
    mockGetSession.mockResolvedValueOnce({
      userId: "gh:100",
      name: "Alice",
      avatarUrl: null,
      admin: false,
      expiresAt: 2000,
      sessionId: "s1",
    });

    mockWorkerFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );

    const req = new Request("http://localhost:3000/api/sync", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ mutations: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "rate_limited" });
  });
});
