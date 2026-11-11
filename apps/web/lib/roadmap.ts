import "server-only";
import { eq } from "drizzle-orm";
import { ITEMS_PACK_ID, PLAN_WEEKS, SLOTS_PER_WEEK, addDays, parseWeekKey, toLocalDate, type PlanWeek } from "@habit/shared";
import { getDb } from "./db";
import { packProgress, problemSolves, tasks } from "./schema";
import { getBacklogView, getPlanStart } from "./tasks";

export interface RoadmapWeek extends PlanWeek {
  state?: RoadmapState;
  start: string;
  end: string;
  goalsDone: number;
  goalsTotal: number;
  tasksDone: number;
  problemsSolved: number;
  xp: number;
}

export type RoadmapState = "done" | "current" | "upcoming";

export async function getRoadmapView() {
  const db = await getDb();
  const today = toLocalDate();
  const planStart = await getPlanStart();
  const backlog = await getBacklogView(); // also creates the plan position when missing
  const { position } = backlog;
  const backlogCount = backlog.overdue.reduce((n, g) => n + g.tasks.length, 0) + (backlog.goalsOverdue ? backlog.goals.length : 0);
  const [doneTasks, solves, itemSolves] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.status, "done")),
    db.select().from(problemSolves),
    db.select().from(packProgress).where(eq(packProgress.packId, ITEMS_PACK_ID)),
  ]);

  const weeks: RoadmapWeek[] = PLAN_WEEKS.map((w) => {
    // Past weeks use the range they actually ran; the current week runs from its start; weeks without
    // history (before this feature, or not reached) fall back to the calendar formula.
    const ran = position.history.find((h) => h.week === w.week);
    const isCurrent = !position.finished && w.week === position.cursor;
    const start = ran ? ran.start : isCurrent ? position.start : addDays(planStart, (w.week - 1) * 7);
    const end = ran ? (ran.end > addDays(start, 6) ? ran.end : addDays(start, 6)) : isCurrent && today > addDays(start, 6) ? today : addDays(start, 6);
    const upcoming = !position.finished && w.week > position.cursor; // not reached yet: no stats
    const inWeek = (d: string | null) => !upcoming && d !== null && d >= start && d <= end; // YYYY-MM-DD compares as text
    const weekTasks = doneTasks.filter((t) => inWeek(t.doneOn));
    const weekSolves = solves.filter((s) => inWeek(s.solvedOn));
    const weekItemSolves = itemSolves.filter((s) => inWeek(s.doneOn));
    return {
      ...w,
      start,
      end,
      goalsDone: doneTasks.filter((t) => {
        if (upcoming || t.scope !== "week" || t.templateKey === null || t.date !== start) return false;
        const p = parseWeekKey(t.templateKey);
        return p === null || p.week === w.week;
      }).length,
      goalsTotal: 3,
      tasksDone: weekTasks.filter((t) => t.scope === "day").length,
      problemsSolved: weekSolves.filter((s) => s.kind === "solve").length + weekItemSolves.length,
      xp: weekTasks.reduce((n, t) => n + t.xp, 0) + weekSolves.reduce((n, s) => n + s.xp, 0),
    };
  });

  const state = (week: number): RoadmapState =>
    position.finished || week < position.cursor ? "done" : week === position.cursor ? "current" : "upcoming";

  return {
    today,
    planStart,
    /** The plan week you are on (1 to 16); stays at 16 once the plan is finished. */
    currentWeek: position.cursor,
    finished: position.finished,
    weeksLeft: position.weeksLeft,
    currentDone: backlog.doneCount,
    currentTotal: backlog.totalCount,
    backlogCount,
    slotsPerWeek: SLOTS_PER_WEEK,
    weeks: weeks.map((w) => ({ ...w, state: state(w.week) })),
  };
}
