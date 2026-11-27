import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { contentDatabaseUrl, getContentDb } from "@/lib/content-db/client";
import { isHosted } from "@/lib/hosted";
import { isLocalRequest } from "@/lib/content-sync/local";
import { contentOrigin } from "@/lib/content-sync/origin";
import { syncContent } from "@/lib/content-sync/sync";
import { desktopNotices, startedUnits } from "@/lib/content-sync/desktop-notices";
import { recordNotices } from "@/lib/content-notices";
import { getFollowMute } from "@/lib/content-follow";
import { getDb } from "@/lib/db";
import { conceptProgress, problemSolves } from "@/lib/schema";
import { summaryLine } from "@habit/shared";

const NO_STORE = { "Cache-Control": "no-store" };

// Local only (plan 0115 step 5): the desktop app calls this on a timer and from Settings. It pulls the changes from the
// hosted site into the local content copy and expires the cache tags of what changed. Refused unless this is the
// desktop app (HABIT_DESKTOP=1) and the request is local. On the hosted site it does not exist (404).
export async function POST(request: Request) {
  if (isHosted()) return new Response("Not found", { status: 404 });
  await connection();
  if (process.env.HABIT_DESKTOP !== "1" || !isLocalRequest(request)) {
    return Response.json({ error: "Sync runs only in the desktop app, from this computer." }, { status: 403, headers: NO_STORE });
  }
  const dbUrl = contentDatabaseUrl();
  if (!dbUrl.startsWith("file:") && dbUrl !== ":memory:") {
    return Response.json({ error: "The local content copy is not a local file." }, { status: 409, headers: NO_STORE });
  }

  const db = await getContentDb();
  const result = await syncContent({ db, fetch, origin: contentOrigin(), units: "all", now: Date.now() });
  for (const tag of result.tags) revalidateTag(tag, { expire: 0 });

  // Update notices (plan 0119): only "Tell learners" changes in units this person has started, or one
  // "Content was refreshed" notice after a full resync. Notices are best effort: a failure never fails the sync.
  let notices = "";
  if (result.refreshed || (result.entries ?? []).some((e) => e.notify)) {
    try {
      const userDb = await getDb();
      const solved = await userDb.select({ id: problemSolves.problemId }).from(problemSolves);
      const concepts = await userDb.select({ id: conceptProgress.conceptId }).from(conceptProgress);
      const started = await startedUnits(db, { solvedProblemIds: solved.map((r) => r.id), conceptIds: concepts.map((r) => r.id) });
      const prefs = await getFollowMute(userDb);
      const list = await desktopNotices(db, result, started, Date.now(), prefs);
      if ((await recordNotices(list, userDb)) > 0) notices = summaryLine(list);
    } catch (e) {
      console.error("content sync: could not record notices", e instanceof Error ? e.message : e);
    }
  }
  return Response.json(
    { status: result.status, applied: result.applied, ...(notices ? { notices } : {}), ...(result.error ? { error: result.error } : {}) },
    { headers: NO_STORE },
  );
}
