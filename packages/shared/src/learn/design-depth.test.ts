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

  // Plan 0014 batch E: the seven designs that were short are now 1,500+ words, with architecture cards and a scorecard (plan 0031).
  const BATCH_E = ["metrics", "kafka", "recommendations", "building-blocks", "delivery-slots", "pricing", "catalog"].map((n) => "sdd-" + n);
  for (const id of BATCH_E) {
    it(id + " has 1,500+ words, architecture cards and evaluation criteria", () => {
      const d = DESIGN_DEEP[id];
      expect(d.sections.reduce((a, s) => a + words(s.body), 0)).toBeGreaterThanOrEqual(1500);
      expect((d.architecture ?? []).length).toBeGreaterThanOrEqual(4);
      expect((d.criteria ?? []).length).toBeGreaterThanOrEqual(4);
      for (const a of d.architecture ?? []) for (const v of [a.role, a.scale, a.failure]) expect(v.length).toBeGreaterThan(10);
      for (const c of d.criteria ?? []) for (const v of [c.strong, c.weak]) expect(v.length).toBeGreaterThan(10);
      // the numbers section and the trade-offs section are both present
      expect(d.sections.some((x) => /trade-offs/i.test(x.title))).toBe(true);
      expect(d.sections.some((x) => /edge cases/i.test(x.title))).toBe(true);
    });
  }

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
