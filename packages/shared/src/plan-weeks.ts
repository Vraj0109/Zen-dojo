// Pure rules for dynamic plan weeks (plan 0056). A plan week owns 24 generated rows: 3 weekly
// goals dated at the week's start and 3 tasks for each of 7 day-slots. Their template keys are
// prefixed with the plan week ("w3:dsa-warmup") so the tasks table needs no new column.
import { addDays, daysBetween } from "./dates";

export const SLOTS_PER_WEEK = 7;

export interface PlanWeekRow {
  id: number;
  date: string;
  scope: string;
  templateKey: string | null;
  status: string;
}

/** `weekKey(3, "dsa-warmup")` is `"w3:dsa-warmup"`. */
export function weekKey(week: number, key: string): string {
  return `w${week}:${key}`;
}

/** Split a prefixed key; null for legacy (unprefixed) and custom (null) keys. */
export function parseWeekKey(key: string | null): { week: number; key: string } | null {
  if (key === null) return null;
  const m = /^w(\d+):(.+)$/.exec(key);
  return m ? { week: Number(m[1]), key: m[2] } : null;
}

/** Date a day-slot (1 to 7) is planned for. */
export function slotDueDate(start: string, slot: number): string {
  return addDays(start, slot - 1);
}

/** The slot that is "today", clamped to 1..7 (before the start is 1, more than a week in is 7). */
export function todaySlot(start: string, today: string): number {
  return Math.min(Math.max(daysBetween(start, today) + 1, 1), SLOTS_PER_WEEK);
}

/** Weeks still to do, counting the current one; 0 once the plan is finished. */
export function weeksLeft(cursor: number, finished: boolean, totalWeeks = 16): number {
  return finished ? 0 : Math.max(totalWeeks - cursor + 1, 0);
}

/** Generated rows that belong to this run of `week`: right prefix and inside the 7-day window. */
function weekRows<T extends PlanWeekRow>(rows: T[], week: number, start: string): T[] {
  const last = slotDueDate(start, SLOTS_PER_WEEK);
  return rows.filter((r) => {
    const p = parseWeekKey(r.templateKey);
    return p !== null && p.week === week && r.date >= start && r.date <= last;
  });
}

/** True when the week has generated rows and every one is done. */
export function isWeekComplete<T extends PlanWeekRow>(rows: T[], week: number, start: string): boolean {
  const mine = weekRows(rows, week, start);
  return mine.length > 0 && mine.every((r) => r.status === "done");
}

/**
 * Sort a plan week's open rows into: overdue (day slots before today's), today, upcoming (later
 * slots), and the weekly goals (overdue only once the week's seventh day has passed).
 */
export function splitBacklog<T extends PlanWeekRow>(
  rows: T[],
  week: number,
  start: string,
  today: string,
): { overdue: T[]; today: T[]; upcoming: T[]; goals: { open: T[]; overdue: T[] } } {
  const open = weekRows(rows, week, start).filter((r) => r.status !== "done");
  const slot = todaySlot(start, today);
  const slotOf = (r: T) => daysBetween(start, r.date) + 1;
  const days = open.filter((r) => r.scope === "day");
  const goalsOpen = open.filter((r) => r.scope === "week");
  const goalsLate = daysBetween(start, today) > SLOTS_PER_WEEK - 1;
  return {
    overdue: days.filter((r) => slotOf(r) < slot),
    today: days.filter((r) => slotOf(r) === slot),
    upcoming: days.filter((r) => slotOf(r) > slot),
    goals: { open: goalsOpen, overdue: goalsLate ? goalsOpen : [] },
  };
}
