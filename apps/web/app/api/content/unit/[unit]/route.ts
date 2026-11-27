import { connection } from "next/server";
import { getContentDb } from "@/lib/content-db/client";
import { getContentVersion } from "@/lib/content-db/meta";
import { redirectToVersion, unitKind, unitPages } from "@/lib/content-sync/serve";

const NO_STORE = { "Cache-Control": "no-store" };

// Public: one page of a unit's entities and images (plan 0115 step 2). `?v=` must be the current version, otherwise 302.
// `page` counts from 0; a page is at most 3 MB of JSON.
export async function GET(request: Request, ctx: { params: Promise<{ unit: string }> }) {
  await connection();
  const db = await getContentDb();
  const current = await getContentVersion(db);
  const url = new URL(request.url);
  if (url.searchParams.get("v") !== String(current)) return redirectToVersion(url, current);

  const { unit } = await ctx.params;
  if (!unitKind(unit)) return new Response("Not found", { status: 404, headers: NO_STORE });
  const pageParam = url.searchParams.get("page") ?? "0";
  if (!/^\d+$/.test(pageParam)) return Response.json({ error: "page must be a whole number." }, { status: 400, headers: NO_STORE });

  const page = (await unitPages(db, unit))[Number(pageParam)];
  if (!page) return new Response("Not found", { status: 404, headers: NO_STORE });
  return Response.json(page, { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
}
