// Plan 0073: where the sync hub (sign-in, sync, public profile API) lives. It is the site's own /hub route now; the old
// Cloudflare Worker address stays only as the last-resort fallback until cutover is done. Pure: no I/O, no secrets.

/** Last resort. Documented in plan 0073; remove with the Worker. */
export const LEGACY_WORKER_URL = "https://zen-dojo-sync.habit-sync-worker.workers.dev";

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/\/+$/, "");
}

/**
 * Base URL of the hub, without a trailing slash (it may carry the /hub prefix, so build URLs with `hubUrl`, never
 * `new URL(path, base)`, which would drop the prefix).
 * Order: HUB_URL, the old overrides (AUTH_WORKER_URL / SYNC_WORKER_URL; `prefer` picks which comes first),
 * PUBLIC_SITE_URL + "/hub", the old Worker URL.
 */
export function hubBaseUrl(prefer: "auth" | "sync" = "auth"): string {
  const env = process.env;
  const legacy = prefer === "sync" ? [env.SYNC_WORKER_URL, env.AUTH_WORKER_URL] : [env.AUTH_WORKER_URL, env.SYNC_WORKER_URL];
  for (const v of [env.HUB_URL, ...legacy]) {
    const c = clean(v);
    if (c) return c;
  }
  const site = clean(env.PUBLIC_SITE_URL);
  if (site) return `${site}/hub`;
  return LEGACY_WORKER_URL;
}

/** `base + path` (path starts with "/"). Keeps any prefix in the base. */
export function hubUrl(path: string, base: string = hubBaseUrl()): string {
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
