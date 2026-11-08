import { describe, expect, it } from "vitest";
import { IDLE_MS, Ledger, MAX_GAP_MS, creditSeconds, isActive, localDay, slugFromPath } from "./time.js";

describe("slugFromPath", () => {
  it("reads the slug from problem pages only", () => {
    expect(slugFromPath("/problems/two-sum/")).toBe("two-sum");
    expect(slugFromPath("/problems/two-sum/description/")).toBe("two-sum");
    expect(slugFromPath("/problems/3sum/submissions/123/")).toBe("3sum");
    expect(slugFromPath("/problems/two-sum")).toBe("two-sum");
    expect(slugFromPath("/problemset/")).toBeNull();
    expect(slugFromPath("/")).toBeNull();
    expect(slugFromPath("/problems/")).toBeNull();
  });
});

describe("localDay", () => {
  it("formats the local date with zero padding", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDay(new Date(2026, 10, 30, 0, 1))).toBe("2026-11-30");
  });
});

describe("creditSeconds and isActive", () => {
  it("credits the gap only while active and not too long", () => {
    expect(creditSeconds(1000, 6000, true)).toBe(5);
    expect(creditSeconds(1000, 6000, false)).toBe(0);
    expect(creditSeconds(1000, 1000 + MAX_GAP_MS + 1, true)).toBe(0);
    expect(creditSeconds(6000, 1000, true)).toBe(0);
  });

  it("treats a hidden, unfocused or idle page as away", () => {
    const base = { visible: true, focused: true, lastInput: 100_000, now: 110_000 };
    expect(isActive(base)).toBe(true);
    expect(isActive({ ...base, visible: false })).toBe(false);
    expect(isActive({ ...base, focused: false })).toBe(false);
    expect(isActive({ ...base, now: base.lastInput + IDLE_MS })).toBe(false);
  });
});

describe("Ledger", () => {
  it("drains whole seconds per day and problem and keeps the fraction", () => {
    const l = new Ledger();
    l.add("2026-11-04", "two-sum", 5);
    l.add("2026-11-04", "two-sum", 5.5);
    l.add("2026-11-05", "two-sum", 0.4);
    l.add("2026-11-04", "three-sum", 3);
    expect(l.drain()).toEqual([
      { day: "2026-11-04", slug: "two-sum", seconds: 10 },
      { day: "2026-11-04", slug: "three-sum", seconds: 3 },
    ]);
    l.add("2026-11-04", "two-sum", 0.5);
    expect(l.drain()).toEqual([{ day: "2026-11-04", slug: "two-sum", seconds: 1 }]);
    expect(l.drain()).toEqual([]);
  });

  it("puts entries back after a failed send", () => {
    const l = new Ledger();
    l.add("2026-11-04", "two-sum", 20);
    const sent = l.drain();
    l.restore(sent);
    expect(l.drain()).toEqual([{ day: "2026-11-04", slug: "two-sum", seconds: 20 }]);
  });

  it("ignores zero or negative additions", () => {
    const l = new Ledger();
    l.add("2026-11-04", "two-sum", 0);
    l.add("2026-11-04", "two-sum", -3);
    expect(l.drain()).toEqual([]);
  });
});
