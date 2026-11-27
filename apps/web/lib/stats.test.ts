import { parseWeekKey } from "@habit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSolved } from "./dsa";
import { getStats } from "./stats";
import { logPractice, saveConcept } from "./study";
import { getTodayView, toggleTask } from "./tasks";

// Content comes from the database in the app; here the repo returns the old constants, so the test stays fast.
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
    "constraint-hints": s.CONSTRAINT_HINTS,
    "leetcode-tags": s.LEETCODE_TAGS,
    "think-patterns": s.THINK_PATTERNS,
    "think-signals": s.THINK_SIGNALS,
    "reading-routine": s.READING_ROUTINE,
    clues: s.CLUES,
    "worked-examples": s.WORKED_EXAMPLES,
    "optimize-moves": s.OPTIMIZE_MOVES,
    "cp-algorithms": s.CP_ALGO_ARTICLES,
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

const setDay = (d: number) => vi.setSystemTime(new Date(2026, 10, d, 12));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay(4); // Wednesday; plan starts Monday Nov 2
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getStats", () => {
  it("is empty on a fresh database", async () => {
    const s = await getStats();
    expect(s.totals).toMatchObject({ totalXp: 0, streak: 0, bestStreak: 0, activeDays: 0, hours: 0 });
    expect(s.heatmap).toHaveLength(52);
    expect(s.recentXp).toBe(0);
    expect(s.badges.every((b) => !b.earned)).toBe(true);
  });

  it("combines tasks, solves, practice and concepts into XP, heatmap, balance and badges", async () => {
    setDay(3);
    const view = await getTodayView();
    await toggleTask(view.dayTasks.find((t) => (parseWeekKey(t.templateKey)?.key ?? t.templateKey) === "deep-block")!.id); // 30 XP system design, 75 min
    setDay(4);
    await markSolved("lc-239"); // hard: 30 XP DSA
    await logPractice("sdd-url-shortener", { minutes: 45, scores: { req: 4 }, notes: "", link: "" }); // 30 XP sd
    await logPractice("lldp-parking-lot", { minutes: 30, scores: { code: 3 }, notes: "", link: "" }); // 25 XP lld
    await saveConcept("os-deadlocks", { confidence: 4, checked: [], notes: "" }); // 5 XP core

    const s = await getStats();
    expect(s.totals).toMatchObject({ totalXp: 120, streak: 2, bestStreak: 2, activeDays: 2, hours: 2.5 });
    const thisWeek = s.heatmap[51];
    expect(thisWeek.slice(0, 3).map((c) => c.xp)).toEqual([0, 30, 90]);
    expect(thisWeek[2].level).toBe(4);

    const share = Object.fromEntries(s.balance.map((b) => [b.category, b.xp]));
    expect(share).toEqual({ dsa: 30, sd: 60, beh_lld: 25, mock_app: 0, other: 5 });
    expect(s.balance.find((b) => b.category === "sd")!.share).toBe(0.5);

    const earned = s.badges.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(["first-solve", "first-hard", "first-design", "first-lld"]);
  });
});
