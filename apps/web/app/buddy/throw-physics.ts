// Throw physics for the Buddy: no gravity. A flick sends it sliding with friction toward the nearest screen edge, where it
// settles on a soft spring. It always ends flush with an edge, never in the middle. Pure functions; units are px and ms.

export interface Vec {
  x: number;
  y: number;
}
export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
export type Edge = "left" | "right" | "top" | "bottom";

/** Velocity decays as e^(-FRICTION * t). A flick of 2 px/ms slides about 2 / FRICTION = 400 px. */
export const FRICTION = 0.005;
/** Below this speed (px/ms) a release is a drop, not a throw: it snaps to the nearest edge of where it was let go. */
export const MIN_THROW_SPEED = 0.15;
/** How far the landing point may be from the release point (px), so a hard flick still ends within reach. */
const MAX_TRAVEL = 1400;

// Damped spring toward the edge target (angular frequency in rad/ms, damping ratio below 1 gives a slight bounce).
const OMEGA = 0.012;
const ZETA = 0.72;
const MAX_STEP_MS = 8;

const clampN = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function clampTo(p: Vec, b: Bounds): Vec {
  return { x: clampN(p.x, b.minX, b.maxX), y: clampN(p.y, b.minY, b.maxY) };
}

export function nearestEdge(p: Vec, b: Bounds): Edge {
  const q = clampTo(p, b);
  const d: [Edge, number][] = [
    ["left", q.x - b.minX],
    ["right", b.maxX - q.x],
    ["top", q.y - b.minY],
    ["bottom", b.maxY - q.y],
  ];
  d.sort((a, c) => a[1] - c[1]);
  return d[0][0];
}

/** Flush with the given edge (or the nearest one), keeping the other coordinate. */
export function snapToEdge(p: Vec, b: Bounds, edge: Edge = nearestEdge(p, b)): Vec {
  const q = clampTo(p, b);
  switch (edge) {
    case "left":
      return { x: b.minX, y: q.y };
    case "right":
      return { x: b.maxX, y: q.y };
    case "top":
      return { x: q.x, y: b.minY };
    default:
      return { x: q.x, y: b.maxY };
  }
}

/** Where a throw from `p` with velocity `v` (px/ms) would come to rest sliding, before snapping. */
export function landingPoint(p: Vec, v: Vec): Vec {
  let tx = v.x / FRICTION;
  let ty = v.y / FRICTION;
  const len = Math.hypot(tx, ty);
  if (len > MAX_TRAVEL) {
    tx = (tx / len) * MAX_TRAVEL;
    ty = (ty / len) * MAX_TRAVEL;
  }
  return { x: p.x + tx, y: p.y + ty };
}

/** The resting place after a release: a slow release snaps to the nearest edge; a flick goes to the edge it is headed for. */
export function throwTarget(p: Vec, v: Vec, b: Bounds): Vec {
  const speed = Math.hypot(v.x, v.y);
  if (speed < MIN_THROW_SPEED) return snapToEdge(p, b);
  // The edge is the one the flick runs into: take the unclamped landing point, then the nearest edge of the clamped one.
  const landing = landingPoint(p, v);
  const wallX = landing.x <= b.minX ? "left" : landing.x >= b.maxX ? "right" : null;
  const wallY = landing.y <= b.minY ? "top" : landing.y >= b.maxY ? "bottom" : null;
  let edge: Edge;
  if (wallX && wallY) {
    // A corner throw: pick the wall the flick hits first (the one it needs the smaller fraction of its travel to reach).
    const fx = Math.abs(v.x) > 1e-6 ? Math.abs((wallX === "left" ? b.minX : b.maxX) - p.x) / Math.abs(v.x) : Infinity;
    const fy = Math.abs(v.y) > 1e-6 ? Math.abs((wallY === "top" ? b.minY : b.maxY) - p.y) / Math.abs(v.y) : Infinity;
    edge = fx <= fy ? wallX : wallY;
  } else {
    edge = wallX ?? wallY ?? nearestEdge(clampTo(landing, b), b);
  }
  return snapToEdge(clampTo(landing, b), b, edge);
}

export interface Motion {
  pos: Vec;
  vel: Vec;
}

/** One animation frame of the damped spring toward `target` (dt in ms, sub-stepped so it stays stable on slow frames). */
export function springStep(m: Motion, target: Vec, dtMs: number): Motion {
  let { x, y } = m.pos;
  let { x: vx, y: vy } = m.vel;
  let left = Math.min(Math.max(dtMs, 0), 64);
  while (left > 0) {
    const h = Math.min(left, MAX_STEP_MS);
    left -= h;
    const ax = -OMEGA * OMEGA * (x - target.x) - 2 * ZETA * OMEGA * vx;
    const ay = -OMEGA * OMEGA * (y - target.y) - 2 * ZETA * OMEGA * vy;
    vx += ax * h;
    vy += ay * h;
    x += vx * h;
    y += vy * h;
  }
  return { pos: { x, y }, vel: { x: vx, y: vy } };
}

export function isSettled(m: Motion, target: Vec): boolean {
  return Math.hypot(m.pos.x - target.x, m.pos.y - target.y) < 0.5 && Math.hypot(m.vel.x, m.vel.y) < 0.02;
}

/** Release velocity (px/ms) from recent pointer samples; only the last `windowMs` count. */
export function releaseVelocity(samples: { t: number; x: number; y: number }[], windowMs = 90): Vec {
  if (samples.length < 2) return { x: 0, y: 0 };
  const end = samples[samples.length - 1];
  const recent = samples.filter((s) => end.t - s.t <= windowMs);
  const first = recent[0] ?? samples[0];
  const dt = end.t - first.t;
  if (dt < 8) return { x: 0, y: 0 };
  return { x: (end.x - first.x) / dt, y: (end.y - first.y) / dt };
}
