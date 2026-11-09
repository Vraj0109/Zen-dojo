import { describe, expect, it } from "vitest";
import { ALL_EXERCISES } from "../study";
import { DESIGN_DEEP } from "./index";

// Plan 0014: every design that has depth content has 3+ diagrams, 800+ words in its sections, a failure-modes section,
// and Java code with a main method when it has code at all. (The code is compiled by apps/web/lib/design-code.test.ts.)

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

describe("system design depth", () => {
  it("covers every system design exercise (27)", () => {
    const designs = Object.keys(ALL_EXERCISES).filter((id) => id.startsWith("sdd-"));
    expect(designs.length).toBe(27);
    expect(designs.filter((id) => !DESIGN_DEEP[id])).toEqual([]);
  });

  it("only covers real designs", () => {
    for (const id of Object.keys(DESIGN_DEEP)) expect(ALL_EXERCISES[id], `${id} is not an exercise in study.ts`).toBeDefined();
  });

  for (const [id, d] of Object.entries(DESIGN_DEEP)) {
    it(`${id} has diagrams, 800+ words and a failure section`, () => {
      expect(d.diagrams.length).toBeGreaterThanOrEqual(3);
      expect(d.diagrams.every((x) => x.caption && x.caption.length > 10)).toBe(true);
      expect(d.sections.reduce((a, s) => a + words(s.body), 0)).toBeGreaterThanOrEqual(800);
      expect(d.sections.some((s) => /failure/i.test(s.title))).toBe(true);
      for (const s of d.sections) expect(words(s.body), `${id}: "${s.title}" is too short`).toBeGreaterThanOrEqual(100);
    });
    for (const c of d.code ?? []) {
      it(`${id}: ${c.name} is Java with a main method`, () => {
        expect(c.name.endsWith(".java")).toBe(true);
        expect(c.code).toMatch(/static void main\(/);
        expect(c.code).not.toMatch(/TODO/);
      });
    }
  }
});
