import { connection } from "next/server";
import { getDiagramImage } from "@/lib/diagrams";

/** Serve an uploaded diagram image. */
export async function GET(_request: Request, ctx: RouteContext<"/api/diagrams/[id]">) {
  await connection();
  const id = Number((await ctx.params).id);
  const img = Number.isInteger(id) && id > 0 ? await getDiagramImage(id) : null;
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
