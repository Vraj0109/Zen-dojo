import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Agent A owns the real storage files; here they are stubbed with the same names (plan 0073 contracts).
vi.mock("./db", () => ({ getHubDb: async () => ({}) }));
vi.mock("./rate-limit", () => ({ createRateLimiter: () => ({ limit: async () => ({ success: true }) }) }));
vi.mock("./d1", () => {
  const stmt = {
    bind: () => stmt,
    first: async () => null,
    all: async () => ({ results: [] }),
    run: async () => ({ success: true, meta: { changes: 1 } }),
  };
  return { createD1FromLibsql: () => ({ prepare: () => stmt, batch: async () => [] }) };
});

import { hubFetch, stripHubPrefix } from "./handler";
import { DELETE, GET, OPTIONS, POST, PUT } from "../../app/hub/[...path]/route";

const PUBLIC_JWK = { kty: "EC", crv: "P-256", x: "0MnAyLV6DqpjQq4Q2aTJEZEtXb1NE0t0gdqOJa9uD3U", y: "SgVcB_dYQk4GI_gcxzds0QHyWstLXT4GL8t_2uRqzUI" };
const SITE = "https://site.test";
const SAVED = { ...process.env };

beforeEach(() => {
  process.env.JWT_PUBLIC_JWK = JSON.stringify(PUBLIC_JWK);
  process.env.JWT_PRIVATE_JWK = "{}";
  process.env.GITHUB_CLIENT_ID = "test-client";
  process.env.GITHUB_CLIENT_SECRET = "test-secret";
  process.env.ALLOWED_REDIRECTS = `${SITE}/auth/callback`;
});
afterEach(() => {
  process.env = { ...SAVED };
});

describe("stripHubPrefix", () => {
  it("removes only the leading /hub segment", () => {
    expect(stripHubPrefix("/hub/auth/token")).toBe("/auth/token");
    expect(stripHubPrefix("/hub/.well-known/jwks.json")).toBe("/.well-known/jwks.json");
    expect(stripHubPrefix("/hub")).toBe("/");
    expect(stripHubPrefix("/hubby/x")).toBe("/hubby/x");
  });
});

describe("hubFetch", () => {
  it("serves the public key from the environment", async () => {
    const res = await hubFetch(new Request(`${SITE}/hub/.well-known/jwks.json`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { keys: Array<Record<string, string>> };
    expect(body.keys[0].x).toBe(PUBLIC_JWK.x);
    expect(body.keys[0].y).toBe(PUBLIC_JWK.y);
  });

  it("ignores a client-supplied CF-Connecting-IP (rate limits use Vercel's address)", async () => {
    const seen: string[] = [];
    vi.doMock("./rate-limit", () => ({
      createRateLimiter: () => ({ limit: async ({ key }: { key: string }) => (seen.push(key), { success: true }) }),
    }));
    vi.resetModules();
    const { hubFetch: fresh } = await import("./handler");
    await fresh(
      new Request(`${SITE}/hub/api/public/u/none`, { headers: { "cf-connecting-ip": "6.6.6.6", "x-real-ip": "1.2.3.4" } }),
    );
    expect(seen).toContain("1.2.3.4");
    expect(seen).not.toContain("6.6.6.6");
    vi.doUnmock("./rate-limit");
  });
});

describe("route", () => {
  it("exports every method", () => {
    for (const h of [GET, POST, PUT, DELETE, OPTIONS]) expect(typeof h).toBe("function");
  });

  it("answers OPTIONS", async () => {
    const res = await OPTIONS(new Request(`${SITE}/hub/api/sync`, { method: "OPTIONS" }));
    expect(res.status).toBe(204);
  });

  it("404s an unknown public profile", async () => {
    const res = await GET(new Request(`${SITE}/hub/api/public/u/none`));
    expect(res.status).toBe(404);
  });

  it("401s a sync call without a token", async () => {
    const res = await POST(new Request(`${SITE}/hub/api/sync`, { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("redirects sign-in start to github.com for an allowed redirect", async () => {
    const q = new URLSearchParams({
      redirect_uri: `${SITE}/auth/callback`,
      state: "a".repeat(32),
      code_challenge: "b".repeat(43),
    });
    const res = await GET(new Request(`${SITE}/hub/auth/github/start?${q}`));
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location") ?? "").host).toBe("github.com");
  });

  it("refuses a redirect that is not allowed", async () => {
    const q = new URLSearchParams({ redirect_uri: "https://evil.test/auth/callback", state: "a".repeat(32), code_challenge: "b".repeat(43) });
    const res = await GET(new Request(`${SITE}/hub/auth/github/start?${q}`));
    expect(res.status).toBe(400);
  });
});
