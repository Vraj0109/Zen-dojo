import { describe, expect, it } from "vitest";
import {
  PROBLEM_MICRO_STEPS,
  getCompassionateReEntry,
  getMidSessionNudge,
  getPacingConfig,
  getPostSessionCelebration,
  getStartCheckIn,
} from "./buddy";

describe("buddy check-in dialogue", () => {
  it("generates start check-ins according to tone", () => {
    const calm = getStartCheckIn("calm", "Master Wu");
    expect(calm).toContain("Master Wu:");
    expect(calm.toLowerCase()).toContain("breath");

    const peer = getStartCheckIn("peer");
    expect(peer).toContain("Buddy:");
    expect(peer).toContain("1 main goal");

    const coach = getStartCheckIn("coach", "Coach Taylor");
    expect(coach).toContain("Coach Taylor:");
    expect(coach).toContain("lock in");
  });

  it("generates mid-session micro-nudges", () => {
    expect(getMidSessionNudge("calm")).toContain("unclench your jaw");
    expect(getMidSessionNudge("peer")).toContain("Halfway through");
    expect(getMidSessionNudge("coach")).toContain("Keep moving forward");
  });

  it("generates post-session celebrations whether goal achieved or not", () => {
    // When achieved
    const calmWin = getPostSessionCelebration("calm", true);
    expect(calmWin).toContain("Wonderful focus");

    const peerWin = getPostSessionCelebration("peer", true);
    expect(peerWin).toContain("crushed that sprint goal");

    // When not achieved - still positive and shame-free
    const calmStruggle = getPostSessionCelebration("calm", false);
    expect(calmStruggle).toContain("strengthens your intuition");

    const peerStruggle = getPostSessionCelebration("peer", false);
    expect(peerStruggle).toContain("takes grit");

    const coachStruggle = getPostSessionCelebration("coach", false);
    expect(coachStruggle).toContain("valuable progress");
  });
});

describe("compassionate re-entry", () => {
  it("welcomes back quickly for daily learners", () => {
    expect(getCompassionateReEntry(1, "calm")).toContain("Ready when you are");
    expect(getCompassionateReEntry(0, "peer")).toContain("Great to see you again today");
  });

  it("provides shame-free, compassionate copy after long breaks", () => {
    const calm = getCompassionateReEntry(14, "calm");
    expect(calm).toContain("Pauses are a natural part of learning");
    expect(calm).toContain("no pressure");

    const peer = getCompassionateReEntry(30, "peer");
    expect(peer).toContain("Life gets busy, no sweat at all");

    const coach = getCompassionateReEntry(7, "coach");
    expect(coach).toContain("Rest is necessary recovery");

    // Ensure non-punitive guarantee
    for (const text of [calm, peer, coach]) {
      expect(text.toLowerCase()).not.toContain("streak lost");
      expect(text.toLowerCase()).not.toContain("failed");
      expect(text.toLowerCase()).not.toContain("broken streak");
      expect(text.toLowerCase()).not.toContain("lazy");
      expect(text.toLowerCase()).not.toContain("shame");
    }
  });
});

describe("micro-steps definition", () => {
  it("provides 5 sequential deconstruction stages", () => {
    expect(PROBLEM_MICRO_STEPS).toHaveLength(5);
    expect(PROBLEM_MICRO_STEPS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
    expect(PROBLEM_MICRO_STEPS[0].title).toContain("Restate");
    expect(PROBLEM_MICRO_STEPS[1].title).toContain("Inputs & bounds");
    expect(PROBLEM_MICRO_STEPS[2].title).toContain("Brute force");
    expect(PROBLEM_MICRO_STEPS[3].title).toContain("bottleneck");
    expect(PROBLEM_MICRO_STEPS[4].title).toContain("pattern");
  });
});

describe("pacing config", () => {
  it("configures gentle pacing with countup and soft nudges", () => {
    const gentle = getPacingConfig("gentle");
    expect(gentle.workMinutes).toBe(20);
    expect(gentle.style).toBe("countup");
    expect(gentle.softNudge).toBe(true);

    const standard = getPacingConfig("standard");
    expect(standard.workMinutes).toBe(25);
    expect(standard.style).toBe("countdown");
    expect(standard.softNudge).toBe(false);
  });
});
