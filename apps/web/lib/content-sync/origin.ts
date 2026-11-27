// Where the hosted content lives: the site's origin (no path, no trailing slash). Derived the way lib/hub/url.ts derives
// the hub URL, minus its "/hub" suffix. Pure: no I/O.

/** Used when nothing is configured (the desktop app, `pnpm dev`): the hosted site. */
export const DEFAULT_CONTENT_ORIGIN = "https://zen-dojo-lovat.vercel.app";

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/\/+$/, "");
}

/**
 * Order: CONTENT_ORIGIN, HUB_URL without its trailing "/hub", PUBLIC_SITE_URL, DEFAULT_CONTENT_ORIGIN.
 */
export function contentOrigin(env: Record<string, string | undefined> = process.env): string {
  const explicit = clean(env.CONTENT_ORIGIN);
  if (explicit) return explicit;
  const hub = clean(env.HUB_URL);
  if (hub) return hub.replace(/\/hub$/, "");
  const site = clean(env.PUBLIC_SITE_URL);
  if (site) return site;
  return DEFAULT_CONTENT_ORIGIN;
}
