import { getLesson } from "@/lib/content-repo/courses";
import { serveVersioned } from "@/lib/content-repo/http";

/** One lesson with its page. */
export async function GET(request: Request, ctx: RouteContext<"/api/content/lessons/[id]">) {
  const { id } = await ctx.params;
  return serveVersioned(request, async () => {
    const lesson = await getLesson(id);
    return lesson ? { body: lesson } : null;
  });
}
