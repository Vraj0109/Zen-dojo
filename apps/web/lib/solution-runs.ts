import "server-only";
import { eq } from "drizzle-orm";
import { toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { solutionRuns } from "./schema";

export const RUN_CODE_LIMIT = 100_000;

export type SavedRun = typeof solutionRuns.$inferSelect;

/** What the latest run came to: the verdict word and how many tests passed. */
export interface RunSummary {
  status: string;
  passed: number;
  total: number;
}

/** Keeps the latest run per problem and language (a compile error counts as a run). Code over 100 KB is refused. */
export async function saveRun(problemId: string, lang: string, code: string, result: RunSummary): Promise<boolean> {
  if (code.length > RUN_CODE_LIMIT) return false;
  const db = await getDb();
  const row = { problemId, lang, code, ranOn: toLocalDate(new Date()), status: result.status, passed: result.passed, total: result.total };
  await db
    .insert(solutionRuns)
    .values(row)
    .onConflictDoUpdate({ target: [solutionRuns.problemId, solutionRuns.lang], set: { code, ranOn: row.ranOn, status: row.status, passed: row.passed, total: row.total } });
  return true;
}

export async function getRuns(problemId: string): Promise<SavedRun[]> {
  const db = await getDb();
  return db.select().from(solutionRuns).where(eq(solutionRuns.problemId, problemId));
}
