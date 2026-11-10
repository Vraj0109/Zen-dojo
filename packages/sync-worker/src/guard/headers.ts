// Hardening helpers (plan 0049 B3). Standard Web APIs only.

/** Security headers for a response to `pathname`. /auth and /api are never cached. */
export function securityHeaders(pathname: string, base?: HeadersInit): Headers {
  const h = new Headers(base);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  if (pathname.startsWith("/auth") || pathname.startsWith("/api")) {
    h.set("Cache-Control", "no-store");
  }
  return h;
}

/** Parse ALLOWED_ORIGIN (comma list). A literal "*" entry is ignored: credentialed routes never get a wildcard. */
export function allowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => s !== "" && s !== "*");
}

/**
 * Strict CORS check. `allowed` is true when the request has no Origin header (not a browser cross-origin call)
 * or its Origin exactly matches the list. `headers` holds the CORS response headers (empty when not allowed).
 */
export function checkCors(req: Request, allowedOrigin: string | undefined): { allowed: boolean; headers: Headers } {
  const headers = new Headers();
  const origin = req.headers.get("Origin");
  if (!origin) return { allowed: true, headers };
  const list = allowedOrigins(allowedOrigin);
  if (!list.includes(origin)) return { allowed: false, headers };
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "600");
  return { allowed: true, headers };
}

export type LimitedBody = { ok: true; bytes: Uint8Array; text: string } | { ok: false; reason: "too_large" | "unreadable" };

/** Reads the body as a stream and aborts as soon as it passes `maxBytes`, without buffering the rest. */
export async function readBodyLimited(req: Request, maxBytes: number): Promise<LimitedBody> {
  const declared = Number(req.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    try {
      await req.body?.cancel();
    } catch {
      /* ignore */
    }
    return { ok: false, reason: "too_large" };
  }
  if (!req.body) return { ok: true, bytes: new Uint8Array(0), text: "" };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, bytes, text: new TextDecoder().decode(bytes) };
}
