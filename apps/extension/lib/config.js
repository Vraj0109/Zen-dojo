// @ts-check
export const DEFAULT_APP_URL = "http://localhost:3000";

/** Only local addresses are allowed (they're also the only ones in host_permissions). */
export function normalizeAppUrl(/** @type {string} */ raw) {
  let url;
  try {
    url = new URL(raw.trim() || DEFAULT_APP_URL);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname)) return null;
  return url.origin;
}
