import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCookiesMap = new Map<string, { value: string; options?: unknown }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const c = mockCookiesMap.get(name);
      return c ? { name, value: c.value } : undefined;
    },
    set: (name: string, value: string, options?: unknown) => {
      mockCookiesMap.set(name, { value, options });
    },
    delete: (name: string) => {
      mockCookiesMap.delete(name);
    },
  }),
}));

import { GET as startHandler } from "./start/route";
import { GET as callbackHandler } from "./callback/route";
import { POST as logoutHandler } from "./logout/route";
import { clearDesktopPkce, rememberDesktopPkce, takeDesktopPkce } from "@/lib/auth/desktop-pkce";

describe("Auth route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesMap.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /auth/start", () => {
    it("redirects 302 to Worker with PKCE challenge and sets zd_pkce cookie", async () => {
      const req = new Request("http://localhost:3000/auth/start?next=/profile/account", {
        headers: { host: "localhost:3000" },
      });

      const res = await startHandler(req);
      expect(res.status).toBe(302);

      const location = res.headers.get("location");
      expect(location).toBeTruthy();
      const redirectUrl = new URL(location!);
      expect(redirectUrl.pathname).toBe("/hub/auth/github/start");
      expect(redirectUrl.searchParams.get("redirect_uri")).toBe("http://localhost:3000/auth/callback");
      expect(redirectUrl.searchParams.get("state")).toBeTruthy();
      expect(redirectUrl.searchParams.get("code_challenge")).toBeTruthy();

      const pkceCookie = res.cookies.get("zd_pkce");
      expect(pkceCookie).toBeTruthy();
      const parsed = JSON.parse(pkceCookie!.value);
      expect(parsed.state).toBe(redirectUrl.searchParams.get("state"));
      expect(parsed.next).toBe("/profile/account");
    });

    it("uses the loopback redirect_uri when HABIT_DESKTOP is unset", async () => {
      vi.stubEnv("HABIT_DESKTOP", "");
      const req = new Request("http://127.0.0.1:3000/auth/start", { headers: { host: "127.0.0.1:3000" } });
      const res = await startHandler(req);
      vi.unstubAllEnvs();
      const redirectUrl = new URL(res.headers.get("location")!);
      expect(redirectUrl.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3000/auth/callback");
    });

    it("uses the zendojo deep link as redirect_uri when HABIT_DESKTOP=1", async () => {
      vi.stubEnv("HABIT_DESKTOP", "1");
      const req = new Request("http://127.0.0.1:3000/auth/start?next=/profile/account", {
        headers: { host: "127.0.0.1:3000" },
      });
      const res = await startHandler(req);
      vi.unstubAllEnvs();

      expect(res.status).toBe(302);
      const location = res.headers.get("location")!;
      expect(location).toContain("redirect_uri=zendojo%3A%2F%2Fauth%2Fcallback");
      const redirectUrl = new URL(location);
      expect(redirectUrl.pathname).toBe("/hub/auth/github/start");
      expect(redirectUrl.searchParams.get("state")).toBeTruthy();
      expect(redirectUrl.searchParams.get("code_challenge")).toBeTruthy();
      const parsed = JSON.parse(res.cookies.get("zd_pkce")!.value);
      expect(parsed.state).toBe(redirectUrl.searchParams.get("state"));
      expect(parsed.verifier).toBeTruthy();
      expect(parsed.next).toBe("/profile/account");
    });

    it("sanitizes open-redirect attempts in next parameter", async () => {
      const evilUrls = [
        "https://evil.com",
        "//evil.com/path",
        "/\\evil.com",
        "javascript:alert(1)",
      ];

      for (const evil of evilUrls) {
        const req = new Request(`http://localhost:3000/auth/start?next=${encodeURIComponent(evil)}`, {
          headers: { host: "localhost:3000" },
        });

        const res = await startHandler(req);
        const pkceCookie = res.cookies.get("zd_pkce");
        const parsed = JSON.parse(pkceCookie!.value);
        expect(parsed.next).toBe("/");
      }
    });
  });

  describe("GET /auth/callback", () => {
    it("redirects to /login?error=no_pkce on missing zd_pkce cookie", async () => {
      const req = new Request("http://localhost:3000/auth/callback?code=abc&state=xyz");
      const res = await callbackHandler(req);

      expect(res.status).toBe(302);
      expect(new URL(res.headers.get("location")!).searchParams.get("error")).toBe("no_pkce");
    });

    it("redirects to /login?error=state_mismatch on state mismatch", async () => {
      mockCookiesMap.set("zd_pkce", {
        value: JSON.stringify({ state: "expected-state", verifier: "v123", next: "/dashboard" }),
      });

      const req = new Request("http://localhost:3000/auth/callback?code=abc&state=wrong-state");
      const res = await callbackHandler(req);

      expect(res.status).toBe(302);
      expect(new URL(res.headers.get("location")!).searchParams.get("error")).toBe("state_mismatch");
    });

    it("exchanges code for tokens, sets cookies, deletes zd_pkce and redirects to next", async () => {
      mockCookiesMap.set("zd_pkce", {
        value: JSON.stringify({ state: "valid-state", verifier: "v123", next: "/profile/account" }),
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "jwt.access.token",
            refresh_token: "rt-456",
            expires_in: 900,
            user: { id: "gh:12345", name: "Octocat", avatar_url: "https://avatar.png", admin: false },
          }),
          { status: 200 },
        ),
      );

      const req = new Request("http://localhost:3000/auth/callback?code=code-123&state=valid-state");
      const res = await callbackHandler(req);

      expect(res.status).toBe(302);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/profile/account");

      expect(res.cookies.get("zd_at")?.value).toBe("jwt.access.token");
      expect(res.cookies.get("zd_rt")?.value).toBe("rt-456");
      expect(res.cookies.get("zd_pkce")?.value).toBe(""); // deleted
    });
  });

  describe("GET /auth/callback error codes", () => {
    const withCookie = () =>
      mockCookiesMap.set("zd_pkce", { value: JSON.stringify({ state: "s1", verifier: "v1", next: "/" }) });
    const errorOf = (res: Response) => new URL(res.headers.get("location")!).searchParams.get("error");

    it("missing: no code or no state", async () => {
      expect(errorOf(await callbackHandler(new Request("http://localhost:3000/auth/callback?state=s1")))).toBe("missing");
      expect(errorOf(await callbackHandler(new Request("http://localhost:3000/auth/callback?code=c")))).toBe("missing");
    });

    it("token_unreachable, token_refused, rate_limited and token_bad, each with one log line and no secrets", async () => {
      const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const req = () => new Request("http://localhost:3000/auth/callback?code=secret-code&state=s1");

      withCookie();
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("down"));
      expect(errorOf(await callbackHandler(req()))).toBe("token_unreachable");

      withCookie();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 400 }));
      expect(errorOf(await callbackHandler(req()))).toBe("token_refused");

      withCookie();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 429 }));
      expect(errorOf(await callbackHandler(req()))).toBe("rate_limited");

      withCookie();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 200 }));
      expect(errorOf(await callbackHandler(req()))).toBe("token_bad");

      const lines = log.mock.calls.map((c) => c.join(" "));
      expect(lines).toEqual([
        "auth callback: token_unreachable",
        "auth callback: token_refused (HTTP 400)",
        "auth callback: rate_limited (HTTP 429)",
        "auth callback: token_bad (HTTP 200)",
      ]);
      for (const l of lines) expect(l).not.toMatch(/secret-code|s1|v1/);
    });
  });

  describe("desktop PKCE kept on the server", () => {
    beforeEach(() => clearDesktopPkce());
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.useRealTimers();
    });
    const okToken = () =>
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "at", refresh_token: "rt" }), { status: 200 }),
      );

    async function desktopStart(): Promise<string> {
      vi.stubEnv("HABIT_DESKTOP", "1");
      const res = await startHandler(new Request("http://127.0.0.1:3000/auth/start?next=/dsa", { headers: { host: "127.0.0.1:3000" } }));
      return new URL(res.headers.get("location")!).searchParams.get("state")!;
    }

    it("desktop start stores the PKCE; callback works without the cookie, once", async () => {
      const state = await desktopStart();
      okToken();
      const req = () => new Request(`http://127.0.0.1:3000/auth/callback?code=c&state=${state}`, { headers: { host: "127.0.0.1:3000" } });
      const res = await callbackHandler(req());
      expect(res.headers.get("location")).toBe("http://127.0.0.1:3000/dsa");
      expect(res.cookies.get("zd_at")?.value).toBe("at");
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      expect(new URL((await callbackHandler(req())).headers.get("location")!).searchParams.get("error")).toBe("no_pkce");
    });

    it("an entry expires after 10 minutes", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 10, 14, 12, 0, 0));
      const state = await desktopStart();
      vi.setSystemTime(new Date(2026, 10, 14, 12, 10, 1));
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const res = await callbackHandler(new Request(`http://127.0.0.1:3000/auth/callback?code=c&state=${state}`));
      expect(new URL(res.headers.get("location")!).searchParams.get("error")).toBe("no_pkce");
    });

    it("web mode never stores or reads the map", async () => {
      vi.stubEnv("HABIT_DESKTOP", "");
      const res = await startHandler(new Request("http://localhost:3000/auth/start", { headers: { host: "localhost:3000" } }));
      const state = new URL(res.headers.get("location")!).searchParams.get("state")!;
      expect(takeDesktopPkce(state)).toBeNull();
      // Even a stored entry is ignored on the web.
      rememberDesktopPkce(state, { verifier: "v", next: "/" });
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const cb = await callbackHandler(new Request(`http://localhost:3000/auth/callback?code=c&state=${state}`));
      expect(new URL(cb.headers.get("location")!).searchParams.get("error")).toBe("no_pkce");
      expect(takeDesktopPkce(state)).not.toBeNull();
    });
  });

  describe("GET /auth/callback regardless of Host", () => {
    it("exchanges the code and redirects to the host the client used", async () => {
      mockCookiesMap.set("zd_pkce", {
        value: JSON.stringify({ state: "s1", verifier: "v1", next: "/profile/account" }),
      });
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "at", refresh_token: "rt" }), { status: 200 }),
      );

      // req.url carries the bind address; the Host header is what the window used.
      const req = new Request("http://0.0.0.0:3000/auth/callback?code=c&state=s1", {
        headers: { host: "127.0.0.1:4567" },
      });
      const res = await callbackHandler(req);

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("http://127.0.0.1:4567/profile/account");
      expect(res.cookies.get("zd_at")?.value).toBe("at");
      expect(res.cookies.get("zd_rt")?.value).toBe("rt");
    });

    it("still errors on state mismatch with a different Host", async () => {
      mockCookiesMap.set("zd_pkce", { value: JSON.stringify({ state: "s1", verifier: "v1" }) });
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const req = new Request("http://0.0.0.0:3000/auth/callback?code=c&state=other", {
        headers: { host: "127.0.0.1:4567" },
      });
      const res = await callbackHandler(req);
      expect(res.headers.get("location")).toBe("http://127.0.0.1:4567/login?error=state_mismatch");
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("POST /auth/logout", () => {
    it("rejects request if same-origin check fails", async () => {
      const req = new Request("http://localhost:3000/auth/logout", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://evil.com",
        },
      });

      const res = await logoutHandler(req);
      expect(res.status).toBe(403);
    });

    it("clears cookies and calls worker logout on valid same-origin request", async () => {
      mockCookiesMap.set("zd_rt", { value: "my-rt-token" });

      let workerLogoutBody: unknown;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (info, init) => {
        if (String(info).includes("/auth/logout")) {
          workerLogoutBody = JSON.parse(String(init?.body));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response("Not found", { status: 404 });
      });

      const req = new Request("http://localhost:3000/auth/logout", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });

      const res = await logoutHandler(req);
      expect(res.status).toBe(200);
      expect(workerLogoutBody).toEqual({ refresh_token: "my-rt-token" });

      expect(res.cookies.get("zd_at")?.value).toBe("");
      expect(res.cookies.get("zd_rt")?.value).toBe("");
    });
  });
});
