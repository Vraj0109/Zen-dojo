import { describe, expect, it } from "vitest";
import {
  ALL_CONCEPTS,
  ALL_EXERCISES,
  STUDY_AREAS,
  averageScore,
  conceptReviewDue,
  practiceInterval,
  practiceState,
} from "./study";
import { ALL_PATTERNS, PROBLEMS } from "./dsa";

describe("study content", () => {
  it("has unique ids that don't clash with DSA problems or patterns", () => {
    const ids = STUDY_AREAS.flatMap((a) => [
      ...a.sections.map((s) => s.id),
      ...a.sections.flatMap((s) => s.concepts.map((c) => c.id)),
      ...(a.exercises?.items ?? []).map((e) => e.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id in PROBLEMS).toBe(false);
      expect(ALL_PATTERNS.some((p) => p.id === id)).toBe(false);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("covers the roadmap's system design section", () => {
    const sd = STUDY_AREAS.find((a) => a.id === "sd")!;
    expect(sd.sections.map((s) => s.concepts.length)).toEqual([8, 10, 12]);
    expect(sd.exercises!.items).toHaveLength(27);
    expect(sd.exercises!.steps.map((s) => s.minutes).reduce((a, b) => a + b, 0)).toBe(45);
    expect(Object.values(ALL_CONCEPTS).every((c) => c.points.length >= 2 && c.points.every((p) => p.length > 1))).toBe(true);
    expect(ALL_EXERCISES["sdd-url-shortener"]).toMatchObject({ area: "sd", title: "URL shortener / Pastebin" });
  });
});

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
