import type { AccessClaims, AuthEnv } from "./types";
import { ACCESS_TTL_SECONDS } from "./types";
import { b64urlDecode, b64urlEncode, sha256B64url, utf8 } from "./util";

const ISSUER = "zen-dojo-sync";
const SKEW_SECONDS = 30;
const ALG = { name: "ECDSA", hash: "SHA-256" } as const;

interface Jwk {
  kty?: string;
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function parseJwk(raw: string): Jwk {
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== "object") throw new Error("bad jwk");
  return v as Jwk;
}

function publicOnly(jwk: Jwk): { kty: string; crv: string; x: string; y: string } {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) throw new Error("bad jwk");
  return { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y };
}

function importCached(kind: "sign" | "verify", jwk: JsonWebKey): Promise<CryptoKey> {
  const id = kind + ":" + JSON.stringify(jwk);
  let p = keyCache.get(id);
  if (!p) {
    p = crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [kind]);
    p.catch(() => keyCache.delete(id));
    keyCache.set(id, p);
  }
  return p;
}

/** RFC 7638 thumbprint of the public key. */
async function keyId(env: AuthEnv): Promise<string> {
  const p = publicOnly(parseJwk(env.JWT_PUBLIC_JWK));
  return sha256B64url(JSON.stringify({ crv: p.crv, kty: p.kty, x: p.x, y: p.y }));
}

export async function signAccessToken(
  env: AuthEnv,
  claims: AccessClaims,
  nowMs: number = Date.now(),
): Promise<{ token: string; expiresIn: number }> {
  const priv = parseJwk(env.JWT_PRIVATE_JWK);
  if (priv.kty !== "EC" || priv.crv !== "P-256" || !priv.d) throw new Error("bad private jwk");
  const key = await importCached("sign", { kty: "EC", crv: "P-256", x: priv.x, y: priv.y, d: priv.d });
  const iat = Math.floor(nowMs / 1000);
  const header = { alg: "ES256", typ: "JWT", kid: await keyId(env) };
  const payload = { iss: ISSUER, sub: claims.sub, sid: claims.sid, adm: claims.adm, iat, exp: iat + ACCESS_TTL_SECONDS };
  const input = b64urlEncode(utf8(JSON.stringify(header))) + "." + b64urlEncode(utf8(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign(ALG, key, utf8(input)));
  return { token: input + "." + b64urlEncode(sig), expiresIn: ACCESS_TTL_SECONDS };
}

export async function verifyAccessToken(
  token: string,
  env: AuthEnv,
  nowMs: number = Date.now(),
): Promise<AccessClaims | null> {
  try {
    if (typeof token !== "string" || token.length > 2048) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const headerBytes = b64urlDecode(h);
    const payloadBytes = b64urlDecode(p);
    const sig = b64urlDecode(s);
    if (!headerBytes || !payloadBytes || !sig || sig.length !== 64) return null;
    const dec = new TextDecoder();
    const header = JSON.parse(dec.decode(headerBytes)) as { alg?: unknown; kid?: unknown };
    if (header.alg !== "ES256") return null; // also rejects "none"
    const pub = publicOnly(parseJwk(env.JWT_PUBLIC_JWK));
    if (header.kid !== undefined && header.kid !== (await keyId(env))) return null;
    const key = await importCached("verify", pub);
    const ok = await crypto.subtle.verify(ALG, key, sig, utf8(h + "." + p));
    if (!ok) return null;
    const c = JSON.parse(dec.decode(payloadBytes)) as Record<string, unknown>;
    if (c.iss !== ISSUER) return null;
    if (typeof c.exp !== "number" || nowMs / 1000 > c.exp + SKEW_SECONDS) return null;
    if (typeof c.iat !== "number" || c.iat > nowMs / 1000 + SKEW_SECONDS) return null;
    if (typeof c.sub !== "string" || !c.sub.startsWith("gh:")) return null;
    if (typeof c.sid !== "string" || !c.sid || typeof c.adm !== "boolean") return null;
    return { sub: c.sub, sid: c.sid, adm: c.adm };
  } catch {
    return null;
  }
}

export async function jwks(env: AuthEnv): Promise<{ keys: Record<string, string>[] }> {
  const pub = publicOnly(parseJwk(env.JWT_PUBLIC_JWK));
  return { keys: [{ ...pub, kid: await keyId(env), alg: "ES256", use: "sig" }] };
}
