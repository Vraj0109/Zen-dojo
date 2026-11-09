import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for batch 9 (problems-leetcode-9.ts):
// backtracking, dynamic programming, monotonic stack, intervals, graphs and advanced structures.
// Fixed seeds, biggest allowed sizes, and shapes that break slow or careless solutions.

const { ints, fill, range, shuffled, letters, chain, S, rng, between } = H;

const grid = <T>(r: number, c: number, f: (i: number, j: number) => T) =>
  Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));

/** Creates a 100x100 grid with two isolated islands in opposite corners */
function twoIslandsGrid(n: number): number[][] {
  const g = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  // Island 1 in top-left
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) g[r][c] = 1;
  }
  // Island 2 in bottom-right
  for (let r = n - 3; r < n; r++) {
    for (let c = n - 3; c < n; c++) g[r][c] = 1;
  }
  return g;
}

/** Generates random intervals [start, end] with 0 <= start < end <= maxVal */
function randomIntervals(n: number, maxVal: number, maxLen: number, seed: number): number[][] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const s = between(r, 0, maxVal - maxLen);
    const len = between(r, 1, maxLen);
    return [s, s + len];
  });
}

/** Generates a consistent alien dictionary from a fixed random alphabet permutation */
function alienWords(wordCount: number, maxWordLen: number, seed: number): string[] {
  const r = rng(seed);
  const alpha = shuffled("abcdefghijklmnopqrstuvwxyz".split(""), seed);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const len = between(r, 2, maxWordLen);
    let w = "";
    for (let k = 0; k < len; k++) {
      w += alpha[between(r, 0, 15)];
    }
    words.push(w);
  }
  words.sort((w1, w2) => {
    const minLen = Math.min(w1.length, w2.length);
    for (let k = 0; k < minLen; k++) {
      const idx1 = alpha.indexOf(w1[k]);
      const idx2 = alpha.indexOf(w2[k]);
      if (idx1 !== idx2) return idx1 - idx2;
    }
    return w1.length - w2.length;
  });
  return words;
}

/** Generates random tree parent array */
function randomTreeParent(n: number, seed: number): number[] {
  const r = rng(seed);
  const parent = Array.from({ length: n }, () => -1);
  for (let i = 1; i < n; i++) {
    parent[i] = between(r, 0, i - 1);
  }
  return parent;
}

export const STRESS_9: Record<string, StressCase[]> = {
  // 1. lc-37: Sudoku Solver
  "lc-37": [
    S("hard 9x9 sudoku with 17 clues", () => [
      [
        [".", ".", ".", ".", ".", ".", ".", "1", "2"],
        [".", ".", ".", ".", ".", ".", ".", ".", "3"],
        [".", ".", "2", "3", ".", ".", "4", ".", "."],
        [".", ".", "1", "8", ".", ".", ".", ".", "5"],
        [".", "6", ".", ".", "7", ".", "8", ".", "."],
        [".", ".", ".", ".", ".", "9", ".", ".", "."],
        [".", ".", "8", "5", ".", ".", ".", ".", "."],
        ["9", ".", ".", ".", "4", ".", "5", ".", "."],
        ["4", "7", ".", ".", ".", "6", ".", ".", "."],
      ],
    ]),
    S("sparse 9x9 sudoku puzzle", () => [
      [
        ["8", ".", ".", ".", ".", ".", ".", ".", "."],
        [".", ".", "3", "6", ".", ".", ".", ".", "."],
        [".", "7", ".", ".", "9", ".", "2", ".", "."],
        [".", "5", ".", ".", ".", "7", ".", ".", "."],
        [".", ".", ".", ".", "4", "5", "7", ".", "."],
        [".", ".", ".", "1", ".", ".", ".", "3", "."],
        [".", ".", "1", ".", ".", ".", ".", "6", "8"],
        [".", ".", "8", "5", ".", ".", ".", "1", "."],
        [".", "9", ".", ".", ".", ".", "4", ".", "."],
      ],
    ]),
  ],

  // 2. lc-212: Word Search II
  "lc-212": [
    S("12x12 board with 200 dictionary words", () => {
      const b = grid(12, 12, (i, j) => letters(1, "abcdef", 901 + i * 12 + j));
      const words = Array.from({ length: 200 }, (_, k) => letters(between(rng(1900 + k), 3, 6), "abcdef", 2000 + k));
      return [b, words];
    }),
    S("12x12 uniform board of letter a with prefix words", () => {
      const b = grid(12, 12, () => "a");
      const words = Array.from({ length: 10 }, (_, k) => "a".repeat(k + 1));
      return [b, words];
    }),
  ],

  // 3. lc-934: Shortest Bridge
  "lc-934": [
    S("100x100 grid with islands in opposite corners", () => [twoIslandsGrid(100)]),
    S("60x60 grid with two islands separated by wide water", () => [twoIslandsGrid(60)]),
  ],

  // 4. lc-1434: Number of Ways to Wear Different Hats to Each Other
  "lc-1434": [
    S("10 people each liking 25 distinct hats", () => {
      const r = rng(1434);
      const hats = Array.from({ length: 10 }, () => {
        const pool = shuffled(range(40, 1), between(r, 1, 1000));
        return pool.slice(0, 25);
      });
      return [hats];
    }),
    S("10 people each liking all 40 hats", () => [
      Array.from({ length: 10 }, () => range(40, 1)),
    ]),
  ],

  // 5. lc-1755: Closest Subsequence Sum
  "lc-1755": [
    S("34 random integers with positive goal", () => [
      ints(34, -1000000, 1000000, 1755),
      5000000,
    ]),
    S("36 random integers with zero goal", () => [
      ints(36, -500000, 500000, 1756),
      0,
    ]),
  ],

  // 6. lc-2035: Partition Array Into Two Arrays to Minimize Sum Difference
  "lc-2035": [
    S("30 random integers partition", () => [
      ints(30, -1000000, 1000000, 2035),
    ]),
    S("28 balanced integers partition", () => [
      ints(28, -50000, 50000, 2036),
    ]),
  ],

  // 7. lc-301: Remove Invalid Parentheses
  "lc-301": [
    S("22 parentheses with alternating patterns", () => [
      "()())())(()())(())()(",
    ]),
    S("20 parentheses with deep nesting and extra closes", () => [
      "((((()()()())))))(",
    ]),
  ],

  // 8. lc-253: Meeting Rooms II
  "lc-253": [
    S("10000 random meeting intervals", () => [
      randomIntervals(10000, 1000000, 50000, 253),
    ]),
    S("5000 overlapping meeting intervals", () => [
      randomIntervals(5000, 100000, 80000, 254),
    ]),
  ],

  // 9. lc-759: Employee Free Time
  "lc-759": [
    S("10000 random work intervals", () => [
      randomIntervals(10000, 10000000, 50000, 759),
    ]),
    S("5000 dense work intervals with occasional gaps", () => [
      randomIntervals(5000, 1000000, 2000, 760),
    ]),
  ],

  // 10. lc-269: Alien Dictionary
  "lc-269": [
    S("100 sorted alien words from random alphabet", () => [
      alienWords(100, 8, 269),
    ]),
    S("50 short alien words", () => [
      alienWords(50, 4, 270),
    ]),
  ],

  // 11. lc-305: Number of Islands II
  "lc-305": [
    S("5000 land additions in 500x500 grid", () => {
      const r = rng(305);
      const pos = Array.from({ length: 5000 }, () => [between(r, 0, 499), between(r, 0, 499)]);
      return [500, 500, pos];
    }),
    S("3000 land additions with duplicate points", () => {
      const r = rng(306);
      const pos = Array.from({ length: 3000 }, () => [between(r, 0, 100), between(r, 0, 100)]);
      return [200, 200, pos];
    }),
  ],

  // 12. lc-1168: Optimize Water Distribution in a Village
  "lc-1168": [
    S("5000 houses with 10000 pipes", () => {
      const wells = ints(5000, 1, 100000, 1168);
      const r = rng(1169);
      const pipes = Array.from({ length: 10000 }, () => [between(r, 1, 5000), between(r, 1, 5000), between(r, 1, 100000)]);
      return [5000, wells, pipes];
    }),
    S("3000 houses with cheap pipes", () => {
      const wells = ints(3000, 1000, 50000, 1170);
      const r = rng(1171);
      const pipes = Array.from({ length: 6000 }, () => [between(r, 1, 3000), between(r, 1, 3000), between(r, 1, 500)]);
      return [3000, wells, pipes];
    }),
  ],

  // 13. lc-772: Basic Calculator III
  "lc-772": [
    S("1000 character nested arithmetic expression", () => {
      // Build a well-formed nested expression
      const parts: string[] = ["1"];
      for (let i = 0; i < 200; i++) {
        parts.push("+", "2", "*", "(", "3", "+", "4", "/", "2", ")");
      }
      return [parts.join("")];
    }),
    S("800 character alternating operations", () => {
      const parts: string[] = ["10"];
      for (let i = 0; i < 150; i++) {
        parts.push("+", "5", "*", "2", "-", "3");
      }
      return [parts.join("")];
    }),
  ],

  // 14. lc-901: Online Stock Span
  "lc-901": [
    S("50000 strictly decreasing then rising prices", () => [
      [...range(25000, 25000).reverse(), ...range(25000, 1)],
    ]),
    S("50000 random fluctuating prices", () => [
      ints(50000, 1, 100000, 901),
    ]),
  ],

  // 15. lc-1483: Kth Ancestor of a Tree Node
  "lc-1483": [
    S("20000 node random tree with 20000 queries", () => {
      const parent = randomTreeParent(20000, 1483);
      const r = rng(1484);
      const queries = Array.from({ length: 20000 }, () => [between(r, 0, 19999), between(r, 1, 20000)]);
      return [20000, parent, queries];
    }),
    S("10000 node chain tree with 10000 queries", () => {
      const parent = [-1, ...range(9999, 0)];
      const r = rng(1485);
      const queries = Array.from({ length: 10000 }, () => [between(r, 0, 9999), between(r, 1, 5000)]);
      return [10000, parent, queries];
    }),
  ],

  // 16. lc-303: Range Sum Query - Immutable
  "lc-303": [
    S("20000 numbers with 20000 range sum queries", () => {
      const nums = ints(20000, -1000, 1000, 303);
      const r = rng(304);
      const queries = Array.from({ length: 20000 }, () => {
        const a = between(r, 0, 19999);
        const b = between(r, 0, 19999);
        return [Math.min(a, b), Math.max(a, b)];
      });
      return [nums, queries];
    }),
  ],

  // 17. lc-307: Range Sum Query - Mutable
  "lc-307": [
    S("20000 numbers with 20000 updates and queries", () => {
      const nums = ints(20000, -100, 100, 307);
      const r = rng(308);
      const queries = Array.from({ length: 20000 }, () => {
        if (between(r, 1, 2) === 1) {
          return [1, between(r, 0, 19999), between(r, -100, 100)];
        } else {
          const a = between(r, 0, 19999), b = between(r, 0, 19999);
          return [2, Math.min(a, b), Math.max(a, b)];
        }
      });
      return [nums, queries];
    }),
  ],

  // 18. lc-32: Longest Valid Parentheses
  "lc-32": [
    S("30000 alternating parentheses", () => [
      "()".repeat(15000),
    ]),
    S("30000 random parentheses string", () => [
      letters(30000, "()", 32),
    ]),
  ],

  // 19. lc-85: Maximal Rectangle
  "lc-85": [
    S("200x200 random binary matrix", () => [
      grid(200, 200, (i, j) => letters(1, "01", 85 + i * 200 + j)),
    ]),
    S("200x200 matrix of all 1s", () => [
      grid(200, 200, () => "1"),
    ]),
  ],

  // 20. lc-22: Generate Parentheses
  "lc-22": [
    S("8 pairs of parentheses (1430 combinations)", () => [8]),
    S("7 pairs of parentheses (429 combinations)", () => [7]),
  ],

  // 21. lc-128: Longest Consecutive Sequence
  "lc-128": [
    S("50000 numbers with long sequences", () => [
      shuffled([...range(25000, 0), ...range(25000, 50000)], 128),
    ]),
    S("50000 random integers with duplicate values", () => [
      ints(50000, -50000, 50000, 129),
    ]),
  ],

  // 22. lc-139: Word Break
  "lc-139": [
    S("300 character string of repeated prefix words", () => {
      const s = "a".repeat(300);
      const dict = Array.from({ length: 20 }, (_, k) => "a".repeat(k + 1));
      return [s, dict];
    }),
    S("250 character alternating string with 50 words", () => {
      const s = "abcdefghij".repeat(25);
      const dict = Array.from({ length: 50 }, (_, k) => letters(5, "abcdefghij", 139 + k));
      return [s, dict];
    }),
  ],

  // 23. lc-329: Longest Increasing Path in a Matrix
  "lc-329": [
    S("200x200 random integers matrix", () => [
      grid(200, 200, (i, j) => between(rng(329 + i * 200 + j), 0, 1000000)),
    ]),
    S("100x100 strictly increasing row matrix", () => [
      grid(100, 100, (i, j) => i * 100 + j),
    ]),
  ],

  // 24. lc-78: Subsets
  "lc-78": [
    S("10 distinct integers (1024 subsets)", () => [range(10, 1)]),
    S("9 distinct integers (512 subsets)", () => [range(9, -4)]),
  ],

  // 25. lc-46: Permutations
  "lc-46": [
    S("6 distinct integers (720 permutations)", () => [range(6, 1)]),
    S("5 distinct integers (120 permutations)", () => [range(5, -2)]),
  ],
};
