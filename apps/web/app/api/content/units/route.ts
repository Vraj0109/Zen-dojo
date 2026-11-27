import { connection } from "next/server";
import { getContentDb } from "@/lib/content-db/client";
import { getContentVersion } from "@/lib/content-db/meta";
import { listUnits, redirectToVersion } from "@/lib/content-sync/serve";

// Public: the download units with their sizes (plan 0115 step 2). Versioned: `?v=` must be the current version,
// otherwise 302 to it. The answer for the current version never changes, so it is immutable.
export async function GET(request: Request) {
  await connection();
  const db = await getContentDb();
  const current = await getContentVersion(db);
  const url = new URL(request.url);
  if (url.searchParams.get("v") !== String(current)) return redirectToVersion(url, current);
  return Response.json(await listUnits(db), { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
}
