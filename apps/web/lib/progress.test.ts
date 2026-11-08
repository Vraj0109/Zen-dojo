import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSolved } from "./dsa";
import { applyFreeze, getProgress } from "./progress";
import { getStats } from "./stats";

const setDay = (d: number) => vi.setSystemTime(new Date(2026, 10, d, 12));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay(2); // Monday Nov 2
});

afterEach(() => {
  vi.useRealTimers();
});

describe("streak freeze", () => {
  it("covers a missed day: the streak continues, no XP is added, and a second freeze that week is refused", async () => {
    await markSolved("lc-239"); // active on Nov 2
    setDay(4); // Nov 3 was missed, today is Wednesday Nov 4

    const before = await getProgress("2026-11-04");
    expect(before.streak).toBe(0);
    expect(before.freezeOffer).toEqual(["2026-11-03"]);

    expect(await applyFreeze("2026-11-03", "2026-11-04")).toBe(true);
    const after = await getProgress("2026-11-04");
    expect(after.streak).toBe(2);
    expect(after.totalXp).toBe(before.totalXp);
    expect(after.freezeOffer).toEqual([]);

    expect(await applyFreeze("2026-11-03", "2026-11-04")).toBe(false); // already frozen
    expect(await applyFreeze("2026-11-01", "2026-11-04")).toBe(false); // not a candidate
  });

  it("refuses a day that was not missed or has nothing to save", async () => {
    setDay(4);
    expect(await applyFreeze("2026-11-03", "2026-11-04")).toBe(false); // no activity before it
    expect((await getProgress("2026-11-04")).freezeOffer).toEqual([]);
  });

  it("counts frozen days in the streak numbers on Profile but not as active days", async () => {
    await markSolved("lc-239"); // Nov 2
    setDay(4);
    await applyFreeze("2026-11-03", "2026-11-04");
    await markSolved("lc-1"); // Nov 4
    const s = await getStats();
    expect(s.totals.streak).toBe(3);
    expect(s.totals.bestStreak).toBe(3);
    expect(s.totals.activeDays).toBe(2);
  });
});
