import { connection } from "next/server";
import { getContentDb } from "@/lib/content-db/client";
import { buildChanges } from "@/lib/content-sync/serve";

const NO_STORE = { "Cache-Control": "no-store" };

// Public: the part-level changes after `since`, for the units asked for (plan 0115 step 3). `units` is a comma list,
// or "all" (or absent) for every unit. 410 when `since` is older than the oldest kept change: download the units again.
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  if (sinceParam === null || !/^\d+$/.test(sinceParam)) {
    return Response.json({ error: "Give ?since=<version>, a whole number." }, { status: 400, headers: NO_STORE });
  }
  const raw = url.searchParams.get("units");
  const units = raw === null || raw === "all" ? null : raw.split(",").map((u) => u.trim()).filter(Boolean);

  const db = await getContentDb();
  const result = await buildChanges(db, { since: Number(sinceParam), units });
  if (result.gone) {
    return Response.json({ error: "Too far behind: download the units again.", oldest: result.oldest }, { status: 410, headers: NO_STORE });
  }
  return Response.json(result.page, { headers: { "Cache-Control": "public, max-age=30" } });
}
