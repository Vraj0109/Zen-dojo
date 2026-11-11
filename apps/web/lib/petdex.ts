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

/**
 * Finds the pet's own zip link on its page: https://assets.petdex.dev/pets/<name>-<hex>/zip.zip.
 * The folder name is not always the page slug (the page "luffy-2" serves "luffy-0a3b70887f85"), so the slug is not used to
 * build it. A pet page has exactly one zip link; if there are several, the one that starts with the slug's base name wins,
 * otherwise null (never guesses).
 */
export function findZipUrl(html: string, slug: string): string | null {
  if (!SLUG.test(slug)) return null;
  const all = Array.from(new Set(html.match(/https:\/\/assets\.petdex\.dev\/pets\/[a-z0-9][a-z0-9-]{0,80}-[0-9a-f]{6,32}\/zip\.zip/gi) ?? []));
  if (all.length === 1) return all[0];
  if (all.length === 0) return null;
  const base = slug.replace(/-\d+$/, "");
  const own = all.filter((u) => u.toLowerCase().includes(`/pets/${base}-`));
  return own.length === 1 ? own[0] : null;
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
