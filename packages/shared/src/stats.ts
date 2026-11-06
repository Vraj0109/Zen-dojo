// Stats and badges: pure functions over data the app already has (nothing extra is stored).

import { addDays, daysBetween, startOfWeek } from "./dates";

/** Longest run of consecutive active days. */
export function bestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export interface HeatCell {
  date: string;
  xp: number;
  /** 0 = none, 1-4 = quartiles of the busiest day */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** `weeks` columns (Monday-Sunday) ending with the current week, oldest first. */
export function heatmap(xpByDay: Map<string, number>, today: string, weeks = 16): HeatCell[][] {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const cols: { date: string; xp: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    cols.push(
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(first, w * 7 + d);
        return { date, xp: xpByDay.get(date) ?? 0, future: date > today };
      }),
    );
  }
  const max = Math.max(0, ...cols.flat().map((c) => c.xp));
  const level = (xp: number): HeatCell["level"] => (xp <= 0 || max === 0 ? 0 : (Math.min(4, Math.ceil((xp / max) * 4)) as 1 | 2 | 3 | 4));
  return cols.map((col) => col.map((c) => ({ ...c, level: level(c.xp) })));
}

export interface BadgeStats {
  solved: number;
  hardSolved: number;
  resolved: number;
  bestStreak: number;
  groupsCovered: number;
  designsPracticed: number;
  lldPracticed: number;
  conceptsCovered: number;
  perfectWeeks: number;
  level: number;
}

export interface BadgeDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  stat: keyof BadgeStats;
  target: number;
}

export const BADGES: BadgeDef[] = [
  { id: "first-solve", icon: "🌱", title: "First solve", description: "Solve your first problem", stat: "solved", target: 1 },
  { id: "solved-25", icon: "🧩", title: "Pattern spotter", description: "Solve 25 problems", stat: "solved", target: 25 },
  { id: "solved-75", icon: "🔥", title: "Grinder", description: "Solve 75 problems", stat: "solved", target: 75 },
  { id: "solved-150", icon: "🏔️", title: "150 club", description: "Solve 150 problems (the roadmap goal)", stat: "solved", target: 150 },
  { id: "first-hard", icon: "💪", title: "Hard hitter", description: "Solve a Hard problem", stat: "hardSolved", target: 1 },
  { id: "hard-20", icon: "🦾", title: "Hard mode", description: "Solve 20 Hard problems", stat: "hardSolved", target: 20 },
  { id: "resolve-10", icon: "🔁", title: "Cold re-solver", description: "Re-solve 10 problems two weeks later", stat: "resolved", target: 10 },
  { id: "group-covered", icon: "🗺️", title: "Group master", description: "Cover every pattern in a DSA group", stat: "groupsCovered", target: 1 },
  { id: "streak-7", icon: "📅", title: "Week streak", description: "Be active 7 days in a row", stat: "bestStreak", target: 7 },
  { id: "streak-30", icon: "🏅", title: "Month streak", description: "Be active 30 days in a row", stat: "bestStreak", target: 30 },
  { id: "perfect-week", icon: "⭐", title: "Perfect week", description: "Finish every daily and weekly task for a week", stat: "perfectWeeks", target: 1 },
  { id: "first-design", icon: "🏗️", title: "Architect", description: "Practice your first system design", stat: "designsPracticed", target: 1 },
  { id: "designs-10", icon: "🏙️", title: "Ten designs", description: "Practice 10 different system designs", stat: "designsPracticed", target: 10 },
  { id: "first-lld", icon: "🧱", title: "Class act", description: "Practice your first LLD problem", stat: "lldPracticed", target: 1 },
  { id: "lld-all", icon: "🏛️", title: "LLD complete", description: "Practice all 10 classic LLD problems", stat: "lldPracticed", target: 10 },
  { id: "concepts-20", icon: "🧠", title: "Fundamentals", description: "Cover 20 concepts (confidence 4+)", stat: "conceptsCovered", target: 20 },
  { id: "concepts-60", icon: "🎓", title: "Theory pro", description: "Cover 60 concepts", stat: "conceptsCovered", target: 60 },
  { id: "sde2", icon: "🎯", title: "SDE2", description: "Reach level 8 (SDE2 tier)", stat: "level", target: 8 },
  { id: "senior", icon: "🚀", title: "Senior", description: "Reach level 12 (Senior tier)", stat: "level", target: 12 },
];

export function evaluateBadges(s: BadgeStats) {
  return BADGES.map((b) => ({ ...b, value: Math.min(s[b.stat], b.target), earned: s[b.stat] >= b.target }));
}

/**
 * Weeks (by Monday) where tasks exist for all 7 days and every task of the week (daily and weekly) is done.
 * Days you never opened have no tasks, so they don't count toward a perfect week.
 */
export function perfectWeeks(tasks: { date: string; scope: "day" | "week"; status: "todo" | "done" }[]): number {
  const weeks = new Map<string, { days: Set<string>; allDone: boolean }>();
  for (const t of tasks) {
    const monday = startOfWeek(t.date);
    const w = weeks.get(monday) ?? { days: new Set<string>(), allDone: true };
    if (t.scope === "day") w.days.add(t.date);
    if (t.status !== "done") w.allDone = false;
    weeks.set(monday, w);
  }
  return [...weeks.values()].filter((w) => w.allDone && w.days.size === 7).length;
}
