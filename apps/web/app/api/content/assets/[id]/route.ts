import { connection } from "next/server";
import { getAssetFile } from "@/lib/content-repo/assets";
import { etagMatches, IMMUTABLE_CACHE } from "@/lib/content-repo/http";

const ASSET_ID = /^[0-9a-f]{64}$/;

/** One stored image. The id is the SHA-256 of the bytes, so the response never changes. */
export async function GET(request: Request, ctx: RouteContext<"/api/content/assets/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const asset = ASSET_ID.test(id) ? await getAssetFile(id) : null;
  if (!asset) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const etag = `"${asset.id}"`;
  const headers = {
    ETag: etag,
    "Cache-Control": IMMUTABLE_CACHE,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
  if (etagMatches(request, etag)) return new Response(null, { status: 304, headers });
  return new Response(asset.bytes, { headers: { ...headers, "Content-Type": asset.mime } });
}
