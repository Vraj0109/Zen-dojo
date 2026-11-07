import { describe, expect, it } from "vitest";
import { LAST_DAYS_PLAN, QUIZ_DECK, currentPhase, daysUntil, pickCard, quizCards, seededRandom } from "./revise";

describe("quick revise", () => {
  it("counts days to the interview across a DST change", () => {
    expect(daysUntil("2026-11-01", "2026-11-08")).toBe(7); // US DST ends Nov 1
    expect(daysUntil("2026-11-08", "2026-11-08")).toBe(0);
    expect(daysUntil("2026-11-09", "2026-11-08")).toBe(-1);
  });

  it("covers every day from a week out to the interview with exactly one phase", () => {
    for (let d = 0; d <= 7; d++) expect(LAST_DAYS_PLAN.filter((p) => d >= p.from && d <= p.to), `day ${d}`).toHaveLength(1);
    expect(currentPhase(8)).toBeNull();
    expect(currentPhase(-1)).toBeNull();
    expect(currentPhase(1)?.id).toBe("eve");
  });

  it("builds a quiz deck from lesson questions and design follow-ups", () => {
    expect(QUIZ_DECK.length).toBeGreaterThan(200);
    expect(QUIZ_DECK.every((c, i) => c.n === i)).toBe(true);
    expect(quizCards("sd").every((c) => c.area === "sd")).toBe(true);
    expect(quizCards("core").length).toBeGreaterThan(0);
    expect(quizCards("lld").length).toBeGreaterThan(0);
    expect(quizCards("all", new Set(["sd-caching"])).every((c) => c.itemId === "sd-caching")).toBe(true);
    expect(QUIZ_DECK.some((c) => c.answer)).toBe(true);
  });

  it("picks a different card than the previous one when it can", () => {
    const two = quizCards("all").slice(0, 2);
    expect(pickCard(two, 0, two[0].n)?.n).toBe(two[1].n);
    expect(pickCard(two.slice(0, 1), 0.9, two[0].n)?.n).toBe(two[0].n);
    expect(pickCard([], 0.5)).toBeNull();
    expect(pickCard(two, 0.999999)?.n).toBe(two[1].n);
  });

  it("seeds the quiz order deterministically and spreads it out", () => {
    expect(seededRandom("2026-11-07:all:3")).toBe(seededRandom("2026-11-07:all:3"));
    const values = Array.from({ length: 200 }, (_, i) => seededRandom(`2026-11-07:all:${i}`));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    const picked = new Set(values.map((v) => pickCard(QUIZ_DECK, v)!.n));
    expect(picked.size).toBeGreaterThan(110); // ~280 cards, 200 draws: ~140 distinct expected
  });
});
