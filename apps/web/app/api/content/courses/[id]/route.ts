import { getCourse } from "@/lib/content-repo/courses";
import { serveVersioned } from "@/lib/content-repo/http";

/** One course with its lesson summaries. */
export async function GET(request: Request, ctx: RouteContext<"/api/content/courses/[id]">) {
  const { id } = await ctx.params;
  return serveVersioned(request, async () => {
    const course = await getCourse(id);
    return course ? { body: course } : null;
  });
}
