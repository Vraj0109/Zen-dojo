import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
const mockRedirect = vi.fn();
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    mockNotFound();
    throw new Error("NOT_FOUND");
  },
}));

// In-memory cookie store mock
type CookieMap = Map<string, { value: string; options?: unknown }>;
let mockCookies: CookieMap = new Map();
let cookieSetThrows = false;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const c = mockCookies.get(name);
      return c ? { name, value: c.value } : undefined;
    },
    set: (name: string, value: string, options?: unknown) => {
      if (cookieSetThrows) {
        throw new Error("Cookies cannot be modified in a Server Component");
      }
      mockCookies.set(name, { value, options });
    },
    delete: (name: string) => {
      if (cookieSetThrows) {
        throw new Error("Cookies cannot be modified in a Server Component");
      }
      mockCookies.delete(name);
    },
  }),
}));

// Mock verifyAccessToken
const mockVerifyAccessToken = vi.fn();
vi.mock("./jwks", () => ({
  getWorkerUrl: () => "https://test-worker.dev",
  verifyAccessToken: (token: string) => mockVerifyAccessToken(token),
}));

import {
  clearRefreshFlightsForTest,
  getSession,
  requireAdmin,
  requireSession,
  workerFetch,
} from "./session";

describe("session management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies = new Map();
    cookieSetThrows = false;
    clearRefreshFlightsForTest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns session from valid zd_at access token", async () => {
    mockCookies.set("zd_at", { value: "valid-jwt" });
    mockCookies.set("zd_u", {
      value: encodeURIComponent(JSON.stringify({ name: "Alice", avatarUrl: "https://alice.pic" })),
    });

    mockVerifyAccessToken.mockResolvedValueOnce({
      iss: "zen-dojo-sync",
      sub: "gh:100",
      sid: "session-1",
      adm: true,
      iat: 1000,
      exp: 2000,
    });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("gh:100");
    expect(session?.name).toBe("Alice");
    expect(session?.avatarUrl).toBe("https://alice.pic");
    expect(session?.admin).toBe(true);
    expect(session?.sessionId).toBe("session-1");
  });

  it("refreshes token with zd_rt when zd_at is missing", async () => {
    mockCookies.set("zd_rt", { value: "refresh-token-123" });
    mockVerifyAccessToken.mockResolvedValueOnce(null); // zd_at is missing or fails

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "new-access-jwt",
          refresh_token: "new-refresh-token",
          expires_in: 900,
          user: {
            id: "gh:100",
            name: "Bob",
            avatar_url: null,
            admin: false,
          },
        }),
        { status: 200 },
      ),
    );

    mockVerifyAccessToken.mockResolvedValueOnce({
      iss: "zen-dojo-sync",
      sub: "gh:100",
      sid: "session-2",
      adm: false,
      iat: 1000,
      exp: 1900,
    });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("gh:100");
    expect(session?.name).toBe("Bob");
    expect(session?.admin).toBe(false);

    expect(mockCookies.get("zd_at")?.value).toBe("new-access-jwt");
    expect(mockCookies.get("zd_rt")?.value).toBe("new-refresh-token");
  });

  it("handles Server Component where cookie set throws, returning session anyway", async () => {
    mockCookies.set("zd_rt", { value: "refresh-token-456" });
    cookieSetThrows = true;

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "new-access-jwt",
          refresh_token: "new-refresh-token",
          expires_in: 900,
          user: {
            id: "gh:200",
            name: "Charlie",
            avatar_url: null,
            admin: false,
          },
        }),
        { status: 200 },
      ),
    );

    mockVerifyAccessToken.mockResolvedValueOnce({
      iss: "zen-dojo-sync",
      sub: "gh:200",
      sid: "session-3",
      adm: false,
      iat: 1000,
      exp: 1900,
    });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("gh:200");
    expect(session?.name).toBe("Charlie");
  });

  it("clears cookies and returns null when refresh is rejected (e.g. 401)", async () => {
    mockCookies.set("zd_rt", { value: "revoked-refresh-token" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: "invalid_grant" }), { status: 401 }),
    );

    const session = await getSession();
    expect(session).toBeNull();
    expect(mockCookies.has("zd_rt")).toBe(false);
  });

  it("coalesces concurrent refreshes for the same refresh token (single-flight)", async () => {
    mockCookies.set("zd_rt", { value: "same-refresh-token" });

    let fetchCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(
        JSON.stringify({
          access_token: "new-access-jwt",
          refresh_token: "new-refresh-token",
          expires_in: 900,
          user: { id: "gh:300", name: "David", avatar_url: null, admin: false },
        }),
        { status: 200 },
      );
    });

    mockVerifyAccessToken.mockResolvedValue({
      iss: "zen-dojo-sync",
      sub: "gh:300",
      sid: "s-300",
      adm: false,
      iat: 1000,
      exp: 1900,
    });

    const [s1, s2] = await Promise.all([getSession(), getSession()]);
    expect(fetchCount).toBe(1);
    expect(s1?.userId).toBe("gh:300");
    expect(s2?.userId).toBe("gh:300");
  });

  it("requireSession redirects when no session and returns session when present", async () => {
    // No session
    await expect(requireSession("/profile")).rejects.toThrow("REDIRECT:/login?next=%2Fprofile");
    expect(mockRedirect).toHaveBeenCalledWith("/login?next=%2Fprofile");

    // With session
    mockCookies.set("zd_at", { value: "valid-jwt" });
    mockVerifyAccessToken.mockResolvedValueOnce({
      iss: "zen-dojo-sync",
      sub: "gh:100",
      sid: "session-1",
      adm: false,
      iat: 1000,
      exp: 2000,
    });

    const session = await requireSession("/profile");
    expect(session.userId).toBe("gh:100");
  });

  it("requireAdmin redirects to /login?next=/admin when signed out", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login?next=/admin");
    expect(mockRedirect).toHaveBeenCalledWith("/login?next=/admin");
  });

  it("requireAdmin throws notFound() when signed in but not admin", async () => {
    mockCookies.set("zd_at", { value: "valid-jwt" });
    mockVerifyAccessToken.mockResolvedValueOnce({
      iss: "zen-dojo-sync",
      sub: "gh:100",
      sid: "session-1",
      adm: false,
      iat: 1000,
      exp: 2000,
    });

    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("requireAdmin returns session when signed in and admin is true", async () => {
    mockCookies.set("zd_at", { value: "valid-jwt" });
    mockVerifyAccessToken.mockResolvedValueOnce({
      iss: "zen-dojo-sync",
      sub: "gh:100",
      sid: "session-1",
      adm: true,
      iat: 1000,
      exp: 2000,
    });

    const session = await requireAdmin();
    expect(session.userId).toBe("gh:100");
    expect(session.admin).toBe(true);
  });

  it("workerFetch adds Bearer token, refreshes on 401, and retries once", async () => {
    mockCookies.set("zd_at", { value: "old-at" });
    mockCookies.set("zd_rt", { value: "valid-rt" });

    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (info, init) => {
      callCount++;
      const url = String(info);
      if (url.includes("/auth/token")) {
        return new Response(
          JSON.stringify({
            access_token: "refreshed-at",
            refresh_token: "new-rt",
            expires_in: 900,
            user: { id: "gh:100", name: "Alice", avatar_url: null, admin: false },
          }),
          { status: 200 },
        );
      }

      // First call with old-at returns 401
      const auth = new Headers(init?.headers).get("authorization");
      if (auth === "Bearer old-at") {
        return new Response("Unauthorized", { status: 401 });
      }
      if (auth === "Bearer refreshed-at") {
        return new Response(JSON.stringify({ ok: true, data: "success" }), { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    });

    mockVerifyAccessToken.mockResolvedValue({
      iss: "zen-dojo-sync",
      sub: "gh:100",
      sid: "session-1",
      adm: false,
      iat: 1000,
      exp: 2000,
    });

    const res = await workerFetch("/api/data");
    expect(res.status).toBe(200);
    expect(callCount).toBe(3);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: "success" });
  });
});
