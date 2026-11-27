import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { CODE_LANGS, TAG, specFromContent, type CodeLang, type ContentPage, type ContentProblem, type ProblemRow, type ProblemSpec } from "@habit/shared";
import { getContentDb } from "../content-db/client";
import { loadProblem } from "../content-db/load";
import { blockCode, blocks, pageSections, problems } from "../content-db/schema";
import { stressFor } from "./stress";

/** The columns the DSA list needs. No statements, cases, hints or code. */
export type ProblemSummary = {
  id: string;
  title: string;
  source: string;
  difficulty: ProblemRow["difficulty"];
  pattern: string | null;
  kind: ProblemRow["kind"];
  /** Languages that have solution code, in CODE_LANGS order. */
  languages: CodeLang[];
  /** True when a solution block has the "brute" variant. */
  hasBrute: boolean;
};

/** All live problems, summary columns only (about 100 KB for 500 problems). */
export async function listProblemSummaries(): Promise<ProblemSummary[]> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.problems);
  cacheLife("max");
  const db = await getContentDb();
  const rows = await db
    .select({
      id: problems.id,
      title: problems.title,
      source: problems.source,
      difficulty: problems.difficulty,
      pattern: problems.pattern,
      kind: problems.kind,
    })
    .from(problems)
    .where(eq(problems.deleted, 0))
    .orderBy(asc(problems.id));
  const codeRows = await db
    .select({ problemId: pageSections.ownerId, lang: blockCode.lang, variant: blocks.variant })
    .from(blockCode)
    .innerJoin(blocks, eq(blocks.id, blockCode.blockId))
    .innerJoin(pageSections, eq(pageSections.id, blocks.sectionId))
    .where(and(eq(pageSections.ownerKind, "problem"), eq(pageSections.slot, "solution")));

  const langs = new Map<string, Set<string>>();
  const brute = new Set<string>();
  for (const c of codeRows) {
    let set = langs.get(c.problemId);
    if (!set) {
      set = new Set();
      langs.set(c.problemId, set);
    }
    set.add(c.lang);
    if (c.variant === "brute") brute.add(c.problemId);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    source: r.source,
    difficulty: r.difficulty as ProblemRow["difficulty"],
    pattern: r.pattern,
    kind: r.kind as ProblemRow["kind"],
    languages: CODE_LANGS.filter((l) => langs.get(r.id)?.has(l) ?? false),
    hasBrute: brute.has(r.id),
  }));
}

/** One problem with its cases, hints, statement and solution, or null when missing or soft-deleted. */
export async function getProblem(id: string): Promise<ContentProblem | null> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.problem(id));
  cacheLife("max");
  return loadProblem(await getContentDb(), id);
}

/**
 * The judge's ProblemSpec. Not cached itself: the stress generators are functions, which a cache entry cannot hold.
 * It reads the cached problem (getProblem) and adds the code-side stress.
 */
export async function getProblemSpec(id: string): Promise<ProblemSpec | null> {
  const problem = await getProblem(id);
  if (!problem) return null;
  return specFromContent(problem, stressFor(id));
}

/** The solution page of one problem (ordered sections, blocks and code per language), or null. */
export async function getSolutionPage(id: string): Promise<ContentPage | null> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.problem(id));
  cacheLife("max");
  const problem = await getProblem(id);
  return problem ? problem.solution : null;
}
