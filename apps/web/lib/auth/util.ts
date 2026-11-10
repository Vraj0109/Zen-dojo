import { base64UrlEncode } from "./jwks";

/**
 * Validates `next` query parameter.
 * Must be a same-origin relative path starting with a single "/",
 * not "//", containing no backslashes, schemes, or control characters.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/";
  if (next.length > 1024) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(next)) return "/";
  return next;
}

/**
 * Checks if the request is from the same origin using Origin or Referer against Host.
 */
export function checkSameOrigin(req: Request): boolean {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const u = new URL(origin);
      return u.host.toLowerCase() === host.toLowerCase();
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      return u.host.toLowerCase() === host.toLowerCase();
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generates cryptographically secure random base64url string.
 */
export function randomBase64Url(byteCount: number = 32): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * Computes S256 code challenge from a code verifier.
 */
export async function computeS256(verifier: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(verifier));
  return base64UrlEncode(new Uint8Array(hash));
}
