import { describe, expect, it } from "vitest";
import { currentPhase, daysUntil, pickCard, seededRandom, type PlanPhase, type QuizCard } from "./revise";

// The plan, numbers and deck are content (docs "revise-plan", "quiz-deck", ...); these are the helpers over them.
const PLAN: PlanPhase[] = [
  { id: "week", title: "7 to 4 days before", from: 4, to: 7, items: [] },
  { id: "final", title: "3 to 2 days before", from: 2, to: 3, items: [] },
  { id: "eve", title: "The day before", from: 1, to: 1, items: [] },
  { id: "day", title: "The day", from: 0, to: 0, items: [] },
];
const deck = (n: number): QuizCard[] => Array.from({ length: n }, (_, i) => ({ n: i, area: "sd", itemId: `c${i}`, itemTitle: `C${i}`, question: "?", points: [] }));

describe("quick revise", () => {
  it("counts days to the interview across a DST change", () => {
    expect(daysUntil("2026-11-01", "2026-11-08")).toBe(7); // US DST ends Nov 1
    expect(daysUntil("2026-11-08", "2026-11-08")).toBe(0);
    expect(daysUntil("2026-11-09", "2026-11-08")).toBe(-1);
  });

  it("finds the phase for the days left", () => {
    expect(currentPhase(8, PLAN)).toBeNull();
    expect(currentPhase(-1, PLAN)).toBeNull();
    expect(currentPhase(1, PLAN)?.id).toBe("eve");
    expect(currentPhase(5, PLAN)?.id).toBe("week");
  });

  it("picks a different card than the previous one when it can", () => {
    const two = deck(2);
    expect(pickCard(two, 0, two[0].n)?.n).toBe(two[1].n);
    expect(pickCard(two.slice(0, 1), 0.9, two[0].n)?.n).toBe(two[0].n);
    expect(pickCard([], 0.5)).toBeNull();
    expect(pickCard(two, 0.999999)?.n).toBe(two[1].n);
  });

  it("seeds the quiz order deterministically and spreads it out", () => {
    expect(seededRandom("2026-11-07:all:3")).toBe(seededRandom("2026-11-07:all:3"));
    const values = Array.from({ length: 200 }, (_, i) => seededRandom(`2026-11-07:all:${i}`));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    const picked = new Set(values.map((v) => pickCard(deck(280), v)!.n));
    expect(picked.size).toBeGreaterThan(110); // 280 cards, 200 draws: ~140 distinct expected
  });
});
