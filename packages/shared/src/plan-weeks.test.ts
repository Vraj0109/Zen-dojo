import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  isWeekComplete,
  parseWeekKey,
  slotDueDate,
  splitBacklog,
  todaySlot,
  weekKey,
  weeksLeft,
  type PlanWeekRow,
} from "./plan-weeks";

const START = "2026-11-09";

/** The 24 generated rows of a week: 3 goals on the start date, 3 tasks for each of 7 slots. */
function makeWeek(week: number, start: string, status = "todo"): PlanWeekRow[] {
  const rows: PlanWeekRow[] = [];
  let id = 1;
  for (const k of ["week-dsa", "week-sd", "week-other"]) {
    rows.push({ id: id++, date: start, scope: "week", templateKey: weekKey(week, k), status });
  }
  for (let slot = 1; slot <= 7; slot++) {
    for (const k of ["a", "b", "c"]) {
      rows.push({ id: id++, date: slotDueDate(start, slot), scope: "day", templateKey: weekKey(week, k), status });
    }
  }
  return rows;
}

describe("keys", () => {
  it("round-trips and ignores legacy and custom keys", () => {
    expect(weekKey(3, "dsa-warmup")).toBe("w3:dsa-warmup");
    expect(parseWeekKey("w3:dsa-warmup")).toEqual({ week: 3, key: "dsa-warmup" });
    expect(parseWeekKey("w12:week-dsa")).toEqual({ week: 12, key: "week-dsa" });
    expect(parseWeekKey("dsa-warmup")).toBeNull();
    expect(parseWeekKey(null)).toBeNull();
  });
});

describe("slots", () => {
  it("clamps today's slot to 1..7", () => {
    expect(todaySlot(START, "2026-11-01")).toBe(1);
    expect(todaySlot(START, "2026-11-09")).toBe(1);
    expect(todaySlot(START, "2026-11-12")).toBe(4);
    expect(todaySlot(START, "2026-11-15")).toBe(7);
    expect(todaySlot(START, "2026-11-19")).toBe(7);
    expect(slotDueDate(START, 1)).toBe(START);
    expect(slotDueDate(START, 7)).toBe("2026-11-15");
  });

  it("counts weeks left", () => {
    expect(weeksLeft(3, false)).toBe(14);
    expect(weeksLeft(1, false)).toBe(16);
    expect(weeksLeft(16, false)).toBe(1);
    expect(weeksLeft(16, true)).toBe(0);
  });
});

describe("isWeekComplete", () => {
  it("is not complete with one open row", () => {
    const rows = makeWeek(3, START, "done");
    rows[5].status = "todo";
    expect(isWeekComplete(rows, 3, START)).toBe(false);
  });

  it("is complete when all 24 are done", () => {
    const rows = makeWeek(3, START, "done");
    expect(rows).toHaveLength(24);
    expect(isWeekComplete(rows, 3, START)).toBe(true);
  });

  it("is not complete with no rows", () => {
    expect(isWeekComplete([], 3, START)).toBe(false);
  });

  it("ignores rows outside the date window", () => {
    const rows = [...makeWeek(3, START, "done"), ...makeWeek(3, addDays(START, -30), "todo").map((r) => ({ ...r, id: r.id + 100 }))];
    expect(isWeekComplete(rows, 3, START)).toBe(true);
  });

  it("ignores legacy, custom and other weeks' rows", () => {
    const rows: PlanWeekRow[] = [
      ...makeWeek(3, START, "done"),
      { id: 900, date: START, scope: "day", templateKey: "dsa-warmup", status: "todo" },
      { id: 901, date: START, scope: "day", templateKey: null, status: "todo" },
      { id: 902, date: START, scope: "day", templateKey: weekKey(4, "x"), status: "todo" },
    ];
    expect(isWeekComplete(rows, 3, START)).toBe(true);
  });
});

describe("splitBacklog", () => {
  it("splits by today's slot", () => {
    const rows = makeWeek(3, START);
    const r = splitBacklog(rows, 3, START, "2026-11-12"); // slot 4
    expect(r.overdue).toHaveLength(9);
    expect(r.today).toHaveLength(3);
    expect(r.upcoming).toHaveLength(9);
    expect(r.goals.open).toHaveLength(3);
    expect(r.goals.overdue).toHaveLength(0);
  });

  it("leaves done rows out", () => {
    const rows = makeWeek(3, START);
    rows[3].status = "done"; // a slot 1 task
    expect(splitBacklog(rows, 3, START, "2026-11-12").overdue).toHaveLength(8);
  });

  it("counts goals overdue only after day 7", () => {
    const rows = makeWeek(3, START);
    expect(splitBacklog(rows, 3, START, "2026-11-15").goals.overdue).toHaveLength(0);
    const late = splitBacklog(rows, 3, START, "2026-11-16");
    expect(late.goals.overdue).toHaveLength(3);
    expect(late.today).toHaveLength(3); // slot 7
    expect(late.overdue).toHaveLength(18); // slots 1 to 6
    expect(late.upcoming).toHaveLength(0);
  });
});
