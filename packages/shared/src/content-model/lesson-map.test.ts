import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_EXTRA, WALKTHROUGHS, WALKTHROUGH_EXTRA, DESIGN_DEEP, LLD_GUIDES, LLD_DEEP, LLD_EXTRA, LLD_PROJECTS, PATTERN_GUIDES, PATTERN_ARTICLES } from "../learn/index";
import { STUDY_AREAS, type StudyArea } from "../study";
import { READING } from "../reading";
import { LAST_DAYS_PLAN, KEY_NUMBERS, COMPLEXITY_TABLE, QUIZ_DECK } from "../revise";
import { CONSTRAINT_HINTS, LEETCODE_TAGS, THINK_PATTERNS, THINK_SIGNALS, READING_ROUTINE, CLUES, WORKED_EXAMPLES, OPTIMIZE_MOVES } from "../thinking-map";
import { CP_ALGO_ARTICLES } from "../cp-algorithms";
import { courseFromStudyArea, docFromFile, lessonFromFile, lessonToShape, lldProjectDoc, PATTERN_COURSE_ID, type LessonCtx, type LessonValue } from "./lesson-map";
import { pageTemplate, validatePageAgainstTemplate } from "./templates";
import type { TemplateId } from "./types";

const ctx = (ord = 0): LessonCtx => ({ courseId: "test", ord, title: "Title" });

interface Case {
  kind: TemplateId;
  id: string;
  value: LessonValue;
}

/** Every learn/ value that is a page, with the kind of its template. */
function lessonCases(): Case[] {
  const out: Case[] = [];
  for (const id of Object.keys(LESSONS)) {
    out.push({ kind: "concept", id, value: { lesson: LESSONS[id], extra: LESSON_EXTRA[id] } });
  }
  for (const id of Object.keys(WALKTHROUGHS)) {
    out.push({ kind: "design", id, value: { walkthrough: WALKTHROUGHS[id], deep: DESIGN_DEEP[id], extra: WALKTHROUGH_EXTRA[id] } });
  }
  for (const id of Object.keys(LLD_GUIDES)) {
    out.push({ kind: "lld", id, value: { guide: LLD_GUIDES[id], deep: LLD_DEEP[id], extra: LLD_EXTRA[id] } });
  }
  for (const id of Object.keys(PATTERN_GUIDES)) {
    out.push({ kind: "pattern", id: `pattern-${id}`, value: { guide: PATTERN_GUIDES[id] } });
  }
  for (const id of Object.keys(PATTERN_ARTICLES)) {
    out.push({ kind: "article", id: `article-${id}`, value: { article: PATTERN_ARTICLES[id] } });
  }
  return out;
}

describe("lessonFromFile / lessonToShape", () => {
  it("covers every learn/ page: 89 concepts, 27 designs, 24 LLD, 76 patterns, 71 articles", () => {
    const counts = new Map<string, number>();
    for (const c of lessonCases()) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
    expect(counts.get("concept")).toBe(89);
    expect(counts.get("design")).toBe(27);
    expect(counts.get("lld")).toBe(24);
    expect(counts.get("pattern")).toBe(76);
    expect(counts.get("article")).toBe(71);
  });

  it("round-trips every learn/ value exactly", () => {
    const failed: string[] = [];
    for (const c of lessonCases()) {
      const lesson = lessonFromFile(c.kind, c.id, c.value, ctx());
      try {
        expect(lessonToShape(lesson)).toEqual(c.value);
      } catch {
        failed.push(`${c.kind}:${c.id}`);
      }
    }
    if (failed.length) console.log("lesson round-trip mismatches (first 5):", failed.slice(0, 5));
    expect(failed).toEqual([]);
  });

  it("every page fits its template", () => {
    const failed: string[] = [];
    for (const c of lessonCases()) {
      const errors = validatePageAgainstTemplate(pageTemplate(c.kind), lessonFromFile(c.kind, c.id, c.value, ctx()).page);
      if (errors.length) failed.push(`${c.id}: ${errors[0]}`);
    }
    if (failed.length) console.log("template mismatches (first 5):", failed.slice(0, 5));
    expect(failed).toEqual([]);
  });

  it("uses the concept checklist as the titles of the point sections", () => {
    const area: StudyArea = STUDY_AREAS.find((a) => a.id === "sd")!;
    const concept = area.sections.flatMap((s) => s.concepts).find((c) => LESSONS[c.id]);
    expect(concept).toBeDefined();
    const lesson = lessonFromFile("concept", concept!.id, { lesson: LESSONS[concept!.id] }, { ...ctx(), points: concept!.points });
    const points = lesson.page.sections.filter((s) => s.slot.startsWith("point:"));
    expect(points.map((s) => s.title)).toEqual(concept!.points);
    expect(points.map((s) => s.slot)).toEqual(concept!.points.map((_, i) => `point:${i}`));
  });

  it("gives the same section and block ids on two runs", () => {
    const c = lessonCases().find((x) => x.kind === "design")!;
    const a = lessonFromFile(c.kind, c.id, c.value, ctx());
    const b = lessonFromFile(c.kind, c.id, c.value, ctx());
    expect(b).toEqual(a);
    expect(new Set(a.page.sections.map((s) => s.id)).size).toBe(a.page.sections.length);
    const blockIds = a.page.sections.flatMap((s) => s.blocks.map((x) => x.id));
    expect(new Set(blockIds).size).toBe(blockIds.length);
  });

  it("refuses problems here (they go through problemFromSpec)", () => {
    expect(() => lessonFromFile("problem", "x", { lesson: LESSONS["db-indexing"] } as LessonValue, ctx())).toThrow();
  });
});

describe("docs and courses", () => {
  it("keeps list-like constants exactly as their body", () => {
    const docs: [string, unknown][] = [
      ["reading", READING],
      ["revise-plan", LAST_DAYS_PLAN],
      ["key-numbers", KEY_NUMBERS],
      ["complexity-table", COMPLEXITY_TABLE],
      ["quiz-deck", QUIZ_DECK],
      ["constraint-hints", CONSTRAINT_HINTS],
      ["leetcode-tags", LEETCODE_TAGS],
      ["think-patterns", THINK_PATTERNS],
      ["think-signals", THINK_SIGNALS],
      ["reading-routine", READING_ROUTINE],
      ["clues", CLUES],
      ["worked-examples", WORKED_EXAMPLES],
      ["optimize-moves", OPTIMIZE_MOVES],
      ["cp-algorithms", CP_ALGO_ARTICLES],
    ];
    for (const [kind, value] of docs) {
      const doc = docFromFile(kind as Parameters<typeof docFromFile>[0], "all", value);
      expect(doc.row.body, kind).toEqual(value);
      expect(doc.row.kind).toBe(kind);
    }
  });

  it("keeps each LLD project as its own document", () => {
    const id = Object.keys(LLD_PROJECTS)[0];
    const doc = lldProjectDoc(id, LLD_PROJECTS[id]);
    expect(doc.row).toEqual({ kind: "lld-project", id, body: LLD_PROJECTS[id] });
  });

  it("turns each study area into a course with its concept ids and exercises", () => {
    expect(STUDY_AREAS.map((a) => a.id)).toEqual(["sd", "lld", "core"]);
    const area = STUDY_AREAS[0];
    const course = courseFromStudyArea(area, 0).row;
    expect(course.id).toBe(area.id);
    expect(course.summaryMd).toBe(area.intro);
    expect(course.data.sections).toHaveLength(area.sections.length);
    expect(course.data.exercises).toEqual(area.exercises ?? null);
    expect(PATTERN_COURSE_ID).toBe("dsa-patterns");
  });
});
