import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES Geometry and String Algorithms problems (problems-cses-geo-str.ts).
// Fixed random seeds, maximum allowed constraints, and stress shapes (collinear, periodic, extreme scales).

const { rng, between, ints, fill, range, letters, S } = H;

export const STRESS_CSES_GEO_STR: Record<string, StressCase[]> = {
  // ==========================================
  // Geometry
  // ==========================================
  "cses-point-location-test": [
    S("20000 random queries with coordinates up to 10^9", () => {
      const r = rng(7001);
      const queries = Array.from({ length: 20000 }, () => [
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
      ]);
      return [queries];
    }),
    S("20000 queries with collinear points (TOUCH)", () => {
      const r = rng(7002);
      const queries = Array.from({ length: 20000 }, () => {
        const x1 = between(r, -500000000, 500000000);
        const y1 = between(r, -500000000, 500000000);
        const dx = between(r, -1000, 1000) || 1;
        const dy = between(r, -1000, 1000) || 1;
        const x2 = x1 + dx;
        const y2 = y1 + dy;
        const t = between(r, -100, 100);
        const x3 = x1 + t * dx;
        const y3 = y1 + t * dy;
        return [x1, y1, x2, y2, x3, y3];
      });
      return [queries];
    }),
  ],

  "cses-line-segment-intersection": [
    S("20000 random segment pairs", () => {
      const r = rng(7011);
      const queries = Array.from({ length: 20000 }, () => [
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
        between(r, -1000000000, 1000000000),
      ]);
      return [queries];
    }),
    S("20000 collinear overlapping and non-overlapping segment pairs", () => {
      const r = rng(7012);
      const queries = Array.from({ length: 20000 }, () => {
        const x0 = between(r, -500000000, 500000000);
        const y0 = between(r, -500000000, 500000000);
        const dx = between(r, 1, 100);
        const dy = between(r, 1, 100);
        const t1 = between(r, 0, 50);
        const t2 = between(r, 51, 100);
        const t3 = between(r, 20, 70);
        const t4 = between(r, 71, 120);
        return [
          x0 + t1 * dx, y0 + t1 * dy,
          x0 + t2 * dx, y0 + t2 * dy,
          x0 + t3 * dx, y0 + t3 * dy,
          x0 + t4 * dx, y0 + t4 * dy,
        ];
      });
      return [queries];
    }),
  ],

  "cses-polygon-area": [
    S("1000-vertex circular convex polygon", () => {
      const n = 1000;
      const R = 500000000;
      const points: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        points.push([Math.round(R * Math.cos(angle)), Math.round(R * Math.sin(angle))]);
      }
      return [points];
    }),
    S("1000-vertex star-shaped polygon", () => {
      const n = 1000;
      const points: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const r = i % 2 === 0 ? 800000000 : 200000000;
        const angle = (2 * Math.PI * i) / n;
        points.push([Math.round(r * Math.cos(angle)), Math.round(r * Math.sin(angle))]);
      }
      return [points];
    }),
  ],

  "cses-point-in-polygon": [
    S("1000-vertex polygon with 1000 query points", () => {
      const n = 1000;
      const R = 400000000;
      const poly: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        poly.push([Math.round(R * Math.cos(angle)), Math.round(R * Math.sin(angle))]);
      }
      const r = rng(7031);
      const queryPoints = Array.from({ length: 1000 }, () => [
        between(r, -500000000, 500000000),
        between(r, -500000000, 500000000),
      ]);
      return [poly, queryPoints];
    }),
  ],

  "cses-polygon-lattice-points": [
    S("10000-vertex convex polygon", () => {
      const n = 10000;
      const R = 400000000;
      const poly: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        poly.push([Math.round(R * Math.cos(angle)), Math.round(R * Math.sin(angle))]);
      }
      return [poly];
    }),
    S("large rectangle with perimeter points", () => {
      return [[[0, 0], [1000000000, 0], [1000000000, 500000000], [0, 500000000]]];
    }),
  ],

  "cses-minimum-euclidean-distance": [
    S("100000 random points", () => {
      const r = rng(7051);
      const pts = Array.from({ length: 100000 }, () => [
        between(r, -500000000, 500000000),
        between(r, -500000000, 500000000),
      ]);
      return [pts];
    }),
    S("100000 points on vertical line with planted distance 1", () => {
      const pts: [number, number][] = range(100000).map((i) => [100, i * 10]);
      pts[50000][1] = pts[49999][1] + 1;
      return [pts];
    }),
  ],

  "cses-convex-hull": [
    S("100000 random points in a square", () => {
      const r = rng(7061);
      const pts = Array.from({ length: 100000 }, () => [
        between(r, -500000000, 500000000),
        between(r, -500000000, 500000000),
      ]);
      return [pts];
    }),
    S("100000 points with many collinear edge points", () => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 25000; i++) {
        pts.push([i, 0]);
        pts.push([25000, i]);
        pts.push([25000 - i, 25000]);
        pts.push([0, 25000 - i]);
      }
      return [pts];
    }),
  ],

  // ==========================================
  // Strings
  // ==========================================
  "cses-word-combinations": [
    S("5000 'a's with multiple word subsegments", () => {
      const s = "a".repeat(5000);
      const words = Array.from({ length: 50 }, (_, i) => "a".repeat(i + 1));
      return [s, words];
    }),
    S("5000 random characters with 2000 dictionary words", () => {
      const s = letters(5000, "abcdefghij", 7081);
      const words = Array.from({ length: 2000 }, (_, i) => letters(between(rng(7082 + i), 2, 8), "abcdefghij", 7082 + i));
      return [s, words];
    }),
  ],

  "cses-finding-borders": [
    S("1000000 'a's", () => ["a".repeat(1000000)]),
    S("1000000 periodic 'ab's", () => ["ab".repeat(500000)]),
    S("1000000 Fibonacci-like periodic string", () => ["abcde".repeat(200000)]),
  ],

  "cses-finding-periods": [
    S("1000000 'a's", () => ["a".repeat(1000000)]),
    S("1000000 characters with period 100", () => {
      const p = letters(100, "abcdefghijklmnopqrstuvwxyz", 7111);
      return [p.repeat(10000)];
    }),
    S("1000000 random characters (only period is n)", () => [
      letters(1000000, "abcdefghijklmnopqrstuvwxyz", 7112),
    ]),
  ],

  "cses-minimal-rotation": [
    S("1000000 'a's ending with 'b'", () => ["a".repeat(999999) + "b"]),
    S("1000000 alternating 'ab's", () => ["ab".repeat(500000)]),
    S("1000000 random characters", () => [letters(1000000, "abcdefghijklmnopqrstuvwxyz", 7121)]),
  ],

  "cses-longest-palindrome": [
    S("1000000 'a's", () => ["a".repeat(1000000)]),
    S("1000000 alternating 'ab's", () => ["ab".repeat(500000)]),
    S("large palindrome centered in 1000000 random characters", () => {
      const prefix = letters(250000, "abcdefghijklmnopqrstuvwxyz", 7131);
      const palHalf = letters(250000, "abcdefghijklmnopqrstuvwxyz", 7132);
      const pal = palHalf + palHalf.split("").reverse().join("");
      return [prefix + pal];
    }),
  ],

  "cses-required-substring": [
    S("n = 1000 with pattern of 100 'A's", () => [1000, "A".repeat(100)]),
    S("n = 1000 with periodic pattern 'ABACABA'", () => [1000, "ABACABA"]),
    S("n = 1000 with distinct pattern 'ABCDEFGHIJ'", () => [1000, "ABCDEFGHIJ"]),
  ],

  "cses-palindrome-queries": [
    S("100000 characters with 100000 mixed queries", () => {
      const s = letters(100000, "abcdefghijklmnopqrstuvwxyz", 7151);
      const r = rng(7152);
      const queries: string[][] = [];
      for (let i = 0; i < 100000; i++) {
        if (between(r, 0, 1) === 0) {
          const k = between(r, 1, 100000);
          const c = String.fromCharCode(97 + between(r, 0, 25));
          queries.push(["1", String(k), c]);
        } else {
          const a = between(r, 1, 100000);
          const b = between(r, a, Math.min(100000, a + 1000));
          queries.push(["2", String(a), String(b)]);
        }
      }
      return [s, queries];
    }),
    S("100000 'a's with range queries and point updates", () => {
      const s = "a".repeat(100000);
      const r = rng(7153);
      const queries: string[][] = [];
      for (let i = 0; i < 100000; i++) {
        if (i % 10 === 0) {
          const k = between(r, 1, 100000);
          queries.push(["1", String(k), "b"]);
        } else {
          const a = between(r, 1, 100000);
          const b = between(r, a, Math.min(100000, a + 500));
          queries.push(["2", String(a), String(b)]);
        }
      }
      return [s, queries];
    }),
  ],
};
