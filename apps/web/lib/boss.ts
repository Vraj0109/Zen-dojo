import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { PROBLEMS, TOTAL_WEEKS, planWeekNumber, toLocalDate, weekFocus } from "@habit/shared";
import { getDb } from "./db";
import { getDsaView, markSolved, type ProblemView } from "./dsa";
import { bossFights, tasks } from "./schema";
import { logStruggle } from "./struggles";
import { getPlanStart } from "./tasks";

// Boss fight: 2 unsolved problems from your weakest patterns so far, solved against a 2-hour timer
// (the roadmap's weekend "timed set"). Picks are stable for the day; "Different problems" re-rolls.

export const BOSS_MINUTES = 120;
export const BOSS_RESULTS = {
  solved: "Solved in time",
  hint: "Solved with a hint",
  failed: "Didn't solve",
} as const;
export type BossResult = keyof typeof BOSS_RESULTS;

export interface BossPick {
  problem: ProblemView;
  pattern: string;
}

/** FNV-1a, for stable daily picks. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Pick 2 from the candidates, one medium and one hard when both exist. Deterministic for a seed. */
export function pickBoss<T extends { problem: { id: string; difficulty?: string } }>(candidates: T[], seed: string): T[] {
  const order = [...candidates].sort((a, b) => hash(seed + a.problem.id) - hash(seed + b.problem.id));
  const medium = order.find((c) => c.problem.difficulty === "medium");
  const hard = order.find((c) => c.problem.difficulty === "hard");
  if (medium && hard) return [medium, hard];
  return order.slice(0, 2);
}

export async function getBossView(reroll = 0) {
  const today = toLocalDate();
  const [dsa, planStart, db] = await Promise.all([getDsaView(), getPlanStart(), getDb()]);
  const weekNo = Math.min(Math.max(planWeekNumber(planStart, today), 1), TOTAL_WEEKS);

  // Patterns the plan has reached so far, weakest first
  const reached = new Set<string>();
  for (let w = 1; w <= weekNo; w++) for (const p of weekFocus(w).patterns) reached.add(p);
  const patterns = dsa.groups.flatMap((g) => g.patterns);
  const weak = patterns
    .filter((p) => reached.has(p.id) && !p.covered)
    .sort((a, b) => a.solved / a.target - b.solved / b.target);

  const eligible = (p: ProblemView) => p.status.state === "unsolved" && !p.premium && !!p.slug && (p.difficulty === "medium" || p.difficulty === "hard");
  const fromPatterns = (list: typeof patterns) => {
    const seen = new Set<string>();
    return list.flatMap((pat) =>
      pat.items.filter((p) => eligible(p) && !seen.has(p.id) && seen.add(p.id)).map((problem) => ({ problem, pattern: pat.name })),
    );
  };
  let candidates = fromPatterns(weak);
  const source = candidates.length >= 2 ? "weak" : "all";
  if (candidates.length < 2) candidates = fromPatterns(patterns);

  const picks: BossPick[] = pickBoss(candidates, `${today}:${reroll}`);
  const history = await db.select().from(bossFights).orderBy(desc(bossFights.id)).limit(10);
  return { today, weekNo, picks, source, history, foughtToday: history.find((h) => h.foughtOn === today) ?? null };
}

/** Save a fight: solves are recorded (with XP), hints and misses go on the stuck list, and today's timed-set task is ticked. */
export async function saveBossFight(input: { results: { problemId: string; result: string }[]; minutes: number | null; notes: string }): Promise<boolean> {
  const results = input.results.filter((r) => r.problemId in PROBLEMS && r.result in BOSS_RESULTS).slice(0, 3);
  if (results.length === 0) return false;
  const db = await getDb();
  const today = toLocalDate();
  for (const r of results) {
    if (r.result !== "failed") await markSolved(r.problemId);
    if (r.result !== "solved") await logStruggle(r.problemId, r.result === "hint" ? "hint" : "failed", "Boss fight");
  }
  const minutes = input.minutes !== null && Number.isInteger(input.minutes) && input.minutes > 0 ? Math.min(input.minutes, 600) : null;
  await db.insert(bossFights).values({ foughtOn: today, results, minutes, notes: input.notes.slice(0, 5000) });
  await db
    .update(tasks)
    .set({ status: "done", doneOn: today })
    .where(and(eq(tasks.date, today), eq(tasks.templateKey, "timed-set"), eq(tasks.status, "todo")));
  return true;
}
