import "server-only";
import { and, desc, eq, like, sql } from "drizzle-orm";
import {
  ALL_PATTERNS,
  DSA_GROUPS,
  PROBLEMS,
  RESOLVE_XP,
  patternTarget,
  solveState,
  solveXp,
  toLocalDate,
  type Difficulty,
  type Pattern,
  type Problem,
  type SolveState,
} from "@habit/shared";
import { getDb } from "./db";
import { getNote, getNotedIds, type ProblemNote } from "./notes";
import { leetcodeProblems, problemSolves } from "./schema";

/** Solve history for roadmap problems (ids in PROBLEMS). Other LeetCode solves are handled separately. */
async function solveIndex() {
  const db = await getDb();
  const rows = await db.select().from(problemSolves).orderBy(problemSolves.id);
  const first = new Map<string, string>();
  const resolved = new Map<string, string>();
  const auto = new Set<string>();
  for (const r of rows) {
    if (!(r.problemId in PROBLEMS)) continue;
    if (r.kind === "solve" && !first.has(r.problemId)) {
      first.set(r.problemId, r.solvedOn);
      if (r.source === "leetcode") auto.add(r.problemId);
    }
    if (r.kind === "resolve") resolved.set(r.problemId, r.solvedOn);
  }
  return { rows, first, resolved, auto };
}

export interface ProblemView extends Problem {
  status: SolveState;
  /** First solve was imported from LeetCode */
  auto: boolean;
  /** Has notes or saved code */
  noted: boolean;
}

/** LeetCode solves of problems outside the roadmap list, newest first. */
async function getExtraSolves() {
  const db = await getDb();
  const rows = await db
    .select({
      problemId: problemSolves.problemId,
      solvedOn: problemSolves.solvedOn,
      xp: problemSolves.xp,
      title: leetcodeProblems.title,
      number: leetcodeProblems.number,
      slug: leetcodeProblems.slug,
      difficulty: leetcodeProblems.difficulty,
    })
    .from(problemSolves)
    .innerJoin(leetcodeProblems, eq(problemSolves.problemId, sql`'lcx-' || ${leetcodeProblems.slug}`))
    .where(and(like(problemSolves.problemId, "lcx-%"), eq(problemSolves.kind, "solve")))
    .orderBy(desc(problemSolves.solvedOn), desc(problemSolves.id));
  return rows.map((r) => ({ ...r, url: `https://leetcode.com/problems/${r.slug}/` }));
}

export interface PatternView extends Pattern {
  items: ProblemView[];
  solved: number;
  target: number;
  covered: boolean;
}

export async function getDsaView() {
  const today = toLocalDate();
  const [{ rows, first, resolved, auto }, extraRows, noted] = await Promise.all([solveIndex(), getExtraSolves(), getNotedIds()]);
  const extras = extraRows.map((e) => ({ ...e, noted: noted.has(e.problemId) }));
  const view = (id: string): ProblemView => ({
    ...PROBLEMS[id],
    status: solveState(first.get(id), resolved.get(id), today),
    auto: auto.has(id),
    noted: noted.has(id),
  });

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
    extras,
    totals: {
      patterns: patterns.length,
      patternsCovered: patterns.filter((p) => p.covered).length,
      problems: allIds.length,
      solved: first.size,
      resolved: resolved.size,
      /** Every distinct problem solved, roadmap or not (roadmap checklist: 150+). */
      allSolved: first.size + extras.length,
      xp: rows.reduce((sum, r) => sum + r.xp, 0),
    },
  };
}

export interface ProblemDetail {
  id: string;
  kind: "roadmap" | "extra";
  title: string;
  number?: number | null;
  url?: string;
  difficulty?: Difficulty;
  premium?: boolean;
  patterns: Pick<Pattern, "id" | "name" | "recognize">[];
  status: SolveState;
  auto: boolean;
  note: ProblemNote | null;
}

/** Everything the problem page needs; null for unknown ids. */
export async function getProblemDetail(id: string): Promise<ProblemDetail | null> {
  const today = toLocalDate();
  if (id in PROBLEMS) {
    const [{ first, resolved, auto }, note] = await Promise.all([solveIndex(), getNote(id)]);
    return {
      ...PROBLEMS[id],
      kind: "roadmap",
      patterns: ALL_PATTERNS.filter((p) => p.problems.includes(id)).map(({ id, name, recognize }) => ({ id, name, recognize })),
      status: solveState(first.get(id), resolved.get(id), today),
      auto: auto.has(id),
      note,
    };
  }
  if (!id.startsWith("lcx-")) return null;
  const db = await getDb();
  const slug = id.slice("lcx-".length);
  const [info, solve, note] = await Promise.all([
    db.query.leetcodeProblems.findFirst({ where: eq(leetcodeProblems.slug, slug) }),
    db.query.problemSolves.findFirst({ where: and(eq(problemSolves.problemId, id), eq(problemSolves.kind, "solve")) }),
    getNote(id),
  ]);
  if (!info) return null;
  return {
    id,
    kind: "extra",
    title: info.title,
    number: info.number,
    url: `https://leetcode.com/problems/${slug}/`,
    difficulty: info.difficulty,
    patterns: [],
    // Re-solves are only scheduled for roadmap problems.
    status: solve ? { state: "resolved", solvedOn: solve.solvedOn, resolvedOn: solve.solvedOn } : { state: "unsolved" },
    auto: solve?.source === "leetcode",
    note,
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
