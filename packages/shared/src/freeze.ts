// Streak freeze: one missed day per Monday-Sunday week can be covered so a streak survives it.
// Pure functions; the app stores only the frozen dates.

import { addDays, startOfWeek } from "./dates";

/** Freezes you may use in one Monday-Sunday week. */
export const FREEZES_PER_WEEK = 1;
/** How far back a missed day can still be frozen (days before today). */
export const FREEZE_WINDOW_DAYS = 7;

/** Active days plus frozen days: what the streak functions should count. A frozen day gives no XP. */
export function streakDays(active: Iterable<string>, frozen: Iterable<string>): string[] {
  return [...new Set([...active, ...frozen])];
}

/**
 * Days that could be frozen right now, newest first. A day qualifies when it is a missed day in the last
 * FREEZE_WINDOW_DAYS days (not today), the day before it was active or frozen (so the freeze really saves a streak),
 * and its week has no freeze yet.
 */
export function freezeCandidates(active: Iterable<string>, frozen: Iterable<string>, today: string): string[] {
  const covered = new Set(streakDays(active, frozen));
  const frozenSet = new Set(frozen);
  const usedInWeek = (day: string) => {
    const monday = startOfWeek(day);
    let n = 0;
    for (let i = 0; i < 7; i++) if (frozenSet.has(addDays(monday, i))) n++;
    return n;
  };
  const out: string[] = [];
  for (let back = 1; back <= FREEZE_WINDOW_DAYS; back++) {
    const day = addDays(today, -back);
    if (covered.has(day)) continue;
    if (!covered.has(addDays(day, -1))) continue;
    if (usedInWeek(day) >= FREEZES_PER_WEEK) continue;
    out.push(day);
  }
  return out;
}

/** Whether `day` may be frozen now (see `freezeCandidates`). */
export function canFreeze(day: string, active: Iterable<string>, frozen: Iterable<string>, today: string): boolean {
  return freezeCandidates(active, frozen, today).includes(day);
}
