import { DOC_KINDS } from "@habit/shared";
import { serveVersioned } from "@/lib/content-repo/http";
import { listDocs } from "@/lib/content-repo/docs";

/** Every live doc of one kind. Unknown kinds are 404. */
export async function GET(request: Request, ctx: RouteContext<"/api/content/docs/[kind]">) {
  const { kind } = await ctx.params;
  return serveVersioned(request, async (version) => {
    if (!Object.hasOwn(DOC_KINDS, kind)) return null;
    return { body: await listDocs(kind), etag: `"list-${version}-${kind}"` };
  });
}
