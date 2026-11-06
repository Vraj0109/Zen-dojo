import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isWeekend, planWeekNumber, startOfWeek, toLocalDate } from "./dates";

describe("toLocalDate", () => {
  it("formats as zero-padded YYYY-MM-DD in local time", () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("is stable across DST changes", () => {
    // US clocks change on 2026-03-08 and 2026-11-01.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });
});

describe("daysBetween", () => {
  it("counts whole days, including across DST", () => {
    expect(daysBetween("2026-03-01", "2026-03-15")).toBe(14);
    expect(daysBetween("2026-10-25", "2026-11-08")).toBe(14);
    expect(daysBetween("2026-11-08", "2026-11-01")).toBe(-7);
  });
});

describe("startOfWeek", () => {
  it("returns the Monday of the week", () => {
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(startOfWeek("2026-11-06")).toBe("2026-11-02"); // Friday
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02"); // Sunday belongs to the previous Monday
  });
});

describe("isWeekend", () => {
  it("is true only for Saturday and Sunday", () => {
    expect(isWeekend("2026-11-06")).toBe(false); // Friday
    expect(isWeekend("2026-11-07")).toBe(true);
    expect(isWeekend("2026-11-08")).toBe(true);
    expect(isWeekend("2026-11-09")).toBe(false);
  });
});

describe("planWeekNumber", () => {
  const start = "2026-11-02";
  it("is 1 for the first seven days", () => {
    expect(planWeekNumber(start, start)).toBe(1);
    expect(planWeekNumber(start, "2026-11-08")).toBe(1);
  });
  it("advances every 7 days", () => {
    expect(planWeekNumber(start, "2026-11-09")).toBe(2);
    expect(planWeekNumber(start, addDays(start, 7 * 15))).toBe(16);
  });
  it("is below 1 before the plan starts", () => {
    expect(planWeekNumber(start, "2026-11-01")).toBe(0);
  });
});
