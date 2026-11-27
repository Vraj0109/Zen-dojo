import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AdminDeniedError,
  isAdminClaims,
  requireAdminAction,
  requireAdminPage,
  requireAdminRequest,
} from "./admin";
import { base64UrlEncode, clearJwksCache } from "./jwks";
import * as sessionModule from "./session";

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

describe("isAdminClaims", () => {
  it("truth table covers adm false, adm true + list empty, not in list, in list with spaces", () => {
    // 1. adm false -> false
    expect(isAdminClaims({ adm: false, sub: "gh:1" }, { ADMIN_USER_IDS: "" })).toBe(false);
    expect(isAdminClaims({ adm: false, sub: "gh:1" }, { ADMIN_USER_IDS: "gh:1" })).toBe(false);
    expect(isAdminClaims(null)).toBe(false);
    expect(isAdminClaims(undefined)).toBe(false);

    // 2. adm true + list empty -> true
    expect(isAdminClaims({ adm: true, sub: "gh:1" }, {})).toBe(true);
    expect(isAdminClaims({ adm: true, sub: "gh:1" }, { ADMIN_USER_IDS: "" })).toBe(true);
    expect(isAdminClaims({ adm: true, sub: "gh:1" }, { ADMIN_USER_IDS: "   " })).toBe(true);

    // 3. adm true + not in list -> false
    expect(isAdminClaims({ adm: true, sub: "gh:1" }, { ADMIN_USER_IDS: "gh:2, gh:3" })).toBe(false);

    // 4. adm true + in list with spaces -> true
    expect(isAdminClaims({ adm: true, sub: "gh:1" }, { ADMIN_USER_IDS: "  gh:2 , gh:1 , gh:3  " })).toBe(true);
  });
});

describe("requireAdminRequest", () => {
  let keyPair: CryptoKeyPair;
  let publicJwk: JsonWebKey & { kid: string; alg: string };

  beforeEach(async () => {
    clearJwksCache();
    vi.clearAllMocks();
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.ADMIN_USER_IDS;

    keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const exported = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    publicJwk = { ...exported, kid: "test-kid", alg: "ES256" };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
      const url = String(info);
      if (url.includes("/.well-known/jwks.json")) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function makeToken(
    claims: Record<string, unknown>,
    header: Record<string, unknown> = { alg: "ES256", kid: "test-kid" },
  ): Promise<string> {
    const enc = new TextEncoder();
    const h = base64UrlEncode(enc.encode(JSON.stringify(header)));
    const p = base64UrlEncode(enc.encode(JSON.stringify(claims)));
    const data = enc.encode(`${h}.${p}`);
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, data);
    const s = base64UrlEncode(new Uint8Array(sig));
    return `${h}.${p}.${s}`;
  }

  function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      iss: "zen-dojo-sync",
      sub: "gh:100",
      sid: "session-1",
      adm: true,
      iat: nowSec,
      exp: nowSec + 900,
      ...overrides,
    };
  }

  it("answers 401 when no auth is provided", async () => {
    const req = new Request("http://localhost:3000/api/admin/content");
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.response.status).toBe(401);
      const json = await res.response.json();
      expect(json).toEqual({ error: "sign-in-required" });
    }
  });

  it("answers 401 on bearer with bad signature", async () => {
    const token = await makeToken(validPayload());
    const badToken = token.slice(0, -6) + "xxxxxx";
    const req = new Request("http://localhost:3000/api/admin/content", {
      headers: { authorization: `Bearer ${badToken}` },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("answers 401 on bearer with alg: none", async () => {
    const enc = new TextEncoder();
    const h = base64UrlEncode(enc.encode(JSON.stringify({ alg: "none" })));
    const p = base64UrlEncode(enc.encode(JSON.stringify(validPayload())));
    const token = `${h}.${p}.`;
    const req = new Request("http://localhost:3000/api/admin/content", {
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("answers 401 on swapped payload (adm: true on a non-admin token)", async () => {
    // Sign a non-admin token
    const nonAdmin = await makeToken(validPayload({ adm: false }));
    const [h, , s] = nonAdmin.split(".");
    // Craft new payload with adm: true without recalculating signature
    const enc = new TextEncoder();
    const pAdmin = base64UrlEncode(enc.encode(JSON.stringify(validPayload({ adm: true }))));
    const forged = `${h}.${pAdmin}.${s}`;

    const req = new Request("http://localhost:3000/api/admin/content", {
      headers: { authorization: `Bearer ${forged}` },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("answers 401 on expired token", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredToken = await makeToken(validPayload({ exp: nowSec - 60 }));
    const req = new Request("http://localhost:3000/api/admin/content", {
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("answers 403 on valid non-admin token", async () => {
    const nonAdmin = await makeToken(validPayload({ adm: false }));
    const req = new Request("http://localhost:3000/api/admin/content", {
      headers: { authorization: `Bearer ${nonAdmin}` },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.response.status).toBe(403);
      expect(await res.response.json()).toEqual({ error: "not-admin" });
    }
  });

  it("answers 403 on admin token where user is not in ADMIN_USER_IDS", async () => {
    process.env.ADMIN_USER_IDS = "gh:999, gh:888";
    const adminToken = await makeToken(validPayload({ sub: "gh:100", adm: true }));
    const req = new Request("http://localhost:3000/api/admin/content", {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });

  it("succeeds on admin token where user is in ADMIN_USER_IDS", async () => {
    process.env.ADMIN_USER_IDS = "  gh:999 , gh:100  ";
    const adminToken = await makeToken(validPayload({ sub: "gh:100", adm: true }));
    const req = new Request("http://localhost:3000/api/admin/content", {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.proof.userId).toBe("gh:100");
    }
  });

  it("answers 403 on cookie POST with foreign Origin", async () => {
    process.env.PUBLIC_SITE_URL = "https://app.example.com";
    const adminToken = await makeToken(validPayload());
    const req = new Request("https://app.example.com/api/admin/content", {
      method: "POST",
      headers: {
        cookie: `zd_at=${adminToken}`,
        origin: "https://evil.com",
      },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });

  it("succeeds on cookie POST with matching Origin", async () => {
    process.env.PUBLIC_SITE_URL = "https://app.example.com";
    const adminToken = await makeToken(validPayload());
    const req = new Request("https://app.example.com/api/admin/content", {
      method: "POST",
      headers: {
        cookie: `zd_at=${adminToken}; zd_u=${encodeURIComponent(JSON.stringify({ name: "Alice" }))}`,
        origin: "https://app.example.com",
      },
    });
    const res = await requireAdminRequest(req);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.proof.userId).toBe("gh:100");
      expect(res.proof.name).toBe("Alice");
    }
  });
});

describe("requireAdminPage & requireAdminAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requireAdminPage redirects when signed out", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue(null);
    vi.spyOn(sessionModule, "hasRefreshCookie").mockResolvedValue(false);

    await expect(requireAdminPage("/admin")).rejects.toThrow("REDIRECT:/login?next=/admin");
  });

  it("requireAdminPage throws notFound when signed in but not admin", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue({
      userId: "gh:100",
      name: "Alice",
      avatarUrl: null,
      admin: false,
      expiresAt: Date.now() + 1000,
      sessionId: "s1",
    });

    await expect(requireAdminPage("/admin")).rejects.toThrow("NOT_FOUND");
  });

  it("requireAdminPage returns proof when admin", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue({
      userId: "gh:100",
      name: "Alice",
      avatarUrl: null,
      admin: true,
      expiresAt: Date.now() + 1000,
      sessionId: "s1",
    });

    const proof = await requireAdminPage("/admin");
    expect(proof.userId).toBe("gh:100");
    expect(proof.name).toBe("Alice");
  });

  it("requireAdminAction throws AdminDeniedError when not admin", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue(null);
    await expect(requireAdminAction()).rejects.toThrow(AdminDeniedError);

    vi.spyOn(sessionModule, "getSession").mockResolvedValue({
      userId: "gh:100",
      name: "Alice",
      avatarUrl: null,
      admin: false,
      expiresAt: Date.now() + 1000,
      sessionId: "s1",
    });
    await expect(requireAdminAction()).rejects.toThrow(AdminDeniedError);
  });

  it("requireAdminAction returns proof when admin", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValue({
      userId: "gh:100",
      name: "Alice",
      avatarUrl: null,
      admin: true,
      expiresAt: Date.now() + 1000,
      sessionId: "s1",
    });

    const proof = await requireAdminAction();
    expect(proof.userId).toBe("gh:100");
  });
});
