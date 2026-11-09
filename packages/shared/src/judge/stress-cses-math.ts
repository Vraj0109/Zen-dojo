import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES Mathematics problems (problems-cses-math.ts).
// Fixed seeds, maximum allowed constraints, and stress shapes (extremes, boundaries, all identical, prime powers).

const { ints, fill, range, letters, S } = H;

export const STRESS_CSES_MATH: Record<string, StressCase[]> = {
  "cses-josephus-queries": [
    S("100000 queries with n = 10^9 and various k", () => [
      Array.from({ length: 100000 }, (_, i) => [1000000000, i + 1])
    ]),
    S("100000 queries with k = 1 or k = n", () => [
      Array.from({ length: 100000 }, (_, i) => [1000000000 - i, i % 2 === 0 ? 1 : 1000000000 - i])
    ]),
    S("100000 queries near upper bound with random-like k", () => [
      Array.from({ length: 100000 }, (_, i) => [1000000000, (i * 99991) % 1000000000 + 1])
    ])
  ],

  "cses-exponentiation-ii": [
    S("100000 queries with large a, b, c", () => [
      Array.from({ length: 100000 }, (_, i) => [
        1000000000 - (i % 100),
        1000000000 - (i % 50),
        1000000000 - (i % 25)
      ])
    ]),
    S("100000 queries with zero exponents", () => [
      Array.from({ length: 100000 }, (_, i) => [i + 2, 0, 0])
    ]),
    S("100000 queries with c = 1", () => [
      Array.from({ length: 100000 }, (_, i) => [(i % 1000) + 1, (i % 1000) + 1, 1])
    ])
  ],

  "cses-sum-of-divisors": [
    S("n = 1000000000000 (maximum n = 10^12)", () => [1000000000000]),
    S("n = 999999999999", () => [999999999999]),
    S("n = 500000000000", () => [500000000000]),
    S("n = 1000000007", () => [1000000007])
  ],

  "cses-prime-multiples": [
    S("n = 10^18 with 20 primes", () => [
      1000000000000000000,
      [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71]
    ]),
    S("n = 10^18 with 20 large primes near 10^9", () => [
      1000000000000000000,
      [
        999999937, 999999929, 999999893, 999999883, 999999797,
        999999761, 999999757, 999999751, 999999739, 999999733,
        999999721, 999999709, 999999677, 999999667, 999999613,
        999999607, 999999599, 999999587, 999999541, 999999527
      ]
    ]),
    S("n = 10^18 with single prime 2", () => [
      1000000000000000000,
      [2]
    ])
  ],

  "cses-counting-coprime-pairs": [
    S("100000 random values up to 1000000", () => [ints(100000, 1, 1000000, 3103)]),
    S("100000 values all equal to 1 (all pairs coprime)", () => [fill(100000, 1)]),
    S("100000 even numbers (no pairs coprime)", () => [
      Array.from({ length: 100000 }, (_, i) => 2 * ((i % 500000) + 1))
    ])
  ],

  "cses-creating-strings-ii": [
    S("1000000 random lowercase letters", () => [letters(1000000, "abcdefghijklmnopqrstuvwxyz", 3104)]),
    S("1000000 of the same letter 'a'", () => ["a".repeat(1000000)]),
    S("1000000 alternating 'a' and 'b'", () => ["ab".repeat(500000)])
  ],

  "cses-distributing-apples": [
    S("n = 1000000, m = 1000000", () => [1000000, 1000000]),
    S("n = 1000000, m = 1", () => [1000000, 1]),
    S("n = 1, m = 1000000", () => [1, 1000000]),
    S("n = 500000, m = 500000", () => [500000, 500000])
  ],

  "cses-christmas-party": [
    S("n = 1000000", () => [1000000]),
    S("n = 999999", () => [999999]),
    S("n = 500000", () => [500000])
  ],

  "cses-bracket-sequences-i": [
    S("n = 1000000", () => [1000000]),
    S("n = 999999 (odd length, 0 sequences)", () => [999999]),
    S("n = 999998", () => [999998])
  ],

  "cses-counting-necklaces": [
    S("n = 1000000, m = 1000000", () => [1000000, 1000000]),
    S("n = 999999, m = 1000000", () => [999999, 1000000]),
    S("n = 1000000, m = 1", () => [1000000, 1])
  ],

  "cses-nim-game-i": [
    S("200000 random heap sizes up to 10^9", () => [ints(200000, 1, 1000000000, 3105)]),
    S("200000 heaps of size 1", () => [fill(200000, 1)]),
    S("200000 paired heaps with XOR sum = 0", () => {
      const base = ints(100000, 1, 1000000000, 3106);
      const paired: number[] = [];
      for (const x of base) {
        paired.push(x, x);
      }
      return [paired];
    })
  ]
};
