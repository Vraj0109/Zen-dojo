import { describe, expect, it } from "vitest";
import { bestStreak } from "./stats";
import { currentStreak } from "./game";
import { FREEZE_WINDOW_DAYS, canFreeze, freezeCandidates, streakDays } from "./freeze";

// 2026-11-09 is a Monday, so 2026-11-02..08 is one week and 2026-11-09..15 the next.
const TODAY = "2026-11-11"; // Wednesday

describe("streak freeze", () => {
  it("merges active and frozen days", () => {
    expect(streakDays(["2026-11-01"], ["2026-11-02", "2026-11-01"]).sort()).toEqual(["2026-11-01", "2026-11-02"]);
  });

  it("lets a frozen day keep the streak alive", () => {
    const active = ["2026-11-08", "2026-11-09", "2026-11-11"]; // missed Tuesday the 10th
    expect(currentStreak(active, TODAY)).toBe(1);
    const days = streakDays(active, ["2026-11-10"]);
    expect(currentStreak(days, TODAY)).toBe(4);
    expect(bestStreak(days)).toBe(4);
  });

  it("offers a missed day that follows an active day", () => {
    expect(freezeCandidates(["2026-11-09"], [], TODAY)).toEqual(["2026-11-10"]);
  });

  it("offers only the day right after activity, and nothing when there is no activity (nothing to save)", () => {
    expect(freezeCandidates(["2026-11-05"], [], TODAY)).toEqual(["2026-11-06"]);
    expect(freezeCandidates([], [], TODAY)).toEqual([]);
  });

  it("never offers today or days that already have activity", () => {
    const c = freezeCandidates(["2026-11-09", "2026-11-10", "2026-11-11"], [], TODAY);
    expect(c).toEqual([]);
  });

  it("allows one freeze per Monday-Sunday week", () => {
    // Active Mon, Wed; Tue frozen. Thu is missed and follows Wed, but this week's freeze is used.
    const active = ["2026-11-09", "2026-11-11"];
    const frozen = ["2026-11-10"];
    expect(freezeCandidates(active, frozen, "2026-11-13")).toEqual([]);
    expect(canFreeze("2026-11-12", active, frozen, "2026-11-13")).toBe(false);
  });

  it("allows another freeze in a different week", () => {
    const active = ["2026-11-05", "2026-11-09"]; // Thu the 5th; Mon the 9th
    const frozen = ["2026-11-06"]; // week of the 2nd already used
    // The 7th and 8th are missed but belong to the used week; the 10th follows the active 9th in a fresh week.
    expect(freezeCandidates(active, frozen, TODAY)).toEqual(["2026-11-10"]);
  });

  it("only looks back FREEZE_WINDOW_DAYS days", () => {
    const old = "2026-10-20";
    expect(freezeCandidates([old], [], TODAY)).not.toContain("2026-10-21");
    expect(FREEZE_WINDOW_DAYS).toBe(7);
  });
});
