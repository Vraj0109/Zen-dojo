import "server-only";
import { eq } from "drizzle-orm";
import { toLocalDate, type ProblemSpec } from "@habit/shared";
import { getDb } from "./db";
import { solutionRuns } from "./schema";
import { parseRunCases, serializeRunCases, type SavedCase, type SavedRunCases } from "./judge/saved-run";

export const RUN_CODE_LIMIT = 100_000;

/** A failed test, looked up from the problem by its id when needed; only the id is stored. */
export interface FailedCase {
  id: number;
  kind: "example" | "test" | "stress";
  input?: unknown[];
  expected?: unknown;
}

export type SavedRun = Omit<typeof solutionRuns.$inferSelect, "runDetail"> & {
  failed?: FailedCase[];
  /** Every case of a Submit (absent for runs saved before per-case details existed) */
  cases?: SavedCase[];
  /** Cases left out of `cases` to keep the saved run small */
  omitted?: number;
};

/** What the latest run came to: the verdict word and how many tests passed. */
export interface RunSummary {
  status: string;
  passed: number;
  total: number;
  /** Ids of the tests that failed (their position: examples, then tests, then large inputs) */
  failedIds?: number[];
  /** Every case of a Submit, already within the size limit (see compactRunCases) */
  cases?: SavedRunCases;
}

/** Keeps the latest run per problem and language (a compile error counts as a run). Code over 100 KB is refused. */
export async function saveRun(problemId: string, lang: string, code: string, result: RunSummary): Promise<boolean> {
  if (code.length > RUN_CODE_LIMIT) return false;
  const db = await getDb();
  const runDetail = result.cases ? serializeRunCases(result.cases) : "";
  const row = { problemId, lang, code, ranOn: toLocalDate(new Date()), status: result.status, passed: result.passed, total: result.total, failedCases: (result.failedIds ?? []).join(","), runDetail };
  await db
    .insert(solutionRuns)
    .values(row)
    .onConflictDoUpdate({
      target: [solutionRuns.problemId, solutionRuns.lang],
      set: { code, ranOn: row.ranOn, status: row.status, passed: row.passed, total: row.total, failedCases: row.failedCases, runDetail },
    });
  return true;
}

/** The problem's own tests by position: examples, then tests (large inputs are generated, so they are not listed). */
function knownCases(spec: ProblemSpec) {
  return [...spec.examples.map((c) => ({ ...c, kind: "example" as const })), ...spec.tests.map((c) => ({ ...c, kind: "test" as const }))];
}

/** Finds the failed tests of a problem from their ids. Large inputs are generated, so they come back as ids only. */
export function failedCasesOf(spec: ProblemSpec, ids: string): FailedCase[] {
  const known = knownCases(spec);
  return ids
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0)
    .map((id) => {
      const c = known[id];
      return c ? { id, kind: c.kind, input: c.input, expected: c.output } : { id, kind: "stress" as const };
    });
}

/** A passed example or test keeps no input in the saved run; it is the problem's own, so it is filled in from the problem. */
function withKnownDetail(spec: ProblemSpec, cases: SavedCase[]): SavedCase[] {
  const known = knownCases(spec);
  return cases.map((c) => {
    if (c.kind === "stress" || c.input !== undefined) return c;
    const k = known[c.index];
    if (!k || k.kind !== c.kind) return c;
    return { ...c, input: k.input, expected: JSON.stringify(k.output) };
  });
}

export async function getRuns(problemId: string, spec?: ProblemSpec): Promise<SavedRun[]> {
  const db = await getDb();
  const rows = await db.select().from(solutionRuns).where(eq(solutionRuns.problemId, problemId));
  return rows.map(({ runDetail, ...r }) => {
    const detail = parseRunCases(runDetail);
    const out: SavedRun = spec ? { ...r, failed: failedCasesOf(spec, r.failedCases) } : { ...r };
    if (detail) {
      out.cases = spec ? withKnownDetail(spec, detail.cases) : detail.cases;
      if (detail.omitted > 0) out.omitted = detail.omitted;
    }
    return out;
  });
}
