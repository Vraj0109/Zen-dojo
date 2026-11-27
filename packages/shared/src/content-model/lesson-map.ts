// Maps the learn/ shapes (concept lessons, design walkthroughs, LLD answers, pattern guides and articles) to lessons with
// sections and blocks, and back (plan 0112). lessonToShape(lessonFromFile(x)) gives x again exactly. Also list-like data
// (docFromFile) and study areas (courseFromStudyArea). Pure.
import type { DiagramBlock, Lesson, LessonExtra, LldDeep, LldExtra, LldGuide, LldProject, PatternArticle, PatternGuide, Section, Walkthrough, WalkthroughExtra } from "../learn/types";
import type { WalkthroughDeep } from "../learn/design-depth-types";
import type { StudyArea } from "../study";
import { buildPage, codeBlock, md, sectionInput, type SectionInput } from "./from-files";
import { slotKey } from "./templates";
import type { ContentCourse, ContentDoc, ContentLesson, ContentPage, LessonRow, SectionRow, TemplateId } from "./types";

export interface ConceptValue {
  lesson: Lesson;
  extra?: LessonExtra;
}
export interface DesignValue {
  walkthrough: Walkthrough;
  deep?: WalkthroughDeep;
  extra?: WalkthroughExtra;
}
export interface LldValue {
  guide: LldGuide;
  deep?: LldDeep;
  extra?: LldExtra;
}
export interface PatternValue {
  guide: PatternGuide;
}
export interface ArticleValue {
  article: PatternArticle;
}
export type LessonValue = ConceptValue | DesignValue | LldValue | PatternValue | ArticleValue;

export interface LessonCtx {
  courseId: string;
  ord: number;
  title: string;
  /** Concept checklist (study.ts). Used as section titles of the "point" slot. */
  points?: string[];
}

/** Pattern guides and articles have no study area; they sit in this course (created by the seed). */
export const PATTERN_COURSE_ID = "dsa-patterns";

// ---- helpers ---------------------------------------------------------------------------------------------------

function listInput(slot: string, items: string[]): SectionInput {
  return { slot, title: null, blocks: items.map((t) => md(t)) };
}

function textInput(slot: string, text: string): SectionInput {
  return { slot, title: null, blocks: [md(text)] };
}

function diagramInput(slot: string, d: DiagramBlock): SectionInput {
  const caption = d.caption ?? null;
  return { slot, title: d.title, blocks: [{ type: "diagram", body: d.source, caption }] };
}

function titledDiagram(slot: string, title: string, source: string): SectionInput {
  return { slot, title, blocks: [{ type: "diagram", body: source, caption: null }] };
}

function sectionsIn(page: ContentPage, key: string): SectionRow[] {
  return page.sections.filter((s) => slotKey(s.slot) === key);
}

function bodyOf(s: SectionRow | undefined): string {
  return s?.blocks.find((b) => b.type === "markdown")?.body ?? "";
}

function textOf(page: ContentPage, key: string): string {
  return bodyOf(sectionsIn(page, key)[0]);
}

function listOf(page: ContentPage, key: string): string[] {
  return sectionsIn(page, key).flatMap((s) => s.blocks.filter((b) => b.type === "markdown").map((b) => b.body));
}

function firstCodeOf(page: ContentPage, key: string): string {
  const b = sectionsIn(page, key)[0]?.blocks.find((x) => x.type === "code");
  return b ? (Object.values(b.code)[0] ?? "") : "";
}

function sectionOf(sec: SectionRow): Section {
  const out: Section = { title: sec.title ?? "", body: bodyOf(sec) };
  const d = sec.blocks.find((b) => b.type === "diagram");
  if (d) {
    out.diagram = d.body;
    if (d.caption !== null) out.diagramCaption = d.caption;
  }
  const c = sec.blocks.find((b) => b.type === "code");
  if (c) {
    out.code = Object.values(c.code)[0] ?? "";
    if (c.label !== null) out.lang = c.label;
  }
  return out;
}

function diagramOf(sec: SectionRow): DiagramBlock {
  const d = sec.blocks.find((b) => b.type === "diagram");
  const out: DiagramBlock = { title: sec.title ?? "", source: d?.body ?? "" };
  if (d && d.caption !== null) out.caption = d.caption;
  return out;
}

/** Only the keys that are set, so a value round-trips without undefined holes. */
function pick<T extends object>(src: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

// ---- concept -----------------------------------------------------------------------------------------------------

function conceptInputs(v: ConceptValue, points: string[]): SectionInput[] {
  const out: SectionInput[] = [textInput("overview", v.lesson.overview)];
  v.lesson.explain.forEach((t, i) => out.push({ slot: `point:${i}`, title: points[i] ?? null, blocks: [md(t)] }));
  if (v.extra) {
    out.push(listInput("recap", v.extra.recap));
    for (const d of v.extra.deeper) out.push(sectionInput("deeper", d));
  }
  out.push(listInput("questions", v.lesson.questions));
  if (v.lesson.pitfalls !== undefined) out.push(listInput("mistakes", v.lesson.pitfalls));
  return out;
}

function conceptValue(page: ContentPage): ConceptValue {
  const lesson: Lesson = {
    overview: textOf(page, "overview"),
    explain: sectionsIn(page, "point").map((s) => bodyOf(s)),
    questions: listOf(page, "questions"),
  };
  if (sectionsIn(page, "mistakes").length) lesson.pitfalls = listOf(page, "mistakes");
  const value: ConceptValue = { lesson };
  if (sectionsIn(page, "recap").length) {
    value.extra = { recap: listOf(page, "recap"), deeper: sectionsIn(page, "deeper").map(sectionOf) };
  }
  return value;
}

// ---- design ------------------------------------------------------------------------------------------------------

function designMeta(d: WalkthroughDeep | undefined): Record<string, unknown> {
  if (!d) return { deep: false };
  return { deep: true, ...pick(d, ["architecture", "criteria", "code"]) };
}

function designInputs(v: DesignValue): SectionInput[] {
  const w = v.walkthrough;
  const out: SectionInput[] = [
    listInput("requirements", w.requirements),
    listInput("estimates", w.estimates),
    listInput("api", w.api),
    listInput("data", w.data),
    listInput("design", w.design),
  ];
  if (v.deep) {
    for (const d of v.deep.diagrams) out.push(diagramInput("diagrams", d));
  }
  for (const d of w.deepDives) out.push({ slot: "dives", title: d.title, blocks: [md(d.body)] });
  if (v.deep) {
    for (const s of v.deep.sections) out.push(sectionInput("deep", s));
  }
  out.push(listInput("tradeoffs", w.tradeoffs));
  if (v.extra) {
    out.push(listInput("recap", v.extra.recap));
    for (const f of v.extra.followUps) out.push({ slot: "follow-ups", title: f.q, blocks: [md(f.a)] });
  }
  return out;
}

function designValue(page: ContentPage, meta: Record<string, unknown>): DesignValue {
  const walkthrough: Walkthrough = {
    requirements: listOf(page, "requirements"),
    estimates: listOf(page, "estimates"),
    api: listOf(page, "api"),
    data: listOf(page, "data"),
    design: listOf(page, "design"),
    deepDives: sectionsIn(page, "dives").map((s) => ({ title: s.title ?? "", body: bodyOf(s) })),
    tradeoffs: listOf(page, "tradeoffs"),
  };
  const value: DesignValue = { walkthrough };
  if (meta.deep === true) {
    const deep: WalkthroughDeep = {
      diagrams: sectionsIn(page, "diagrams").map(diagramOf),
      sections: sectionsIn(page, "deep").map(sectionOf),
      ...pick(meta as Partial<WalkthroughDeep>, ["architecture", "criteria", "code"]),
    };
    value.deep = deep;
  }
  if (sectionsIn(page, "recap").length) {
    value.extra = {
      recap: listOf(page, "recap"),
      followUps: sectionsIn(page, "follow-ups").map((s) => ({ q: s.title ?? "", a: bodyOf(s) })),
    };
  }
  return value;
}

// ---- LLD ---------------------------------------------------------------------------------------------------------

function lldInputs(v: LldValue): SectionInput[] {
  const g = v.guide;
  const out: SectionInput[] = [
    listInput("requirements", g.requirements),
    listInput("entities", g.entities),
    listInput("patterns", g.patterns),
    { slot: "code", title: null, blocks: [codeBlock({ java: g.code })] },
    listInput("extensions", g.extensions),
  ];
  if (v.deep) {
    for (const s of v.deep.walkthrough) out.push(sectionInput("walkthrough", s));
    out.push(titledDiagram("diagrams", "class", v.deep.classDiagram));
    out.push(titledDiagram("diagrams", "sequence", v.deep.sequenceDiagram));
    if (v.deep.stateDiagram !== undefined) out.push(titledDiagram("diagrams", "state", v.deep.stateDiagram));
    for (const d of v.deep.extraDiagrams ?? []) out.push(diagramInput("extra-diagrams", d));
    out.push(listInput("concurrency", v.deep.concurrency));
  }
  if (v.extra) {
    out.push(listInput("recap", v.extra.recap));
    out.push(listInput("flow", v.extra.flow));
    out.push(listInput("edge-cases", v.extra.edgeCases));
  }
  return out;
}

function lldDiagram(page: ContentPage, title: string): string | undefined {
  const s = sectionsIn(page, "diagrams").find((x) => x.title === title);
  return s ? (s.blocks.find((b) => b.type === "diagram")?.body ?? "") : undefined;
}

function lldValue(page: ContentPage, meta: Record<string, unknown>): LldValue {
  const guide: LldGuide = {
    requirements: listOf(page, "requirements"),
    entities: listOf(page, "entities"),
    patterns: listOf(page, "patterns"),
    code: firstCodeOf(page, "code"),
    extensions: listOf(page, "extensions"),
  };
  const value: LldValue = { guide };
  if (meta.deep === true) {
    const deep: LldDeep = {
      walkthrough: sectionsIn(page, "walkthrough").map(sectionOf),
      classDiagram: lldDiagram(page, "class") ?? "",
      sequenceDiagram: lldDiagram(page, "sequence") ?? "",
      concurrency: listOf(page, "concurrency"),
    };
    const state = lldDiagram(page, "state");
    if (state !== undefined) deep.stateDiagram = state;
    if (meta.extraDiagrams === true) deep.extraDiagrams = sectionsIn(page, "extra-diagrams").map(diagramOf);
    value.deep = deep;
  }
  if (sectionsIn(page, "recap").length) {
    value.extra = { recap: listOf(page, "recap"), flow: listOf(page, "flow"), edgeCases: listOf(page, "edge-cases") };
  }
  return value;
}

// ---- pattern and article -----------------------------------------------------------------------------------------

function patternInputs(v: PatternValue): SectionInput[] {
  const g = v.guide;
  return [
    textInput("idea", g.idea),
    listInput("signals", g.signals),
    listInput("steps", g.steps),
    { slot: "template", title: null, blocks: [codeBlock({ cpp: g.template })] },
    textInput("complexity", g.complexity),
    listInput("variations", g.variations),
    listInput("pitfalls", g.pitfalls),
    listInput("recap", g.recap),
  ];
}

function patternValue(page: ContentPage): PatternValue {
  return {
    guide: {
      idea: textOf(page, "idea"),
      signals: listOf(page, "signals"),
      steps: listOf(page, "steps"),
      template: firstCodeOf(page, "template"),
      complexity: textOf(page, "complexity"),
      variations: listOf(page, "variations"),
      pitfalls: listOf(page, "pitfalls"),
      recap: listOf(page, "recap"),
    },
  };
}

function articleInputs(v: ArticleValue): SectionInput[] {
  return [textInput("intro", v.article.intro), ...v.article.sections.map((s) => sectionInput("sections", s))];
}

function articleValue(page: ContentPage): ArticleValue {
  return { article: { intro: textOf(page, "intro"), sections: sectionsIn(page, "sections").map(sectionOf) } };
}

// ---- public API --------------------------------------------------------------------------------------------------

/**
 * One learn/ value as a lesson. `kind` is the page template: concept, design, lld, pattern or article. Ids are
 * "lesson:<id>" for owners, so a pattern guide and its article get different ids (pattern-<id>, article-<id>).
 */
export function lessonFromFile(kind: TemplateId, id: string, value: LessonValue, ctx: LessonCtx): ContentLesson {
  const owner = `lesson:${id}`;
  let inputs: SectionInput[];
  let meta: Record<string, unknown>;
  switch (kind) {
    case "concept": {
      const v = value as ConceptValue;
      inputs = conceptInputs(v, ctx.points ?? []);
      meta = { points: ctx.points ?? [] };
      break;
    }
    case "design": {
      const v = value as DesignValue;
      inputs = designInputs(v);
      meta = designMeta(v.deep);
      break;
    }
    case "lld": {
      const v = value as LldValue;
      inputs = lldInputs(v);
      meta = { deep: v.deep !== undefined, extraDiagrams: v.deep?.extraDiagrams !== undefined };
      break;
    }
    case "pattern":
      inputs = patternInputs(value as PatternValue);
      meta = {};
      break;
    case "article":
      inputs = articleInputs(value as ArticleValue);
      meta = {};
      break;
    case "problem":
      throw new Error("problems are mapped by problemFromSpec (from-files.ts)");
  }
  const row: LessonRow = { id, courseId: ctx.courseId, ord: ctx.ord, title: ctx.title, template: kind, meta };
  return { row, page: buildPage(owner, kind, inputs) };
}

/** The learn/ value of a lesson: the exact inverse of lessonFromFile. */
export function lessonToShape(lesson: ContentLesson): LessonValue {
  const { page, row } = lesson;
  switch (row.template) {
    case "concept":
      return conceptValue(page);
    case "design":
      return designValue(page, row.meta);
    case "lld":
      return lldValue(page, row.meta);
    case "pattern":
      return patternValue(page);
    case "article":
      return articleValue(page);
    case "problem":
      throw new Error("problems are read by specFromContent (to-spec.ts)");
  }
}

/** Kinds of list-like data kept as one document each (plan 0112 step 1), with the constant each one comes from. */
export const DOC_KINDS = {
  reading: "reading.ts READING",
  "revise-plan": "revise.ts LAST_DAYS_PLAN",
  "key-numbers": "revise.ts KEY_NUMBERS",
  "complexity-table": "revise.ts COMPLEXITY_TABLE",
  "quiz-deck": "revise.ts QUIZ_DECK",
  "constraint-hints": "thinking-map.ts CONSTRAINT_HINTS",
  "leetcode-tags": "thinking-map.ts LEETCODE_TAGS",
  "think-patterns": "thinking-map.ts THINK_PATTERNS",
  "think-signals": "thinking-map.ts THINK_SIGNALS",
  "reading-routine": "thinking-map.ts READING_ROUTINE",
  clues: "thinking-map.ts CLUES",
  "worked-examples": "thinking-map.ts WORKED_EXAMPLES",
  "optimize-moves": "thinking-map.ts OPTIMIZE_MOVES",
  "cp-algorithms": "cp-algorithms.ts CP_ALGO_ARTICLES",
  "lld-project": "learn/index.ts LLD_PROJECTS (one per LLD id; the id is the lesson id)",
  "dsa-problems": "dsa.ts PROBLEMS (the roadmap list; fills problems.pattern where ids match)",
  "dsa-groups": "dsa.ts DSA_GROUPS (pattern groups and patterns, in order)",
} as const;
export type DocKind = keyof typeof DOC_KINDS;

/** One list-like constant as a document. The body is the value itself, so the round trip is exact. */
export function docFromFile(kind: DocKind, id: string, value: unknown): ContentDoc {
  return { row: { kind, id, body: value } };
}

/** A project's files as a lld-project document (its lesson holds the text). */
export function lldProjectDoc(id: string, project: LldProject): ContentDoc {
  return docFromFile("lld-project", id, project);
}

/** A study area as a course. Concepts stay lessons; the course keeps the grouping and the exercise list. */
export function courseFromStudyArea(area: StudyArea, ord: number): ContentCourse {
  return {
    row: {
      id: area.id,
      area: area.id,
      title: area.title,
      summaryMd: area.intro,
      ord,
      data: {
        short: area.short,
        sections: area.sections.map((s) => ({
          id: s.id,
          title: s.title,
          weeks: s.weeks ?? null,
          concepts: s.concepts.map((c) => c.id),
        })),
        exercises: area.exercises ?? null,
      },
    },
  };
}
