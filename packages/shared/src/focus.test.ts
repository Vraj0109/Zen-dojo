import { describe, expect, it } from "vitest";
import { ALL_PATTERNS } from "./dsa";
import { WEEK_FOCUS, weekFocus } from "./focus";
import { TOTAL_WEEKS } from "./plan";
import { ALL_CONCEPTS, ALL_EXERCISES } from "./study";

describe("WEEK_FOCUS", () => {
  it("has one entry per plan week", () => {
    expect(WEEK_FOCUS).toHaveLength(TOTAL_WEEKS);
  });

  it("only refers to real patterns, concepts and exercises in the right area", () => {
    const patterns = new Set(ALL_PATTERNS.map((p) => p.id));
    for (const [i, w] of WEEK_FOCUS.entries()) {
      for (const p of w.patterns) expect(patterns.has(p), `week ${i + 1}: pattern ${p}`).toBe(true);
      for (const id of w.sd) expect((ALL_CONCEPTS[id] ?? ALL_EXERCISES[id])?.area, `week ${i + 1}: ${id}`).toBe("sd");
      for (const id of w.lld) expect((ALL_CONCEPTS[id] ?? ALL_EXERCISES[id])?.area, `week ${i + 1}: ${id}`).toBe("lld");
      expect(w.patterns.length > 0 || !!w.dsaFilter, `week ${i + 1} has a DSA target`).toBe(true);
    }
  });

  it("clamps out-of-range weeks", () => {
    expect(weekFocus(0)).toBe(WEEK_FOCUS[0]);
    expect(weekFocus(99)).toBe(WEEK_FOCUS[TOTAL_WEEKS - 1]);
  });
});
