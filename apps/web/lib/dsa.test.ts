import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDsaView, getResolveDueCount, markSolved, undoSolve } from "./dsa";
import { getRoadmapView } from "./roadmap";
import { getTodayView, setPlanStart, toggleTask } from "./tasks";

function setToday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 12));
}

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  setToday("2026-11-06");
});

afterEach(() => {
  vi.useRealTimers();
});

const problem = async (id: string) =>
  (await getDsaView()).groups.flatMap((g) => g.patterns).flatMap((p) => p.items).find((i) => i.id === id)!;

describe("solving problems", () => {
  it("records a solve with XP by difficulty and counts toward XP, today's XP and streak", async () => {
    await markSolved("lc-560"); // medium
    expect((await problem("lc-560")).status).toEqual({
      state: "solved",
      solvedOn: "2026-11-06",
      resolveOn: "2026-11-20",
      resolveDue: false,
    });
    const today = await getTodayView();
    expect(today).toMatchObject({ totalXp: 15, todayXp: 15, streak: 1 });
  });

  it("ignores unknown problem ids", async () => {
    await markSolved("lc-999999");
    await markSolved("");
    expect((await getDsaView()).totals.solved).toBe(0);
  });

  it("becomes due after 14 days, and a second tick records the re-solve", async () => {
    await markSolved("lc-42"); // hard, 30 XP
    setToday("2026-11-19");
    expect(await getResolveDueCount()).toBe(0);
    setToday("2026-11-20");
    expect(await getResolveDueCount()).toBe(1);
    expect((await getDsaView()).due.map((p) => p.id)).toEqual(["lc-42"]);

    await markSolved("lc-42");
    const v = await getDsaView();
    expect(v.due).toHaveLength(0);
    expect((await problem("lc-42")).status).toEqual({ state: "resolved", solvedOn: "2026-11-06", resolvedOn: "2026-11-20" });
    expect(v.totals).toMatchObject({ solved: 1, resolved: 1, xp: 40 });
  });

  it("does nothing after the re-solve", async () => {
    await markSolved("lc-1");
    await markSolved("lc-1");
    await markSolved("lc-1");
    expect((await getDsaView()).totals.xp).toBe(5 + 10);
  });

  it("undo removes the latest solve first", async () => {
    await markSolved("lc-1");
    await markSolved("lc-1");
    await undoSolve("lc-1");
    expect((await problem("lc-1")).status.state).toBe("solved");
    await undoSolve("lc-1");
    expect((await problem("lc-1")).status.state).toBe("unsolved");
    await undoSolve("lc-1"); // nothing left: no error
    expect((await getDsaView()).totals.xp).toBe(0);
  });
});

describe("pattern coverage", () => {
  it("covers a pattern at 4 solved problems", async () => {
    for (const id of ["lc-1", "lc-49", "lc-347"]) await markSolved(id);
    let hashMap = (await getDsaView()).groups[0].patterns.find((p) => p.id === "hash-map")!;
    expect(hashMap).toMatchObject({ solved: 3, target: 4, covered: false });

    await markSolved("lc-560");
    const v = await getDsaView();
    hashMap = v.groups[0].patterns.find((p) => p.id === "hash-map")!;
    expect(hashMap).toMatchObject({ solved: 4, covered: true });
    expect(v.totals.patternsCovered).toBe(1);
  });

  it("credits a shared problem to every pattern that lists it", async () => {
    await markSolved("lc-239"); // sliding window + monotonic deque
    const patterns = (await getDsaView()).groups.flatMap((g) => g.patterns);
    expect(patterns.find((p) => p.id === "sliding-window")!.solved).toBe(1);
    expect(patterns.find((p) => p.id === "monotonic-deque")!.solved).toBe(1);
    expect((await getDsaView()).totals.solved).toBe(1); // counted once overall
  });

  it("covers small patterns when all their problems are solved", async () => {
    await markSolved("lc-1334");
    const fw = (await getDsaView()).groups.flatMap((g) => g.patterns).find((p) => p.id === "floyd-warshall")!;
    expect(fw).toMatchObject({ solved: 1, target: 1, covered: true });
  });
});

describe("streak across tasks and solves", () => {
  it("counts a day with only a solve as active", async () => {
    setToday("2026-11-04");
    await toggleTask((await getTodayView()).dayTasks[0].id);
    setToday("2026-11-05");
    await markSolved("lc-1");
    setToday("2026-11-06");
    expect((await getTodayView()).streak).toBe(2);
  });
});

describe("roadmap", () => {
  it("summarises each plan week from tasks and solves", async () => {
    const today = await getTodayView(); // week 1 starts 2026-11-02
    await toggleTask(today.weekTasks[0].id); // goal, 40 XP
    await toggleTask(today.dayTasks[0].id); // daily, 10 XP
    await markSolved("lc-560"); // 15 XP

    setToday("2026-11-10"); // week 2
    await markSolved("lc-1");

    const r = await getRoadmapView();
    expect(r.currentWeek).toBe(2);
    expect(r.weeks).toHaveLength(16);
    expect(r.weeks[0]).toMatchObject({ start: "2026-11-02", end: "2026-11-08", goalsDone: 1, tasksDone: 1, problemsSolved: 1, xp: 65 });
    expect(r.weeks[1]).toMatchObject({ start: "2026-11-09", problemsSolved: 1, xp: 5, goalsDone: 0 });
    expect(r.weeks[2]).toMatchObject({ problemsSolved: 0, xp: 0 });
  });
});

describe("plan start", () => {
  it("snaps to the Monday of the chosen week", async () => {
    await setPlanStart("2026-11-12"); // Thursday
    expect((await getRoadmapView()).planStart).toBe("2026-11-09");
  });
});
