import { listCourses } from "@/lib/content-repo/courses";
import { serveVersioned } from "@/lib/content-repo/http";

/** Every live course with its lesson summaries. */
export async function GET(request: Request) {
  return serveVersioned(request, async (version) => ({ body: await listCourses(), etag: `"list-${version}"` }));
}
