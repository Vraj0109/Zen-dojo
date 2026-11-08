import "server-only";
import { eq, isNotNull } from "drizzle-orm";
import { canFreeze, currentStreak, freezeCandidates, levelInfo, streakDays, toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { conceptProgress, practiceSessions, problemSolves, streakFreezes, tasks } from "./schema";

/** Every XP-earning row with its local date: done tasks, DSA solves, practice sessions, covered concepts. */
export async function xpEvents(): Promise<{ on: string; xp: number }[]> {
  const db = await getDb();
  const [t, s, p, c] = await Promise.all([
    db.select({ on: tasks.doneOn, xp: tasks.xp }).from(tasks).where(eq(tasks.status, "done")),
    db.select({ on: problemSolves.solvedOn, xp: problemSolves.xp }).from(problemSolves),
    db.select({ on: practiceSessions.practicedOn, xp: practiceSessions.xp }).from(practiceSessions),
    db.select({ on: conceptProgress.coveredOn, xp: conceptProgress.xp }).from(conceptProgress).where(isNotNull(conceptProgress.coveredOn)),
  ]);
  return [...t, ...s, ...p, ...c].flatMap((r) => (r.on ? [{ on: r.on, xp: r.xp }] : []));
}

/** Days covered by a streak freeze (they count for the streak but earned no XP). */
export async function frozenDays(): Promise<string[]> {
  const db = await getDb();
  return (await db.select({ day: streakFreezes.day }).from(streakFreezes)).map((r) => r.day);
}

/** Days that count toward the streak: any activity, plus frozen days. */
export async function streakDayList(): Promise<string[]> {
  const [events, frozen] = await Promise.all([xpEvents(), frozenDays()]);
  return streakDays(
    events.map((e) => e.on),
    frozen,
  );
}

/** Cover one missed day with this week's freeze. False when the day isn't eligible (see `freezeCandidates`). */
export async function applyFreeze(day: string, today: string = toLocalDate()): Promise<boolean> {
  const [events, frozen] = await Promise.all([xpEvents(), frozenDays()]);
  if (!canFreeze(day, events.map((e) => e.on), frozen, today)) return false;
  const db = await getDb();
  await db.insert(streakFreezes).values({ day, createdOn: today }).onConflictDoNothing();
  return true;
}

/** XP, level and streak across everything that earns XP. Any activity on a day (or a frozen day) keeps the streak. */
export async function getProgress(today: string) {
  const [events, frozen] = await Promise.all([xpEvents(), frozenDays()]);
  const totalXp = events.reduce((a, e) => a + e.xp, 0);
  const active = events.map((e) => e.on);
  return {
    totalXp,
    todayXp: events.filter((e) => e.on === today).reduce((a, e) => a + e.xp, 0),
    streak: currentStreak(streakDays(active, frozen), today),
    /** Missed days (newest first) that could be frozen now; empty when this week's freeze is used. */
    freezeOffer: freezeCandidates(active, frozen, today),
    level: levelInfo(totalXp),
  };
}
