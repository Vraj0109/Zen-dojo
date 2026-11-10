import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockWorkerFetch = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  workerFetch: (path: string, init?: RequestInit) => mockWorkerFetch(path, init),
}));

import { DELETE, GET } from "./route";

describe("/api/auth/devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET returns 401 when workerFetch returns 401 (signed out)", async () => {
    mockWorkerFetch.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "unauthorized" });
  });

  it("GET returns devices list from Worker when authenticated", async () => {
    const devices = [
      { id: "d1", name: "Chrome on macOS", created_at: 1000, last_seen_at: 2000, current: true },
      { id: "d2", name: "Firefox on Linux", created_at: 500, last_seen_at: 600, current: false },
    ];
    mockWorkerFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(devices), { status: 200 }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(devices);
  });

  it("DELETE returns 403 on origin mismatch", async () => {
    const req = new Request("http://localhost:3000/api/auth/devices?id=d1", {
      method: "DELETE",
      headers: {
        host: "localhost:3000",
        origin: "http://evil.com",
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("DELETE returns 400 when device id is missing", async () => {
    const req = new Request("http://localhost:3000/api/auth/devices", {
      method: "DELETE",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "missing_id" });
  });

  it("DELETE proxies device deletion to Worker with workerFetch", async () => {
    mockWorkerFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const req = new Request("http://localhost:3000/api/auth/devices?id=dev-999", {
      method: "DELETE",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(mockWorkerFetch).toHaveBeenCalledWith("/auth/devices/dev-999", {
      method: "DELETE",
    });
  });
});
