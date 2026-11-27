import { describe, expect, it } from "vitest";
import { WEEK_FOCUS, weekFocus } from "./focus";
import { TOTAL_WEEKS } from "./plan";

describe("WEEK_FOCUS", () => {
  it("has one entry per plan week", () => {
    expect(WEEK_FOCUS).toHaveLength(TOTAL_WEEKS);
  });

  // Whether every id exists is checked against the content database by verifyContent (content-model/verify.ts).
  it("clamps out-of-range weeks", () => {
    expect(weekFocus(0)).toBe(WEEK_FOCUS[0]);
    expect(weekFocus(99)).toBe(WEEK_FOCUS[TOTAL_WEEKS - 1]);
  });
});
