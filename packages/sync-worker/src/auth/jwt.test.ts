import { describe, expect, it } from "vitest";
import { jwks, signAccessToken, verifyAccessToken } from "./jwt";
import { makeEnv } from "./test-helpers";
import { b64urlEncode, utf8 } from "./util";

const claims = { sub: "gh:1", sid: "sess1", adm: true };
const NOW = 1_800_000_000_000;

function swapPayload(token: string, patch: Record<string, unknown>): string {
  const [h, p, s] = token.split(".");
  const obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
  return `${h}.${b64urlEncode(utf8(JSON.stringify({ ...obj, ...patch })))}.${s}`;
}

describe("jwt", () => {
  it("round trips", async () => {
    const env = await makeEnv();
    const { token, expiresIn } = await signAccessToken(env, claims, NOW);
    expect(expiresIn).toBe(900);
    expect(await verifyAccessToken(token, env, NOW + 1000)).toEqual(claims);
  });

  it("rejects an expired token but tolerates 30 s of skew", async () => {
    const env = await makeEnv();
    const { token } = await signAccessToken(env, claims, NOW);
    expect(await verifyAccessToken(token, env, NOW + 900_000 + 29_000)).not.toBeNull();
    expect(await verifyAccessToken(token, env, NOW + 900_000 + 31_000)).toBeNull();
  });

  it("rejects a token signed by another key", async () => {
    const a = await makeEnv();
    const b = await makeEnv();
    const { token } = await signAccessToken(a, claims, NOW);
    expect(await verifyAccessToken(token, b, NOW)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const env = await makeEnv();
    const { token } = await signAccessToken(env, { ...claims, adm: false }, NOW);
    expect(await verifyAccessToken(swapPayload(token, { adm: true }), env, NOW)).toBeNull();
  });

  it("rejects alg none", async () => {
    const env = await makeEnv();
    const header = b64urlEncode(utf8(JSON.stringify({ alg: "none", typ: "JWT" })));
    const payload = b64urlEncode(
      utf8(JSON.stringify({ iss: "zen-dojo-sync", sub: "gh:1", sid: "s", adm: true, iat: NOW / 1000, exp: NOW / 1000 + 900 })),
    );
    expect(await verifyAccessToken(`${header}.${payload}.`, env, NOW)).toBeNull();
    expect(await verifyAccessToken(`${header}.${payload}.${b64urlEncode(new Uint8Array(64))}`, env, NOW)).toBeNull();
  });

  it("rejects the wrong issuer even with a valid signature", async () => {
    const env = await makeEnv();
    const priv = JSON.parse(env.JWT_PRIVATE_JWK);
    const key = await crypto.subtle.importKey("jwk", priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const h = b64urlEncode(utf8(JSON.stringify({ alg: "ES256", typ: "JWT" })));
    const p = b64urlEncode(
      utf8(JSON.stringify({ iss: "someone-else", sub: "gh:1", sid: "s", adm: false, iat: NOW / 1000, exp: NOW / 1000 + 900 })),
    );
    const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(`${h}.${p}`)));
    expect(await verifyAccessToken(`${h}.${p}.${b64urlEncode(sig)}`, env, NOW)).toBeNull();
  });

  it("rejects garbage", async () => {
    const env = await makeEnv();
    for (const t of ["", "a.b", "a.b.c.d", "x".repeat(5000)]) expect(await verifyAccessToken(t, env, NOW)).toBeNull();
  });

  it("publishes the public key with a kid and no private part", async () => {
    const env = await makeEnv();
    const set = await jwks(env);
    expect(set.keys).toHaveLength(1);
    expect(set.keys[0].kid).toBeTruthy();
    expect(set.keys[0].alg).toBe("ES256");
    expect("d" in set.keys[0]).toBe(false);
  });
});
