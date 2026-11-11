import "server-only";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { PROBLEMS, TOTAL_WEEKS, addDays, startOfWeek, toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { getPlanPosition } from "./tasks";
import { xpEvents } from "./progress";
import { getWeakSpots } from "./revise";
import { siteTimeInRange } from "./site-time";
import { bossFights, conceptProgress, focusSessions, leetcodeProblems, practiceSessions, problemSolves, problemStruggles, tasks, weeklyReviews } from "./schema";

// Weekly review: what the week looked like (Monday to Sunday) next to the week before, your own written reflection,
// and the weak spots to look at next. Nothing here is stored except the reflection.

export const REFLECTION_MAX = 4000;

export interface WeekStats {
  xp: number;
  activeDays: number;
  tasksDone: number;
  tasksTotal: number;
  solves: number;
  resolves: number;
  conceptsCovered: number;
  practices: number;
  /** Average self-score (1-5) of design/LLD practice sessions, or null with none */
  practiceAvg: number | null;
  /** Minutes with the focus timer */
  focusMinutes: number;
  /** Minutes on LeetCode problem pages (browser extension) */
  siteMinutes: number;
  stuckLogged: number;
  stuckCleared: number;
  bossFights: number;
}

export interface Reflection {
  wins: string;
  struggles: string;
  nextFocus: string;
}

const clip = (s: string) => s.replace(/\r\n/g, "\n").slice(0, REFLECTION_MAX);

/** The Monday of the week containing `input` (YYYY-MM-DD); today's week for anything invalid. */
export function weekOf(input: string | undefined, today: string = toLocalDate()): string {
  return startOfWeek(input && /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(new Date(input).getTime()) ? input : today);
}

export async function weekStats(monday: string): Promise<WeekStats> {
  const db = await getDb();
  const sunday = addDays(monday, 6);
  const between = (col: SQLiteColumn) => and(gte(col, monday), lte(col, sunday));

  const [events, taskRows, solveRows, concepts, practice, focus, logged, cleared, boss, site] = await Promise.all([
    xpEvents(),
    db
      .select({ status: tasks.status })
      .from(tasks)
      .where(or(and(eq(tasks.scope, "day"), between(tasks.date)), and(eq(tasks.scope, "week"), eq(tasks.date, monday)))),
    db.select({ kind: problemSolves.kind }).from(problemSolves).where(between(problemSolves.solvedOn)),
    db.select({ id: conceptProgress.conceptId }).from(conceptProgress).where(between(conceptProgress.coveredOn)),
    db.select({ score: practiceSessions.score }).from(practiceSessions).where(between(practiceSessions.practicedOn)),
    db.select({ total: sql<number>`coalesce(sum(${focusSessions.minutes}), 0)` }).from(focusSessions).where(between(focusSessions.focusedOn)),
    db.select({ id: problemStruggles.id }).from(problemStruggles).where(between(problemStruggles.loggedOn)),
    db.select({ id: problemStruggles.id }).from(problemStruggles).where(between(problemStruggles.clearedOn)),
    db.select({ id: bossFights.id }).from(bossFights).where(between(bossFights.foughtOn)),
    siteTimeInRange(monday, sunday),
  ]);

  const inWeek = events.filter((e) => e.on >= monday && e.on <= sunday);
  return {
    xp: inWeek.reduce((a, e) => a + e.xp, 0),
    activeDays: new Set(inWeek.map((e) => e.on)).size,
    tasksDone: taskRows.filter((t) => t.status === "done").length,
    tasksTotal: taskRows.length,
    solves: solveRows.filter((s) => s.kind === "solve").length,
    resolves: solveRows.filter((s) => s.kind === "resolve").length,
    conceptsCovered: concepts.length,
    practices: practice.length,
    practiceAvg: practice.length ? Math.round((practice.reduce((a, p) => a + p.score, 0) / practice.length) * 10) / 10 : null,
    focusMinutes: Number(focus[0]?.total ?? 0),
    siteMinutes: Math.round(site.reduce((a, s) => a + s.seconds, 0) / 60),
    stuckLogged: logged.length,
    stuckCleared: cleared.length,
    bossFights: boss.length,
  };
}

const EMPTY_REFLECTION: Reflection = { wins: "", struggles: "", nextFocus: "" };

export async function getReflection(monday: string): Promise<Reflection> {
  const db = await getDb();
  const row = await db.query.weeklyReviews.findFirst({ where: eq(weeklyReviews.week, monday) });
  return row ? { wins: row.wins, struggles: row.struggles, nextFocus: row.nextFocus } : EMPTY_REFLECTION;
}

/** Save the reflection for the week starting `monday` (empty text clears it). */
export async function saveReflection(monday: string, input: Reflection): Promise<void> {
  const db = await getDb();
  const week = weekOf(monday);
  const values = { wins: clip(input.wins).trim(), struggles: clip(input.struggles).trim(), nextFocus: clip(input.nextFocus).trim() };
  if (!values.wins && !values.struggles && !values.nextFocus) {
    await db.delete(weeklyReviews).where(eq(weeklyReviews.week, week));
    return;
  }
  const row = { ...values, updatedOn: toLocalDate() };
  await db.insert(weeklyReviews).values({ week, ...row }).onConflictDoUpdate({ target: weeklyReviews.week, set: row });
}

/** Problems you spent the most time on in LeetCode this week (needs the extension), with their titles. */
async function topSiteProblems(monday: string, limit = 5) {
  const rows = (await siteTimeInRange(monday, addDays(monday, 6))).slice(0, limit);
  if (rows.length === 0) return [];
  const bySlug = new Map(Object.entries(PROBLEMS).flatMap(([id, p]) => (p.slug ? [[p.slug, { id, title: p.title }] as const] : [])));
  const db = await getDb();
  const extras = new Map((await db.select().from(leetcodeProblems)).map((e) => [e.slug, e.title]));
  return rows.map((r) => {
    const known = bySlug.get(r.slug);
    return {
      slug: r.slug,
      minutes: Math.max(1, Math.round(r.seconds / 60)),
      title: known?.title ?? extras.get(r.slug) ?? r.slug,
      id: known?.id ?? (extras.has(r.slug) ? `lcx-${r.slug}` : null),
    };
  });
}

export async function getWeeklyReview(monday: string) {
  const [position, stats, previous, reflection, topProblems, weak] = await Promise.all([
    getPlanPosition(),
    weekStats(monday),
    weekStats(addDays(monday, -7)),
    getReflection(monday),
    topSiteProblems(monday),
    getWeakSpots(),
  ]);
  // The plan week whose run overlaps this calendar week (history entry, or the current week), else null.
  const sunday = addDays(monday, 6);
  const runs = [...position.history, ...(position.finished ? [] : [{ week: position.cursor, start: position.start, end: addDays(position.start, 6) }])];
  const weekNo = runs.find((r) => r.start <= sunday && r.end >= monday)?.week ?? 0;
  return {
    monday,
    sunday: addDays(monday, 6),
    weekNo: weekNo >= 1 && weekNo <= TOTAL_WEEKS ? weekNo : null,
    stats,
    previous,
    reflection,
    topProblems,
    weak: {
      patterns: weak.patterns.slice(0, 3),
      concepts: weak.concepts.slice(0, 3),
      exercises: weak.exercises.slice(0, 3),
      stuck: weak.stuck.slice(0, 3),
    },
  };
}
