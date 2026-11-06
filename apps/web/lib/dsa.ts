import "server-only";
import { desc, eq } from "drizzle-orm";
import {
  DSA_GROUPS,
  PROBLEMS,
  RESOLVE_XP,
  patternTarget,
  solveState,
  solveXp,
  toLocalDate,
  type Pattern,
  type Problem,
  type SolveState,
} from "@habit/shared";
import { getDb } from "./db";
import { problemSolves } from "./schema";

async function solveIndex() {
  const db = await getDb();
  const rows = await db.select().from(problemSolves).orderBy(problemSolves.id);
  const first = new Map<string, string>();
  const resolved = new Map<string, string>();
  for (const r of rows) {
    if (r.kind === "solve" && !first.has(r.problemId)) first.set(r.problemId, r.solvedOn);
    if (r.kind === "resolve") resolved.set(r.problemId, r.solvedOn);
  }
  return { rows, first, resolved };
}

export interface ProblemView extends Problem {
  status: SolveState;
}

export interface PatternView extends Pattern {
  items: ProblemView[];
  solved: number;
  target: number;
  covered: boolean;
}

export async function getDsaView() {
  const today = toLocalDate();
  const { rows, first, resolved } = await solveIndex();
  const view = (id: string): ProblemView => ({ ...PROBLEMS[id], status: solveState(first.get(id), resolved.get(id), today) });

  const groups = DSA_GROUPS.map((g) => {
    const patterns: PatternView[] = g.patterns.map((p) => {
      const items = p.problems.map(view);
      const solved = items.filter((i) => i.status.state !== "unsolved").length;
      const target = patternTarget(p);
      return { ...p, items, solved, target, covered: solved >= target };
    });
    return { ...g, patterns, covered: patterns.filter((p) => p.covered).length };
  });

  const allIds = Object.keys(PROBLEMS);
  const due = allIds.map(view).filter((p) => p.status.state === "solved" && p.status.resolveDue);
  const patterns = groups.flatMap((g) => g.patterns);

  return {
    today,
    groups,
    due,
    totals: {
      patterns: patterns.length,
      patternsCovered: patterns.filter((p) => p.covered).length,
      problems: allIds.length,
      solved: first.size,
      resolved: resolved.size,
      xp: rows.reduce((sum, r) => sum + r.xp, 0),
    },
  };
}

/** Number of problems waiting for their 14-day re-solve (shown on the Today page). */
export async function getResolveDueCount(): Promise<number> {
  const today = toLocalDate();
  const { first, resolved } = await solveIndex();
  let count = 0;
  for (const [id, on] of first) {
    const s = solveState(on, resolved.get(id), today);
    if (s.state === "solved" && s.resolveDue) count++;
  }
  return count;
}

/** First call records the solve; a second call records the re-solve. Further calls do nothing. */
export async function markSolved(problemId: string) {
  const problem = PROBLEMS[problemId];
  if (!problem) return;
  const db = await getDb();
  const existing = await db.select({ kind: problemSolves.kind }).from(problemSolves).where(eq(problemSolves.problemId, problemId));
  const solvedOn = toLocalDate();
  if (!existing.some((r) => r.kind === "solve")) {
    await db.insert(problemSolves).values({ problemId, kind: "solve", solvedOn, xp: solveXp(problem) });
  } else if (!existing.some((r) => r.kind === "resolve")) {
    await db.insert(problemSolves).values({ problemId, kind: "resolve", solvedOn, xp: RESOLVE_XP });
  }
}

/** Undo the most recent solve or re-solve of a problem. */
export async function undoSolve(problemId: string) {
  const db = await getDb();
  const [last] = await db
    .select({ id: problemSolves.id })
    .from(problemSolves)
    .where(eq(problemSolves.problemId, problemId))
    .orderBy(desc(problemSolves.id))
    .limit(1);
  if (last) await db.delete(problemSolves).where(eq(problemSolves.id, last.id));
}
