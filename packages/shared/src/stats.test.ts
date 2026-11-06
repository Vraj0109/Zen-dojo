import { describe, expect, it } from "vitest";
import { BADGES, bestStreak, evaluateBadges, heatmap, perfectWeeks, type BadgeStats } from "./stats";

describe("bestStreak", () => {
  it("finds the longest run, across month ends and DST", () => {
    expect(bestStreak([])).toBe(0);
    expect(bestStreak(["2026-11-01"])).toBe(1);
    expect(bestStreak(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-04", "2026-11-04"])).toBe(4);
    expect(bestStreak(["2026-03-07", "2026-03-08", "2026-03-09"])).toBe(3); // US DST starts Mar 8
  });
});

describe("heatmap", () => {
  it("lays out Monday-Sunday columns ending this week, with quartile levels", () => {
    const xp = new Map([
      ["2026-11-02", 100],
      ["2026-11-03", 10],
      ["2026-11-04", 60],
      ["2026-08-17", 5],
    ]);
    const weeks = heatmap(xp, "2026-11-04", 12);
    expect(weeks).toHaveLength(12);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date).toBe("2026-08-17"); // a Monday
    expect(weeks[11].map((c) => c.date)[0]).toBe("2026-11-02");
    expect(weeks[11].slice(0, 4).map((c) => [c.level, c.future])).toEqual([
      [4, false],
      [1, false],
      [3, false],
      [0, true],
    ]);
    expect(weeks[0][0]).toMatchObject({ xp: 5, level: 1 });
    expect(heatmap(new Map(), "2026-11-04", 1)[0].every((c) => c.level === 0)).toBe(true);
  });
});

describe("badges", () => {
  const none: BadgeStats = {
    solved: 0,
    hardSolved: 0,
    resolved: 0,
    bestStreak: 0,
    groupsCovered: 0,
    designsPracticed: 0,
    lldPracticed: 0,
    conceptsCovered: 0,
    perfectWeeks: 0,
    level: 0,
  };

  it("have unique ids and reachable targets", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    expect(BADGES.every((b) => b.target >= 1)).toBe(true);
  });

  it("are earned at their target, with capped progress", () => {
    expect(evaluateBadges(none).some((b) => b.earned)).toBe(false);
    const b = evaluateBadges({ ...none, solved: 30, bestStreak: 7, level: 9 });
    const byId = Object.fromEntries(b.map((x) => [x.id, x]));
    expect(byId["first-solve"]).toMatchObject({ earned: true, value: 1 });
    expect(byId["solved-25"].earned).toBe(true);
    expect(byId["solved-75"]).toMatchObject({ earned: false, value: 30 });
    expect(byId["streak-7"].earned).toBe(true);
    expect(byId["sde2"].earned).toBe(true);
    expect(byId["senior"]).toMatchObject({ earned: false, value: 9 });
  });
});

describe("perfectWeeks", () => {
  const week = (monday: number, opts: { skipDay?: number; undoneWeekly?: boolean } = {}) => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-11-${String(monday + i).padStart(2, "0")}`).filter((_, i) => i !== opts.skipDay);
    return [
      ...days.flatMap((date) => [
        { date, scope: "day" as const, status: "done" as const },
        { date, scope: "day" as const, status: "done" as const },
      ]),
      { date: days[0], scope: "week" as const, status: opts.undoneWeekly ? ("todo" as const) : ("done" as const) },
    ];
  };

  it("counts weeks with all 7 days present and every task done", () => {
    expect(perfectWeeks(week(2))).toBe(1);
    expect(perfectWeeks([...week(2), ...week(9)])).toBe(2);
    expect(perfectWeeks(week(2, { undoneWeekly: true }))).toBe(0);
    expect(perfectWeeks(week(2, { skipDay: 3 }))).toBe(0); // a day never opened doesn't count
  });
});
