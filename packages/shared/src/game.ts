import { addDays } from "./dates";

const TIERS = ["Intern", "SDE1", "SDE2", "Senior", "Staff", "Principal"] as const;
const LEVELS_PER_TIER = 4;

/** level = floor(sqrt(xp / 50)), as in the spec. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50));
}

export function xpForLevel(level: number): number {
  return level * level * 50;
}

export function levelInfo(xp: number) {
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const tier = TIERS[Math.min(Math.floor(level / LEVELS_PER_TIER), TIERS.length - 1)];
  return { level, tier, xpIntoLevel: xp - current, xpForNext: next - current };
}

/**
 * Current streak: consecutive days with at least one completed task, ending today.
 * If today has nothing yet, the streak still counts through yesterday (you have until midnight).
 */
export function currentStreak(activeDates: Iterable<string>, today: string): number {
  const days = new Set(activeDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
