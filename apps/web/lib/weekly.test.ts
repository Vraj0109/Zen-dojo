import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSolved } from "./dsa";
import { addSiteTime } from "./site-time";
import { logStruggle } from "./struggles";
import { getTodayView, toggleTask } from "./tasks";
import { logFocus } from "./timer";
import { getReflection, getWeeklyReview, saveReflection, weekOf, weekStats } from "./weekly";

// Content comes from the database in the app; here the repo returns the old constants (no content DB in this test).
vi.mock("@/lib/content-repo/lookups", async () => {
  const s = await import("@habit/shared");
  return {
    getStudyAreas: async () => s.STUDY_AREAS,
    getStudyArea: async (id: string) => s.STUDY_AREAS.find((a) => a.id === id),
    getAllConcepts: async () => s.ALL_CONCEPTS,
    getAllExercises: async () => s.ALL_EXERCISES,
    getRoadmapProblems: async () => s.PROBLEMS,
    getDsaGroups: async () => s.DSA_GROUPS,
    getAllPatterns: async () => s.ALL_PATTERNS,
  };
});
vi.mock("@/lib/content-repo/docs", async () => {
  const s = await import("@habit/shared");
  const values: Record<string, unknown> = {
    reading: s.READING,
    "revise-plan": s.LAST_DAYS_PLAN,
    "key-numbers": s.KEY_NUMBERS,
    "complexity-table": s.COMPLEXITY_TABLE,
    "quiz-deck": s.QUIZ_DECK,
    "think-patterns": s.THINK_PATTERNS,
    "dsa-problems": s.PROBLEMS,
    "dsa-groups": s.DSA_GROUPS,
  };
  return {
    getDoc: async (kind: string, id: string) => (kind in values && id === "main" ? { row: { kind, id, body: values[kind] } } : null),
    listDocs: async (kind: string) => (kind in values ? [{ kind, id: "main", body: values[kind] }] : []),
  };
});
vi.mock("@/lib/content-repo/courses", () => ({
  listCourses: async () => [],
  getCourse: async () => null,
  getLesson: async () => null,
}));
vi.mock("@/lib/content-repo/problems", async () => {
  const s = await import("@habit/shared");
  return {
    getProblemSpec: async (id: string) => s.JUDGE_PROBLEMS[id] ?? null,
    listProblemSummaries: async () => {
      return Object.values(s.JUDGE_PROBLEMS).map((p) => ({
        id: p.id,
        title: p.title,
        source: p.source,
        difficulty: p.difficulty,
        pattern: p.pattern ?? null,
        kind: p.kind ?? "function",
        languages: ["cpp"],
        hasBrute: false,
      }));
    },
  };
});

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
