import { describe, expect, it } from "vitest";
import { CATEGORIES, PLAN_WEEKS, TOTAL_WEEKS, WEEKDAY_TEMPLATE, WEEKEND_TEMPLATE, WEEK_TEMPLATE } from "./plan";

describe("PLAN_WEEKS", () => {
  it("has 16 consecutive weeks with all three columns filled", () => {
    expect(TOTAL_WEEKS).toBe(16);
    PLAN_WEEKS.forEach((w, i) => {
      expect(w.week).toBe(i + 1);
      expect(w.dsa.trim()).not.toBe("");
      expect(w.sd.trim()).not.toBe("");
      expect(w.other.trim()).not.toBe("");
    });
  });
});

describe("templates", () => {
  const all = [...WEEKDAY_TEMPLATE, ...WEEKEND_TEMPLATE, ...WEEK_TEMPLATE];

  it("have unique keys (they are part of the database unique index)", () => {
    const keys = all.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("use known categories and positive XP", () => {
    for (const t of all) {
      expect(Object.keys(CATEGORIES)).toContain(t.category);
      expect(t.xp).toBeGreaterThan(0);
    }
  });

  it("render a title for every week", () => {
    for (const w of PLAN_WEEKS) for (const t of all) expect(t.title(w).length).toBeGreaterThan(0);
  });

  it("have the right scope", () => {
    expect([...WEEKDAY_TEMPLATE, ...WEEKEND_TEMPLATE].every((t) => t.scope === "day")).toBe(true);
    expect(WEEK_TEMPLATE.every((t) => t.scope === "week")).toBe(true);
  });
});
