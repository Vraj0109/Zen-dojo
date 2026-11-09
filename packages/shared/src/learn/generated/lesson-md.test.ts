import { describe, expect, it } from "vitest";
import { lessonToMarkdown, parseLesson } from "../../../../../scripts/build-content.mjs";
import { ALL_CONCEPTS } from "../../study";
import { LESSON_EXTRA, LESSONS } from "../index";
import { SECTION_POINTS } from "../section-points";

// Every existing lesson must survive TypeScript -> Markdown -> parse unchanged. This is what makes the migration safe
// (plan 0023, step 4) and keeps the serializer honest.

const trim = (s: string) => s.trim();

describe("lessons round-trip through Markdown", () => {
  for (const [id, concept] of Object.entries(ALL_CONCEPTS)) {
    it(id, () => {
      const lesson = LESSONS[id];
      const extra = LESSON_EXTRA[id];
      const deeper = (extra?.deeper ?? []).map((s) => ({ ...s, point: SECTION_POINTS[id]?.[s.title] }));
      const md = lessonToMarkdown({ id, title: concept.title, area: concept.area, section: concept.section, points: concept.points, lesson, recap: extra?.recap, deeper });
      const back = parseLesson(md, `${id}.md`);
      expect(back.points).toEqual(concept.points);
      expect(back.lesson.overview).toBe(trim(lesson.overview));
      expect(back.lesson.explain).toEqual(lesson.explain.map(trim));
      expect(back.lesson.questions).toEqual(lesson.questions);
      expect(back.lesson.pitfalls).toEqual(lesson.pitfalls?.length ? lesson.pitfalls : undefined);
      expect(back.recap).toEqual(extra?.recap ?? []);
      expect(back.deeper.map((s: { title: string }) => s.title)).toEqual(deeper.map((s) => s.title));
      back.deeper.forEach((s: { body: string; code?: string; lang?: string; diagram?: string; diagramCaption?: string }, i: number) => {
        expect(s.body).toBe(trim(deeper[i].body));
        expect(s.code).toBe(deeper[i].code);
        expect(s.lang).toBe(deeper[i].lang || undefined);
        expect(s.diagram).toBe(deeper[i].diagram);
        expect(s.diagramCaption).toBe(deeper[i].diagramCaption || undefined);
      });
    });
  }
});
