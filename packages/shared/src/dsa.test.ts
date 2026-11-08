import { describe, expect, it } from "vitest";
import { ALL_PATTERNS, DSA_GROUPS, PROBLEMS, RESOLVE_XP, patternTarget, solveState, solveXp } from "./dsa";

describe("DSA data", () => {
  const problems = Object.values(PROBLEMS);

  it("has 9 groups from the roadmap plus the CSES group", () => {
    expect(DSA_GROUPS).toHaveLength(10);
  });

  it("references only problems that exist", () => {
    for (const p of ALL_PATTERNS) {
      expect(p.problems.length, p.name).toBeGreaterThan(0);
      for (const id of p.problems) expect(PROBLEMS[id], `${p.name} -> ${id}`).toBeDefined();
    }
  });

  it("has unique pattern ids and no duplicate problems within a pattern", () => {
    const ids = ALL_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of ALL_PATTERNS) expect(new Set(p.problems).size, p.name).toBe(p.problems.length);
  });

  it("uses every problem in at least one pattern", () => {
    const used = new Set(ALL_PATTERNS.flatMap((p) => p.problems));
    for (const id of Object.keys(PROBLEMS)) expect(used.has(id), id).toBe(true);
  });

  it("has well-formed LeetCode entries", () => {
    for (const p of problems.filter((x) => x.id.startsWith("lc-"))) {
      expect(p.id).toBe(`lc-${p.number}`);
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(p.url).toBe(`https://leetcode.com/problems/${p.slug}/`);
      expect(["easy", "medium", "hard"]).toContain(p.difficulty);
    }
  });

  it("has unique LeetCode slugs", () => {
    const slugs = problems.filter((p) => p.slug).map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("patternTarget", () => {
  it("is 4, or every problem when a pattern has fewer", () => {
    expect(patternTarget({ id: "a", name: "", recognize: "", problems: ["1", "2", "3", "4", "5"] })).toBe(4);
    expect(patternTarget({ id: "b", name: "", recognize: "", problems: ["1", "2"] })).toBe(2);
  });
});

describe("solveXp", () => {
  it("scales with difficulty", () => {
    expect(solveXp(PROBLEMS["lc-1"])).toBe(5);
    expect(solveXp(PROBLEMS["lc-560"])).toBe(15);
    expect(solveXp(PROBLEMS["lc-42"])).toBe(30);
    expect(solveXp(PROBLEMS["c-z-function"])).toBe(10);
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
