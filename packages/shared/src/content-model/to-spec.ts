// The inverse of from-files.ts for the judge fields: a content problem back to the ProblemSpec the judge runs (plan 0112).
// Pure. Plan 0114 uses it to keep the judge unchanged while the content comes from the database.
import type { Case, ProblemSpec, StressCase } from "../judge/types";
import type { ContentPage, ContentProblem, TestCaseRow } from "./types";

function markdownOf(page: ContentPage, slot: string): string[] {
  return page.sections
    .filter((s) => s.slot === slot)
    .flatMap((s) => s.blocks.filter((b) => b.type === "markdown").map((b) => b.body));
}

function caseOut(c: TestCaseRow): Case & { explanation?: string } {
  const out: Case & { explanation?: string } = { input: c.input, output: c.output };
  if (c.explanationMd !== null) out.explanation = c.explanationMd;
  return out;
}

/**
 * The ProblemSpec of a content problem. `stress` is passed in by the caller (it is code, see judge/stress*.ts). Keys
 * that are undefined are left out, so the result looks like the hand-written spec.
 */
export function specFromContent(p: ContentProblem, stress?: StressCase[]): ProblemSpec {
  const { row } = p;
  const extra: Record<string, unknown> = { ...row.extra };
  const kindOmitted = extra._kindOmitted === true;
  const unorderedFalse = extra._unorderedFalse === true;
  delete extra._kindOmitted;
  delete extra._unorderedFalse;
  delete extra._interviewFrontmatter;

  const cases = [...p.cases].sort((a, b) => a.ord - b.ord);
  const solutionBlocks = p.solution.sections.flatMap((s) => s.blocks);
  const optimal = solutionBlocks.find((b) => b.type === "code" && b.variant === "optimal");

  const spec: Record<string, unknown> = {
    ...extra,
    id: row.id,
    source: row.source,
    title: row.title,
    statement: markdownOf(p.statement, "statement"),
    constraints: row.constraints,
    kind: kindOmitted ? undefined : row.kind,
    design: row.design ?? undefined,
    fn: row.fn,
    examples: cases.filter((c) => c.role === "example").map(caseOut),
    tests: cases.filter((c) => c.role === "test").map(caseOut),
    unordered: row.unordered ? true : unorderedFalse ? false : undefined,
    hints: [...p.hints].sort((a, b) => a.ord - b.ord).map((h) => h.bodyMd),
    solution: {
      idea: solutionBlocks.filter((b) => b.type === "markdown" && b.label === "idea").map((b) => b.body),
      complexity: row.complexity ?? "",
      cpp: optimal?.code.cpp ?? "",
    },
    url: row.url ?? undefined,
    difficulty: row.difficulty ?? undefined,
    pattern: row.pattern ?? undefined,
    inputFormat: row.inputFormatMd ?? undefined,
    outputFormat: row.outputFormatMd ?? undefined,
    stress,
  };
  for (const k of Object.keys(spec)) if (spec[k] === undefined) delete spec[k];
  return spec as unknown as ProblemSpec;
}
