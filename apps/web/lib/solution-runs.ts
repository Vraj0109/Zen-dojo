import "server-only";
import { eq } from "drizzle-orm";
import { toLocalDate, type ProblemSpec } from "@habit/shared";
import { getDb } from "./db";
import { solutionRuns } from "./schema";

export const RUN_CODE_LIMIT = 100_000;

/** A failed test, looked up from the problem by its id when needed; only the id is stored. */
export interface FailedCase {
  id: number;
  kind: "example" | "test" | "stress";
  input?: unknown[];
  expected?: unknown;
}

export type SavedRun = typeof solutionRuns.$inferSelect & { failed?: FailedCase[] };

/** What the latest run came to: the verdict word and how many tests passed. */
export interface RunSummary {
  status: string;
  passed: number;
  total: number;
  /** Ids of the tests that failed (their position: examples, then tests, then large inputs) */
  failedIds?: number[];
}

/** Keeps the latest run per problem and language (a compile error counts as a run). Code over 100 KB is refused. */
export async function saveRun(problemId: string, lang: string, code: string, result: RunSummary): Promise<boolean> {
  if (code.length > RUN_CODE_LIMIT) return false;
  const db = await getDb();
  const row = { problemId, lang, code, ranOn: toLocalDate(new Date()), status: result.status, passed: result.passed, total: result.total, failedCases: (result.failedIds ?? []).join(",") };
  await db
    .insert(solutionRuns)
    .values(row)
    .onConflictDoUpdate({ target: [solutionRuns.problemId, solutionRuns.lang], set: { code, ranOn: row.ranOn, status: row.status, passed: row.passed, total: row.total, failedCases: row.failedCases } });
  return true;
}

/** Finds the failed tests of a problem from their ids. Large inputs are generated, so they come back as ids only. */
export function failedCasesOf(spec: ProblemSpec, ids: string): FailedCase[] {
  const known = [...spec.examples.map((c) => ({ ...c, kind: "example" as const })), ...spec.tests.map((c) => ({ ...c, kind: "test" as const }))];
  return ids
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0)
    .map((id) => {
      const c = known[id];
      return c ? { id, kind: c.kind, input: c.input, expected: c.output } : { id, kind: "stress" as const };
    });
}

export async function getRuns(problemId: string, spec?: ProblemSpec): Promise<SavedRun[]> {
  const db = await getDb();
  const rows = await db.select().from(solutionRuns).where(eq(solutionRuns.problemId, problemId));
  return spec ? rows.map((r) => ({ ...r, failed: failedCasesOf(spec, r.failedCases) })) : rows;
}
