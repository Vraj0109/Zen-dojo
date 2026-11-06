import "server-only";
import { eq, isNotNull, sql } from "drizzle-orm";
import { currentStreak, levelInfo } from "@habit/shared";
import { getDb } from "./db";
import { problemSolves, tasks } from "./schema";

/** XP, level and streak across everything that earns XP: tasks and DSA solves. */
export async function getProgress(today: string) {
  const db = await getDb();
  const [taskXp, solveXp, taskToday, solveToday, taskDays, solveDays] = await Promise.all([
    db.select({ xp: sql<number>`coalesce(sum(${tasks.xp}), 0)` }).from(tasks).where(eq(tasks.status, "done")),
    db.select({ xp: sql<number>`coalesce(sum(${problemSolves.xp}), 0)` }).from(problemSolves),
    db.select({ xp: sql<number>`coalesce(sum(${tasks.xp}), 0)` }).from(tasks).where(eq(tasks.doneOn, today)),
    db.select({ xp: sql<number>`coalesce(sum(${problemSolves.xp}), 0)` }).from(problemSolves).where(eq(problemSolves.solvedOn, today)),
    db.selectDistinct({ d: tasks.doneOn }).from(tasks).where(isNotNull(tasks.doneOn)),
    db.selectDistinct({ d: problemSolves.solvedOn }).from(problemSolves),
  ]);

  const totalXp = Number(taskXp[0]?.xp ?? 0) + Number(solveXp[0]?.xp ?? 0);
  const activeDays = [...taskDays.map((r) => r.d!), ...solveDays.map((r) => r.d)];
  return {
    totalXp,
    todayXp: Number(taskToday[0]?.xp ?? 0) + Number(solveToday[0]?.xp ?? 0),
    streak: currentStreak(activeDays, today),
    level: levelInfo(totalXp),
  };
}
