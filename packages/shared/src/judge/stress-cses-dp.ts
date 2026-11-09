import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES Dynamic Programming problems (problems-cses-dp.ts).
// Fixed seeds, maximum allowed constraints, and stress shapes (all identical, extremes, worst-case transitions).

const { ints, fill, range, letters, S } = H;

export const STRESS_CSES_DP: Record<string, StressCase[]> = {
  "cses-dice-combinations": [
    S("n = 1000000 (maximum n)", () => [1000000]),
    S("n = 999999", () => [999999]),
    S("n = 500000", () => [500000]),
  ],
  "cses-minimizing-coins": [
    S("100 random coins, target = 1000000", () => [ints(100, 1, 1000, 2101), 1000000]),
    S("only even coins, target = 999999 (impossible)", () => [[2, 4, 6, 8, 10, 12, 14, 16], 999999]),
    S("100 consecutive coins 1..100, target = 1000000", () => [range(100, 1), 1000000]),
    S("single large coin, target = 1000000", () => [[1000000], 1000000]),
  ],
  "cses-coin-combinations-i": [
    S("100 random coins, target = 1000000", () => [ints(100, 1, 1000, 2102), 1000000]),
    S("coins [1, 2, 3, 4, 5], target = 1000000", () => [[1, 2, 3, 4, 5], 1000000]),
    S("coins [2, 4, 6], target = 999999 (impossible)", () => [[2, 4, 6], 999999]),
  ],
  "cses-coin-combinations-ii": [
    S("100 random coins, target = 1000000", () => [ints(100, 1, 1000, 2103), 1000000]),
    S("coins [1, 2, 3, 4, 5], target = 1000000", () => [[1, 2, 3, 4, 5], 1000000]),
    S("coins [2, 4, 6, 8], target = 999999 (impossible)", () => [[2, 4, 6, 8], 999999]),
  ],
  "cses-removing-digits": [
    S("n = 1000000", () => [1000000]),
    S("n = 999999", () => [999999]),
    S("n = 876543", () => [876543]),
    S("n = 700005", () => [700005]),
  ],
  "cses-grid-paths-i": [
    S("1000 by 1000 all open grid", () => [fill(1000, ".".repeat(1000))]),
    S("1000 by 1000 with scattered traps", () => [
      Array.from({ length: 1000 }, (_, i) => letters(1000, "..........*", 2104 + i)),
    ]),
    S("1000 by 1000 blocked near end", () => {
      const g = fill(1000, ".".repeat(1000));
      g[999] = ".".repeat(998) + "*.";
      return [g];
    }),
  ],
  "cses-book-shop": [
    S("1000 books, maxPrice = 100000, random prices and pages", () => [
      ints(1000, 1, 1000, 2105),
      ints(1000, 1, 1000, 2106),
      100000,
    ]),
    S("1000 identical books (price 100, pages 100), maxPrice = 50000", () => [
      fill(1000, 100),
      fill(1000, 100),
      50000,
    ]),
    S("1000 cheap books (price 1..1000), maxPrice = 100000", () => [
      range(1000, 1),
      ints(1000, 1, 1000, 2107),
      100000,
    ]),
  ],
  "cses-array-description": [
    S("100000 zeros, m = 100", () => [fill(100000, 0), 100]),
    S("100000 elements alternating zero and fixed, m = 100", () => [
      Array.from({ length: 100000 }, (_, i) => (i % 2 === 0 ? 50 : 0)),
      100,
    ]),
    S("100000 zeros, m = 2", () => [fill(100000, 0), 2]),
  ],
  "cses-edit-distance": [
    S("5000 random uppercase letters against 5000 random uppercase letters", () => [
      letters(5000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2108),
      letters(5000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2109),
    ]),
    S("5000 times A against 5000 times B", () => ["A".repeat(5000), "B".repeat(5000)]),
    S("5000 identical characters", () => ["Z".repeat(5000), "Z".repeat(5000)]),
  ],
  "cses-rectangle-cutting": [
    S("500 by 500 (square, 0 cuts)", () => [500, 500]),
    S("500 by 499 (worst case aspect ratio)", () => [500, 499]),
    S("500 by 1 (strip, 499 cuts)", () => [500, 1]),
    S("450 by 420", () => [450, 420]),
  ],
  "cses-money-sums": [
    S("100 coins of value 1000 (sum 100000)", () => [fill(100, 1000)]),
    S("100 random coins up to 1000", () => [ints(100, 1, 1000, 2110)]),
    S("100 coins 1..100", () => [range(100, 1)]),
  ],
  "cses-removal-game": [
    S("5000 random values up to 10^9", () => [ints(5000, -1000000000, 1000000000, 2111)]),
    S("5000 equal values of 10^9", () => [fill(5000, 1000000000)]),
    S("5000 alternating values: 10^9, 1, 10^9, 1...", () => [
      Array.from({ length: 5000 }, (_, i) => (i % 2 === 0 ? 1000000000 : 1)),
    ]),
  ],
  "cses-two-sets-ii": [
    S("n = 500 (maximum n, total sum 125250 is even)", () => [500]),
    S("n = 499 (total sum 124750 is even)", () => [499]),
    S("n = 498 (total sum is odd, returns 0)", () => [498]),
    S("n = 450", () => [450]),
  ],
};
