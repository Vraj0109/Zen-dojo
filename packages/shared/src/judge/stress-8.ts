import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for batch 8 (problems-leetcode-8.ts): backtracking, dynamic programming, maths and geometry.
// Fixed seeds, biggest allowed sizes, and the shapes that break slow or careless solutions.

const { ints, fill, range, shuffled, letters, chain, S, rng, between } = H;

const grid = (r: number, c: number, f: (i: number, j: number) => number) =>
  Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));

/** Generates groups triplets of identical numbers and one single distinct number, then shuffles them. */
function singleNumberInput(groups: number, single: number, seed: number): number[] {
  const r = rng(seed);
  const seen = new Set<number>([single]);
  const others: number[] = [];
  while (others.length < groups) {
    const v = between(r, -1000000000, 1000000000);
    if (seen.has(v)) continue;
    seen.add(v);
    others.push(v);
  }
  const all: number[] = [single];
  for (const v of others) {
    all.push(v, v, v);
  }
  return shuffled(all, seed + 1);
}

/** Generates n distinct points with coordinates in [-10000, 10000]. */
function distinctPoints(n: number, seed: number): number[][] {
  const r = rng(seed);
  const seen = new Set<string>();
  const out: number[][] = [];
  while (out.length < n) {
    const x = between(r, -10000, 10000);
    const y = between(r, -10000, 10000);
    const k = `${x},${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push([x, y]);
  }
  return out;
}

export const STRESS_8: Record<string, StressCase[]> = {
  "lc-131": [
    S("16 equal letters (all 32768 partitions)", () => ["a".repeat(16)]),
    S("16 distinct letters (only 1 partition)", () => ["abcdefghijklmnop"]),
    S("16 alternating letters", () => ["ab".repeat(8)]),
  ],
  "lc-137": [
    S("29998 numbers, positive single value", () => [singleNumberInput(9999, 123456789, 101)]),
    S("29998 numbers, negative single value (-2^31)", () => [singleNumberInput(9999, -2147483648, 102)]),
    S("29998 numbers, max positive single value (2^31 - 1)", () => [singleNumberInput(9999, 2147483647, 103)]),
  ],
  "lc-698": [
    S("16 numbers into 4 equal subsets", () => [
      shuffled([10, 20, 30, 40, 15, 25, 25, 35, 5, 45, 20, 30, 50, 20, 20, 10], 201),
      4,
    ]),
    S("16 equal numbers into 16 subsets", () => [fill(16, 500), 16]),
    S("16 numbers, total not divisible by k", () => [
      [...fill(15, 10), 11],
      4,
    ]),
    S("16 numbers, one number larger than target", () => [
      [...fill(15, 2), 50],
      4,
    ]),
  ],
  "lc-741": [
    S("50 by 50 all cherries", () => [grid(50, 50, () => 1)]),
    S("50 by 50 with thorns blocking the diagonal", () => [
      grid(50, 50, (i, j) => ((i === 0 && j === 0) || (i === 49 && j === 49) ? 0 : i + j === 49 ? -1 : 1)),
    ]),
    S("50 by 50 mixed cherries and thorns", () => [
      grid(50, 50, (i, j) =>
        (i === 0 && j === 0) || (i === 49 && j === 49) ? 1 : (i * 31 + j * 17) % 7 === 0 ? -1 : (i + j) % 3 === 0 ? 1 : 0
      ),
    ]),
  ],
  "lc-10": [
    S("20 characters matching repeated star pattern", () => ["a".repeat(20), "a*a*a*a*a*a*a*a*a*a*"]),
    S("20 characters mismatching at the end", () => ["a".repeat(19) + "b", "a*a*a*a*a*a*a*a*a*a*"]),
    S("20 characters matching wildcard dot-star", () => ["abcdefghijklmnopqrst", ".*"]),
    S("20 characters matching dot and star combination", () => ["a".repeat(20), ".*a"]),
  ],
  "lc-44": [
    S("2000 letters matching leading star and prefix", () => ["a".repeat(2000), "*" + "a".repeat(1999)]),
    S("2000 letters matching single star", () => ["a".repeat(2000), "*"]),
    S("2000 letters mismatching at the end", () => ["a".repeat(1999) + "b", "a*".repeat(500) + "c"]),
    S("2000 alternating letters with wildcards", () => ["ab".repeat(1000), "*a?b*".repeat(400)]),
  ],
  "lc-115": [
    S("1000 letters, target not in source", () => ["a".repeat(1000), "b".repeat(100)]),
    S("1000 letters, 500 matches", () => ["ab".repeat(500), "a"]),
    S("1000 characters, repeated pattern", () => ["abc".repeat(333) + "a", "abc"]),
    S("1000 letters, combination fitting in 32-bit int", () => ["a".repeat(33) + "b".repeat(967), "a".repeat(30) + "b"]),
  ],
  "lc-132": [
    S("2000 equal letters (0 cuts)", () => ["a".repeat(2000)]),
    S("2000 alternating letters", () => ["ab".repeat(1000)]),
    S("2000 pseudo-random letters", () => [letters(2000, "abcdefghijklmnopqrstuvwxy", 301)]),
    S("2000 characters, palindromic ends", () => ["a".repeat(500) + "bc".repeat(500) + "a".repeat(500)]),
  ],
  "lc-1000": [
    S("30 stones, k = 2", () => [ints(30, 1, 100, 401), 2]),
    S("29 stones, k = 3", () => [fill(29, 100), 3]),
    S("30 stones, k = 3 (impossible, returns -1)", () => [ints(30, 1, 100, 402), 3]),
    S("30 stones, k = 30", () => [ints(30, 1, 100, 403), 30]),
  ],
  "lc-123": [
    S("100000 strictly rising prices", () => [range(100000, 0)]),
    S("100000 strictly falling prices", () => [range(100000).map((i) => 100000 - i)]),
    S("100000 all equal prices", () => [fill(100000, 50000)]),
    S("100000 random prices", () => [ints(100000, 0, 100000, 501)]),
  ],
  "lc-188": [
    S("k = 100, 1000 random prices", () => [100, ints(1000, 0, 1000, 601)]),
    S("k = 100, 1000 strictly rising prices", () => [100, range(1000, 0)]),
    S("k = 100, 1000 strictly falling prices", () => [100, range(1000).map((i) => 1000 - i)]),
    S("k = 1, 1000 random prices", () => [1, ints(1000, 0, 1000, 602)]),
  ],
  "lc-902": [
    S("all 9 digits, n = 10^9", () => [["1", "2", "3", "4", "5", "6", "7", "8", "9"], 1000000000]),
    S("single digit 9, n = 10^9", () => [["9"], 1000000000]),
    S("odd digits, n = 999999999", () => [["1", "3", "5", "7", "9"], 999999999]),
    S("three digits, n = 1", () => [["2", "4", "6"], 1]),
  ],
  "lc-357": [
    S("n = 8 (maximum allowed)", () => [8]),
    S("n = 0 (minimum allowed)", () => [0]),
    S("n = 7", () => [7]),
  ],
  "lc-968": [
    S("1000-node chain to the left", () => [chain(fill(1000, 0), "left")]),
    S("1000-node chain to the right", () => [chain(fill(1000, 0), "right")]),
    S("complete binary tree of 1000 nodes", () => [fill(1000, 0)]),
  ],
  "lc-1986": [
    S("14 tasks of size 10, sessionTime = 10 (14 sessions)", () => [fill(14, 10), 10]),
    S("14 tasks of size 1, sessionTime = 15 (1 session)", () => [fill(14, 1), 15]),
    S("14 random tasks, sessionTime = 15", () => [ints(14, 1, 10, 701), 15]),
    S("14 alternating tasks, sessionTime = 15", () => [
      range(14).map((i) => (i % 2 === 0 ? 7 : 8)),
      15,
    ]),
  ],
  "lc-135": [
    S("20000 strictly rising ratings", () => [range(20000, 0)]),
    S("20000 strictly falling ratings", () => [range(20000).map((i) => 20000 - i)]),
    S("20000 all equal ratings", () => [fill(20000, 500)]),
    S("20000 zigzag ratings", () => [range(20000).map((i) => (i % 2 === 0 ? 100 : 0))]),
    S("20000 random ratings", () => [ints(20000, 0, 20000, 801)]),
  ],
  "lc-767": [
    S("500 characters, exactly 250 a and 250 b", () => ["a".repeat(250) + "b".repeat(250)]),
    S("500 characters, 251 a and 249 b (impossible, returns empty)", () => ["a".repeat(251) + "b".repeat(249)]),
    S("500 characters evenly distributed among 26 letters", () => [
      range(500).map((i) => String.fromCharCode(97 + (i % 26))).join(""),
    ]),
    S("500 random characters from 13 letters", () => [letters(500, "abcdefghijklm", 901)]),
  ],
  "lc-204": [
    S("n = 5000000 (maximum allowed)", () => [5000000]),
    S("n = 4999999", () => [4999999]),
    S("n = 0", () => [0]),
    S("n = 2", () => [2]),
  ],
  "lc-50": [
    S("x = 1.0, n = -2^31 (32-bit negation edge case)", () => [1.0, -2147483648]),
    S("x = -1.0, n = 2^31 - 1", () => [-1.0, 2147483647]),
    S("x = 2.0, n = -2^31 (underflows to 0)", () => [2.0, -2147483648]),
    S("x = 1.00001, n = 100000", () => [1.00001, 100000]),
    S("x = 0.5, n = 1000", () => [0.5, 1000]),
  ],
  "lc-372": [
    S("2000 nines, max a", () => [2147483647, fill(2000, 9)]),
    S("2000 alternating digits", () => [1336, range(2000).map((i) => (i % 2 === 0 ? 1 : 0))]),
    S("2000 random digits", () => [987654321, [5, ...ints(1999, 0, 9, 1001)]]),
    S("a = 1, 2000 sevens", () => [1, fill(2000, 7)]),
  ],
  "lc-149": [
    S("300 points on a horizontal line", () => [range(300).map((i) => [i - 150, 42])]),
    S("300 points on a vertical line", () => [range(300).map((i) => [42, i - 150])]),
    S("300 points on a diagonal line", () => [range(300).map((i) => [i - 150, i - 150])]),
    S("300 random distinct points", () => [distinctPoints(300, 1101)]),
  ],
  "lc-223": [
    S("maximum coordinate non-overlapping rectangles", () => [-10000, -10000, -5000, -5000, 5000, 5000, 10000, 10000]),
    S("maximum coordinate identical rectangles", () => [-10000, -10000, 10000, 10000, -10000, -10000, 10000, 10000]),
    S("one rectangle completely inside another", () => [-10000, -10000, 10000, 10000, -100, -100, 100, 100]),
    S("overlapping rectangles across quadrants", () => [-8000, -6000, 2000, 4000, -1000, -2000, 9000, 8000]),
  ],
  "lc-327": [
    S("100000 zeros, lower = 0, upper = 0", () => [fill(100000, 0), 0, 0]),
    S("100000 ones, range 1 to 100", () => [fill(100000, 1), 1, 100]),
    S("100000 random numbers, range -5000 to 5000", () => [ints(100000, -10000, 10000, 1201), -5000, 5000]),
    S("100000 alternating extreme values", () => [
      range(100000).map((i) => (i % 2 === 0 ? 2147483647 : -2147483648)),
      -1,
      1,
    ]),
  ],
  "lc-220": [
    S("100000 rising numbers with large gaps (no duplicate)", () => [range(100000).map((i) => i * 10), 100000, 2]),
    S("100000 numbers with a duplicate at the end", () => [[...range(99999).map((i) => i * 10), 0], 100000, 0]),
    S("100000 random numbers", () => [ints(100000, -1000000000, 1000000000, 1301), 5000, 1000]),
    S("100000 all equal numbers", () => [fill(100000, 42), 1, 0]),
  ],
  "lc-699": [
    S("1000 squares on the exact same spot", () => [fill(1000, [100, 5])]),
    S("1000 squares side by side", () => [range(1000).map((i) => [i * 10 + 1, 5])]),
    S("1000 cascading overlapping squares", () => [range(1000).map((i) => [i * 2 + 1, 10])]),
    S("1000 random squares", () => [
      range(1000).map((i) => [((i * 7919) % 50000) + 1, ((i * 31) % 100) + 1]),
    ]),
  ],
};
