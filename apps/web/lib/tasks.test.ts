// Integration tests for task generation, ticking, XP and streaks against a real
// in-memory SQLite database (same libSQL driver the app uses).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { eq, like } from "drizzle-orm";
import { settings, tasks } from "./schema";
import { addCustomTask, deleteCustomTask, getBacklogView, getPlanPosition, getPlanStart, getTodayView, setPlanStart, skipPlanWeek, toggleTask } from "./tasks";

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
    expect(v.dayTasks.map((t) => t.templateKey)).toEqual(["w1:dsa-warmup", "w1:deep-block", "w1:behavioral"]);
    expect(v.weekTasks.map((t) => t.templateKey)).toEqual(["w1:week-dsa", "w1:week-sd", "w1:week-other"]);
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
    expect(saturday.dayTasks.map((t) => t.templateKey)).toEqual(["w1:timed-set", "w1:design-session", "w1:review"]);
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


/** Tick every open generated row of the current plan week, newest data each time. */
async function tickWholeWeek() {
  const db = await getDb();
  const pos = await getPlanPosition();
  const rows = await db.select().from(tasks).where(like(tasks.templateKey, `w${pos.cursor}:%`));
  for (const r of rows) if (r.status === "todo") await toggleTask(r.id);
}

async function settingValue(key: string) {
  const db = await getDb();
  return (await db.query.settings.findFirst({ where: eq(settings.key, key) }))?.value ?? null;
}

describe("plan position", () => {
  it("creates the settings rows and 24 prefixed tasks, once", async () => {
    const pos = await getPlanPosition();
    expect(pos).toMatchObject({ cursor: 1, start: "2026-11-02", finished: false, weeksLeft: 16, history: [] });
    await getPlanPosition();
    const db = await getDb();
    const rows = await db.select().from(tasks);
    expect(rows).toHaveLength(24);
    expect(rows.every((r) => r.templateKey?.startsWith("w1:"))).toBe(true);
    expect(await settingValue("plan_week_cursor")).toBe("1");
  });

  it("takes the calendar week once for an existing user and drops legacy open tasks", async () => {
    const db = await getDb();
    await getPlanStart();
    await db.insert(tasks).values([
      { date: "2026-11-06", scope: "day", templateKey: "dsa-warmup", title: "old open", category: "dsa", xp: 10 },
      { date: "2026-11-05", scope: "day", templateKey: "dsa-warmup", title: "old done", category: "dsa", xp: 10, status: "done", doneOn: "2026-11-05" },
    ]);
    setToday("2026-11-18"); // plan started 2026-11-02, so calendar week 3
    const pos = await getPlanPosition();
    expect(pos).toMatchObject({ cursor: 3, start: "2026-11-16", weeksLeft: 14 });
    const titles = (await db.select().from(tasks)).map((t) => t.title);
    expect(titles).not.toContain("old open");
    expect(titles).toContain("old done");
  });

  it("counts the days already behind on a Friday", async () => {
    const v = await getTodayView();
    expect(v.weekNo).toBe(1);
    expect(v.backlogCount).toBe(12); // slots 1 to 4 (Mon to Thu), 3 tasks each, are behind on Friday
  });
});

describe("backlog and catching up", () => {
  it("ten idle days put you on slot 7 with six overdue days", async () => {
    await getTodayView();
    setToday("2026-11-12"); // start 2026-11-02, 10 days later
    const v = await getTodayView();
    expect(v.weekNo).toBe(1);
    expect(v.dayTasks).toHaveLength(3);
    expect(v.dayTasks.every((t) => t.date === "2026-11-08")).toBe(true);
    const b = await getBacklogView();
    expect(b.overdue).toHaveLength(6);
    expect(b.overdue[0].date).toBe("2026-11-02");
    expect(b.goalsOverdue).toBe(true);
    expect(v.backlogCount).toBe(18 + 3);
  });

  it("ticking the whole week advances and starts the next week today", async () => {
    await getTodayView();
    setToday("2026-11-12");
    await tickWholeWeek();
    const v = await getTodayView();
    expect(v.weekNo).toBe(2);
    expect(v.weeksLeft).toBe(15);
    expect(v.backlogCount).toBe(0);
    expect(await settingValue("plan_week_start")).toBe("2026-11-12");
    expect(JSON.parse((await settingValue("plan_week_history"))!)).toEqual([{ week: 1, start: "2026-11-02", end: "2026-11-12" }]);
    expect(v.dayTasks.every((t) => t.date === "2026-11-12")).toBe(true);
  });

  it("working ahead finishes a week early", async () => {
    await getTodayView(); // Friday, slot 5
    await tickWholeWeek();
    const v = await getTodayView();
    expect(v.weekNo).toBe(2);
    expect(await settingValue("plan_week_start")).toBe("2026-11-06");
  });

  it("getBacklogView lists upcoming slots and counts done rows", async () => {
    await getTodayView();
    const v = await getTodayView();
    await toggleTask(v.dayTasks[0].id);
    const b = await getBacklogView();
    expect(b.upcoming.map((d) => d.date)).toEqual(["2026-11-07", "2026-11-08"]);
    expect(b.doneCount).toBe(1);
    expect(b.totalCount).toBe(24);
    expect(b.goals).toHaveLength(3);
    expect(b.goalsOverdue).toBe(false);
  });
});

describe("skipPlanWeek", () => {
  it("deletes open tasks, records the week and moves on", async () => {
    const v = await getTodayView();
    await toggleTask(v.dayTasks[0].id);
    await skipPlanWeek();
    const after = await getTodayView();
    expect(after.weekNo).toBe(2);
    const db = await getDb();
    const week1 = await db.select().from(tasks).where(like(tasks.templateKey, "w1:%"));
    expect(week1).toHaveLength(1);
    expect(week1[0].status).toBe("done");
    expect(JSON.parse((await settingValue("plan_week_history"))!)).toHaveLength(1);
  });
});

describe("plan start date", () => {
  it("shows no tasks before the plan starts", async () => {
    await getTodayView();
    await setPlanStart("2026-11-09");
    const v = await getTodayView();
    expect(v.beforeStart).toBe(true);
    expect(v.weekNo).toBe(1);
    expect(v.dayTasks).toHaveLength(0);
    expect(v.weekTasks).toHaveLength(0);
  });

  it("resets to week 1, clears history, and keeps completed tasks", async () => {
    const v = await getTodayView();
    await toggleTask(v.dayTasks[0].id);
    await skipPlanWeek();
    await setPlanStart("2026-10-26");
    const after = await getTodayView();
    expect(after.weekNo).toBe(1);
    expect(await settingValue("plan_week_history")).toBe("[]");
    expect(await settingValue("plan_finished")).toBeNull();
    const db = await getDb();
    expect((await db.select().from(tasks).where(eq(tasks.status, "done")))).toHaveLength(1);
  });

  it("completing week 16 finishes the plan", async () => {
    await setPlanStart("2026-11-02");
    const db = await getDb();
    await db.insert(settings).values({ key: "plan_week_cursor", value: "16" }).onConflictDoUpdate({ target: settings.key, set: { value: "16" } });
    await tickWholeWeek();
    const v = await getTodayView();
    expect(v.finished).toBe(true);
    expect(v.weeksLeft).toBe(0);
    expect(v.dayTasks).toHaveLength(0);
    expect(await settingValue("plan_finished")).toBe("1");
  });
});
