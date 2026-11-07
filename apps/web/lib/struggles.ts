import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { PROBLEMS, addDays, toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { problemStruggles } from "./schema";

// The stuck list: problems you needed a hint for, couldn't solve, or solved too slowly.
// An open entry comes back for review STRUGGLE_RETRY_DAYS after it was logged, and stays open
// until you solve the problem cold.

export const STRUGGLE_KINDS = {
  hint: "Needed a hint",
  failed: "Couldn't solve it",
  slow: "Solved, but too slowly",
} as const;
export type StruggleKind = keyof typeof STRUGGLE_KINDS;

export const STRUGGLE_RETRY_DAYS = 3;
const MAX_REASON = 500;

export type StruggleRow = typeof problemStruggles.$inferSelect;

/** Roadmap problems and synced LeetCode problems outside the list ("lcx-<slug>"). */
export const isProblemId = (id: string) => id in PROBLEMS || /^lcx-[a-z0-9-]{1,100}$/.test(id);

export async function logStruggle(problemId: string, kind: string, reason: string): Promise<boolean> {
  if (!isProblemId(problemId) || !(kind in STRUGGLE_KINDS)) return false;
  const db = await getDb();
  await db.insert(problemStruggles).values({ problemId, kind, reason: reason.trim().slice(0, MAX_REASON), loggedOn: toLocalDate() });
  return true;
}

/** Solved it cold: close every open entry for the problem. */
export async function clearStruggles(problemId: string) {
  const db = await getDb();
  await db
    .update(problemStruggles)
    .set({ clearedOn: toLocalDate() })
    .where(and(eq(problemStruggles.problemId, problemId), isNull(problemStruggles.clearedOn)));
}

export async function getStruggles(problemId: string): Promise<StruggleRow[]> {
  const db = await getDb();
  return db.select().from(problemStruggles).where(eq(problemStruggles.problemId, problemId)).orderBy(desc(problemStruggles.id));
}

export interface OpenStruggle {
  problemId: string;
  kind: StruggleKind;
  reason: string;
  /** Latest entry */
  loggedOn: string;
  count: number;
  dueOn: string;
  due: boolean;
}

/** Problems with open entries, keyed by problem id (latest entry wins). */
export async function openStruggles(today = toLocalDate()): Promise<Map<string, OpenStruggle>> {
  const db = await getDb();
  const rows = await db.select().from(problemStruggles).where(isNull(problemStruggles.clearedOn)).orderBy(problemStruggles.id);
  const map = new Map<string, OpenStruggle>();
  for (const r of rows) {
    const dueOn = addDays(r.loggedOn, STRUGGLE_RETRY_DAYS);
    const prev = map.get(r.problemId);
    map.set(r.problemId, {
      problemId: r.problemId,
      kind: (r.kind in STRUGGLE_KINDS ? r.kind : "failed") as StruggleKind,
      reason: r.reason || prev?.reason || "",
      loggedOn: r.loggedOn,
      count: (prev?.count ?? 0) + 1,
      dueOn,
      due: dueOn <= today,
    });
  }
  return map;
}
