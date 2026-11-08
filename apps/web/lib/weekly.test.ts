import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSolved } from "./dsa";
import { addSiteTime } from "./site-time";
import { logStruggle } from "./struggles";
import { getTodayView, toggleTask } from "./tasks";
import { logFocus } from "./timer";
import { getReflection, getWeeklyReview, saveReflection, weekOf, weekStats } from "./weekly";

const setDay = (d: number) => vi.setSystemTime(new Date(2026, 10, d, 12));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay(3); // Tuesday; the plan starts Monday Nov 2
});

afterEach(() => {
  vi.useRealTimers();
});

describe("weekOf", () => {
  it("snaps any date to its Monday and falls back to this week", () => {
    expect(weekOf("2026-11-08", "2026-11-04")).toBe("2026-11-02"); // Sunday
    expect(weekOf("2026-11-09", "2026-11-04")).toBe("2026-11-09");
    expect(weekOf("nonsense", "2026-11-04")).toBe("2026-11-02");
    expect(weekOf(undefined, "2026-11-04")).toBe("2026-11-02");
  });
});

describe("weekStats", () => {
  it("is all zeros for an empty week", async () => {
    expect(await weekStats("2026-11-02")).toEqual({
      xp: 0,
      activeDays: 0,
      tasksDone: 0,
      tasksTotal: 0,
      solves: 0,
      resolves: 0,
      conceptsCovered: 0,
      practices: 0,
      practiceAvg: null,
      focusMinutes: 0,
      siteMinutes: 0,
      stuckLogged: 0,
      stuckCleared: 0,
      bossFights: 0,
    });
  });

  it("counts the week's work and keeps other weeks out", async () => {
    const view = await getTodayView();
    await toggleTask(view.dayTasks[0].id);
    await markSolved("lc-239"); // 30 XP, Nov 3
    await logFocus("lc-239", 25);
    await logStruggle("lc-1", "hint", "forgot the map trick");
    await addSiteTime([
      { day: "2026-11-03", slug: "sliding-window-maximum", seconds: 1200 },
      { day: "2026-10-30", slug: "sliding-window-maximum", seconds: 600 }, // last week
    ]);

    const s = await weekStats("2026-11-02");
    expect(s.tasksDone).toBe(1);
    expect(s.tasksTotal).toBeGreaterThan(1);
    expect(s.solves).toBe(1);
    expect(s.focusMinutes).toBe(25);
    expect(s.stuckLogged).toBe(1);
    expect(s.siteMinutes).toBe(20);
    expect(s.activeDays).toBe(1);
    expect(s.xp).toBeGreaterThanOrEqual(30);

    const last = await weekStats("2026-10-26");
    expect(last.siteMinutes).toBe(10);
    expect(last.solves).toBe(0);
  });
});

describe("reflection", () => {
  it("saves, updates and clears per week", async () => {
    expect(await getReflection("2026-11-02")).toEqual({ wins: "", struggles: "", nextFocus: "" });
    await saveReflection("2026-11-04", { wins: "  Solved the heap set  ", struggles: "Trees", nextFocus: "Graphs" }); // snaps to Monday
    expect(await getReflection("2026-11-02")).toEqual({ wins: "Solved the heap set", struggles: "Trees", nextFocus: "Graphs" });
    await saveReflection("2026-11-02", { wins: "Better", struggles: "", nextFocus: "" });
    expect((await getReflection("2026-11-02")).wins).toBe("Better");
    await saveReflection("2026-11-02", { wins: "", struggles: " ", nextFocus: "" });
    expect(await getReflection("2026-11-02")).toEqual({ wins: "", struggles: "", nextFocus: "" });
  });

  it("limits the length", async () => {
    await saveReflection("2026-11-02", { wins: "x".repeat(9000), struggles: "", nextFocus: "" });
    expect((await getReflection("2026-11-02")).wins).toHaveLength(4000);
  });
});

describe("getWeeklyReview", () => {
  it("bundles stats, the previous week, the plan week number, top problems and weak spots", async () => {
    await markSolved("lc-239");
    await addSiteTime([{ day: "2026-11-03", slug: "sliding-window-maximum", seconds: 600 }]);
    const r = await getWeeklyReview("2026-11-02");
    expect(r.monday).toBe("2026-11-02");
    expect(r.sunday).toBe("2026-11-08");
    expect(r.weekNo).toBe(1);
    expect(r.stats.solves).toBe(1);
    expect(r.previous.solves).toBe(0);
    expect(r.topProblems).toEqual([{ slug: "sliding-window-maximum", minutes: 10, title: expect.any(String), id: "lc-239" }]);
    expect(r.weak.patterns.length).toBeLessThanOrEqual(3);

    expect((await getWeeklyReview("2026-10-26")).weekNo).toBeNull(); // before the plan starts
  });
});
