import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES range queries problems of round seven (problems-cses-range.ts).
// Fixed seeds, the maximum sizes the constraints allow, and the shapes that break slow or careless solutions.

const { rng, between, ints, fill, range, shuffled, S } = H;

const N = 200000;
const Q = 200000;

/** n random ranges [a, b] with a <= b */
const ranges = (n: number, len: number, seed: number): number[][] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const a = between(r, 1, len);
    const b = between(r, 1, len);
    return [Math.min(a, b), Math.max(a, b)];
  });
};

/** n random queries, each a point update [1, k, v] or a range query [2, a, b] */
const updateOrRange = (n: number, len: number, lo: number, hi: number, seed: number): number[][] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    if (r() < 0.5) return [1, between(r, 1, len), between(r, lo, hi)];
    const a = between(r, 1, len);
    const b = between(r, 1, len);
    return [2, Math.min(a, b), Math.max(a, b)];
  });
};

const grid = (n: number, density: number, seed: number): string[] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => Array.from({ length: n }, () => (r() < density ? "*" : ".")).join(""));
};

const rects = (n: number, side: number, seed: number): number[][] => {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const y1 = between(r, 1, side);
    const y2 = between(r, 1, side);
    const x1 = between(r, 1, side);
    const x2 = between(r, 1, side);
    return [Math.min(y1, y2), Math.min(x1, x2), Math.max(y1, y2), Math.max(x1, x2)];
  });
};

export const STRESS_CSES_RANGE: Record<string, StressCase[]> = {
  "cses-dynamic-range-minimum-queries": [
    S("200000 random values, random updates and queries", () => [ints(N, 1, 1000000000, 8101), updateOrRange(Q, N, 1, 1000000000, 8102)]),
    S("200000 rising values, alternating update and full-range query", () => [range(N, 1), Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, (i % N) + 1, 1000000000 - i] : [2, 1, N]))]),
    S("single element, 200000 updates and queries", () => [[5], Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, 1, i + 1] : [2, 1, 1]))]),
  ],
  "cses-range-xor-queries": [
    S("200000 random values, random ranges", () => [ints(N, 1, 1000000000, 8111), ranges(Q, N, 8112)]),
    S("200000 equal values, full-array queries", () => [fill(N, 1000000000), fill(Q, [1, N])]),
    S("200000 values, single-element queries", () => [ints(N, 1, 1000000000, 8113), range(Q, 1).map((i) => [i, i])]),
  ],
  "cses-range-update-queries": [
    S("200000 random values, full-range updates and point queries", () => [ints(N, 1, 1000000000, 8121), Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, 1, N, 1000000000] : [2, (i % N) + 1]))]),
    S("100000 full-range maximum updates then point queries", () => [fill(N, 1000000000), Array.from({ length: Q }, (_, i) => (i < 100000 ? [1, 1, N, 1000000000] : [2, N]))]),
    S("random range updates and point queries", () => {
      const r = rng(8122);
      return [
        ints(N, 1, 1000000000, 8123),
        Array.from({ length: Q }, () => {
          if (r() < 0.5) {
            const a = between(r, 1, N);
            const b = between(r, 1, N);
            return [1, Math.min(a, b), Math.max(a, b), between(r, 1, 1000000000)];
          }
          return [2, between(r, 1, N)];
        }),
      ];
    }),
  ],
  "cses-forest-queries": [
    S("1000 x 1000 random forest, 200000 random rectangles", () => [grid(1000, 0.5, 8131), rects(Q, 1000, 8132)]),
    S("1000 x 1000 full forest, whole-map queries", () => [grid(1000, 1, 8133), fill(Q, [1, 1, 1000, 1000])]),
    S("1000 x 1000 empty forest, single-square queries", () => [
      grid(1000, 0, 8134),
      range(Q).map((i) => {
        const y = (i % 1000) + 1;
        const x = (Math.floor(i / 1000) % 1000) + 1;
        return [y, x, y, x];
      }),
    ]),
  ],
  "cses-forest-queries-ii": [
    S("1000 x 1000 random forest, random flips and rectangles", () => {
      const r = rng(8142);
      return [
        grid(1000, 0.5, 8141),
        Array.from({ length: Q }, () => {
          if (r() < 0.5) return [1, between(r, 1, 1000), between(r, 1, 1000)];
          const y1 = between(r, 1, 1000);
          const y2 = between(r, 1, 1000);
          const x1 = between(r, 1, 1000);
          const x2 = between(r, 1, 1000);
          return [2, Math.min(y1, y2), Math.min(x1, x2), Math.max(y1, y2), Math.max(x1, x2)];
        }),
      ];
    }),
    S("1000 x 1000 full forest, whole-map queries", () => [grid(1000, 1, 8143), fill(Q, [2, 1, 1, 1000, 1000])]),
    S("1000 x 1000, flipping the corner square and counting everything", () => [grid(1000, 0.3, 8144), Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, 1000, 1000] : [2, 1, 1, 1000, 1000]))]),
  ],
  "cses-hotel-queries": [
    S("200000 random hotels, 200000 random groups", () => [ints(N, 1, 1000000000, 8151), ints(Q, 1, 1000000000, 8152)]),
    S("200000 hotels of 10^9 rooms, groups of 10^9", () => [fill(N, 1000000000), fill(Q, 1000000000)]),
    S("200000 hotels of one room, groups of one", () => [fill(N, 1), fill(Q, 1)]),
    S("small hotels, groups that never fit", () => [ints(N, 1, 1000, 8153), fill(Q, 1000000000)]),
  ],
  "cses-list-removals": [
    S("200000 values, always remove the first", () => [ints(N, 1, 1000000000, 8161), fill(N, 1)]),
    S("200000 values, always remove the last", () => [ints(N, 1, 1000000000, 8162), range(N).map((i) => N - i)]),
    S("200000 values, random valid positions", () => {
      const r = rng(8163);
      return [ints(N, 1, 1000000000, 8164), range(N).map((i) => between(r, 1, N - i))];
    }),
    S("200000 values, always remove the middle", () => [ints(N, 1, 1000000000, 8165), range(N).map((i) => Math.floor((N - i + 1) / 2))]),
  ],
  "cses-salary-queries": [
    S("200000 random salaries, random updates and ranges", () => {
      const r = rng(8172);
      return [
        ints(N, 1, 1000000000, 8171),
        Array.from({ length: Q }, () => {
          if (r() < 0.5) return [1, between(r, 1, N), between(r, 1, 1000000000)];
          const a = between(r, 1, 1000000000);
          const b = between(r, 1, 1000000000);
          return [2, Math.min(a, b), Math.max(a, b)];
        }),
      ];
    }),
    S("200000 equal salaries, queries over the whole range", () => [fill(N, 1000000000), Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, (i % N) + 1, 1] : [2, 1, 1000000000]))]),
    S("200000 distinct salaries, updates all hit one employee", () => [range(N, 1), Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, 1, 1000000000 - i] : [2, 1, N]))]),
  ],
  "cses-prefix-sum-queries": [
    S("200000 random values of either sign, random updates and queries", () => [ints(N, -1000000000, 1000000000, 8181), updateOrRange(Q, N, -1000000000, 1000000000, 8182)]),
    S("200000 values of 10^9, full-range queries", () => [fill(N, 1000000000), Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, (i % N) + 1, 1000000000] : [2, 1, N]))]),
    S("200000 values of -10^9, full-range queries", () => [fill(N, -1000000000), Array.from({ length: Q }, (_, i) => (i % 2 === 0 ? [1, (i % N) + 1, -1000000000] : [2, 1, N]))]),
  ],
  "cses-subarray-sum-queries": [
    S("200000 random values of either sign, random updates", () => {
      const r = rng(8192);
      return [ints(N, -1000000000, 1000000000, 8191), Array.from({ length: Q }, () => [between(r, 1, N), between(r, -1000000000, 1000000000)])];
    }),
    S("200000 values of 10^9, updates at the ends", () => [fill(N, 1000000000), Array.from({ length: Q }, (_, i) => [i % 2 === 0 ? 1 : N, i % 4 < 2 ? -1000000000 : 1000000000])]),
    S("200000 negative values, one position updated over and over", () => [fill(N, -5), Array.from({ length: Q }, (_, i) => [100000, i % 2 === 0 ? 7 : -7])]),
  ],
  "cses-pizzeria-queries": [
    S("200000 random prices, random updates and queries", () => {
      const r = rng(8202);
      return [ints(N, 1, 1000000000, 8201), Array.from({ length: Q }, () => (r() < 0.5 ? [1, between(r, 1, N), between(r, 1, 1000000000)] : [2, between(r, 1, N)]))];
    }),
    S("200000 prices of 10^9, queries at the ends", () => [fill(N, 1000000000), Array.from({ length: Q }, (_, i) => (i % 3 === 0 ? [1, (i % N) + 1, 1000000000] : [2, i % 3 === 1 ? 1 : N]))]),
    S("200000 falling prices, queries everywhere", () => [range(N).map((i) => 1000000000 - i), Array.from({ length: Q }, (_, i) => [2, (i % N) + 1])]),
  ],
  "cses-range-queries-and-copies": [
    S("200000 values, a third each of update, sum and copy", () => {
      const r = rng(8212);
      let count = 1;
      return [
        ints(N, 1, 1000000000, 8211),
        Array.from({ length: Q }, () => {
          const t = between(r, 1, 3);
          const k = between(r, 1, count);
          if (t === 1) return [1, k, between(r, 1, N), between(r, 1, 1000000000)];
          if (t === 2) {
            const a = between(r, 1, N);
            const b = between(r, 1, N);
            return [2, k, Math.min(a, b), Math.max(a, b)];
          }
          count++;
          return [3, k];
        }),
      ];
    }),
    S("a chain of copies, each updated then summed", () => {
      const r = rng(8213);
      return [
        ints(N, 1, 1000000000, 8214),
        Array.from({ length: Q }, (_, i) => {
          const newest = Math.floor(i / 4) + 1;
          if (i % 4 === 0) return [3, newest];
          if (i % 4 === 1) return [1, newest + 1, between(r, 1, N), between(r, 1, 1000000000)];
          if (i % 4 === 2) return [2, newest + 1, 1, N];
          return [2, 1, 1, N];
        }),
      ];
    }),
    S("100000 updates then full sums of array 1", () => [ints(N, 1, 1000000000, 8215), Array.from({ length: Q }, (_, i) => (i < 100000 ? [1, 1, (i % N) + 1, 1000000000] : [2, 1, 1, N]))]),
  ],
  "cses-missing-coin-sum-queries": [
    S("200000 coins 2^0 to 2^29 at random, random ranges", () => [ints(N, 0, 29, 8221).map((e) => 2 ** e), ranges(Q, N, 8222)], 3000),
    S("200000 random coins up to 10^9, random ranges", () => [ints(N, 1, 1000000000, 8228), ranges(Q, N, 8222)]),
    S("200000 powers of two, long doubling chains", () => [shuffled(range(N).map((i) => 2 ** (i % 30)), 8223), ranges(Q, N, 8224)], 4000),
    S("200000 ones, every range", () => [fill(N, 1), ranges(Q, N, 8225)]),
    S("200000 small coins, full-array queries", () => [ints(N, 1, 10, 8226), fill(Q, [1, N])]),
    S("200000 coins of 10^9, no coin 1", () => [fill(N, 1000000000), ranges(Q, N, 8227)]),
  ],
  "cses-distinct-values-queries": [
    S("200000 random values from a large range, random ranges", () => [ints(N, 1, 1000000000, 8231), ranges(Q, N, 8232)]),
    S("200000 values from a small range, random ranges", () => [ints(N, 1, 50, 8233), ranges(Q, N, 8234)]),
    S("200000 distinct values, full-array queries", () => [shuffled(range(N, 1), 8235), fill(Q, [1, N])]),
    S("200000 equal values, random ranges", () => [fill(N, 1000000000), ranges(Q, N, 8236)]),
  ],
  "cses-movie-festival-queries": [
    S("100000 random movies, random windows", () => {
      const r = rng(8241);
      const n = 100000;
      const q = 100000;
      return [
        Array.from({ length: n }, () => {
          const s = between(r, 1, 999990000);
          return [s, s + between(r, 1, 10000)];
        }),
        Array.from({ length: q }, () => {
          const a = between(r, 1, 989000000);
          return [a, a + between(r, 1, 10000000)];
        }),
      ];
    }, 3000),
    S("100000 back-to-back unit movies, full window", () => {
      const n = 100000;
      const q = 100000;
      return [range(n, 1).map((i) => [i, i + 1]), fill(q, [1, n + 1])];
    }),
    S("100000 identical movies", () => {
      const n = 100000;
      const q = 100000;
      return [fill(n, [1, 1000000000]), Array.from({ length: q }, (_, i) => (i % 2 === 0 ? [1, 1000000000] : [2, 999999999]))];
    }),
    S("100000 movies of random length, wide windows", () => {
      const r = rng(8242);
      const n = 100000;
      const q = 100000;
      return [
        Array.from({ length: n }, () => {
          const s = between(r, 1, 900000000);
          return [s, s + between(r, 1, 100000000)];
        }),
        Array.from({ length: q }, () => {
          const a = between(r, 1, 100000000);
          return [a, a + between(r, 800000000, 899999999)];
        }),
      ];
    }, 3000),
  ],
};
