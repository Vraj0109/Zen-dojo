// DSA problem and pattern types plus solve XP rules. The problems and pattern groups themselves live in the content
// database (docs "dsa-problems" and "dsa-groups", plan 0117); read them through apps/web/lib/content-repo/lookups.ts.

import { addDays, daysBetween } from "./dates";

export type Difficulty = "easy" | "medium" | "hard";

export interface Problem {
  id: string; // "lc-560" for LeetCode, "c-..." for other items
  title: string;
  url?: string;
  /** LeetCode only */
  number?: number;
  slug?: string;
  difficulty?: Difficulty;
  premium?: boolean;
  /** One line on what the problem teaches (shown in the problem header and as a tooltip in lists) */
  why?: string;
}

export interface Pattern {
  id: string;
  name: string;
  recognize: string;
  problems: string[]; // Problem ids
}

export interface PatternGroup {
  id: string;
  title: string;
  patterns: Pattern[];
}

/** Problems needed to call a pattern "covered" (roadmap: 4+ problems each, or all if fewer). */
export function patternTarget(p: Pattern): number {
  return Math.min(4, p.problems.length);
}

export const SOLVE_XP: Record<Difficulty | "other", number> = { easy: 5, medium: 15, hard: 30, other: 10 };
export const RESOLVE_XP = 10;
export const RESOLVE_AFTER_DAYS = 14;

export function solveXp(problem: Pick<Problem, "difficulty">): number {
  return SOLVE_XP[problem.difficulty ?? "other"];
}

export type SolveState =
  | { state: "unsolved" }
  | { state: "solved"; solvedOn: string; resolveOn: string; resolveDue: boolean }
  | { state: "resolved"; solvedOn: string; resolvedOn: string };

/** Where a problem stands given its first solve and latest re-solve dates. */
export function solveState(firstSolvedOn: string | undefined, resolvedOn: string | undefined, today: string): SolveState {
  if (!firstSolvedOn) return { state: "unsolved" };
  if (resolvedOn) return { state: "resolved", solvedOn: firstSolvedOn, resolvedOn };
  const resolveOn = addDays(firstSolvedOn, RESOLVE_AFTER_DAYS);
  return { state: "solved", solvedOn: firstSolvedOn, resolveOn, resolveDue: daysBetween(resolveOn, today) >= 0 };
}
