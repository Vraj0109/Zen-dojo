import { exportPackJson } from "@/lib/packs";

// Downloads a stored content pack as a .json file (the "Download this pack" link on the pack page).
export async function GET(_request: Request, ctx: RouteContext<"/api/packs/[id]/download">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(id)) return Response.json({ error: "Unknown pack." }, { status: 404 });
  const json = await exportPackJson(id);
  if (!json) return Response.json({ error: "Unknown pack." }, { status: 404 });
  return new Response(json, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${id}.json"`, "Cache-Control": "no-store" } });
}
