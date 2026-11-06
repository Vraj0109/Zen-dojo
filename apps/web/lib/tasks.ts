import "server-only";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import {
  PLAN_WEEKS,
  TOTAL_WEEKS,
  WEEK_TEMPLATE,
  WEEKDAY_TEMPLATE,
  WEEKEND_TEMPLATE,
  isWeekend,
  planWeekNumber,
  startOfWeek,
  toLocalDate,
} from "@habit/shared";
import { getDb } from "./db";
import { getProgress } from "./progress";
import { settings, tasks, type Task } from "./schema";

const PLAN_START_KEY = "plan_start_date";

export async function getPlanStart(): Promise<string> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, PLAN_START_KEY) });
  if (row) return row.value;
  // First run: start the plan this week so there's something to do immediately.
  const start = startOfWeek(toLocalDate());
  await db.insert(settings).values({ key: PLAN_START_KEY, value: start }).onConflictDoNothing();
  return start;
}

/** Plan weeks run Monday-Sunday so weekly goals line up with calendar weeks; snaps to that Monday. */
export async function setPlanStart(input: string) {
  const date = startOfWeek(input);
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key: PLAN_START_KEY, value: date })
    .onConflictDoUpdate({ target: settings.key, set: { value: date } });
  // Drop not-yet-done generated tasks so they regenerate with the new week's focus.
  await db.delete(tasks).where(and(isNotNull(tasks.templateKey), eq(tasks.status, "todo")));
}

function weekFor(weekNo: number) {
  return PLAN_WEEKS[Math.min(Math.max(weekNo, 1), TOTAL_WEEKS) - 1];
}

/** Create today's and this week's tasks from the templates. Safe to call repeatedly. */
async function ensureTasks(today: string, weekNo: number) {
  const db = await getDb();
  const week = weekFor(weekNo);
  const daily = isWeekend(today) ? WEEKEND_TEMPLATE : WEEKDAY_TEMPLATE;
  const monday = startOfWeek(today);
  const rows = [
    ...daily.map((t) => ({ date: today, t })),
    ...WEEK_TEMPLATE.map((t) => ({ date: monday, t })),
  ].map(({ date, t }) => ({
    date,
    scope: t.scope,
    templateKey: t.key,
    title: t.title(week),
    category: t.category,
    xp: t.xp,
    minutes: t.minutes ?? null,
  }));
  await db.insert(tasks).values(rows).onConflictDoNothing();
}

export interface TodayView {
  today: string;
  weekNo: number;
  planStart: string;
  week: (typeof PLAN_WEEKS)[number];
  dayTasks: Task[];
  weekTasks: Task[];
  totalXp: number;
  todayXp: number;
  streak: number;
  level: Awaited<ReturnType<typeof getProgress>>["level"];
}

export async function getTodayView(): Promise<TodayView> {
  const db = await getDb();
  const today = toLocalDate();
  const planStart = await getPlanStart();
  const weekNo = planWeekNumber(planStart, today);
  if (weekNo >= 1 && weekNo <= TOTAL_WEEKS) await ensureTasks(today, weekNo);

  const monday = startOfWeek(today);
  const [dayTasks, weekTasks, progress] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.scope, "day"), eq(tasks.date, today))).orderBy(tasks.id),
    db.select().from(tasks).where(and(eq(tasks.scope, "week"), eq(tasks.date, monday))).orderBy(tasks.id),
    getProgress(today),
  ]);

  return { today, weekNo, planStart, week: weekFor(weekNo), dayTasks, weekTasks, ...progress };
}

export async function toggleTask(id: number) {
  const db = await getDb();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!task) return;
  const done = task.status === "done";
  await db
    .update(tasks)
    .set({ status: done ? "todo" : "done", doneOn: done ? null : toLocalDate() })
    .where(eq(tasks.id, id));
}

export async function addCustomTask(title: string, category: string, scope: "day" | "week") {
  const db = await getDb();
  const today = toLocalDate();
  await db.insert(tasks).values({
    date: scope === "week" ? startOfWeek(today) : today,
    scope,
    templateKey: null,
    title,
    category,
    xp: scope === "week" ? 40 : 10,
  });
}

export async function deleteCustomTask(id: number) {
  const db = await getDb();
  // Only custom tasks can be deleted; generated ones would just come back.
  await db.delete(tasks).where(and(eq(tasks.id, id), isNull(tasks.templateKey)));
}
