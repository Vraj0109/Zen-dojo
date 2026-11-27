import { serveVersioned } from "@/lib/content-repo/http";
import { getProblem } from "@/lib/content-repo/problems";

/** One problem with its cases, hints, statement and solution. */
export async function GET(request: Request, ctx: RouteContext<"/api/content/problems/[id]">) {
  const { id } = await ctx.params;
  return serveVersioned(request, async () => {
    const problem = await getProblem(id);
    return problem ? { body: problem } : null;
  });
}
