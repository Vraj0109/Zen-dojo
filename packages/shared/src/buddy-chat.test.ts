import { describe, expect, it } from "vitest";
import { buildBuddyChatMessages } from "./ai-prompts";

describe("buildBuddyChatMessages", () => {
  it("speaks as the pet, with its description, and no problem or code", () => {
    const m = buildBuddyChatMessages({ name: "Shinchan", description: "A tiny mischievous kindergarten-boy companion in a red shirt and yellow shorts.", tone: "peer", history: [{ role: "user", content: "hi" }] });
    expect(m[0].role).toBe("system");
    expect(m[0].content).toContain("You are playing Shinchan");
    expect(m[0].content).toContain("mischievous kindergarten-boy");
    expect(m.slice(1)).toEqual([{ role: "user", content: "hi" }]);
  });

  it("cleans control characters and caps the persona", () => {
    const m = buildBuddyChatMessages({ name: "A\u0000B", description: "x".repeat(900), history: [{ role: "user", content: "hi" }] });
    expect(m[0].content).toContain("You are playing A B");
    expect(m[0].content.length).toBeLessThan(1200);
  });
});

import { courseState, coursePercent, profileCourses, summarizePortfolio, type PortfolioData } from "./portfolio";
import { buildPortfolioSummaryMessages } from "./ai-prompts";

const data: PortfolioData = {
  name: "Ada",
  level: 7,
  xp: 5400,
  streak: 6,
  bestStreak: 14,
  totalSolved: 87,
  solvedByDifficulty: { easy: 40, medium: 35, hard: 12 },
  planWeeksDone: 3,
  courses: [
    { id: "sd", title: "System design", kind: "area", done: 30, total: 30, completedOn: "2026-10-01" },
    { id: "core", title: "Core CS", kind: "area", done: 13, total: 25, completedOn: null },
    { id: "lld", title: "LLD", kind: "area", done: 0, total: 20, completedOn: null },
  ],
  generatedOn: "2026-11-11",
  activeDays: 31,
  hours: 24.4,
  badges: [
    { id: "a", title: "First solve", description: "", earned: true, value: 1, target: 1 },
    { id: "b", title: "Hard hitter", description: "", earned: false, value: 3, target: 10 },
  ],
};

describe("portfolio profile helpers", () => {
  it("shows completed and in-progress courses, leaves out untouched ones", () => {
    const list = profileCourses(data.courses);
    expect(list.map((c) => c.id)).toEqual(["sd", "core"]);
    expect(courseState(data.courses[1])).toBe("in-progress");
    expect(coursePercent(data.courses[1])).toBe(52);
  });

  it("summarizes the work in plain words from the numbers", () => {
    const t = summarizePortfolio(data);
    expect(t).toContain("Ada has solved 87 problems (40 easy, 35 medium, 12 hard)");
    expect(t).toContain("current streak of 6 days");
    expect(t).toContain("Completed: System design");
    expect(t).toContain("In progress: Core CS (52%)");
    expect(t).toContain("1 of 2 badges earned");
  });

  it("the AI summary prompt carries only the numbers and never invents data sources", () => {
    const m = buildPortfolioSummaryMessages(data, [{ role: "user", content: "Summarize this profile." }]);
    expect(m[0].content).toContain("Problems solved: 87");
    expect(m[0].content).toContain("Course: Core CS: 13 of 25 done");
    expect(m[0].content).not.toContain("LLD");
    expect(m[0].content).toContain("Use only the numbers");
  });
});
