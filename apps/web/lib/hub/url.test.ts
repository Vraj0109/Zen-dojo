import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_WORKER_URL, hubBaseUrl, hubUrl } from "./url";

const NAMES = ["HUB_URL", "AUTH_WORKER_URL", "SYNC_WORKER_URL", "PUBLIC_SITE_URL"];
function clear() {
  for (const n of NAMES) vi.stubEnv(n, "");
}

afterEach(() => vi.unstubAllEnvs());

describe("hubBaseUrl", () => {
  it("falls back to the old Worker URL", () => {
    clear();
    expect(hubBaseUrl()).toBe(LEGACY_WORKER_URL);
  });

  it("uses PUBLIC_SITE_URL + /hub, trimming slashes", () => {
    clear();
    vi.stubEnv("PUBLIC_SITE_URL", "https://dojo.example//");
    expect(hubBaseUrl()).toBe("https://dojo.example/hub");
  });

  it("HUB_URL beats everything; old names still override the site", () => {
    clear();
    vi.stubEnv("PUBLIC_SITE_URL", "https://dojo.example");
    vi.stubEnv("AUTH_WORKER_URL", "https://auth.example/");
    vi.stubEnv("SYNC_WORKER_URL", "https://sync.example");
    expect(hubBaseUrl()).toBe("https://auth.example");
    expect(hubBaseUrl("sync")).toBe("https://sync.example");
    vi.stubEnv("HUB_URL", "https://dojo.example/hub/");
    expect(hubBaseUrl()).toBe("https://dojo.example/hub");
  });
});

describe("hubUrl", () => {
  it("keeps the /hub prefix (new URL(path, base) would drop it)", () => {
    expect(hubUrl("/auth/token", "https://dojo.example/hub")).toBe("https://dojo.example/hub/auth/token");
    expect(hubUrl("/api/sync?since=1", "https://dojo.example/hub/")).toBe("https://dojo.example/hub/api/sync?since=1");
    expect(hubUrl("/.well-known/jwks.json", "https://w.example")).toBe("https://w.example/.well-known/jwks.json");
  });

  it("defaults to the current base", () => {
    clear();
    vi.stubEnv("HUB_URL", "https://dojo.example/hub");
    expect(hubUrl("/api/sync/head")).toBe("https://dojo.example/hub/api/sync/head");
  });
});
