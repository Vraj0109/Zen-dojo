import { hostedNotFound } from "@/lib/hosted/no-run";
import { authorizeExtension, getKnownSubmissionIds, getSiteSlugs } from "@/lib/leetcode/extension";

/**
 * Extension: check the pairing key; list submission ids already stored (so they aren't re-fetched)
 * and the LeetCode slugs this app tracks (roadmap + other synced problems), so the import can skip the rest.
 */
export async function GET(request: Request) {
  const gone = hostedNotFound();
  if (gone) return gone;
  const denied = await authorizeExtension(request);
  if (denied) return denied;
  const [known, slugs] = await Promise.all([getKnownSubmissionIds(), getSiteSlugs()]);
  return Response.json({ ok: true, known, slugs });
}
