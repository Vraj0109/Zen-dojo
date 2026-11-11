import { describe, expect, it } from "vitest";
import { type Bounds, isSettled, landingPoint, nearestEdge, releaseVelocity, snapToEdge, springStep, throwTarget } from "./throw-physics";

const B: Bounds = { minX: 16, maxX: 936, minY: 16, maxY: 680 };

describe("buddy throw physics", () => {
  it("finds the nearest edge and snaps flush to it", () => {
    expect(nearestEdge({ x: 100, y: 300 }, B)).toBe("left");
    expect(snapToEdge({ x: 100, y: 300 }, B)).toEqual({ x: 16, y: 300 });
    expect(snapToEdge({ x: 800, y: 300 }, B)).toEqual({ x: 936, y: 300 });
    expect(snapToEdge({ x: 500, y: 40 }, B)).toEqual({ x: 500, y: 16 });
    expect(snapToEdge({ x: 500, y: 660 }, B)).toEqual({ x: 500, y: 680 });
  });

  it("a slow release is a drop: nearest edge of where it was let go", () => {
    expect(throwTarget({ x: 60, y: 300 }, { x: 0.05, y: 0 }, B)).toEqual({ x: 16, y: 300 });
  });

  it("a flick goes to the edge it is headed for, even from the middle", () => {
    const t = throwTarget({ x: 400, y: 300 }, { x: 2, y: 0 }, B);
    expect(t.x).toBe(936);
    const up = throwTarget({ x: 400, y: 300 }, { x: 0, y: -2.5 }, B);
    expect(up.y).toBe(16);
  });

  it("every result lies on an edge, never in the middle", () => {
    for (const v of [
      { x: 0.4, y: 0.1 },
      { x: -0.9, y: 1.2 },
      { x: 3, y: -3 },
      { x: 0, y: 0 },
    ]) {
      const t = throwTarget({ x: 480, y: 340 }, v, B);
      const onEdge = t.x === B.minX || t.x === B.maxX || t.y === B.minY || t.y === B.maxY;
      expect(onEdge, JSON.stringify(v)).toBe(true);
      expect(t.x).toBeGreaterThanOrEqual(B.minX);
      expect(t.x).toBeLessThanOrEqual(B.maxX);
    }
  });

  it("a harder flick lands farther", () => {
    const a = landingPoint({ x: 0, y: 0 }, { x: 1, y: 0 }).x;
    const b = landingPoint({ x: 0, y: 0 }, { x: 2, y: 0 }).x;
    expect(b).toBeGreaterThan(a);
  });

  it("the spring settles on the target", () => {
    const target = { x: 936, y: 300 };
    let m = { pos: { x: 400, y: 300 }, vel: { x: 2, y: 0 } };
    let frames = 0;
    while (!isSettled(m, target) && frames < 600) {
      m = springStep(m, target, 16);
      frames++;
    }
    expect(isSettled(m, target)).toBe(true);
    expect(frames).toBeLessThan(600);
  });

  it("measures release velocity from the last samples only", () => {
    const s = [
      { t: 0, x: 0, y: 0 },
      { t: 200, x: 10, y: 0 },
      { t: 240, x: 50, y: 0 },
      { t: 280, x: 130, y: 0 },
    ];
    const v = releaseVelocity(s);
    expect(v.x).toBeCloseTo(1.5, 1);
    expect(releaseVelocity([{ t: 0, x: 0, y: 0 }])).toEqual({ x: 0, y: 0 });
  });
});
