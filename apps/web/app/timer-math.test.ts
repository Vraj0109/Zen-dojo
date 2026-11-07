import { describe, expect, it } from "vitest";
import { clock, elapsedAt, minutesToLog, newTimer, parseTimer, pauseTimer, reachedTarget, resumeTimer, serializeTimer, withTarget } from "./timer-math";

const item = { itemId: "lc-1", label: "1. Two Sum", href: "/dsa/lc-1", targetMinutes: 25 };
const MIN = 60_000;

describe("timer math", () => {
  it("counts up from the start and survives a reload (state is derived from startedAt)", () => {
    const t = newTimer(item, 1_000_000);
    expect(elapsedAt(t, 1_000_000)).toBe(0);
    expect(elapsedAt(t, 1_000_000 + 5 * MIN)).toBe(5 * MIN);
    const reloaded = parseTimer(serializeTimer(t))!;
    expect(elapsedAt(reloaded, 1_000_000 + 7 * MIN)).toBe(7 * MIN);
  });

  it("pauses, keeps the elapsed time and resumes", () => {
    let t = newTimer(item, 0);
    t = pauseTimer(t, 10 * MIN);
    expect(t.startedAt).toBeNull();
    expect(elapsedAt(t, 99 * MIN)).toBe(10 * MIN);
    t = resumeTimer(t, 20 * MIN);
    expect(elapsedAt(t, 25 * MIN)).toBe(15 * MIN);
    // pausing a paused timer or resuming a running one changes nothing
    expect(pauseTimer(pauseTimer(t, 30 * MIN), 40 * MIN)).toEqual(pauseTimer(t, 30 * MIN));
    expect(resumeTimer(t, 99 * MIN)).toBe(t);
  });

  it("never goes backwards if the clock moves", () => {
    const t = newTimer(item, 1_000);
    expect(elapsedAt(t, 500)).toBe(0);
  });

  it("logs whole minutes and knows when the target is reached", () => {
    const t = newTimer(item, 0);
    expect(minutesToLog(t, 29_000)).toBe(0);
    expect(minutesToLog(t, 90_000)).toBe(2);
    expect(reachedTarget(t, 24 * MIN)).toBe(false);
    expect(reachedTarget(t, 25 * MIN)).toBe(true);
  });

  it("clamps the target", () => {
    expect(newTimer({ ...item, targetMinutes: 0 }, 0).targetMinutes).toBe(1);
    expect(withTarget(newTimer(item, 0), 100_000).targetMinutes).toBe(600);
    expect(withTarget(newTimer(item, 0), 45).targetMinutes).toBe(45);
  });

  it("formats the clock", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(65_000)).toBe("1:05");
    expect(clock(25 * MIN)).toBe("25:00");
    expect(clock(61 * MIN + 5000)).toBe("1:01:05");
    expect(clock(-5)).toBe("0:00");
  });

  it("treats malformed storage as no timer", () => {
    expect(parseTimer(null)).toBeNull();
    expect(parseTimer("")).toBeNull();
    expect(parseTimer("{not json")).toBeNull();
    expect(parseTimer(JSON.stringify({ itemId: "x" }))).toBeNull();
    expect(parseTimer(JSON.stringify({ ...newTimer(item, 0), href: "https://evil.example" }))).toBeNull();
    expect(parseTimer(JSON.stringify({ ...newTimer(item, 0), elapsedMs: -5 }))).toBeNull();
    expect(parseTimer(serializeTimer(newTimer(item, 0)))).not.toBeNull();
  });
});
