import "server-only";
import { and, eq, inArray, like } from "drizzle-orm";
import { PROBLEMS, RESOLVE_AFTER_DAYS, RESOLVE_XP, SOLVE_XP, daysBetween, solveXp, toLocalDate } from "@habit/shared";
import { getDb } from "../db";
import { leetcodeProblems, leetcodeSubmissions, problemSolves, settings, tasks } from "../schema";
import { getPlanStart } from "../tasks";
import { LeetCodeError, USERNAME_RE, fetchQuestion, fetchRecentAccepted, userExists, type AcceptedSubmission } from "./client";

const KEY_USERNAME = "leetcode_username";
const KEY_LAST = "leetcode_last_sync";
/** How old the last sync may be before a page load triggers a background one. */
export const SYNC_INTERVAL_MS = 15 * 60 * 1000;

export interface SyncResult {
  at: string; // ISO timestamp
  ok: boolean;
  added: number; // first solves recorded
  resolved: number; // re-solves recorded
  error?: string;
}

/** Problem id used for LeetCode solves that are not in the roadmap list. */
export const extraProblemId = (slug: string) => `lcx-${slug}`;

const ROADMAP_BY_SLUG = new Map(Object.values(PROBLEMS).flatMap((p) => (p.slug ? [[p.slug, p.id] as const] : [])));

async function getSetting(key: string) {
  const db = await getDb();
  return (await db.query.settings.findFirst({ where: eq(settings.key, key) }))?.value;
}

async function putSetting(key: string, value: string) {
  const db = await getDb();
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getLeetCodeStatus() {
  const username = await getSetting(KEY_USERNAME);
  const raw = await getSetting(KEY_LAST);
  return { username: username ?? null, last: raw ? (JSON.parse(raw) as SyncResult) : null };
}

/** Validate the username against LeetCode, save it, and run a first sync. */
export async function connectLeetCode(username: string): Promise<SyncResult> {
  const at = new Date().toISOString();
  const fail = async (error: string) => {
    const result = { at, ok: false, added: 0, resolved: 0, error };
    await putSetting(KEY_LAST, JSON.stringify(result));
    return result;
  };
  if (!USERNAME_RE.test(username)) return fail("That doesn't look like a LeetCode username.");
  try {
    if (!(await userExists(username))) return fail(`LeetCode user "${username}" was not found.`);
  } catch (e) {
    return fail(e instanceof LeetCodeError ? e.message : "Could not check the username.");
  }
  await putSetting(KEY_USERNAME, username);
  return syncLeetCode();
}

export async function disconnectLeetCode() {
  const db = await getDb();
  await db.delete(settings).where(inArray(settings.key, [KEY_USERNAME, KEY_LAST]));
  // Keep imported solves and the processed-submission log, so reconnecting doesn't duplicate.
}

let inflight: Promise<SyncResult> | null = null;

/** Import new accepted submissions. Concurrent calls share one run. */
export function syncLeetCode(): Promise<SyncResult> {
  inflight ??= runSync().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Background sync on page load, at most every SYNC_INTERVAL_MS (failures count, to avoid hammering). */
export async function syncLeetCodeIfStale(): Promise<void> {
  const { username, last } = await getLeetCodeStatus();
  if (!username) return;
  if (last && Date.now() - Date.parse(last.at) < SYNC_INTERVAL_MS) return;
  await syncLeetCode();
}

async function runSync(): Promise<SyncResult> {
  const at = new Date().toISOString();
  const username = await getSetting(KEY_USERNAME);
  if (!username) return { at, ok: false, added: 0, resolved: 0, error: "No LeetCode username set." };

  let result: SyncResult;
  try {
    result = { at, ok: true, ...(await importSubmissions(username, at)) };
  } catch (e) {
    result = { at, ok: false, added: 0, resolved: 0, error: e instanceof Error ? e.message : String(e) };
  }
  await putSetting(KEY_LAST, JSON.stringify(result));
  return result;
}

async function importSubmissions(username: string, syncedAt: string) {
  return recordAccepted(await fetchRecentAccepted(username), syncedAt);
}

/**
 * Record solves/re-solves for accepted submissions (from the public sync or the browser extension).
 * Each submission id is processed once. Solves dated before the plan start count as solved but
 * give no XP, so importing years of history doesn't inflate your level.
 */
export async function recordAccepted(accepted: AcceptedSubmission[], syncedAt: string) {
  const db = await getDb();
  const subs = [...accepted].sort((a, b) => a.timestamp - b.timestamp);
  if (subs.length === 0) return { added: 0, resolved: 0 };
  const planStart = await getPlanStart();

  const seen = new Set(
    (await db.select({ id: leetcodeSubmissions.id }).from(leetcodeSubmissions).where(inArray(leetcodeSubmissions.id, subs.map((s) => s.id)))).map(
      (r) => r.id,
    ),
  );

  const today = toLocalDate();
  let added = 0;
  let resolved = 0;
  let solvedToday = false;

  for (const sub of subs) {
    if (seen.has(sub.id)) continue;
    const solvedOn = toLocalDate(new Date(sub.timestamp * 1000));
    const roadmapId = ROADMAP_BY_SLUG.get(sub.slug);
    const problemId = roadmapId ?? extraProblemId(sub.slug);

    let xp: number;
    if (roadmapId) {
      xp = solveXp(PROBLEMS[roadmapId]);
    } else {
      // Not in the roadmap list: look up its difficulty once and remember it.
      const known = await db.query.leetcodeProblems.findFirst({ where: eq(leetcodeProblems.slug, sub.slug) });
      let difficulty = known?.difficulty;
      if (!known) {
        const q = await fetchQuestion(sub.slug);
        difficulty = q?.difficulty;
        await db
          .insert(leetcodeProblems)
          .values({ slug: sub.slug, number: q?.number ?? null, title: q?.title ?? sub.title, difficulty: q?.difficulty ?? "medium" })
          .onConflictDoNothing();
      }
      xp = SOLVE_XP[difficulty ?? "medium"];
    }
    const beforePlan = solvedOn < planStart;

    const existing = await db.select().from(problemSolves).where(eq(problemSolves.problemId, problemId)).orderBy(problemSolves.id);
    const first = existing.find((r) => r.kind === "solve");
    const hasResolve = existing.some((r) => r.kind === "resolve");

    if (!first) {
      await db.insert(problemSolves).values({ problemId, kind: "solve", solvedOn, xp: beforePlan ? 0 : xp, source: "leetcode" });
      added++;
      solvedToday ||= solvedOn === today;
    } else if (roadmapId && !hasResolve && daysBetween(first.solvedOn, solvedOn) >= RESOLVE_AFTER_DAYS) {
      await db.insert(problemSolves).values({ problemId, kind: "resolve", solvedOn, xp: beforePlan ? 0 : RESOLVE_XP, source: "leetcode" });
      resolved++;
      solvedToday ||= solvedOn === today;
    }
    // Mark processed either way, so repeats and manual undos aren't re-imported.
    await db.insert(leetcodeSubmissions).values({ id: sub.id, slug: sub.slug, solvedOn, syncedAt }).onConflictDoNothing();
  }

  // A solve today counts as today's DSA warm-up.
  if (solvedToday) {
    await db
      .update(tasks)
      .set({ status: "done", doneOn: today })
      .where(and(eq(tasks.date, today), like(tasks.templateKey, "w%:dsa-warmup"), eq(tasks.status, "todo")));
  }

  return { added, resolved };
}
