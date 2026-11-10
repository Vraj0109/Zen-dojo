const enc = new TextEncoder();

export function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(input: string) {
  if (!/^[A-Za-z0-9_-]*$/.test(input)) return null;
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function utf8(s: string) {
  return enc.encode(s);
}

export async function sha256(s: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(s)));
}

export async function sha256Hex(s: string): Promise<string> {
  return [...(await sha256(s))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256B64url(s: string): Promise<string> {
  return b64urlEncode(await sha256(s));
}

/** 256-bit random value, base64url. */
export function randomToken(bytes = 32): string {
  return b64urlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Constant-time string comparison (length difference is folded in, no early exit). */
export function timingSafeEqual(a: string, b: string): boolean {
  const x = utf8(a);
  const y = utf8(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function json(body: unknown, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export function fail(status: number, error: string): Response {
  return json({ ok: false, error }, status);
}

export function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") ?? "unknown";
}

/** Reads a small JSON object body. Returns null when missing, too large, or not an object. */
export async function readJsonObject(req: Request, maxBytes = 8192): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) return null;
  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }
  if (text.length > maxBytes) return null;
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
