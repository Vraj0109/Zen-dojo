// Pure content verification and quality checks (plan 0117 step 2, fixed in wave 3 by V1).
//
// Severity policy (docs/plans/notes/wave3-V1.md):
// - "error" only for what breaks a page or the judge: a problem without optimal C++, a test case whose input count
//   differs from the parameter count, a section in a slot the template does not have (or a block type the slot does not
//   allow, or a required slot missing), a lesson pointing at a missing course, duplicate entity ids, and a few judge
//   structure rules (forbidden calls, size, the class or method the judge calls).
// - "warning" for completeness and quality goals: hint count, word counts, section lists and order, brute force,
//   recap and follow-up counts, placeholder text, reading-list URL rules, LLD project checks.
//
// The old-test rules (learn/, judge/) run on the learn/ shapes: lessons go through lessonToShape, so "sections" means the
// same thing here as in the old tests (the intro and the Recap are not pattern sections, for example).

import type {
  ContentCourse,
  ContentDoc,
  ContentEntity,
  ContentLesson,
  ContentPage,
  ContentProblem,
  ContentSnapshot,
  EntityKind,
  SectionRow,
  CodeLang,
} from "./types";
import { entityKey } from "./types";
import { WEEK_FOCUS } from "../focus";
import { lessonToShape, type ArticleValue, type ConceptValue, type DesignValue, type LldValue, type PatternValue } from "./lesson-map";
import { pageTemplate, validatePageAgainstTemplate } from "./templates";

export interface Issue {
  level: "error" | "warning";
  entity: EntityKind;
  id: string;
  message: string;
}

export interface VerifyContext {
  snapshot?: ContentSnapshot;
  entities?: ContentEntity[];
  knownProblemIds?: Set<string>;
  knownLessonIds?: Set<string>;
  knownCourseIds?: Set<string>;
  knownPatterns?: Set<string>;
  knownConcepts?: Set<string>;
}

export interface VerifyContentOptions {
  /** Check WEEK_FOCUS (from focus.ts) coverage. Defaults to true when snapshot has > 30 entities. */
  checkRoadmapFocus?: boolean;
}

const FORBIDDEN_CODE_PATTERNS = [
  "Runtime.getRuntime().exec",
  "ProcessBuilder",
  "subprocess",
  "os.system",
  "socket",
  "urllib",
  "java.net",
];

const FORBIDDEN_INTERVIEW_PHRASES = ["As an AI", "In this article", "geeksforgeeks"];

export const REQUIRED_PATTERN_SECTIONS = [
  "The intuition",
  "Why it works",
  "A worked example",
  "Implementation",
  "Variants",
  "Complexity",
  "Pitfalls and edge cases",
  "Practice order",
] as const;

export const REQUIRED_INTERVIEW_HEADINGS = [
  "Clarify first",
  "Examples to say out loud",
  "Brute force",
  "The key observation",
  "Optimal approach",
  "Code walkthrough",
  "Test it out loud",
  "Common mistakes",
] as const;

const SKIP_STRESS_LINE = "# verify: skip-stress";
const TRACKING_URL = /bit\.ly|buff\.ly|amzn\.to|affiliate|utm_|[?&]r=|[?&]via=|couponCode/i;

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function hasPlaceholder(s: string): boolean {
  return /TODO|FIXME|lorem ipsum|…/i.test(s);
}

interface Reporter {
  err: (message: string) => void;
  warn: (message: string) => void;
}

function reporter(entity: EntityKind, id: string, issues: Issue[]): Reporter {
  return {
    err: (message) => issues.push({ level: "error", entity, id, message }),
    warn: (message) => issues.push({ level: "warning", entity, id, message }),
  };
}

// ------------------------------------------------------------------------------------------------
// Problem Verification
// ------------------------------------------------------------------------------------------------

function verifyProblem(p: ContentProblem, ctx?: VerifyContext): Issue[] {
  const issues: Issue[] = [];
  const id = p.row.id;
  const r = reporter("problem", id, issues);

  if (!id || id.trim().length === 0) r.err("Problem has empty id");
  if (!p.row.title || p.row.title.trim().length === 0) r.warn("Problem has empty title");
  if (p.row.difficulty && !["easy", "medium", "hard"].includes(p.row.difficulty)) {
    r.warn(`Invalid difficulty "${p.row.difficulty}"`);
  }

  // The judge needs the signature (name, return type) or the design class.
  if (p.row.kind === "function") {
    if (!p.row.fn || !p.row.fn.name) {
      r.err("Function problem is missing function signature or name");
    } else if (!p.row.fn.returns) {
      r.err("Function problem signature is missing return type");
    }
  } else if (p.row.kind === "design") {
    const design = p.row.design as { className?: string } | null;
    if (!design || !design.className) r.err("Design problem is missing design spec or className");
  }

  // Test cases: the judge runs every case, so the input count must match the parameters.
  const cases = p.cases ?? [];
  if (!cases.some((c) => c.role === "example")) r.warn("Problem has no example test cases (role: 'example')");
  if (!cases.some((c) => c.role === "test")) r.warn("Problem has no test cases (role: 'test')");

  const paramCount = p.row.kind === "function" ? (p.row.fn?.params?.length ?? 0) : null;
  const seenCaseOrd = new Set<number>();
  for (const c of cases) {
    if (seenCaseOrd.has(c.ord)) r.err(`Duplicate test case ord ${c.ord}`);
    seenCaseOrd.add(c.ord);
    if (paramCount !== null && c.input.length !== paramCount) {
      r.err(`Case ord ${c.ord} has ${c.input.length} inputs but function takes ${paramCount}`);
    }
  }

  // Hints (completeness goal: warnings, except a duplicate ord, which breaks the hint order on the page)
  const hints = p.hints ?? [];
  if (hints.length < 3) r.warn(`Problem has ${hints.length} hints (expected at least 3)`);
  const seenHintOrd = new Set<number>();
  for (const h of hints) {
    if (seenHintOrd.has(h.ord)) r.err(`Duplicate hint ord ${h.ord}`);
    seenHintOrd.add(h.ord);
    if (!h.bodyMd || h.bodyMd.trim().length === 0) r.warn(`Hint ord ${h.ord} has empty body`);
    if (h.bodyMd && h.bodyMd.includes("```")) {
      r.warn(`Hint ord ${h.ord} contains code fence; hints should be conceptual without code`);
    }
    if (h.bodyMd && hasPlaceholder(h.bodyMd)) r.warn(`Hint ord ${h.ord} contains placeholder text`);
  }

  // Solution code blocks: judge rules are errors, placeholders are warnings
  const solutionSections = p.solution?.sections ?? [];
  const allSolutionBlocks = solutionSections.flatMap((s) => s.blocks);
  const codeBlocks = allSolutionBlocks.filter((b) => b.type === "code");

  let hasOptimalCpp = false;
  let hasBruteSolution = false;
  let hasAlreadyOptimalNote = false;

  if (p.row.extra?.brute === "same") hasAlreadyOptimalNote = true;
  for (const b of allSolutionBlocks) {
    if (b.type === "markdown" && /already optimal|brute:\s*same/i.test(b.body)) hasAlreadyOptimalNote = true;
  }
  for (const s of solutionSections) {
    if (/already optimal|brute:\s*same/i.test(s.title ?? "")) hasAlreadyOptimalNote = true;
  }

  const design = p.row.design as { className: string } | null;
  for (const b of codeBlocks) {
    if (b.variant === "brute") {
      const hasAnyCode = Object.values(b.code).some((code) => code && code.trim().length > 0);
      if (hasAnyCode) hasBruteSolution = true;
    }
    if (b.variant === "optimal" || b.variant === null || b.ord === 0) {
      if (b.code.cpp && b.code.cpp.trim().length > 0) hasOptimalCpp = true;
    }

    for (const [lang, code] of Object.entries(b.code)) {
      if (!code) continue;
      const codeLang = lang as CodeLang;

      if (code.length > 40 * 1024) {
        r.err(`Solution block ${b.id} (${codeLang}): exceeds 40 KB limit (${code.length} bytes)`);
      }
      for (const word of FORBIDDEN_CODE_PATTERNS) {
        if (code.includes(word)) r.err(`Solution block ${b.id} (${codeLang}): contains forbidden call "${word}"`);
      }
      if (code.includes(SKIP_STRESS_LINE)) {
        const firstLine = code.split("\n")[0].trim();
        if (codeLang !== "python" || firstLine !== SKIP_STRESS_LINE) {
          r.err(`Solution block ${b.id} (${codeLang}): "${SKIP_STRESS_LINE}" is only allowed as first line of python`);
        }
      }

      // The judge calls the class (design) or the method (function) by name.
      if (codeLang === "java") {
        if (!code.includes("class ")) r.err(`Solution block ${b.id} (java): missing "class " declaration`);
        if (p.row.kind === "design" && design) {
          if (!code.includes(`class ${design.className}`)) r.err(`Solution block ${b.id} (java): missing class "${design.className}"`);
        } else if (p.row.fn?.name && !code.includes(`${p.row.fn.name}(`)) {
          r.err(`Solution block ${b.id} (java): missing method "${p.row.fn.name}("`);
        }
      } else if (codeLang === "python") {
        if (p.row.kind === "design" && design) {
          if (!code.includes(`class ${design.className}`)) r.err(`Solution block ${b.id} (python): missing class "${design.className}"`);
        } else if (p.row.fn?.name && !code.includes(`def ${p.row.fn.name}(`)) {
          r.err(`Solution block ${b.id} (python): missing "def ${p.row.fn.name}("`);
        }
      } else if (codeLang === "cpp") {
        if (p.row.kind === "design" && design) {
          if (!code.includes(`class ${design.className}`)) r.err(`Solution block ${b.id} (cpp): missing class "${design.className}"`);
        } else if (p.row.fn?.name && !code.includes(`${p.row.fn.name}(`)) {
          r.err(`Solution block ${b.id} (cpp): missing method "${p.row.fn.name}("`);
        }
      }

      if (hasPlaceholder(code)) r.warn(`Solution block ${b.id} (${codeLang}): contains placeholder text (TODO/FIXME)`);
    }
  }

  if (!hasOptimalCpp) r.err("Problem missing optimal C++ solution");
  if (!hasBruteSolution && !hasAlreadyOptimalNote) {
    r.warn('Problem missing brute force solution or "already optimal" / "brute: same" note');
  }

  // Page structure: statement and solution against the problem template (slots, block types, required slots)
  const combined: ContentPage = {
    template: "problem",
    sections: [...(p.statement?.sections ?? []), ...solutionSections],
  } as ContentPage;
  for (const e of validatePageAgainstTemplate(pageTemplate("problem"), combined)) r.err(`Problem page: ${e}`);

  // Placeholders in statement and solution markdown
  const allBlocks = [...(p.statement?.sections ?? []).flatMap((s) => s.blocks), ...allSolutionBlocks];
  for (const b of allBlocks) {
    if (b.type === "markdown" && hasPlaceholder(b.body)) r.warn(`Block ${b.id} contains placeholder text`);
  }

  // Interview walkthrough (completeness and style rules: warnings)
  const interviewMd = (p.row.extra?.interviewMd as string) ?? null;
  if (interviewMd) verifyInterviewMarkdown(id, interviewMd, issues);

  return issues;
}

function verifyInterviewMarkdown(id: string, md: string, issues: Issue[]): void {
  const r = reporter("problem", id, issues);

  for (const phrase of FORBIDDEN_INTERVIEW_PHRASES) {
    if (md.toLowerCase().includes(phrase.toLowerCase())) r.warn(`Interview walkthrough contains forbidden phrase "${phrase}"`);
  }
  if (/leetcode\.com\/problems\/[^/\s]+\/solutions/i.test(md)) {
    r.warn('Interview walkthrough contains forbidden URL pattern "leetcode.com/problems/*/solutions"');
  }

  let lastPos = 0;
  for (const heading of REQUIRED_INTERVIEW_HEADINGS) {
    const match = md.slice(lastPos).match(new RegExp(`##\\s+${heading}`, "i"));
    if (!match || match.index === undefined) {
      r.warn(`Interview walkthrough missing required heading "## ${heading}" in order`);
    } else {
      lastPos += match.index + match[0].length;
    }
  }

  const furtherReadingIdx = md.search(/##\s+Further reading/i);
  const textBeforeFurtherReading = furtherReadingIdx >= 0 ? md.slice(0, furtherReadingIdx) : md;
  if (/https?:\/\//i.test(textBeforeFurtherReading) || /\[.+?\]\(.+?\)/.test(textBeforeFurtherReading)) {
    r.warn('Interview walkthrough links are only allowed under "## Further reading"');
  }

  const words = countWords(md);
  if (words < 350 || words > 1100) r.warn(`Interview walkthrough word count (${words}) out of bounds (350-1100 words)`);
}

// ------------------------------------------------------------------------------------------------
// Lesson Verification
// ------------------------------------------------------------------------------------------------

function verifyLesson(l: ContentLesson, ctx?: VerifyContext): Issue[] {
  const issues: Issue[] = [];
  const id = l.row.id;
  const r = reporter("lesson", id, issues);

  if (!id || id.trim().length === 0) r.err("Lesson has empty id");
  if (!l.row.title || l.row.title.trim().length === 0) r.warn("Lesson has empty title");
  if (!l.row.courseId || l.row.courseId.trim().length === 0) r.err("Lesson has empty courseId");

  const sections: SectionRow[] = l.page?.sections ?? [];
  const allBlocks = sections.flatMap((s) => s.blocks);

  // Template structure: slots, block types, required slots (errors)
  for (const e of validatePageAgainstTemplate(pageTemplate(l.row.template), l.page)) r.err(`Lesson page: ${e}`);

  // Placeholders (warnings)
  for (const s of sections) {
    if (s.title && hasPlaceholder(s.title)) r.warn(`Section "${s.title}" has placeholder title`);
  }
  for (const b of allBlocks) {
    if (b.type === "markdown" && hasPlaceholder(b.body)) r.warn(`Block ${b.id} has placeholder text`);
    for (const [lang, code] of Object.entries(b.code)) {
      if (code && hasPlaceholder(code)) r.warn(`Code block ${b.id} (${lang}) has placeholder text`);
    }
  }

  if (l.row.template === "problem") return issues;

  // The old-test rules run on the learn/ shape, so they see the same sections the old tests saw.
  const value = lessonToShape(l);
  switch (l.row.template) {
    case "concept":
      verifyConcept(value as ConceptValue, l, sections, r);
      break;
    case "design":
      verifyDesign(value as DesignValue, r);
      break;
    case "lld":
      verifyLld(value as LldValue, r);
      break;
    case "pattern":
      verifyPattern(value as PatternValue, r);
      break;
    case "article":
      verifyArticle(value as ArticleValue, id, ctx, r);
      break;
  }
  return issues;
}

/** learn.test.ts, order-audit.test.ts (concept lessons). */
function verifyConcept(v: ConceptValue, l: ContentLesson, sections: SectionRow[], r: Reporter): void {
  const overview = v.lesson.overview.trim();
  if (overview.length < 40) r.warn("Concept lesson overview must be at least 40 characters");
  else if (overview.length <= 80) r.warn("Concept lesson overview is relatively short (<= 80 characters)");

  const points = (l.row.meta?.points as string[]) ?? [];
  if (points.length > 0 && v.lesson.explain.length < points.length) {
    r.warn(`Concept has ${points.length} checklist points but only ${v.lesson.explain.length} point explanations`);
  }
  // Point sections come out in checklist order
  let lastPoint = -1;
  for (const s of sections) {
    if (!s.slot.startsWith("point:")) continue;
    const n = Number(s.slot.slice(6));
    if (points.length > 0 && n >= points.length) {
      r.warn(`Section "${s.title}" point index ${n} out of range [0..${points.length - 1}]`);
    }
    if (n < lastPoint) r.warn(`Section "${s.title}" (point ${n}) comes after point ${lastPoint}`);
    lastPoint = n;
  }

  if (v.lesson.questions.length === 0) r.warn("Concept lesson has no interview questions");

  const recap = v.extra?.recap ?? [];
  if (recap.length < 3) r.warn(`Concept lesson has fewer than 3 recap items (found ${recap.length})`);

  // learn.test.ts: at least five deeper sections, unique titles, sentence case, more than 200 characters each
  const deeper = v.extra?.deeper ?? [];
  if (deeper.length < 5) r.warn(`Concept lesson has ${deeper.length} deeper sections (expected at least 5)`);
  const seen = new Set<string>();
  for (const s of deeper) {
    if (seen.has(s.title)) r.warn(`Duplicate deeper section title "${s.title}"`);
    seen.add(s.title);
    const capitalized = s.title.split(/\s+/).slice(1).filter((w) => /^[A-Z][a-z]{3,}$/.test(w));
    if (capitalized.length >= 3) r.warn(`Section title "${s.title}" must use sentence case (found ${capitalized.length} capitalized words)`);
    const chars = s.body.length + (s.code?.length ?? 0);
    if (chars <= 200) r.warn(`Deeper section "${s.title}" too short (${chars} chars, expected > 200)`);
  }
}

/** learn/design-depth.test.ts and learn.test.ts (system design walkthroughs). */
function verifyDesign(v: DesignValue, r: Reporter): void {
  const w = v.walkthrough;
  const empty = [
    ["requirements", w.requirements],
    ["design", w.design],
    ["deep dives", w.deepDives],
    ["tradeoffs", w.tradeoffs],
  ]
    .filter(([, items]) => (items as unknown[]).length === 0)
    .map(([name]) => name);
  if (empty.length > 0) r.warn(`Design walkthrough has no items in: ${empty.join(", ")}`);

  if (v.extra) {
    if (v.extra.recap.length < 3) r.warn(`Design lesson has ${v.extra.recap.length} recap items (expected at least 3)`);
    if (v.extra.followUps.length < 3) r.warn(`Design lesson has ${v.extra.followUps.length} follow-up questions (expected at least 3)`);
  } else {
    r.warn("Design walkthrough has no recap and follow-up questions");
  }

  const deep = v.deep;
  if (!deep) return;
  const totalWords = deep.sections.reduce((acc, s) => acc + countWords(s.body), 0);
  if (totalWords < 800) r.warn(`Design walkthrough has ${totalWords} words in its deep sections (expected at least 800)`);
  if (!deep.sections.some((s) => /failure/i.test(s.title))) r.warn("Design walkthrough missing failure modes section");
  for (const s of deep.sections) {
    const words = countWords(s.body);
    if (words < 100) r.warn(`Design section "${s.title}" is too short (${words} words, expected >= 100)`);
  }
  if (deep.diagrams.length < 3) r.warn(`Design walkthrough has ${deep.diagrams.length} diagrams (expected at least 3)`);
  for (const d of deep.diagrams) {
    if (!d.caption || d.caption.length <= 10) r.warn(`Diagram "${d.title}" missing descriptive caption (length > 10)`);
  }
  for (const c of deep.code ?? []) {
    if (c.name.endsWith(".java") && !c.code.includes("static void main(")) {
      r.warn(`Java code "${c.name}" must include static void main()`);
    }
    if (/TODO/.test(c.code)) r.warn(`Java code "${c.name}" contains TODO`);
  }
}

/** learn.test.ts (LLD guides) and the LLD project rules of learn/types.ts (LldDeep). */
function verifyLld(v: LldValue, r: Reporter): void {
  if (!v.guide.code.includes("class ")) r.warn("LLD guide missing code with 'class ' declaration");
  const deep = v.deep;
  if (!deep) return;
  const words = deep.walkthrough.reduce((acc, s) => acc + countWords(s.body), 0);
  if (deep.walkthrough.length < 6) r.warn(`LLD walkthrough has ${deep.walkthrough.length} sections (expected at least 6)`);
  if (words < 1000) r.warn(`LLD walkthrough has ${words} words (expected at least 1000)`);
  if (!deep.classDiagram.trim().startsWith("classDiagram")) r.warn("LLD project class diagram must start with classDiagram");
  if (!deep.sequenceDiagram.trim().startsWith("sequenceDiagram")) r.warn("LLD project sequence diagram must start with sequenceDiagram");
}

/** learn.test.ts "has a complete guide for every DSA pattern" (PatternGuide). */
function verifyPattern(v: PatternValue, r: Reporter): void {
  const g = v.guide;
  if (g.idea.length <= 80) r.warn(`Pattern guide idea is short (${g.idea.length} characters, expected more than 80)`);
  if (g.signals.length < 2) r.warn(`Pattern guide has ${g.signals.length} signals (expected at least 2)`);
  if (g.steps.length < 2) r.warn(`Pattern guide has ${g.steps.length} steps (expected at least 2)`);
  if (g.template.split("\n").length < 8) r.warn("Pattern guide template has fewer than 8 lines");
  if (g.variations.length < 2) r.warn(`Pattern guide has ${g.variations.length} variations (expected at least 2)`);
  if (g.recap.length < 2) r.warn(`Pattern guide has ${g.recap.length} recap lines (expected at least 2)`);
}

/** pattern-articles.test.ts (PatternArticle), with the practice-order check against the problems in the snapshot. */
function verifyArticle(v: ArticleValue, lessonId: string, ctx: VerifyContext | undefined, r: Reporter): void {
  const a = v.article;
  const titles = a.sections.map((s) => s.title);

  const introWords = countWords(a.intro);
  if (introWords < 25) r.warn(`Pattern article intro has ${introWords} words (expected at least 25)`);

  let fromIdx = 0;
  for (const req of REQUIRED_PATTERN_SECTIONS) {
    const at = titles.findIndex((t, i) => i >= fromIdx && t === req);
    if (at < 0) r.warn(`Pattern article missing required section "${req}" in order`);
    else fromIdx = at + 1;
  }

  titles.forEach((t, i) => {
    if ((REQUIRED_PATTERN_SECTIONS as readonly string[]).includes(t)) return;
    const parent = t.startsWith("Implementation: ") ? "Implementation" : t.startsWith("Variants: ") ? "Variants" : null;
    if (!parent) {
      r.warn(`Unexpected section "${t}" in pattern article`);
    } else {
      const parentIdx = titles.indexOf(parent);
      if (parentIdx < 0 || parentIdx >= i) r.warn(`Sub-section "${t}" must follow "${parent}"`);
    }
  });

  const seen = new Set<string>();
  for (const t of titles) {
    if (seen.has(t)) r.warn(`Duplicate section title "${t}" in pattern article`);
    seen.add(t);
  }

  const proseWords = introWords + a.sections.reduce((acc, s) => acc + countWords(s.body), 0);
  if (proseWords < 900) r.warn(`Pattern article has ${proseWords} prose words (expected at least 900)`);

  const withCode = a.sections.filter((s) => s.code !== undefined);
  if (withCode.length < 2) r.warn(`Pattern article has ${withCode.length} sections with code (expected at least 2)`);
  for (const s of withCode) {
    if ((s.code ?? "").trim().length <= 40) r.warn(`Pattern article section "${s.title}" code is too short (expected more than 40 characters)`);
  }
  for (const s of a.sections) {
    if (s.body.trim().length <= 150) r.warn(`Pattern article section "${s.title}" body too short (${s.body.trim().length} chars, expected > 150)`);
  }

  // Practice order names at least three of the pattern's problems (or all of them when it has fewer)
  if (ctx?.entities) {
    const patternId = lessonId.replace(/^article-/, "");
    const practice = a.sections.find((s) => s.title === "Practice order")?.body ?? "";
    const titlesOfPattern: string[] = [];
    for (const e of ctx.entities) {
      if (e.kind === "problem" && e.value.row.pattern === patternId) titlesOfPattern.push(e.value.row.title);
    }
    const named = titlesOfPattern.filter((t) => practice.includes(t)).length;
    const need = Math.min(3, titlesOfPattern.length);
    if (named < need) r.warn(`Practice order names ${named} of this pattern's problems (expected at least ${need})`);
  }
}

// ------------------------------------------------------------------------------------------------
// Course & Doc Verification
// ------------------------------------------------------------------------------------------------

function verifyCourse(entity: ContentEntity): Issue[] {
  const issues: Issue[] = [];
  const c = (entity as { value: ContentCourse }).value;
  const id = c.row.id;
  const r = reporter("course", id, issues);

  if (!id || id.trim().length === 0) r.err("Course has empty id");
  if (!c.row.area || c.row.area.trim().length === 0) r.warn("Course has empty area");
  if (!c.row.title || c.row.title.trim().length === 0) r.warn("Course has empty title");
  if (!c.row.summaryMd || c.row.summaryMd.trim().length === 0) r.warn("Course has empty summaryMd");
  return issues;
}

interface ReadingEntry {
  id?: string;
  url?: string;
  items?: string[];
}

function verifyDoc(entity: ContentEntity, ctx?: VerifyContext): Issue[] {
  const d = (entity as { value: ContentDoc }).value;
  const id = `${d.row.kind}:${d.row.id}`;
  const issues: Issue[] = [];
  const r = reporter("doc", id, issues);

  if (!d.row.kind || d.row.kind.trim().length === 0) r.err("Doc has empty kind");
  if (!d.row.id || d.row.id.trim().length === 0) r.err("Doc has empty id");

  // The reading doc holds the whole READING list (an array); a single object is checked the same way.
  if (d.row.kind === "reading") {
    const body = d.row.body as unknown;
    const entries: ReadingEntry[] = Array.isArray(body) ? (body as ReadingEntry[]) : body ? [body as ReadingEntry] : [];
    const seenIds = new Set<string>();
    for (const e of entries) {
      const label = e.id ?? e.url ?? "(no id)";
      if (e.id !== undefined) {
        if (seenIds.has(e.id)) r.warn(`Reading list id "${e.id}" is listed twice`);
        seenIds.add(e.id);
      }
      if (!e.url || !e.url.startsWith("https://")) r.warn(`Reading link "${e.url}" must be HTTPS (${label})`);
      if (e.url && TRACKING_URL.test(e.url)) {
        r.warn(`Reading link "${e.url}" contains tracking parameters or URL shortener (${label})`);
      }
      if (ctx && e.items) {
        for (const item of e.items) {
          if (!ctx.knownLessonIds?.has(item) && !ctx.knownProblemIds?.has(item)) {
            r.warn(`Reading ${label} points at unknown item "${item}"`);
          }
        }
      }
    }
  }

  // LLD project rules (learn.test.ts "every project has a Main, tests, expected output")
  if (d.row.kind === "lld-project") {
    const p = d.row.body as { files?: { name: string; code: string }[]; tests?: { name: string; code: string }[]; expectedOutput?: string[] };
    const files = p.files ?? [];
    if (!files.some((f) => f.name === "Main.java")) r.warn("LLD project has no Main.java");
    if (!p.tests || p.tests.length === 0) r.warn("LLD project has no tests");
    if ((p.expectedOutput?.length ?? 0) <= 3) r.warn(`LLD project expected output has ${p.expectedOutput?.length ?? 0} lines (expected more than 3)`);
    const names = [...files, ...(p.tests ?? [])].map((f) => f.name);
    if (new Set(names).size !== names.length) r.warn("LLD project has duplicate file names");
    for (const f of [...files, ...(p.tests ?? [])]) {
      if (/TODO|FIXME/.test(f.code)) r.warn(`LLD project file ${f.name} contains TODO or FIXME`);
    }
  }

  return issues;
}

// ------------------------------------------------------------------------------------------------
// Public API: verifyEntity and verifyContent
// ------------------------------------------------------------------------------------------------

/**
 * Verifies a single content entity against all ported structural and quality rules.
 */
export function verifyEntity(entity: ContentEntity, ctx?: VerifyContext): Issue[] {
  switch (entity.kind) {
    case "problem":
      return verifyProblem(entity.value, ctx);
    case "lesson":
      return verifyLesson(entity.value, ctx);
    case "course":
      return verifyCourse(entity);
    case "doc":
      return verifyDoc(entity, ctx);
    default:
      return [{ level: "error", entity: (entity as { kind: EntityKind }).kind ?? "doc", id: "unknown", message: "Unknown entity kind" }];
  }
}

/**
 * Verifies an entire content snapshot: runs per-entity checks and whole-snapshot cross-reference rules.
 */
export function verifyContent(snapshot: ContentSnapshot, options?: VerifyContentOptions): Issue[] {
  const issues: Issue[] = [];

  const courseIds = new Set<string>();
  const lessonIds = new Set<string>();
  const problemIds = new Set<string>();
  const patternIds = new Set<string>();
  const assetIds = new Set<string>(snapshot.assets?.map((a) => a.id) ?? []);
  const seenEntityKeys = new Set<string>();

  for (const entity of snapshot.entities) {
    const key = entityKey(entity);
    if (seenEntityKeys.has(key)) {
      issues.push({
        level: "error",
        entity: entity.kind,
        id: (entity.value as { row?: { id?: string } }).row?.id ?? "unknown",
        message: `Duplicate entity key "${key}"`,
      });
    }
    seenEntityKeys.add(key);

    if (entity.kind === "course") courseIds.add(entity.value.row.id);
    else if (entity.kind === "lesson") {
      lessonIds.add(entity.value.row.id);
      if (entity.value.row.template === "pattern") patternIds.add(entity.value.row.id);
    } else if (entity.kind === "problem") {
      problemIds.add(entity.value.row.id);
      if (entity.value.row.pattern) patternIds.add(entity.value.row.pattern);
    }
  }

  const ctx: VerifyContext = {
    snapshot,
    entities: snapshot.entities,
    knownCourseIds: courseIds,
    knownLessonIds: lessonIds,
    knownProblemIds: problemIds,
    knownPatterns: patternIds,
  };

  for (const entity of snapshot.entities) {
    issues.push(...verifyEntity(entity, ctx));
  }

  // Cross-entity integrity checks

  // 1. Lesson courseId must exist (error)
  const courseLessonsMap = new Map<string, number[]>();
  for (const entity of snapshot.entities) {
    if (entity.kind !== "lesson") continue;
    const l = entity.value;
    if (!courseIds.has(l.row.courseId)) {
      issues.push({
        level: "error",
        entity: "lesson",
        id: l.row.id,
        message: `Lesson references non-existent courseId "${l.row.courseId}"`,
      });
    }
    const ords = courseLessonsMap.get(l.row.courseId) ?? [];
    ords.push(l.row.ord);
    courseLessonsMap.set(l.row.courseId, ords);
  }

  // 2. Lesson ord unique per course (error: the app orders lessons by ord)
  for (const [courseId, ords] of courseLessonsMap.entries()) {
    const seenOrd = new Set<number>();
    for (const ord of ords) {
      if (seenOrd.has(ord)) {
        issues.push({
          level: "error",
          entity: "course",
          id: courseId,
          message: `Course has duplicate lesson ord ${ord}`,
        });
      }
      seenOrd.add(ord);
    }
  }

  // 3. Asset references (error: the page would show a missing image)
  for (const entity of snapshot.entities) {
    let sections: SectionRow[] = [];
    if (entity.kind === "lesson") sections = entity.value.page?.sections ?? [];
    else if (entity.kind === "problem") {
      sections = [...(entity.value.statement?.sections ?? []), ...(entity.value.solution?.sections ?? [])];
    }
    for (const s of sections) {
      for (const b of s.blocks) {
        if (b.assetId && !assetIds.has(b.assetId)) {
          issues.push({
            level: "error",
            entity: entity.kind,
            id: (entity.value as { row: { id: string } }).row.id,
            message: `Block ${b.id} references non-existent assetId "${b.assetId}"`,
          });
        }
      }
    }
  }

  // 4. Roadmap Focus verification (focus.ts): warnings
  const shouldCheckFocus = options?.checkRoadmapFocus ?? snapshot.entities.length > 30;
  if (shouldCheckFocus) {
    const missingPatterns: string[] = [];
    const missingStudy: string[] = [];
    for (const week of WEEK_FOCUS) {
      for (const p of week.patterns) {
        if (!patternIds.has(p) && !lessonIds.has(p)) missingPatterns.push(p);
      }
      for (const item of [...week.sd, ...week.lld]) {
        if (!lessonIds.has(item) && !problemIds.has(item)) missingStudy.push(item);
      }
    }
    if (missingPatterns.length > 0) {
      issues.push({
        level: "warning",
        entity: "problem",
        id: "roadmap",
        message: `Missing patterns referenced in WEEK_FOCUS: ${[...new Set(missingPatterns)].join(", ")}`,
      });
    }
    if (missingStudy.length > 0) {
      issues.push({
        level: "warning",
        entity: "lesson",
        id: "roadmap",
        message: `Missing study items referenced in WEEK_FOCUS: ${[...new Set(missingStudy)].join(", ")}`,
      });
    }
  }

  return issues;
}
