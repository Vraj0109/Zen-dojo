import { describe, expect, it } from "vitest";
import type { StudyArea } from "../study";
import { fixtureEntities } from "./fixture-for-tests";
import { courseFromStudyArea, docFromFile, lessonFromFile, lessonToShape, lldProjectDoc, PATTERN_COURSE_ID, type LessonCtx, type LessonValue } from "./lesson-map";
import { pageTemplate, validatePageAgainstTemplate } from "./templates";

// The content now lives in the database (plan 0117); these checks run the converters over the committed fixture's
// lessons. The full round trip of every lesson was proved once at cutover (docs/plans/wave3-content-db.md).
const { lessons, docs } = fixtureEntities();
const ctx = (ord = 0): LessonCtx => ({ courseId: "test", ord, title: "Title" });

describe("lessonFromFile / lessonToShape", () => {
  it("the fixture has concept, design, LLD and pattern lessons", () => {
    const kinds = new Set(lessons.map((l) => l.row.template));
    for (const k of ["concept", "design", "lld", "pattern"]) expect(kinds.has(k as never), k).toBe(true);
  });

  it("round-trips every fixture lesson's shape exactly", () => {
    for (const l of lessons) {
      const shape = lessonToShape(l);
      const again = lessonFromFile(l.row.template, l.row.id, shape, ctx());
      expect(lessonToShape(again), l.row.id).toEqual(shape);
    }
  });

  it("every page fits its template", () => {
    for (const l of lessons) {
      const rebuilt = lessonFromFile(l.row.template, l.row.id, lessonToShape(l), ctx());
      expect(validatePageAgainstTemplate(pageTemplate(l.row.template), rebuilt.page), l.row.id).toEqual([]);
    }
  });

  it("uses the concept checklist as the titles of the point sections", () => {
    const l = lessons.find((x) => x.row.template === "concept")!;
    const points = (l.row.meta as { points: string[] }).points; // the concept checklist, kept on the lesson row
    const lesson = lessonFromFile("concept", l.row.id, lessonToShape(l), { ...ctx(), points });
    const pointSections = lesson.page.sections.filter((s) => s.slot.startsWith("point:"));
    expect(pointSections.map((s) => s.title)).toEqual(points);
    expect(pointSections.map((s) => s.slot)).toEqual(points.map((_, i) => `point:${i}`));
  });

  it("gives the same section and block ids on two runs", () => {
    const l = lessons.find((x) => x.row.template === "design")!;
    const a = lessonFromFile("design", l.row.id, lessonToShape(l), ctx());
    const b = lessonFromFile("design", l.row.id, lessonToShape(l), ctx());
    expect(b).toEqual(a);
    expect(new Set(a.page.sections.map((s) => s.id)).size).toBe(a.page.sections.length);
    const blockIds = a.page.sections.flatMap((s) => s.blocks.map((x) => x.id));
    expect(new Set(blockIds).size).toBe(blockIds.length);
  });

  it("refuses problems here (they go through problemFromSpec)", () => {
    const l = lessons.find((x) => x.row.template === "concept")!;
    expect(() => lessonFromFile("problem", "x", lessonToShape(l) as LessonValue, ctx())).toThrow();
  });
});

describe("docs and courses", () => {
  it("keeps list-like values exactly as their body", () => {
    for (const d of docs) {
      const doc = docFromFile(d.row.kind as Parameters<typeof docFromFile>[0], d.row.id, d.row.body);
      expect(doc.row.body, d.row.kind).toEqual(d.row.body);
      expect(doc.row.kind).toBe(d.row.kind);
    }
  });

  it("keeps each LLD project as its own document", () => {
    const project = docs.find((d) => d.row.kind === "lld-project")!;
    const doc = lldProjectDoc(project.row.id, project.row.body as Parameters<typeof lldProjectDoc>[1]);
    expect(doc.row).toEqual({ kind: "lld-project", id: project.row.id, body: project.row.body });
  });

  it("turns a study area into a course with its concept ids and exercises", () => {
    const area: StudyArea = {
      id: "sd",
      title: "System design",
      intro: "Intro.",
      sections: [{ id: "basics", title: "Basics", concepts: [{ id: "c1", title: "C1", points: ["a"] }] }],
      exercises: [{ id: "sdd-x", title: "X", focus: "f" }],
    } as unknown as StudyArea;
    const course = courseFromStudyArea(area, 0).row;
    expect(course.id).toBe("sd");
    expect(course.summaryMd).toBe("Intro.");
    expect(course.data.sections).toHaveLength(1);
    expect(course.data.exercises).toEqual(area.exercises);
    expect(PATTERN_COURSE_ID).toBe("dsa-patterns");
  });
});
