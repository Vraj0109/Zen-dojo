// Maps today's problem files (ProblemSpec, Java/Python/brute code, interview walkthrough) to content rows (plan 0112).
// Pure. The inverse for the judge fields is to-spec.ts. Keys with a leading underscore in row.extra are bookkeeping
// for the content DB and are removed again by specFromContent.
import type { ProblemSpec } from "../judge/types";
import { revOf } from "./rev";
import type {
  BlockType,
  CodeLang,
  CodeVariant,
  ContentPage,
  ContentProblem,
  HintRow,
  ProblemRow,
  SectionRow,
  TemplateId,
  TestCaseRow,
} from "./types";

/** Reference code in one or more languages (brute force or optimal). */
export interface LangCode {
  cpp?: string;
  java?: string;
  python?: string;
}

/** Everything about a problem that is not in its ProblemSpec: loaded from the solution and interview files. */
export interface ProblemExtra {
  /** Java optimal solution (content/solutions/<id>.java). */
  java?: string;
  /** Python optimal solution (content/solutions/<id>.py). */
  python?: string;
  /** Brute force code (content/solutions/<id>.brute.*). */
  brute?: LangCode;
  /** Full interview walkthrough Markdown, frontmatter included (content/interview/<id>.md). */
  interviewMd?: string;
  /** True when the walkthrough says "brute: same": the direct approach is already optimal. */
  bruteSame?: boolean;
}

export const BRUTE_SAME_TEXT = "The direct approach is already optimal here.";

/** A block before ids are assigned. */
export interface BlockInput {
  type: BlockType;
  body: string;
  caption?: string | null;
  variant?: CodeVariant | null;
  label?: string | null;
  code?: Partial<Record<CodeLang, string>>;
}

/** A section before ids are assigned. */
export interface SectionInput {
  slot: string;
  title: string | null;
  blocks: BlockInput[];
}

const LANG_KEYS: Record<string, CodeLang> = {
  cpp: "cpp",
  "c++": "cpp",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  python: "python",
  py: "python",
  sql: "sql",
  go: "go",
  text: "text",
};

/** The code-block key for a language label. Unknown or missing languages are "text". */
export function codeLangOf(lang: string | undefined): CodeLang {
  return LANG_KEYS[(lang ?? "").trim().toLowerCase()] ?? "text";
}

export function md(body: string, label: string | null = null): BlockInput {
  return { type: "markdown", body, label };
}

export function codeBlock(
  code: Partial<Record<CodeLang, string>>,
  opts: { variant?: CodeVariant | null; label?: string | null } = {},
): BlockInput {
  return { type: "code", body: "", variant: opts.variant ?? null, label: opts.label ?? null, code };
}

/** One Section (learn/types.ts) as a section in the given slot: prose, then diagram, then code. */
export function sectionInput(slot: string, s: { title: string; body: string; diagram?: string; diagramCaption?: string; code?: string; lang?: string }): SectionInput {
  const blocks: BlockInput[] = [md(s.body)];
  if (s.diagram !== undefined) blocks.push({ type: "diagram", body: s.diagram, caption: s.diagramCaption ?? null });
  if (s.code !== undefined) blocks.push(codeBlock({ [codeLangOf(s.lang)]: s.code }, { label: s.lang ?? null }));
  return { slot, title: s.title, blocks };
}

/** Builds a page: ids are deterministic (owner, slot and position), so re-seeding gives the same ids. */
export function buildPage(owner: string, template: TemplateId, inputs: SectionInput[]): ContentPage {
  const sections: SectionRow[] = inputs.map((s, ord) => {
    const id = revOf([owner, s.slot, ord]);
    return {
      id,
      slot: s.slot,
      ord,
      title: s.title,
      blocks: s.blocks.map((b, i) => ({
        id: revOf([id, i]),
        ord: i,
        type: b.type,
        body: b.body,
        caption: b.caption ?? null,
        variant: b.variant ?? null,
        label: b.label ?? null,
        timeComplexity: null,
        spaceComplexity: null,
        assetId: null,
        code: b.code ?? {},
      })),
    };
  });
  return { template, sections };
}

export interface InterviewSection {
  /** null for text before the first "## " heading. */
  title: string | null;
  body: string;
}

/** Splits a walkthrough into "## " sections, the same way the Solution tab does. Frontmatter is dropped. */
export function parseInterview(md: string): { frontmatter: string; sections: InterviewSection[] } {
  const fm = /^---[\s\S]*?---\n*/.exec(md);
  const frontmatter = fm ? fm[0] : "";
  const body = md.slice(frontmatter.length);
  const out: { title: string | null; lines: string[] }[] = [];
  let cur: { title: string | null; lines: string[] } = { title: null, lines: [] };
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = inFence ? null : /^## (.+)$/.exec(line);
    if (h) {
      out.push(cur);
      cur = { title: h[1].trim(), lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  out.push(cur);
  const sections = out
    .map((s) => ({ title: s.title, body: s.lines.join("\n").trim() }))
    .filter((s) => s.title !== null || s.body !== "");
  return { frontmatter, sections };
}

/** Languages present in a LangCode, in tab order (cpp, java, python). Null when there are none. */
export function langCodeOf(src: LangCode | undefined): Partial<Record<CodeLang, string>> | null {
  if (!src) return null;
  const out: Partial<Record<CodeLang, string>> = {};
  if (src.cpp !== undefined) out.cpp = src.cpp;
  if (src.java !== undefined) out.java = src.java;
  if (src.python !== undefined) out.python = src.python;
  return Object.keys(out).length ? out : null;
}

function bruteBlocks(extra: ProblemExtra): BlockInput[] {
  if (extra.bruteSame) return [md(BRUTE_SAME_TEXT, "brute-same")];
  const code = langCodeOf(extra.brute);
  return code ? [codeBlock(code, { variant: "brute", label: "Brute force" })] : [];
}

/**
 * The solution page, in the order the Solution tab shows it (apps/web/app/solution-walkthrough.tsx): each walkthrough
 * section with its text; after a "brute force" section the brute code (or the "already optimal" sentence); after an
 * "optimal approach" section the idea paragraphs (once) and the optimal code. Without a walkthrough: idea, then code.
 * When the walkthrough has no matching section, the brute code and the idea + optimal code go at the end so nothing is lost.
 */
export function solutionSections(spec: ProblemSpec, extra: ProblemExtra): SectionInput[] {
  const optimalCode: Partial<Record<CodeLang, string>> = { cpp: spec.solution.cpp };
  if (extra.java !== undefined) optimalCode.java = extra.java;
  if (extra.python !== undefined) optimalCode.python = extra.python;
  const optimal = codeBlock(optimalCode, { variant: "optimal", label: "Optimal" });
  const idea = spec.solution.idea.map((t) => md(t, "idea"));
  const brute = bruteBlocks(extra);

  if (extra.interviewMd === undefined) {
    return [{ slot: "solution", title: null, blocks: [...idea, optimal, ...brute] }];
  }

  const out: SectionInput[] = [];
  let ideaUsed = false;
  let hasBrute = false;
  let hasOptimal = false;
  for (const s of parseInterview(extra.interviewMd).sections) {
    const lower = (s.title ?? "").toLowerCase();
    const blocks: BlockInput[] = [];
    if (s.body) blocks.push(md(s.body));
    if (lower.includes("brute force")) {
      hasBrute = true;
      blocks.push(...brute);
    }
    if (lower.includes("optimal approach")) {
      hasOptimal = true;
      if (!ideaUsed) blocks.push(...idea);
      ideaUsed = true;
      blocks.push(optimal);
    }
    out.push({ slot: "solution", title: s.title, blocks });
  }
  if (!hasBrute && brute.length) out.push({ slot: "solution", title: null, blocks: brute });
  if (!hasOptimal) out.push({ slot: "solution", title: null, blocks: [...idea, optimal] });
  return out;
}

const MODELLED = [
  "id",
  "source",
  "title",
  "statement",
  "constraints",
  "kind",
  "design",
  "fn",
  "examples",
  "tests",
  "unordered",
  "hints",
  "solution",
  "url",
  "stress",
  "difficulty",
  "pattern",
  "inputFormat",
  "outputFormat",
] as const;

/**
 * One ProblemSpec (plus its files) as a content problem. Judge fields go to row, cases and hints; the statement and
 * the solution become pages. Spec fields not modelled here (description, sampleCases, ...) go to row.extra. `stress` is
 * code and is never stored.
 */
export function problemFromSpec(spec: ProblemSpec, extra: ProblemExtra = {}): ContentProblem {
  const owner = `problem:${spec.id}`;
  const rest: Record<string, unknown> = { ...spec };
  for (const k of MODELLED) delete rest[k];
  if (spec.kind === undefined) rest._kindOmitted = true;
  if (spec.unordered === false) rest._unorderedFalse = true;
  if (extra.interviewMd !== undefined) rest._interviewFrontmatter = parseInterview(extra.interviewMd).frontmatter;

  const row: ProblemRow = {
    id: spec.id,
    source: spec.source,
    title: spec.title,
    difficulty: spec.difficulty ?? null,
    pattern: spec.pattern ?? null,
    url: spec.url ?? null,
    kind: spec.kind ?? "function",
    constraints: spec.constraints,
    inputFormatMd: spec.inputFormat ?? null,
    outputFormatMd: spec.outputFormat ?? null,
    fn: spec.fn as ProblemRow["fn"],
    design: spec.design ?? null,
    unordered: spec.unordered === true,
    complexity: spec.solution.complexity,
    extra: rest,
  };

  const caseRow = (c: { input: unknown[]; output: unknown; explanation?: string }, ord: number, role: "example" | "test"): TestCaseRow => ({
    ord,
    role,
    input: c.input,
    output: c.output,
    explanationMd: c.explanation ?? null,
  });
  const cases: TestCaseRow[] = [
    ...spec.examples.map((c, i) => caseRow(c, i, "example")),
    ...spec.tests.map((c, i) => caseRow(c, spec.examples.length + i, "test")),
  ];
  const hints: HintRow[] = spec.hints.map((h, i) => ({ ord: i, bodyMd: h }));

  return {
    row,
    cases,
    hints,
    statement: buildPage(owner, "problem", [{ slot: "statement", title: null, blocks: spec.statement.map((t) => md(t)) }]),
    solution: buildPage(owner, "problem", solutionSections(spec, extra)),
  };
}
