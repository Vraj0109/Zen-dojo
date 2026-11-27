import { DOC_KINDS } from "@habit/shared";
import { getDoc } from "@/lib/content-repo/docs";
import { serveVersioned } from "@/lib/content-repo/http";

/** One doc. Unknown kinds are 404. */
export async function GET(request: Request, ctx: RouteContext<"/api/content/docs/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  return serveVersioned(request, async () => {
    if (!Object.hasOwn(DOC_KINDS, kind)) return null;
    const doc = await getDoc(kind, id);
    return doc ? { body: doc } : null;
  });
}
