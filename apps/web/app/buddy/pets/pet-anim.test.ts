import { describe, expect, it } from "vitest";
import { frameDelayMs, rowForMood } from "./pet-anim";

describe("pet animation rows", () => {
  it("maps moods to rows", () => {
    expect(rowForMood("idle")).toBe("idle");
    expect(rowForMood("thinking")).toBe("review");
    expect(rowForMood("sleeping")).toBe("waiting");
    expect(rowForMood("excited")).toBe("jumping");
  });
  it("speaking waves and dragging runs, dragging winning", () => {
    expect(rowForMood("idle", { speaking: true })).toBe("waving");
    expect(rowForMood("idle", { dragging: "left" })).toBe("running-left");
    expect(rowForMood("sleeping", { dragging: "right", speaking: true })).toBe("running-right");
    expect(rowForMood("idle", { dragging: null })).toBe("idle");
  });
  it("gives every row a delay", () => {
    expect(frameDelayMs("idle")).toBe(180);
    expect(frameDelayMs("running-left")).toBe(90);
    expect(frameDelayMs("jumping")).toBe(110);
    expect(frameDelayMs("failed")).toBe(140);
  });
});
