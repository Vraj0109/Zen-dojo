import "server-only";
import { eq } from "drizzle-orm";
import { PLAN_WEEKS, addDays, planWeekNumber, toLocalDate, type PlanWeek } from "@habit/shared";
import { getDb } from "./db";
import { problemSolves, tasks } from "./schema";
import { getPlanStart } from "./tasks";

export interface RoadmapWeek extends PlanWeek {
  start: string;
  end: string;
  goalsDone: number;
  goalsTotal: number;
  tasksDone: number;
  problemsSolved: number;
  xp: number;
}

export async function getRoadmapView() {
  const db = await getDb();
  const today = toLocalDate();
  const planStart = await getPlanStart();
  const [doneTasks, solves] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.status, "done")),
    db.select().from(problemSolves),
  ]);

  const weeks: RoadmapWeek[] = PLAN_WEEKS.map((w) => {
    const start = addDays(planStart, (w.week - 1) * 7);
    const end = addDays(start, 6);
    const inWeek = (d: string | null) => d !== null && d >= start && d <= end; // YYYY-MM-DD compares as text
    const weekTasks = doneTasks.filter((t) => inWeek(t.doneOn));
    const weekSolves = solves.filter((s) => inWeek(s.solvedOn));
    return {
      ...w,
      start,
      end,
      goalsDone: doneTasks.filter((t) => t.scope === "week" && t.templateKey !== null && t.date === start).length,
      goalsTotal: 3,
      tasksDone: weekTasks.filter((t) => t.scope === "day").length,
      problemsSolved: weekSolves.filter((s) => s.kind === "solve").length,
      xp: weekTasks.reduce((n, t) => n + t.xp, 0) + weekSolves.reduce((n, s) => n + s.xp, 0),
    };
  });

  return { today, planStart, currentWeek: planWeekNumber(planStart, today), weeks };
}
