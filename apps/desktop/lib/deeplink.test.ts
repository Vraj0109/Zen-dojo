import { describe, expect, it } from "vitest";
import { PROTOCOL, findDeepLink, hubOrigins, isWorkerRedirect, parseAuthDeepLink } from "./deeplink.js";

describe("PROTOCOL", () => {
  it("equals zendojo", () => {
    expect(PROTOCOL).toBe("zendojo");
  });
});

describe("parseAuthDeepLink", () => {
  it("parses valid auth deep links", () => {
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc&state=xyz")).toEqual({
      code: "abc",
      state: "xyz",
    });
    // Supports reversed query parameter order
    expect(parseAuthDeepLink("zendojo://auth/callback?state=xyz_123&code=abc-456")).toEqual({
      code: "abc-456",
      state: "xyz_123",
    });
    // Supports trailing slash on pathname
    expect(parseAuthDeepLink("zendojo://auth/callback/?code=abc&state=xyz")).toEqual({
      code: "abc",
      state: "xyz",
    });
    // Protocol is case-insensitive
    expect(parseAuthDeepLink("ZENDOJO://auth/callback?code=abc&state=xyz")).toEqual({
      code: "abc",
      state: "xyz",
    });
    // Host is case-insensitive
    expect(parseAuthDeepLink("zendojo://AUTH/callback?code=abc&state=xyz")).toEqual({
      code: "abc",
      state: "xyz",
    });
  });

  it("accepts tokens up to exactly 512 characters of [A-Za-z0-9_-]", () => {
    const longToken = "a".repeat(512);
    expect(parseAuthDeepLink(`zendojo://auth/callback?code=${longToken}&state=${longToken}`)).toEqual({
      code: longToken,
      state: longToken,
    });
  });

  it("rejects extra query parameters", () => {
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc&state=xyz&evil=1")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc&state=xyz&utm_source=hack")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc&state=xyz&code=dup")).toBeNull();
  });

  it("rejects wrong host or wrong path", () => {
    expect(parseAuthDeepLink("zendojo://evil/callback?code=abc&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/token?code=abc&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback/extra?code=abc&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/?code=abc&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://callback?code=abc&state=xyz")).toBeNull();
  });

  it("rejects wrong protocol", () => {
    expect(parseAuthDeepLink("https://auth/callback?code=abc&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("custom://auth/callback?code=abc&state=xyz")).toBeNull();
  });

  it("rejects oversized code or state (> 512 characters)", () => {
    const oversized = "a".repeat(513);
    expect(parseAuthDeepLink(`zendojo://auth/callback?code=${oversized}&state=xyz`)).toBeNull();
    expect(parseAuthDeepLink(`zendojo://auth/callback?code=abc&state=${oversized}`)).toBeNull();
  });

  it("rejects illegal characters in code or state", () => {
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc def&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc;drop&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=<script>&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc&state=xyz%20bad")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc!&state=xyz")).toBeNull();
  });

  it("rejects empty or missing parameters", () => {
    expect(parseAuthDeepLink("zendojo://auth/callback?code=&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc&state=")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?code=abc")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback?state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth/callback")).toBeNull();
  });

  it("rejects userinfo and port", () => {
    expect(parseAuthDeepLink("zendojo://user:pass@auth/callback?code=abc&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://user@auth/callback?code=abc&state=xyz")).toBeNull();
    expect(parseAuthDeepLink("zendojo://auth:8080/callback?code=abc&state=xyz")).toBeNull();
  });

  it("returns null on invalid inputs without throwing", () => {
    expect(parseAuthDeepLink("")).toBeNull();
    expect(parseAuthDeepLink("not a url")).toBeNull();
    expect(parseAuthDeepLink(null)).toBeNull();
    expect(parseAuthDeepLink(undefined)).toBeNull();
    expect(parseAuthDeepLink(123)).toBeNull();
  });
});

describe("findDeepLink", () => {
  it("finds the first deep link in argv", () => {
    const argv = ["node.exe", "main.js", "--dev", "zendojo://auth/callback?code=abc&state=xyz"];
    expect(findDeepLink(argv)).toBe("zendojo://auth/callback?code=abc&state=xyz");
  });

  it("returns null if no deep link is found", () => {
    expect(findDeepLink(["node.exe", "main.js", "--dev"])).toBeNull();
    expect(findDeepLink([])).toBeNull();
  });

  it("handles case-insensitive scheme prefix", () => {
    expect(findDeepLink(["ZENDOJO://auth/callback?code=1&state=2"])).toBe("ZENDOJO://auth/callback?code=1&state=2");
  });

  it("handles null or non-array argv safely", () => {
    expect(findDeepLink(null)).toBeNull();
    expect(findDeepLink(undefined)).toBeNull();
    // @ts-expect-error test invalid type
    expect(findDeepLink("zendojo://auth/callback")).toBeNull();
  });
});

describe("isWorkerRedirect", () => {
  const workerOrigin = "https://zen-dojo-sync.habit-sync-worker.workers.dev";

  it("returns true for matching worker origins", () => {
    expect(isWorkerRedirect("https://zen-dojo-sync.habit-sync-worker.workers.dev/auth/login", workerOrigin)).toBe(true);
    expect(isWorkerRedirect("https://zen-dojo-sync.habit-sync-worker.workers.dev/api/status", workerOrigin)).toBe(true);
  });

  it("handles workerOrigin with trailing slash", () => {
    expect(isWorkerRedirect("https://zen-dojo-sync.habit-sync-worker.workers.dev/auth/login", `${workerOrigin}/`)).toBe(true);
  });

  it("returns false for different origins", () => {
    expect(isWorkerRedirect("https://github.com/login/oauth/authorize", workerOrigin)).toBe(false);
    expect(isWorkerRedirect("http://127.0.0.1:3000/auth/callback", workerOrigin)).toBe(false);
    expect(isWorkerRedirect("https://attacker-zen-dojo-sync.habit-sync-worker.workers.dev", workerOrigin)).toBe(false);
    expect(isWorkerRedirect("https://zen-dojo-sync.habit-sync-worker.workers.dev.evil.com", workerOrigin)).toBe(false);
  });

  it("returns false for invalid inputs without throwing", () => {
    expect(isWorkerRedirect("not a url", workerOrigin)).toBe(false);
    expect(isWorkerRedirect(null, workerOrigin)).toBe(false);
    expect(isWorkerRedirect("https://example.com", "not a url")).toBe(false);
    expect(isWorkerRedirect(undefined, undefined)).toBe(false);
  });
});

describe("hubOrigins and both origins", () => {
  const site = "https://zen-dojo.example.app";
  const list = hubOrigins({ HUB_URL: `${site}/hub`, PUBLIC_SITE_URL: "not a url" });

  it("always includes the old Worker and adds the new site origin", () => {
    expect(list).toContain("https://zen-dojo-sync.habit-sync-worker.workers.dev");
    expect(list).toContain(site);
    expect(hubOrigins({})).toEqual(["https://zen-dojo-lovat.vercel.app", "https://zen-dojo-sync.habit-sync-worker.workers.dev"]);
  });

  it("accepts the new and the old origin, refuses look-alikes", () => {
    expect(isWorkerRedirect(`${site}/hub/auth/github/start`, list)).toBe(true);
    expect(isWorkerRedirect("https://zen-dojo-sync.habit-sync-worker.workers.dev/auth/x", list)).toBe(true);
    expect(isWorkerRedirect("https://zen-dojo.example.app.evil.com/hub", list)).toBe(false);
    expect(isWorkerRedirect("https://evil-zen-dojo.example.app/", list)).toBe(false);
    expect(isWorkerRedirect("http://zen-dojo.example.app/", list)).toBe(false);
    expect(isWorkerRedirect("https://github.com/login", list)).toBe(false);
  });
});
