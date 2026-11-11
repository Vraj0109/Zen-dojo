import { describe, expect, it } from "vitest";
import { BUDDY_LINE_EVENTS, eventToLine, pickLine } from "./buddy-lines";

const TONES = ["calm", "peer", "coach"] as const;

describe("buddy lines", () => {
  it("has a non-empty, short, emoji-free line for every tone, event and seed", () => {
    for (const tone of TONES) {
      for (const ev of BUDDY_LINE_EVENTS) {
        const seen = new Set<string>();
        for (let seed = 0; seed < 12; seed++) {
          const l = pickLine(tone, ev, seed, "Buddy");
          expect(l.length).toBeGreaterThan(0);
          expect(l.length).toBeLessThanOrEqual(140);
          expect(l).not.toMatch(/\p{Extended_Pictographic}/u);
          seen.add(l);
        }
        expect(seen.size).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("is deterministic for a seed and tolerates odd seeds and long names", () => {
    expect(pickLine("peer", "solved", 3)).toBe(pickLine("peer", "solved", 3));
    expect(pickLine("coach", "welcome", -5).length).toBeGreaterThan(0);
    expect(pickLine("calm", "streak", Number.NaN).length).toBeGreaterThan(0);
    expect(pickLine("calm", "streak", 1, "x".repeat(200)).length).toBeLessThanOrEqual(140);
  });

  it("maps buddy events to line events", () => {
    expect(eventToLine("solved")).toBe("solved");
    expect(eventToLine("ai-end")).toBe("ai-done");
    expect(eventToLine("session-start")).toBe("session-start");
    expect(eventToLine("session-end")).toBe("session-end");
    expect(eventToLine("break-due")).toBe("break-due");
    expect(eventToLine("tick")).toBeNull();
    expect(eventToLine("activity")).toBeNull();
    expect(eventToLine("ai-start")).toBeNull();
  });
});
