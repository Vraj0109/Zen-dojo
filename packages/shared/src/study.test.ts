import { describe, expect, it } from "vitest";
import { averageScore, conceptReviewDue, practiceInterval, practiceState } from "./study";

describe("practice schedule", () => {
  it("spaces practice by how well it went", () => {
    expect([1, 2.9, 3, 3.9, 4, 5].map(practiceInterval)).toEqual([7, 7, 14, 14, 30, 30]);
    expect(practiceState(undefined, "2026-11-06")).toEqual({ state: "new" });
    expect(practiceState({ on: "2026-10-30", score: 2.5 }, "2026-11-06")).toEqual({
      state: "practiced",
      lastOn: "2026-10-30",
      score: 2.5,
      nextOn: "2026-11-06",
      due: true,
    });
    expect(practiceState({ on: "2026-10-30", score: 4.2 }, "2026-11-06")).toMatchObject({ nextOn: "2026-11-29", due: false });
  });

  it("averages the filled-in step scores", () => {
    expect(averageScore({ a: 4, b: 3, c: 5 })).toBe(4);
    expect(averageScore({ a: 4, b: 3 })).toBe(3.5);
    expect(averageScore({ a: 2, b: 3, c: 3 })).toBe(2.7);
    expect(averageScore({ a: 0, b: 6, c: 2.5 })).toBeNull();
    expect(averageScore({})).toBeNull();
  });

  it("brings unsure concepts back after a week", () => {
    expect(conceptReviewDue(2, "2026-10-30", "2026-11-06")).toBe(true);
    expect(conceptReviewDue(2, "2026-10-31", "2026-11-06")).toBe(false);
    expect(conceptReviewDue(4, "2026-01-01", "2026-11-06")).toBe(false);
    expect(conceptReviewDue(0, "2026-01-01", "2026-11-06")).toBe(false);
  });
});
