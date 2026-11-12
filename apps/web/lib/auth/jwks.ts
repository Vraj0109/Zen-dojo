import type { AccessTokenClaims } from "./types";
import { hubBaseUrl, hubUrl } from "../hub/url";

const ISSUER = "zen-dojo-sync";
const SKEW_SECONDS = 30;
const ALG = { name: "ECDSA", hash: "SHA-256" } as const;

export function getWorkerUrl(): string {
  return hubBaseUrl("auth");
}

function getCacheTtlMs(): number {
  const s = parseInt(process.env.AUTH_JWKS_CACHE_SECONDS || "3600", 10);
  return (Number.isFinite(s) && s > 0 ? s : 3600) * 1000;
}

export interface JwkKey extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

interface CachedJwks {
  keys: JwkKey[];
  fetchedAt: number;
}

let jwksCache: CachedJwks | null = null;
const keyCryptoCache = new Map<string, CryptoKey>();

export function clearJwksCache(): void {
  jwksCache = null;
  keyCryptoCache.clear();
}

export function base64UrlDecode(str: string): Uint8Array | null {
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function fetchJwks(forceRefresh = false): Promise<JwkKey[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && now - jwksCache.fetchedAt < getCacheTtlMs()) {
    return jwksCache.keys;
  }

  const workerUrl = getWorkerUrl();
  const jwksUrl = hubUrl("/.well-known/jwks.json", workerUrl);
  const res = await fetch(jwksUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS: status ${res.status}`);
  }

  const data = (await res.json()) as { keys?: JwkKey[] };
  if (!data || !Array.isArray(data.keys)) {
    throw new Error("Invalid JWKS response shape");
  }

  jwksCache = {
    keys: data.keys,
    fetchedAt: now,
  };
  return data.keys;
}

async function getCryptoKey(jwk: JwkKey): Promise<CryptoKey | null> {
  const cacheKey = JSON.stringify(jwk);
  const cached = keyCryptoCache.get(cacheKey);
  if (cached) return cached;

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    keyCryptoCache.set(cacheKey, key);
    return key;
  } catch {
    return null;
  }
}

export async function verifyAccessToken(
  token: string,
  nowMs: number = Date.now(),
): Promise<AccessTokenClaims | null> {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  const headerBytes = base64UrlDecode(h);
  const payloadBytes = base64UrlDecode(p);
  const sigBytes = base64UrlDecode(s);
  if (!headerBytes || !payloadBytes || !sigBytes || sigBytes.length !== 64) {
    return null;
  }

  let header: { alg?: unknown; kid?: unknown };
  let payload: Record<string, unknown>;
  try {
    const dec = new TextDecoder();
    header = JSON.parse(dec.decode(headerBytes)) as { alg?: unknown; kid?: unknown };
    payload = JSON.parse(dec.decode(payloadBytes)) as Record<string, unknown>;
  } catch {
    return null;
  }

  // Reject alg:none or anything other than ES256
  if (header.alg !== "ES256") return null;

  // Validate claims
  if (payload.iss !== ISSUER) return null;
  if (typeof payload.sub !== "string" || !payload.sub.startsWith("gh:")) return null;
  if (typeof payload.sid !== "string" || !payload.sid) return null;
  if (typeof payload.adm !== "boolean") return null;
  if (typeof payload.exp !== "number" || typeof payload.iat !== "number") return null;

  const nowSec = nowMs / 1000;
  if (nowSec > payload.exp + SKEW_SECONDS) return null;
  if (payload.iat > nowSec + SKEW_SECONDS) return null;

  // Find matching key in JWKS
  let keys: JwkKey[];
  try {
    keys = await fetchJwks();
  } catch {
    return null;
  }

  const findKey = (targetKeys: JwkKey[]) => {
    if (header.kid) {
      return targetKeys.find((k) => k.kid === header.kid);
    }
    // If token header has no kid, try the first key if there is one
    return targetKeys[0];
  };

  let matchingKey = findKey(keys);
  // On unknown kid, refetch JWKS once and retry
  if (!matchingKey && header.kid) {
    try {
      keys = await fetchJwks(true);
      matchingKey = findKey(keys);
    } catch {
      return null;
    }
  }

  if (!matchingKey) return null;

  const cryptoKey = await getCryptoKey(matchingKey);
  if (!cryptoKey) return null;

  const enc = new TextEncoder();
  const data = enc.encode(`${h}.${p}`);
  const sigBuffer = sigBytes.buffer.slice(
    sigBytes.byteOffset,
    sigBytes.byteOffset + sigBytes.byteLength,
  ) as ArrayBuffer;
  const ok = await crypto.subtle.verify(ALG, cryptoKey, sigBuffer, data);
  if (!ok) return null;

  return {
    iss: payload.iss,
    sub: payload.sub,
    sid: payload.sid,
    adm: payload.adm,
    iat: payload.iat,
    exp: payload.exp,
  };
}
