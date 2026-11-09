import { describe, expect, it } from "vitest";
import { ALL_CONCEPTS } from "../../study";
import { LESSON_EXTRA, LESSONS } from "../index";

// Plans 0014 and 0015: every concept of a finished batch reaches 1,200 words of lesson text and has a diagram.
// Add a concept id prefix to BATCHES when its batch is written.
const BATCHES = ["os-", "db-", "net-"];
const WORDS = 1200;

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function lessonWords(id: string): number {
  const l = LESSONS[id];
  const x = LESSON_EXTRA[id];
  return [l.overview, ...l.explain, ...l.questions, ...(l.pitfalls ?? []), ...(x?.recap ?? []), ...(x?.deeper.map((s) => s.body) ?? [])].reduce((a, t) => a + words(t), 0);
}

describe("depth targets", () => {
  const ids = Object.keys(ALL_CONCEPTS).filter((id) => BATCHES.some((p) => id.startsWith(p)));
  it("has concepts to check", () => expect(ids.length).toBeGreaterThan(0));
  for (const id of ids) {
    it(`${id} has ${WORDS}+ words and a diagram`, () => {
      expect(lessonWords(id)).toBeGreaterThanOrEqual(WORDS);
      expect((LESSON_EXTRA[id]?.deeper ?? []).some((s) => s.diagram)).toBe(true);
    });
  }
});
