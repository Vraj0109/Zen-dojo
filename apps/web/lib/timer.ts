import "server-only";
import { eq, sql } from "drizzle-orm";
import { toLocalDate } from "@habit/shared";
import { getAllConcepts, getAllExercises, getAllPatterns } from "@/lib/content-repo/lookups";
import { getDb } from "./db";
import { focusSessions } from "./schema";
import { isProblemId } from "./struggles";

// Focus timer: minutes spent on one problem, concept, design, DSA pattern guide or boss fight. Counts toward
// hours studied (Profile), not XP: XP comes from finishing things.

export const FOCUS_MAX_MINUTES = 600;
export const BOSS_ITEM = "boss";

/** Timer id for studying a DSA pattern guide (/dsa/pattern/[id]). */
export const patternTimerId = (patternId: string) => `pattern:${patternId}`;

/** Whether an id can take focus minutes: a problem, a concept, an exercise, the boss fight or a pattern guide. */
export async function isTimerItem(id: string): Promise<boolean> {
  if (isProblemId(id) || id === BOSS_ITEM) return true;
  const [concepts, exercises, patterns] = await Promise.all([getAllConcepts(), getAllExercises(), getAllPatterns()]);
  return id in concepts || id in exercises || patterns.some((p) => patternTimerId(p.id) === id);
}

export async function logFocus(itemId: string, minutes: number): Promise<boolean> {
  if (!(await isTimerItem(itemId)) || !Number.isFinite(minutes)) return false;
  const m = Math.min(Math.round(minutes), FOCUS_MAX_MINUTES);
  if (m < 1) return false;
  const db = await getDb();
  await db.insert(focusSessions).values({ itemId, focusedOn: toLocalDate(), minutes: m });
  return true;
}

/** Total focused minutes on one item. */
export async function focusMinutes(itemId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${focusSessions.minutes}), 0)` })
    .from(focusSessions)
    .where(eq(focusSessions.itemId, itemId));
  return Number(row?.total ?? 0);
}

/** Focused minutes per day, for hours studied. */
export async function focusByDay(): Promise<{ on: string; minutes: number }[]> {
  const db = await getDb();
  const rows = await db
    .select({ on: focusSessions.focusedOn, minutes: sql<number>`sum(${focusSessions.minutes})` })
    .from(focusSessions)
    .groupBy(focusSessions.focusedOn);
  return rows.map((r) => ({ on: r.on, minutes: Number(r.minutes) }));
}
