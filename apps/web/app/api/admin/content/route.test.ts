import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";
import { base64UrlEncode, clearJwksCache } from "@/lib/auth/jwks";
import { getItem } from "@/lib/content";

describe("/api/admin/content route", () => {
  let keyPair: CryptoKeyPair;
  let publicJwk: JsonWebKey & { kid: string; alg: string };

  beforeEach(async () => {
    process.env.DATABASE_URL = ":memory:";
    delete (globalThis as { habitDb?: unknown }).habitDb;
    delete process.env.ADMIN_USER_IDS;
    delete process.env.PUBLIC_SITE_URL;
    clearJwksCache();
    vi.clearAllMocks();

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

  async function makeToken(claims: Record<string, unknown>): Promise<string> {
    const enc = new TextEncoder();
    const h = base64UrlEncode(enc.encode(JSON.stringify({ alg: "ES256", kid: "test-kid" })));
    const p = base64UrlEncode(enc.encode(JSON.stringify(claims)));
    const data = enc.encode(`${h}.${p}`);
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, data);
    const s = base64UrlEncode(new Uint8Array(sig));
    return `${h}.${p}.${s}`;
  }

  function tokenPayload(adm: boolean, sub = "gh:100"): Record<string, unknown> {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      iss: "zen-dojo-sync",
      sub,
      sid: "session-1",
      adm,
      iat: nowSec,
      exp: nowSec + 900,
    };
  }

  const req = (method: string, path = "", token?: string, body?: unknown) =>
    new Request(`http://localhost:3000/api/admin/content${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  it("answers 401 for anonymous requests on GET, POST and DELETE", async () => {
    expect((await GET(req("GET"))).status).toBe(401);
    expect((await POST(req("POST", "", undefined, []))).status).toBe(401);
    expect((await DELETE(req("DELETE", "?id=problem:x"))).status).toBe(401);
  });

  it("answers 403 for valid non-admin token on GET, POST and DELETE", async () => {
    const nonAdmin = await makeToken(tokenPayload(false));
    expect((await GET(req("GET", "", nonAdmin))).status).toBe(403);
    expect((await POST(req("POST", "", nonAdmin, []))).status).toBe(403);
    expect((await DELETE(req("DELETE", "?id=problem:x", nonAdmin))).status).toBe(403);
  });

  it("answers 403 for admin token not in ADMIN_USER_IDS", async () => {
    process.env.ADMIN_USER_IDS = "gh:999";
    const adminNotAllowed = await makeToken(tokenPayload(true, "gh:100"));
    expect((await GET(req("GET", "", adminNotAllowed))).status).toBe(403);
  });

  it("allows admin requests on GET, POST and DELETE", async () => {
    const admin = await makeToken(tokenPayload(true));

    // GET empty list
    const getRes = await GET(req("GET", "", admin));
    expect(getRes.status).toBe(200);
    const listBody = await getRes.json();
    expect(listBody).toHaveProperty("items");

    // POST an item (reading link)
    const postItem = {
      type: "reading",
      id: "test-reading",
      title: "Test Reading",
      url: "https://example.com/test",
    };
    const postRes = await POST(req("POST", "", admin, postItem));
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.results[0]).toMatchObject({ ok: true, id: "reading:test-reading" });
    expect(await getItem("reading:test-reading")).not.toBeNull();

    // GET single item
    const getSingle = await GET(req("GET", "?id=reading:test-reading", admin));
    expect(getSingle.status).toBe(200);
    expect((await getSingle.json()).id).toBe("reading:test-reading");

    // DELETE item
    const delRes = await DELETE(req("DELETE", "?id=reading:test-reading", admin));
    expect(delRes.status).toBe(200);
    expect(await delRes.json()).toEqual({ removed: "reading:test-reading" });
    expect(await getItem("reading:test-reading")).toBeNull();
  });
});
