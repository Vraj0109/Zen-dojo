import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  base64UrlEncode,
  clearJwksCache,
  verifyAccessToken,
  type JwkKey,
} from "./jwks";

const ALG = { name: "ECDSA", hash: "SHA-256" } as const;

async function generateKeyPair(): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicJwk: JwkKey;
  privateJwk: JsonWebKey;
}> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const publicJwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as JwkKey;
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { ...pair, publicJwk, privateJwk };
}

async function signToken(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
): Promise<string> {
  const enc = new TextEncoder();
  const h = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const p = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const input = `${h}.${p}`;
  const sig = await crypto.subtle.sign(ALG, privateKey, enc.encode(input));
  const s = base64UrlEncode(new Uint8Array(sig));
  return `${input}.${s}`;
}

describe("jwks and verifyAccessToken", () => {
  let keyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let keyPair2: Awaited<ReturnType<typeof generateKeyPair>>;

  beforeEach(async () => {
    clearJwksCache();
    keyPair = await generateKeyPair();
    keyPair.publicJwk.kid = "key-1";
    keyPair.publicJwk.alg = "ES256";
    keyPair.publicJwk.use = "sig";

    keyPair2 = await generateKeyPair();
    keyPair2.publicJwk.kid = "key-2";
    keyPair2.publicJwk.alg = "ES256";
    keyPair2.publicJwk.use = "sig";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearJwksCache();
  });

  it("verifies a valid ES256 token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ keys: [keyPair.publicJwk] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const token = await signToken(
      { alg: "ES256", kid: "key-1", typ: "JWT" },
      {
        iss: "zen-dojo-sync",
        sub: "gh:12345",
        sid: "session-abc",
        adm: true,
        iat: nowSec - 10,
        exp: nowSec + 900,
      },
      keyPair.privateKey,
    );

    const claims = await verifyAccessToken(token);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe("gh:12345");
    expect(claims?.sid).toBe("session-abc");
    expect(claims?.adm).toBe(true);
    expect(claims?.iss).toBe("zen-dojo-sync");
  });

  it("rejects alg:none tokens", async () => {
    const enc = new TextEncoder();
    const h = base64UrlEncode(enc.encode(JSON.stringify({ alg: "none", typ: "JWT" })));
    const p = base64UrlEncode(
      enc.encode(
        JSON.stringify({
          iss: "zen-dojo-sync",
          sub: "gh:12345",
          sid: "s1",
          adm: false,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        }),
      ),
    );
    const unsignedToken = `${h}.${p}.`;

    const claims = await verifyAccessToken(unsignedToken);
    expect(claims).toBeNull();
  });

  it("rejects token with wrong issuer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ keys: [keyPair.publicJwk] }), { status: 200 }),
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const token = await signToken(
      { alg: "ES256", kid: "key-1" },
      {
        iss: "wrong-issuer",
        sub: "gh:12345",
        sid: "s1",
        adm: false,
        iat: nowSec - 10,
        exp: nowSec + 900,
      },
      keyPair.privateKey,
    );

    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("rejects expired token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ keys: [keyPair.publicJwk] }), { status: 200 }),
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const token = await signToken(
      { alg: "ES256", kid: "key-1" },
      {
        iss: "zen-dojo-sync",
        sub: "gh:12345",
        sid: "s1",
        adm: false,
        iat: nowSec - 1000,
        exp: nowSec - 50, // beyond 30s skew
      },
      keyPair.privateKey,
    );

    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("rejects token signed with wrong key", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ keys: [keyPair.publicJwk] }), { status: 200 }),
    );

    const nowSec = Math.floor(Date.now() / 1000);
    // Signed with keyPair2 but claiming kid: "key-1"
    const token = await signToken(
      { alg: "ES256", kid: "key-1" },
      {
        iss: "zen-dojo-sync",
        sub: "gh:12345",
        sid: "s1",
        adm: false,
        iat: nowSec - 10,
        exp: nowSec + 900,
      },
      keyPair2.privateKey,
    );

    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("refetches JWKS once on unknown kid and succeeds if key appears", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ keys: [keyPair.publicJwk] }), { status: 200 });
      }
      return new Response(JSON.stringify({ keys: [keyPair.publicJwk, keyPair2.publicJwk] }), {
        status: 200,
      });
    });

    const nowSec = Math.floor(Date.now() / 1000);
    const token = await signToken(
      { alg: "ES256", kid: "key-2" },
      {
        iss: "zen-dojo-sync",
        sub: "gh:99999",
        sid: "sess-2",
        adm: false,
        iat: nowSec - 10,
        exp: nowSec + 900,
      },
      keyPair2.privateKey,
    );

    const claims = await verifyAccessToken(token);
    expect(callCount).toBe(2);
    expect(claims?.sub).toBe("gh:99999");
  });
});
