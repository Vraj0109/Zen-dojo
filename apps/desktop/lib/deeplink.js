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

/** The hosted site, where the hub (sign-in and sync) lives. Always accepted. */
export const DEFAULT_HUB_ORIGIN = "https://zen-dojo-lovat.vercel.app";

/** The old Cloudflare Worker origin. Still accepted while old and new builds sign in during the move (plan 0073). */
export const LEGACY_WORKER_ORIGIN = "https://zen-dojo-sync.habit-sync-worker.workers.dev";

/**
 * Origins the sign-in may legitimately bounce through: the old Worker, plus the new site (HUB_URL, the old
 * AUTH_WORKER_URL override, or PUBLIC_SITE_URL). Invalid values are skipped. Never throws.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function hubOrigins(env) {
  const out = new Set([DEFAULT_HUB_ORIGIN, LEGACY_WORKER_ORIGIN]);
  for (const v of [env.HUB_URL, env.AUTH_WORKER_URL, env.SYNC_WORKER_URL, env.PUBLIC_SITE_URL]) {
    if (!v) continue;
    try {
      const o = new URL(v.trim()).origin;
      if (o !== "null") out.add(o);
    } catch {
      // ignore a malformed override
    }
  }
  return [...out];
}

/**
 * Safely parses url and checks if its origin equals the origin of workerOrigin (a string, or a list of strings:
 * any match is enough). Exact origin match only, so look-alike hosts are refused. Never throws.
 *
 * @param {unknown} url
 * @param {unknown} workerOrigin
 * @returns {boolean}
 */
export function isWorkerRedirect(url, workerOrigin) {
  if (typeof url !== "string") return false;
  const list = Array.isArray(workerOrigin) ? workerOrigin : [workerOrigin];
  try {
    const targetOrigin = new URL(url).origin;
    if (targetOrigin === "null") return false;
    for (const o of list) {
      if (typeof o !== "string") continue;
      try {
        if (new URL(o).origin === targetOrigin) return true;
      } catch {
        // skip a malformed origin
      }
    }
    return false;
  } catch {
    return false;
  }
}
