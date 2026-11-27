import { describe, expect, it } from "vitest";
import { RESOLVE_XP, patternTarget, solveState, solveXp } from "./dsa";

describe("patternTarget", () => {
  it("is 4, or every problem when a pattern has fewer", () => {
    expect(patternTarget({ id: "a", name: "", recognize: "", problems: ["1", "2", "3", "4", "5"] })).toBe(4);
    expect(patternTarget({ id: "b", name: "", recognize: "", problems: ["1", "2"] })).toBe(2);
  });
});

describe("solveXp", () => {
  it("scales with difficulty", () => {
    expect(solveXp({ difficulty: "easy" })).toBe(5);
    expect(solveXp({ difficulty: "medium" })).toBe(15);
    expect(solveXp({ difficulty: "hard" })).toBe(30);
    expect(solveXp({ difficulty: undefined })).toBe(10);
    expect(RESOLVE_XP).toBe(10);
  });
});

describe("solveState", () => {
  const today = "2026-11-20";

  it("is unsolved without a solve", () => {
    expect(solveState(undefined, undefined, today)).toEqual({ state: "unsolved" });
  });

  it("schedules a re-solve 14 days after the first solve", () => {
    expect(solveState("2026-11-10", undefined, today)).toEqual({
      state: "solved",
      solvedOn: "2026-11-10",
      resolveOn: "2026-11-24",
      resolveDue: false,
    });
  });

  it("is due on and after the re-solve date", () => {
    expect(solveState("2026-11-06", undefined, today)).toMatchObject({ resolveDue: true, resolveOn: "2026-11-20" });
    expect(solveState("2026-10-01", undefined, today)).toMatchObject({ resolveDue: true });
  });

  it("is resolved once re-solved", () => {
    expect(solveState("2026-10-01", "2026-10-16", today)).toEqual({
      state: "resolved",
      solvedOn: "2026-10-01",
      resolvedOn: "2026-10-16",
    });
  });
});
