import "server-only";
import { eq, sql } from "drizzle-orm";
import { ALL_CONCEPTS, ALL_EXERCISES, toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { focusSessions } from "./schema";
import { isProblemId } from "./struggles";

// Focus timer: minutes spent on one problem, concept, design or boss fight. Counts toward
// hours studied (Profile), not XP: XP comes from finishing things.

export const FOCUS_MAX_MINUTES = 600;
export const BOSS_ITEM = "boss";

export const isTimerItem = (id: string) => isProblemId(id) || id in ALL_CONCEPTS || id in ALL_EXERCISES || id === BOSS_ITEM;

export async function logFocus(itemId: string, minutes: number): Promise<boolean> {
  if (!isTimerItem(itemId) || !Number.isFinite(minutes)) return false;
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
