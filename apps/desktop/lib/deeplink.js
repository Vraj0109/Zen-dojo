// @ts-check
// Helpers for desktop sign-in deep linking (zendojo://auth/callback?code=...&state=...).

export const PROTOCOL = "zendojo";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Validates and parses an incoming auth deep link.
 * Must match zendojo://auth/callback?code=...&state=...
 * Query parameters must contain ONLY code and state.
 * Returns { code, state } or null if invalid. Never throws.
 *
 * @param {unknown} url
 * @returns {{ code: string, state: string } | null}
 */
export function parseAuthDeepLink(url) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol.toLowerCase() !== `${PROTOCOL}:`) return null;
    if (parsed.username || parsed.password || parsed.port) return null;
    if (parsed.host.toLowerCase() !== "auth") return null;

    const pathname = parsed.pathname.toLowerCase();
    if (pathname !== "/callback" && pathname !== "/callback/") return null;

    const params = parsed.searchParams;
    const keys = Array.from(params.keys());
    if (keys.length !== 2) return null;
    if (!params.has("code") || !params.has("state")) return null;

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) return null;
    if (code.length > 512 || state.length > 512) return null;
    if (!TOKEN_PATTERN.test(code) || !TOKEN_PATTERN.test(state)) return null;

    return { code, state };
  } catch {
    return null;
  }
}

/**
 * Scans argv and returns the first element that starts with zendojo://, or null if not found.
 *
 * @param {readonly string[] | string[] | undefined | null} argv
 * @returns {string | null}
 */
export function findDeepLink(argv) {
  if (!Array.isArray(argv)) return null;
  for (const arg of argv) {
    if (typeof arg === "string" && arg.toLowerCase().startsWith(`${PROTOCOL}://`)) {
      return arg;
    }
  }
  return null;
}

/**
 * Safely parses url and checks if its origin equals new URL(workerOrigin).origin.
 * Never throws.
 *
 * @param {unknown} url
 * @param {unknown} workerOrigin
 * @returns {boolean}
 */
export function isWorkerRedirect(url, workerOrigin) {
  if (typeof url !== "string" || typeof workerOrigin !== "string") return false;
  try {
    const targetOrigin = new URL(url).origin;
    const expectedOrigin = new URL(workerOrigin).origin;
    return targetOrigin !== "null" && targetOrigin === expectedOrigin;
  } catch {
    return false;
  }
}
