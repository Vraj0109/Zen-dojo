// Plan 0073: where the sync hub (sign-in, sync, public profile API) lives: the site's own /hub route on Vercel. Pure: no I/O,
// no secrets.

/** Used when nothing is configured (the desktop app, `pnpm dev`): the hosted site's hub. */
export const DEFAULT_HUB_URL = "https://zen-dojo-lovat.vercel.app/hub";

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/\/+$/, "");
}

/**
 * Base URL of the hub, without a trailing slash (it may carry the /hub prefix, so build URLs with `hubUrl`, never
 * `new URL(path, base)`, which would drop the prefix).
 * Order: HUB_URL, the old overrides (AUTH_WORKER_URL / SYNC_WORKER_URL; `prefer` picks which comes first),
 * PUBLIC_SITE_URL + "/hub", DEFAULT_HUB_URL.
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
  return DEFAULT_HUB_URL;
}

/** `base + path` (path starts with "/"). Keeps any prefix in the base. */
export function hubUrl(path: string, base: string = hubBaseUrl()): string {
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
