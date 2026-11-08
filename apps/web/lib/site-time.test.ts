import { beforeEach, describe, expect, it } from "vitest";
import { SITE_TIME_LIMITS, addSiteTime, parseSiteTime, siteMinutesForSlug, siteTimeInRange } from "./site-time";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
});

describe("parseSiteTime", () => {
  it("accepts a valid entry and rounds seconds", () => {
    expect(parseSiteTime({ day: "2026-11-04", slug: "two-sum", seconds: 59.6 })).toEqual({ day: "2026-11-04", slug: "two-sum", seconds: 60 });
  });

  it("rejects bad days, slugs and seconds", () => {
    expect(parseSiteTime(null)).toBeNull();
    expect(parseSiteTime({ day: "04-11-2026", slug: "two-sum", seconds: 10 })).toBeNull();
    expect(parseSiteTime({ day: "2026-13-45", slug: "two-sum", seconds: 10 })).toBeNull();
    expect(parseSiteTime({ day: "2026-11-04", slug: "Two Sum!", seconds: 10 })).toBeNull();
    expect(parseSiteTime({ day: "2026-11-04", slug: "two-sum", seconds: 0 })).toBeNull();
    expect(parseSiteTime({ day: "2026-11-04", slug: "two-sum", seconds: "30" })).toBeNull();
    expect(parseSiteTime({ day: "2026-11-04", slug: "two-sum", seconds: SITE_TIME_LIMITS.secondsPerEntry + 1 })).toBeNull();
  });
});

describe("addSiteTime", () => {
  it("adds up across reports, per day and problem", async () => {
    const r = await addSiteTime([
      { day: "2026-11-03", slug: "two-sum", seconds: 600 },
      { day: "2026-11-04", slug: "two-sum", seconds: 300 },
      { day: "2026-11-04", slug: "three-sum", seconds: 120 },
      { day: "bad", slug: "two-sum", seconds: 5 },
    ]);
    expect(r).toEqual({ stored: 3, skipped: 1 });
    await addSiteTime([{ day: "2026-11-04", slug: "two-sum", seconds: 60 }]);

    expect(await siteMinutesForSlug("two-sum")).toBe(16); // 600 + 300 + 60 = 960 s
    expect(await siteMinutesForSlug("unknown")).toBe(0);
    expect(await siteTimeInRange("2026-11-04", "2026-11-04")).toEqual([
      { slug: "two-sum", seconds: 360 },
      { slug: "three-sum", seconds: 120 },
    ]);
  });

  it("caps one problem's time at 24 hours a day", async () => {
    for (let i = 0; i < 6; i++) await addSiteTime([{ day: "2026-11-04", slug: "two-sum", seconds: SITE_TIME_LIMITS.secondsPerEntry }]);
    expect((await siteTimeInRange("2026-11-04", "2026-11-04"))[0].seconds).toBe(SITE_TIME_LIMITS.secondsPerDay);
  });
});
