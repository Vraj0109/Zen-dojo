import { connection } from "next/server";
import { etagMatches } from "@/lib/content-repo/http";
import { getContentVersionCached } from "@/lib/content-repo/version";

/** The current content version, shape version and epoch. Short browser and CDN cache: clients poll this. */
export async function GET(request: Request) {
  await connection();
  const current = await getContentVersionCached();
  const etag = `"v${current.version}-s${current.schema}-e${current.epoch}"`;
  const headers = { ETag: etag, "Cache-Control": "public, max-age=30, s-maxage=30" };
  if (etagMatches(request, etag)) return new Response(null, { status: 304, headers });
  return Response.json(current, { headers });
}
