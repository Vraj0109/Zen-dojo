import { describe, expect, it } from "vitest";
import { currentStreak, levelFromXp, levelInfo, xpForLevel } from "./game";

describe("levelFromXp", () => {
  it("follows floor(sqrt(xp / 50))", () => {
    expect(levelFromXp(0)).toBe(0);
    expect(levelFromXp(49)).toBe(0);
    expect(levelFromXp(50)).toBe(1);
    expect(levelFromXp(199)).toBe(1);
    expect(levelFromXp(200)).toBe(2);
    expect(levelFromXp(5000)).toBe(10);
  });

  it("treats negative XP as zero", () => {
    expect(levelFromXp(-100)).toBe(0);
  });

  it("is consistent with xpForLevel", () => {
    for (let level = 0; level < 30; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      if (level > 0) expect(levelFromXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });
});

describe("levelInfo", () => {
  it("reports progress within the current level", () => {
    expect(levelInfo(80)).toEqual({ level: 1, tier: "Intern", xpIntoLevel: 30, xpForNext: 150 });
  });

  it("moves through named tiers every 4 levels", () => {
    expect(levelInfo(xpForLevel(3)).tier).toBe("Intern");
    expect(levelInfo(xpForLevel(4)).tier).toBe("SDE1");
    expect(levelInfo(xpForLevel(8)).tier).toBe("SDE2");
    expect(levelInfo(xpForLevel(20)).tier).toBe("Principal");
  });

  it("caps at the top tier", () => {
    expect(levelInfo(10_000_000).tier).toBe("Principal");
  });
});

describe("currentStreak", () => {
  const today = "2026-11-06";

  it("is 0 with no activity", () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-11-04", "2026-11-05", "2026-11-06"], today)).toBe(3);
  });

  it("keeps yesterday's streak alive until today ends", () => {
    expect(currentStreak(["2026-11-04", "2026-11-05"], today)).toBe(2);
  });

  it("breaks on a missed day", () => {
    expect(currentStreak(["2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06"], today)).toBe(2);
    expect(currentStreak(["2026-11-04"], today)).toBe(0);
  });

  it("ignores duplicates and order", () => {
    expect(currentStreak(["2026-11-06", "2026-11-05", "2026-11-06"], today)).toBe(2);
  });

  it("works across month boundaries", () => {
    expect(currentStreak(["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-01")).toBe(3);
  });
});
