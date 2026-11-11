import "server-only";
import { and, between, eq, isNull, like, sql } from "drizzle-orm";
import {
  PLAN_WEEKS,
  SLOTS_PER_WEEK,
  TOTAL_WEEKS,
  WEEK_TEMPLATE,
  WEEKDAY_TEMPLATE,
  WEEKEND_TEMPLATE,
  addDays,
  isWeekComplete,
  isWeekend,
  planWeekNumber,
  slotDueDate,
  splitBacklog,
  startOfWeek,
  toLocalDate,
  todaySlot,
  weekKey,
  weeksLeft,
} from "@habit/shared";
import { getDb } from "./db";
import { getProgress } from "./progress";
import { settings, tasks, type Task } from "./schema";

export type TaskRow = Task;

const PLAN_START_KEY = "plan_start_date";
const CURSOR_KEY = "plan_week_cursor";
const WEEK_START_KEY = "plan_week_start";
const HISTORY_KEY = "plan_week_history";
const FINISHED_KEY = "plan_finished";

export interface PlanHistoryEntry {
  week: number;
  start: string;
  end: string;
}

export interface PlanPosition {
  cursor: number;
  start: string;
  finished: boolean;
  weeksLeft: number;
  history: PlanHistoryEntry[];
}

type Db = Awaited<ReturnType<typeof getDb>>;

async function readSetting(db: Db, key: string): Promise<string | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row ? row.value : null;
}

async function writeSetting(db: Db, key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getPlanStart(): Promise<string> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, PLAN_START_KEY) });
  if (row) return row.value;
  // First run: start the plan this week so there's something to do immediately.
  const start = startOfWeek(toLocalDate());
  await db.insert(settings).values({ key: PLAN_START_KEY, value: start }).onConflictDoNothing();
  return start;
}

/** Drop open generated tasks (prefixed or legacy); done rows stay as history. */
async function deleteOpenGenerated(db: Db) {
  await db.delete(tasks).where(and(sql`${tasks.templateKey} IS NOT NULL`, eq(tasks.status, "todo")));
}

/** Plan weeks run Monday-Sunday; the start date snaps to that Monday and the plan restarts at week 1. */
export async function setPlanStart(input: string) {
  const date = startOfWeek(input);
  const db = await getDb();
  await writeSetting(db, PLAN_START_KEY, date);
  await writeSetting(db, CURSOR_KEY, "1");
  await writeSetting(db, WEEK_START_KEY, date);
  await writeSetting(db, HISTORY_KEY, "[]");
  await db.delete(settings).where(eq(settings.key, FINISHED_KEY));
  await deleteOpenGenerated(db);
}

function weekFor(weekNo: number) {
  return PLAN_WEEKS[Math.min(Math.max(weekNo, 1), TOTAL_WEEKS) - 1];
}

/** Create the plan week's 24 rows (3 goals + 7 slots x 3 tasks). Safe to call repeatedly. */
async function ensurePlanWeek(db: Db, week: number, start: string) {
  const plan = weekFor(week);
  const make = (date: string, t: (typeof WEEK_TEMPLATE)[number]) => ({
    date,
    scope: t.scope,
    templateKey: weekKey(week, t.key),
    title: t.title(plan),
    category: t.category,
    xp: t.xp,
    minutes: t.minutes ?? null,
  });
  const rows = WEEK_TEMPLATE.map((t) => make(start, t));
  for (let slot = 1; slot <= SLOTS_PER_WEEK; slot++) {
    const date = slotDueDate(start, slot);
    for (const t of isWeekend(date) ? WEEKEND_TEMPLATE : WEEKDAY_TEMPLATE) rows.push(make(date, t));
  }
  await db.insert(tasks).values(rows).onConflictDoNothing();
}

/** Generated rows of this run of a plan week. */
async function loadWeekRows(db: Db, week: number, start: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(like(tasks.templateKey, `w${week}:%`), between(tasks.date, start, slotDueDate(start, SLOTS_PER_WEEK))))
    .orderBy(tasks.date, tasks.id);
}

function parseHistory(raw: string | null): PlanHistoryEntry[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as PlanHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

async function readPosition(db: Db): Promise<PlanPosition> {
  let cursorRaw = await readSetting(db, CURSOR_KEY);
  if (cursorRaw === null) {
    // First run for an existing user: take the calendar week once, then never follow the calendar again.
    const planStart = await getPlanStart();
    const today = toLocalDate();
    const cursor = Math.min(Math.max(planWeekNumber(planStart, today), 1), TOTAL_WEEKS);
    const start = addDays(planStart, (cursor - 1) * 7);
    await deleteOpenGenerated(db);
    await db.insert(settings).values({ key: CURSOR_KEY, value: String(cursor) }).onConflictDoNothing();
    await db.insert(settings).values({ key: WEEK_START_KEY, value: start }).onConflictDoNothing();
    await db.insert(settings).values({ key: HISTORY_KEY, value: "[]" }).onConflictDoNothing();
    cursorRaw = await readSetting(db, CURSOR_KEY); // another caller may have won the race
  }
  const cursor = Math.min(Math.max(Number(cursorRaw) || 1, 1), TOTAL_WEEKS);
  const start = (await readSetting(db, WEEK_START_KEY)) ?? (await getPlanStart());
  const finished = (await readSetting(db, FINISHED_KEY)) === "1";
  const history = parseHistory(await readSetting(db, HISTORY_KEY));
  return { cursor, start, finished, weeksLeft: weeksLeft(cursor, finished, TOTAL_WEEKS), history };
}

/** Where you are in the plan. Creates the settings rows and the current week's 24 tasks if missing. */
export async function getPlanPosition(): Promise<PlanPosition> {
  const db = await getDb();
  const pos = await readPosition(db);
  if (!pos.finished && pos.start <= toLocalDate()) await ensurePlanWeek(db, pos.cursor, pos.start);
  return pos;
}

/** Close the current week (history, then next week or finished). */
async function advance(db: Db, pos: PlanPosition, today: string) {
  if (!pos.history.some((h) => h.week === pos.cursor)) {
    const history = [...pos.history, { week: pos.cursor, start: pos.start, end: today }];
    await writeSetting(db, HISTORY_KEY, JSON.stringify(history));
  }
  if (pos.cursor < TOTAL_WEEKS) {
    await writeSetting(db, CURSOR_KEY, String(pos.cursor + 1));
    await writeSetting(db, WEEK_START_KEY, today);
    await ensurePlanWeek(db, pos.cursor + 1, today);
  } else {
    await writeSetting(db, FINISHED_KEY, "1");
  }
}

/** If every task of the current plan week is done, move to the next week. Returns true when it moved. */
export async function advancePlanWeekIfComplete(today: string = toLocalDate()): Promise<boolean> {
  const db = await getDb();
  const pos = await readPosition(db);
  if (pos.finished || pos.start > today) return false;
  const rows = await loadWeekRows(db, pos.cursor, pos.start);
  if (!isWeekComplete(rows, pos.cursor, pos.start)) return false;
  await advance(db, pos, today);
  return true;
}

/** Give up the rest of this plan week: delete its open tasks and move on. */
export async function skipPlanWeek(today: string = toLocalDate()): Promise<void> {
  const db = await getDb();
  const pos = await readPosition(db);
  if (pos.finished) return;
  const rows = await loadWeekRows(db, pos.cursor, pos.start);
  for (const r of rows) if (r.status === "todo") await db.delete(tasks).where(eq(tasks.id, r.id));
  await advance(db, pos, today);
}

export interface TodayView {
  today: string;
  /** The current plan week (the cursor), 1 to 16. */
  weekNo: number;
  planStart: string;
  week: (typeof PLAN_WEEKS)[number];
  weeksLeft: number;
  /** Open tasks from earlier day-slots (plus the weekly goals once the week is over) */
  backlogCount: number;
  finished: boolean;
  /** The plan's first week has not begun yet */
  beforeStart: boolean;
  dayTasks: Task[];
  weekTasks: Task[];
  totalXp: number;
  todayXp: number;
  streak: number;
  /** Missed days (newest first) a streak freeze could cover right now */
  freezeOffer: string[];
  level: Awaited<ReturnType<typeof getProgress>>["level"];
}

export async function getTodayView(): Promise<TodayView> {
  const db = await getDb();
  const today = toLocalDate();
  let position = await getPlanPosition();
  if (await advancePlanWeekIfComplete(today)) position = await getPlanPosition();
  const { cursor, start, finished } = position;
  const beforeStart = start > today;
  const active = !finished && !beforeStart;
  const slotDate = slotDueDate(start, todaySlot(start, today));

  const [weekRows, custom, progress] = await Promise.all([
    active ? loadWeekRows(db, cursor, start) : Promise.resolve([] as Task[]),
    // Custom tasks are not part of a plan week: today's day tasks and this calendar week's goals.
    db
      .select()
      .from(tasks)
      .where(
        and(
          isNull(tasks.templateKey),
          sql`((${tasks.scope} = 'day' AND ${tasks.date} = ${today}) OR (${tasks.scope} = 'week' AND ${tasks.date} = ${startOfWeek(today)}))`,
        ),
      )
      .orderBy(tasks.id),
    getProgress(today),
  ]);
  const split = splitBacklog(weekRows, cursor, start, today);
  const dayTasks = [...weekRows.filter((t) => t.scope === "day" && t.date === slotDate), ...custom.filter((t) => t.scope === "day")];
  const weekTasks = [...weekRows.filter((t) => t.scope === "week"), ...custom.filter((t) => t.scope === "week")];
  const backlogCount = split.overdue.length + split.goals.overdue.length;

  return {
    today,
    weekNo: cursor,
    planStart: await getPlanStart(),
    week: weekFor(cursor),
    weeksLeft: position.weeksLeft,
    backlogCount,
    finished,
    beforeStart,
    dayTasks,
    weekTasks,
    ...progress,
  };
}

export interface BacklogView {
  position: PlanPosition;
  today: string;
  overdue: { date: string; tasks: TaskRow[] }[];
  goals: TaskRow[];
  goalsOverdue: boolean;
  upcoming: { date: string; tasks: TaskRow[] }[];
  doneCount: number;
  totalCount: number;
}

function groupByDate(rows: TaskRow[]): { date: string; tasks: TaskRow[] }[] {
  const out: { date: string; tasks: TaskRow[] }[] = [];
  for (const r of [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)) {
    const last = out[out.length - 1];
    if (last && last.date === r.date) last.tasks.push(r);
    else out.push({ date: r.date, tasks: [r] });
  }
  return out;
}

export async function getBacklogView(): Promise<BacklogView> {
  const db = await getDb();
  const today = toLocalDate();
  let position = await getPlanPosition();
  if (await advancePlanWeekIfComplete(today)) position = await getPlanPosition();
  const active = !position.finished && position.start <= today;
  const rows = active ? await loadWeekRows(db, position.cursor, position.start) : [];
  const split = splitBacklog(rows, position.cursor, position.start, today);
  return {
    position,
    today,
    overdue: groupByDate(split.overdue),
    goals: split.goals.open,
    goalsOverdue: split.goals.overdue.length > 0,
    upcoming: groupByDate(split.upcoming),
    doneCount: rows.filter((r) => r.status === "done").length,
    totalCount: rows.length,
  };
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
  if (!done && task.templateKey !== null) await advancePlanWeekIfComplete(toLocalDate());
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
