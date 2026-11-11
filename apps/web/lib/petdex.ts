// Plan 0069 (B). Pure helpers for importing a pet from petdex.dev. No I/O here.

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Accepts https://petdex.dev/pets/<slug> (also www., trailing slash, query, hash). Anything else is null. */
export function parsePetdexUrl(input: string): { slug: string; pageUrl: string } | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase();
  if (host !== "petdex.dev" && host !== "www.petdex.dev") return null;
  const m = /^\/pets\/([^/]+)\/?$/.exec(u.pathname);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  if (!SLUG.test(slug)) return null;
  return { slug, pageUrl: `https://petdex.dev/pets/${slug}` };
}

/** Finds https://assets.petdex.dev/pets/<slug>-<hex>/zip.zip in the page. Null when absent (never guesses). */
export function findZipUrl(html: string, slug: string): string | null {
  if (!SLUG.test(slug)) return null;
  const re = new RegExp(`https://assets\\.petdex\\.dev/pets/${slug.replace(/[^a-z0-9-]/g, "")}-[0-9a-f]{6,32}/zip\\.zip`, "i");
  const m = re.exec(html);
  return m ? m[0] : null;
}

/** True only for the exact asset host over https with no credentials or port. */
export function isAssetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "assets.petdex.dev" && !u.username && !u.password && !u.port;
  } catch {
    return false;
  }
}
