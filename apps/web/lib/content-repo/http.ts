import "server-only";
import { connection } from "next/server";
import { revOf } from "@habit/shared";
import { getContentVersionCached } from "./version";

/** Versioned URLs (`?v=<current version>`) never change, so browsers and the CDN may keep them for a year. */
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/** True when If-None-Match lists the given ETag (weak or strong) or `*`. */
export function etagMatches(request: Request, etag: string): boolean {
  const header = request.headers.get("if-none-match");
  if (!header) return false;
  if (header.trim() === "*") return true;
  return header.split(",").some((tag) => tag.trim().replace(/^W\//, "") === etag);
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export type Served = {
  body: unknown;
  /** Lists have no single rev; they pass an ETag built from the version. Entities leave it out (ETag = revOf(body)). */
  etag?: string;
};

/**
 * Serves one public content JSON response (plan 0114 step 6):
 * - unknown id (load returns null) → 404, no-store;
 * - `v` missing or not the current version → 302 to the same path with the current `v`, no-store;
 * - `v` current → 200 with an immutable cache header and an ETag; `If-None-Match` → 304.
 * The ETag of an entity is revOf(body), which is the stored rev of problems, lessons, courses and docs.
 */
export async function serveVersioned(request: Request, load: (version: number) => Promise<Served | null>): Promise<Response> {
  await connection();
  const url = new URL(request.url);
  const current = await getContentVersionCached();
  const found = await load(current.version);
  if (!found) return notFound();

  if (url.searchParams.get("v") !== String(current.version)) {
    url.searchParams.set("v", String(current.version));
    return new Response(null, {
      status: 302,
      headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" },
    });
  }

  const etag = found.etag ?? `"${revOf(found.body)}"`;
  const headers = { ETag: etag, "Cache-Control": IMMUTABLE_CACHE };
  if (etagMatches(request, etag)) return new Response(null, { status: 304, headers });
  return Response.json(found.body, { headers });
}
