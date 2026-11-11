import { describe, expect, it } from "vitest";
import { EXCITED_FOR_MS, SLEEP_AFTER_MS, nextMood } from "./buddy-mood";

const base = { now: 1_000_000, lastActivity: 1_000_000, excitedUntil: 0, aiBusy: false };

describe("nextMood", () => {
  it("thinks while an AI answer is pending, then goes idle", () => {
    expect(nextMood("idle", "ai-start", { ...base, aiBusy: true })).toBe("thinking");
    expect(nextMood("thinking", "tick", { ...base, aiBusy: true })).toBe("thinking");
    expect(nextMood("thinking", "ai-end", base)).toBe("idle");
  });
  it("returns to excited after ai-end when excitement is still running", () => {
    expect(nextMood("thinking", "ai-end", { ...base, excitedUntil: base.now + 1000 })).toBe("excited");
  });
  it("gets excited on solved and session-end, and calms down after EXCITED_FOR_MS", () => {
    expect(nextMood("idle", "solved", base)).toBe("excited");
    expect(nextMood("sleeping", "session-end", base)).toBe("excited");
    const until = base.now + EXCITED_FOR_MS;
    expect(nextMood("excited", "tick", { ...base, excitedUntil: until })).toBe("excited");
    expect(nextMood("excited", "tick", { ...base, now: until, excitedUntil: until })).toBe("idle");
  });
  it("falls asleep after SLEEP_AFTER_MS without activity and wakes on activity", () => {
    expect(nextMood("idle", "tick", { ...base, now: base.now + SLEEP_AFTER_MS - 1 })).toBe("idle");
    expect(nextMood("idle", "tick", { ...base, now: base.now + SLEEP_AFTER_MS })).toBe("sleeping");
    expect(nextMood("sleeping", "tick", { ...base, now: base.now + SLEEP_AFTER_MS * 2 })).toBe("sleeping");
    expect(nextMood("sleeping", "activity", base)).toBe("idle");
  });
  it("does not sleep while thinking", () => {
    expect(nextMood("thinking", "tick", { ...base, now: base.now + SLEEP_AFTER_MS * 3, aiBusy: true })).toBe("thinking");
  });
  it("keeps other moods on activity", () => {
    expect(nextMood("idle", "activity", base)).toBe("idle");
    expect(nextMood("thinking", "activity", base)).toBe("thinking");
  });
});
