import { listProblemSummaries } from "@/lib/content-repo/problems";
import { serveVersioned } from "@/lib/content-repo/http";

/** Every live problem, summary columns only. */
export async function GET(request: Request) {
  return serveVersioned(request, async (version) => ({ body: await listProblemSummaries(), etag: `"list-${version}"` }));
}
