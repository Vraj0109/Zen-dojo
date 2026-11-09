// Integration tests for task generation, ticking, XP and streaks against a real
// in-memory SQLite database (same libSQL driver the app uses).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { problemSolves } from "./schema";
import { addCustomTask, deleteCustomTask, getPlanStart, getTodayView, setPlanStart, shiftPlanSchedule, toggleTask } from "./tasks";

/** Set the clock to a local date at noon. Only Date is faked so the DB driver's timers still work. */
function setToday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 12));
}

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb; // fresh database per test
  vi.useFakeTimers({ toFake: ["Date"] });
  setToday("2026-11-06"); // Friday of week 1 when the plan starts Monday 2026-11-02
});

afterEach(() => {
  vi.useRealTimers();
});

describe("first run", () => {
  it("starts the plan on this week's Monday and generates today's and this week's tasks", async () => {
    const v = await getTodayView();
    expect(v.planStart).toBe("2026-11-02");
    expect(v.weekNo).toBe(1);
    expect(v.dayTasks.map((t) => t.templateKey)).toEqual(["dsa-warmup", "deep-block", "behavioral"]);
    expect(v.weekTasks.map((t) => t.templateKey)).toEqual(["week-dsa", "week-sd", "week-other"]);
    expect(v.dayTasks.every((t) => t.status === "todo")).toBe(true);
    expect(v.weekTasks.every((t) => t.date === "2026-11-02")).toBe(true);
    expect(v).toMatchObject({ totalXp: 0, todayXp: 0, streak: 0 });
  });

  it("does not duplicate tasks when the page loads again", async () => {
    await getTodayView();
    const v = await getTodayView();
    expect(v.dayTasks).toHaveLength(3);
    expect(v.weekTasks).toHaveLength(3);
  });

  it("uses the weekend template on Saturday and keeps the same weekly goals", async () => {
    const friday = await getTodayView();
    setToday("2026-11-07");
    const saturday = await getTodayView();
    expect(saturday.dayTasks.map((t) => t.templateKey)).toEqual(["timed-set", "design-session", "review"]);
    expect(saturday.weekTasks.map((t) => t.id)).toEqual(friday.weekTasks.map((t) => t.id));
  });
});

describe("ticking tasks", () => {
  it("awards XP and starts a streak, and unticking reverses it", async () => {
    const v = await getTodayView();
    const warmup = v.dayTasks[0];

    await toggleTask(warmup.id);
    let after = await getTodayView();
    expect(after.dayTasks[0]).toMatchObject({ status: "done", doneOn: "2026-11-06" });
    expect(after).toMatchObject({ totalXp: 10, todayXp: 10, streak: 1 });

    await toggleTask(warmup.id);
    after = await getTodayView();
    expect(after.dayTasks[0]).toMatchObject({ status: "todo", doneOn: null });
    expect(after).toMatchObject({ totalXp: 0, todayXp: 0, streak: 0 });
  });

  it("counts weekly goals toward XP and level", async () => {
    const v = await getTodayView();
    await toggleTask(v.weekTasks[0].id); // 40 XP
    await toggleTask(v.dayTasks[0].id); // 10 XP
    const after = await getTodayView();
    expect(after.totalXp).toBe(50);
    expect(after.level.level).toBe(1);
  });

  it("builds a streak across consecutive days", async () => {
    setToday("2026-11-04");
    await toggleTask((await getTodayView()).dayTasks[0].id);
    setToday("2026-11-05");
    await toggleTask((await getTodayView()).dayTasks[0].id);
    setToday("2026-11-06");
    const v = await getTodayView();
    expect(v.streak).toBe(2); // still alive today before ticking anything
    expect(v.todayXp).toBe(0);
    expect(v.totalXp).toBe(20);
  });

  it("ignores unknown task ids", async () => {
    await getTodayView();
    await expect(toggleTask(9999)).resolves.toBeUndefined();
  });
});

describe("custom tasks", () => {
  it("can be added for today or this week and deleted", async () => {
    await addCustomTask("LeetCode 560", "dsa", "day");
    await addCustomTask("Read DDIA chapter 5", "sd", "week");
    let v = await getTodayView();
    const custom = v.dayTasks.find((t) => t.title === "LeetCode 560")!;
    expect(custom).toMatchObject({ templateKey: null, category: "dsa", xp: 10 });
    expect(v.weekTasks.find((t) => t.title === "Read DDIA chapter 5")).toMatchObject({ xp: 40, date: "2026-11-02" });

    await deleteCustomTask(custom.id);
    v = await getTodayView();
    expect(v.dayTasks.find((t) => t.title === "LeetCode 560")).toBeUndefined();
  });

  it("refuses to delete generated tasks", async () => {
    const v = await getTodayView();
    await deleteCustomTask(v.dayTasks[0].id);
    expect((await getTodayView()).dayTasks).toHaveLength(3);
  });
});

describe("plan start date", () => {
  it("shows no tasks before the plan starts", async () => {
    await getTodayView();
    await setPlanStart("2026-11-09");
    const v = await getTodayView();
    expect(v.weekNo).toBe(0);
    expect(v.dayTasks).toHaveLength(0);
    expect(v.weekTasks).toHaveLength(0);
  });

  it("regenerates open tasks for the new week but keeps completed ones", async () => {
    const v = await getTodayView();
    await toggleTask(v.dayTasks[0].id);
    await setPlanStart("2026-10-26"); // today becomes week 2

    const after = await getTodayView();
    expect(after.weekNo).toBe(2);
    expect(after.dayTasks[0]).toMatchObject({ status: "done", title: v.dayTasks[0].title });
    expect(after.dayTasks[1].title).toContain("Fundamentals: networking, APIs, estimation");
    expect(after.totalXp).toBe(10);
  });

  it("stops generating tasks after week 16", async () => {
    await setPlanStart("2026-07-06"); // 2026-11-06 is day 123 → week 18
    const v = await getTodayView();
    expect(v.weekNo).toBeGreaterThan(16);
    expect(v.dayTasks).toHaveLength(0);
  });
});

describe("schedule shifting", () => {
  it("shifts plan_start by N days and regenerates open tasks", async () => {
    const v = await getTodayView();
    expect(v.planStart).toBe("2026-11-02");
    expect(v.weekNo).toBe(1);

    await shiftPlanSchedule(7);
    expect(await getPlanStart()).toBe("2026-11-09");
    const after = await getTodayView();
    expect(after.planStart).toBe("2026-11-09");
    expect(after.weekNo).toBe(0); // Today is 2026-11-06, so plan starts in future
  });

  it("offsets pending problemSolves re-solve dates but keeps already resolved ones intact", async () => {
    const db = await getDb();
    // Problem 1: solved on Nov 1, not yet resolved (pending re-solve)
    await db.insert(problemSolves).values({
      problemId: "lc-1",
      kind: "solve",
      solvedOn: "2026-11-01",
      xp: 10,
    });

    // Problem 2: solved on Oct 10 and resolved on Oct 24 (completed re-solve)
    await db.insert(problemSolves).values([
      { problemId: "lc-2", kind: "solve", solvedOn: "2026-10-10", xp: 10 },
      { problemId: "lc-2", kind: "resolve", solvedOn: "2026-10-24", xp: 15 },
    ]);

    await shiftPlanSchedule(7);

    const rows = await db.select().from(problemSolves);
    const p1Solve = rows.find((r) => r.problemId === "lc-1" && r.kind === "solve")!;
    expect(p1Solve.solvedOn).toBe("2026-11-08"); // 2026-11-01 + 7 days

    const p2Solve = rows.find((r) => r.problemId === "lc-2" && r.kind === "solve")!;
    const p2Resolve = rows.find((r) => r.problemId === "lc-2" && r.kind === "resolve")!;
    expect(p2Solve.solvedOn).toBe("2026-10-10"); // unchanged because already resolved
    expect(p2Resolve.solvedOn).toBe("2026-10-24"); // unchanged
  });

  it("ignores zero or invalid days", async () => {
    const before = await getPlanStart();
    await shiftPlanSchedule(0);
    expect(await getPlanStart()).toBe(before);
  });
});
