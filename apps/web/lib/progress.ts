import "server-only";
import { eq, isNotNull } from "drizzle-orm";
import { currentStreak, levelInfo } from "@habit/shared";
import { getDb } from "./db";
import { conceptProgress, practiceSessions, problemSolves, tasks } from "./schema";

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

/** XP, level and streak across everything that earns XP. Any activity on a day keeps the streak. */
export async function getProgress(today: string) {
  const events = await xpEvents();
  const totalXp = events.reduce((a, e) => a + e.xp, 0);
  return {
    totalXp,
    todayXp: events.filter((e) => e.on === today).reduce((a, e) => a + e.xp, 0),
    streak: currentStreak([...new Set(events.map((e) => e.on))], today),
    level: levelInfo(totalXp),
  };
}

