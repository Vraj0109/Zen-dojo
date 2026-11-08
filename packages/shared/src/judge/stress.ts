import type { StressCase } from "./types";

// Large inputs for every problem: the biggest sizes the constraints allow, and the shapes that break slow or careless
// solutions (sorted, reversed, all equal, long chains, many duplicates). Their answers are not written down here: the
// reference solution computes them (see lib/judge/run.ts). Each input is built from a fixed random seed, so it is the
// same on every run. Where a problem promises a unique answer, the generator makes sure the input keeps that promise.
//
// A slow algorithm (O(n^2) where O(n) is expected, or exponential recursion) runs out of time on these; an answer built
// on 32-bit arithmetic where 64 bits are needed gives a wrong answer; and a solution that allocates far too much memory
// stops with "memory limit exceeded".

/** A small seeded random number generator (mulberry32): the same seed always gives the same numbers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const ints = (n: number, lo: number, hi: number, seed: number) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => between(r, lo, hi));
};
const fill = <T>(n: number, v: T) => Array.from({ length: n }, () => v);
const range = (n: number, start = 0) => Array.from({ length: n }, (_, i) => start + i);
function shuffled<T>(items: T[], seed: number): T[] {
  const r = rng(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const letters = (n: number, alphabet: string, seed: number) => {
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(r() * alphabet.length)];
  return s;
};

// ---- trees (level-order arrays with null for a missing child)
interface TN {
  v: number;
  l: TN | null;
  r: TN | null;
}
function bstFromSorted(vals: number[], lo = 0, hi = vals.length - 1): TN | null {
  if (lo > hi) return null;
  const mid = (lo + hi) >> 1;
  return { v: vals[mid], l: bstFromSorted(vals, lo, mid - 1), r: bstFromSorted(vals, mid + 1, hi) };
}
function level(root: TN | null): (number | null)[] {
  const out: (number | null)[] = [];
  const q: (TN | null)[] = root ? [root] : [];
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (!n) {
      out.push(null);
      continue;
    }
    out.push(n.v);
    q.push(n.l, n.r);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
/** A tree where every node has one child: to the right, or to the left. */
function chain(vals: number[], side: "left" | "right"): (number | null)[] {
  const out: (number | null)[] = [vals[0]];
  for (let i = 1; i < vals.length; i++) {
    if (side === "right") out.push(null, vals[i]);
    else out.push(vals[i], null);
  }
  return out;
}

const S = (label: string, make: () => unknown[], limitMs?: number): StressCase => ({ label, make, limitMs });

// ---- helpers for problems with a unique answer
/** Distinct random ints, and a target made from two of them that no other pair reaches. */
function twoSumInput(n: number, seed: number, lo: number, hi: number): unknown[] {
  const r = rng(seed);
  for (let attempt = 0; attempt < 50; attempt++) {
    const set = new Set<number>();
    while (set.size < n) set.add(between(r, lo, hi));
    const nums = [...set];
    const i = Math.floor(r() * n);
    let j = Math.floor(r() * n);
    if (j === i) j = (j + 1) % n;
    const target = nums[i] + nums[j];
    const seen = new Map<number, number>();
    let pairs = 0;
    for (const x of nums) {
      pairs += seen.get(target - x) ?? 0;
      seen.set(x, (seen.get(x) ?? 0) + 1);
    }
    if (pairs === 1) return [nums, target];
  }
  throw new Error("could not build a Two Sum input with a unique pair");
}

function bstInsertOrder(n: number, seed: number): { pre: number[]; inorder: number[] } {
  const order = shuffled(range(n, 1), seed);
  const root: TN = { v: order[0], l: null, r: null };
  for (let k = 1; k < n; k++) {
    let cur = root;
    for (;;) {
      if (order[k] < cur.v) {
        if (!cur.l) {
          cur.l = { v: order[k], l: null, r: null };
          break;
        }
        cur = cur.l;
      } else {
        if (!cur.r) {
          cur.r = { v: order[k], l: null, r: null };
          break;
        }
        cur = cur.r;
      }
    }
  }
  const pre: number[] = [];
  const stack: TN[] = [root];
  while (stack.length) {
    const n2 = stack.pop()!;
    pre.push(n2.v);
    if (n2.r) stack.push(n2.r);
    if (n2.l) stack.push(n2.l);
  }
  return { pre, inorder: range(n, 1) };
}

const bigGrid = (rows: number, cols: number, f: (r: number, c: number) => string) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => f(r, c)));

export const STRESS: Record<string, StressCase[]> = {
  // ---------------- arrays, strings, hashing
  "lc-1": [S("10000 random numbers", () => twoSumInput(10000, 11, -500_000_000, 500_000_000)), S("10000 large numbers (sums near 10^9)", () => twoSumInput(10000, 12, 400_000_000, 500_000_000))],
  "lc-3": [S("50000 random letters", () => [letters(50000, "abcdefghijklmnopqrstuvwxyz", 21)]), S("50000 times the same letter", () => ["a".repeat(50000)]), S("abc repeated", () => ["abc".repeat(16666)])],
  "lc-11": [S("100000 random heights", () => [ints(100000, 0, 10000, 31)]), S("100000 rising heights", () => [range(100000).map((i) => Math.min(10000, Math.floor(i / 10)))]), S("100000 equal heights", () => [fill(100000, 10000)])],
  "lc-20": [S("5000 open then 5000 close", () => ["(".repeat(5000) + ")".repeat(5000)]), S("5000 pairs", () => ["()".repeat(5000)]), S("10000 open brackets", () => ["(".repeat(10000)]), S("10000 random brackets", () => [letters(10000, "()[]{}", 41)])],
  "lc-53": [S("100000 random numbers", () => [ints(100000, -10000, 10000, 51)]), S("100000 negative numbers", () => [fill(100000, -10000)])],
  "lc-70": [S("n = 45 (checks for exponential recursion)", () => [45], 1000)],
  "lc-121": [S("100000 random prices", () => [ints(100000, 0, 10000, 61)]), S("100000 falling prices", () => [range(100000).map((i) => 10000 - Math.floor(i / 10))])],
  "lc-92": [S("500 nodes, reverse all", () => [ints(500, -500, 500, 71), 1, 500]), S("500 nodes, reverse the middle two", () => [ints(500, -500, 500, 72), 250, 251])],
  "lc-25": [S("5000 nodes, k = 2", () => [ints(5000, 0, 1000, 81), 2]), S("5000 nodes, k = 5000", () => [ints(5000, 0, 1000, 82), 5000]), S("5000 nodes, k = 1", () => [ints(5000, 0, 1000, 83), 1])],
  "lc-98": [S("10000-node chain (deep recursion)", () => [chain(range(10000, 1), "right")]), S("balanced tree of 10000 nodes", () => [level(bstFromSorted(range(10000, 1)))]), S("chain with a wrong value at the end", () => [chain([...range(9999, 1), 5], "right")])],
  "lc-543": [S("10000-node chain", () => [chain(range(10000, 1), "left")]), S("complete tree of 10000 nodes", () => [range(10000, 1)])],
  "lc-102": [S("2000-node chain", () => [chain(range(2000, 1), "right")]), S("complete tree of 2000 nodes", () => [range(2000, 1)])],
  "lc-199": [S("100-node chain", () => [chain(range(100, 1), "left")]), S("complete tree of 100 nodes", () => [range(100, 1)])],
  "lc-230": [S("10000-node chain, k = 10000", () => [chain(range(10000, 1), "right"), 10000]), S("balanced tree of 10000 nodes, k = 5000", () => [level(bstFromSorted(range(10000, 1))), 5000])],
  "lc-105": [
    S("3000 nodes, only right children", () => [range(3000, 1), range(3000, 1)]),
    S("3000 nodes, only left children", () => [range(3000, 1).reverse(), range(3000, 1)]),
    S("3000 nodes, random shape", () => {
      const { pre, inorder } = bstInsertOrder(3000, 91);
      return [pre, inorder];
    }),
  ],
  "lc-337": [S("complete tree of 10000 houses", () => [ints(10000, 0, 10000, 101)]), S("10000-house chain", () => [chain(ints(10000, 0, 10000, 102), "left")])],
  "lc-238": [S("100000 numbers that are 1 or -1", () => [ints(100000, 0, 1, 111).map((x) => (x === 0 ? -1 : 1))]), S("100000 numbers with a zero", () => [ints(100000, 0, 1, 112).map((x, i) => (i === 777 ? 0 : x === 0 ? -1 : 1))]), S("100000 ones", () => [fill(100000, 1)])],
  "lc-15": [S("3000 random numbers", () => [ints(3000, -100000, 100000, 121)]), S("3000 zeros", () => [fill(3000, 0)]), S("3000 numbers between -5 and 5", () => [ints(3000, -5, 5, 122)])],
  "lc-49": [
    S("10000 words in 100 groups", () => {
      const bases = Array.from({ length: 100 }, (_, k) => letters(20, "abcdefghijklmnopqrstuvwxyz", 1300 + k));
      const words: string[] = [];
      for (let k = 0; k < 100; k++) for (let j = 0; j < 100; j++) words.push(shuffled([...bases[k]], 2000 + k * 100 + j).join(""));
      return [shuffled(words, 131)];
    }),
    S("10000 identical words of 100 letters", () => [fill(10000, "a".repeat(100))]),
    S("10000 different words of 100 letters", () => [Array.from({ length: 10000 }, (_, k) => letters(100, "abcdefghijklmnopqrstuvwxyz", 3000 + k))]),
  ],
  "lc-56": [
    S("10000 random intervals", () => {
      const r = rng(141);
      return [Array.from({ length: 10000 }, () => { const a = between(r, 0, 10000); const b = between(r, 0, 10000); return [Math.min(a, b), Math.max(a, b)]; })];
    }),
    S("10000 identical intervals", () => [fill(10000, [0, 10000])]),
    S("5000 separate intervals", () => [shuffled(Array.from({ length: 5000 }, (_, i) => [2 * i, 2 * i + 1]), 142)]),
  ],
  "lc-739": [S("100000 random temperatures", () => [ints(100000, 30, 100, 151)]), S("100000 rising then falling", () => [range(100000).map((i) => 30 + (i % 71))]), S("100000 equal temperatures", () => [fill(100000, 100)])],
  "lc-198": [S("100 random houses", () => [ints(100, 0, 400, 161)]), S("100 houses worth 400", () => [fill(100, 400)])],
  "lc-322": [
    S("coins 1 to 5000, amount 10000", () => [[1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000], 10000]),
    S("coins 2, 3, 7, amount 10000", () => [[2, 3, 7], 10000]),
    S("impossible amount", () => [[2, 4, 6, 8, 10, 12], 9999]),
  ],
  "lc-33": [S("5000 numbers, target present", () => { const a = range(5000, -2500); return [[...a.slice(1234), ...a.slice(0, 1234)], 2499]; }), S("5000 numbers, target missing", () => { const a = range(5000, -2500); return [[...a.slice(3000), ...a.slice(0, 3000)], 9999]; })],
  "lc-200": [
    S("300 by 300 random land and water", () => [bigGrid(300, 300, (r, c) => (rng(171 + r * 300 + c)() < 0.5 ? "1" : "0"))]),
    S("300 by 300 water", () => [bigGrid(300, 300, () => "0")]),
    S("100 by 100 land (deep recursion)", () => [bigGrid(100, 100, () => "1")]),
    S("300 by 300 checkerboard", () => [bigGrid(300, 300, (r, c) => ((r + c) % 2 === 0 ? "1" : "0"))]),
  ],
  // ---------------- batch 3
  "lc-347": [
    S("100000 numbers, every count different", () => {
      const nums: number[] = [];
      for (let v = 0; nums.length + (v + 1) <= 100000; v++) for (let k = 0; k <= v; k++) nums.push(v);
      return [shuffled(nums, 181), 10];
    }),
    S("100000 equal numbers", () => [fill(100000, 7), 1]),
    S("20001 different numbers, k = all", () => [shuffled(range(20001, -10000), 182), 20001]),
  ],
  "lc-560": [S("20000 random numbers, k = 0", () => [ints(20000, -1000, 1000, 191), 0]), S("20000 zeros, k = 0 (answer needs more than 16 bits)", () => [fill(20000, 0), 0]), S("20000 ones, k = 10000", () => [fill(20000, 1), 10000])],
  "lc-42": [S("20000 random heights", () => [ints(20000, 0, 100000, 201)]), S("a mountain of 20000 bars", () => [range(20000).map((i) => Math.min(i, 19999 - i) * 5)]), S("a valley of 20000 bars", () => [range(20000).map((i) => Math.abs(10000 - i) * 10)]), S("20000 zeros", () => [fill(20000, 0)])],
  "lc-76": [
    S("100000 letters, one window of 100 matches", () => {
      const block = shuffled([...letters(100, "abcdefghijklmnopqrstuvwxy", 211)], 212).join("");
      const t = shuffled([...block], 213).join("");
      return ["z".repeat(50000) + block + "z".repeat(49900), t];
    }),
    S("100000 letters, no window", () => ["a".repeat(100000), "b"]),
  ],
  "lc-904": [S("100000 random fruit types", () => [ints(100000, 0, 99999, 221)]), S("two types, alternating", () => [range(100000).map((i) => i % 2)]), S("three types, repeating", () => [range(100000).map((i) => i % 3)])],
  "lc-152": [S("20000 numbers that are -1, 0 or 1", () => [ints(20000, -1, 1, 231)]), S("20000 times -1", () => [fill(20000, -1)])],
  "lc-41": [S("a shuffled 1 to 100000", () => [shuffled(range(100000, 1), 241)]), S("one number missing", () => [shuffled([...range(100000, 1).filter((x) => x !== 54321), 2_000_000_000], 242)])],
  "lc-28": [S("10000 letters, needle at the end", () => ["a".repeat(9999) + "b", "a".repeat(5000) + "b"]), S("10000 letters, needle missing", () => ["a".repeat(10000), "a".repeat(5000) + "b"])],
  "lc-54": [S("10 by 10", () => [Array.from({ length: 10 }, (_, r) => range(10, r * 10))]), S("1 by 10", () => [[range(10)]]), S("10 by 1", () => [range(10).map((x) => [x])])],
  "lc-875": [S("100000 random piles", () => [ints(100000, 1, 1_000_000_000, 251), 200000]), S("one pile of a billion, 1 hour", () => [[1_000_000_000], 1]), S("100000 piles of a billion", () => [fill(100000, 1_000_000_000), 100000])],
  "lc-215": [S("100000 random numbers", () => [ints(100000, -10000, 10000, 261), 50000]), S("100000 equal numbers", () => [fill(100000, 5), 1]), S("100000 rising numbers", () => [range(100000).map((i) => i % 10001), 1])],
  "lc-84": [S("100000 random bars", () => [ints(100000, 0, 10000, 271)]), S("100000 equal bars", () => [fill(100000, 10000)]), S("100000 rising bars", () => [range(100000).map((i) => i % 10001)])],
  // ---------------- batch 4
  "lc-55": [S("10000 ones", () => [fill(10000, 1)]), S("a zero blocks the end", () => [[...fill(9998, 1), 0, 0]]), S("10000 random jumps", () => [ints(10000, 0, 3, 281)])],
  "lc-45": [S("10000 ones", () => [fill(10000, 1)]), S("10000 random jumps", () => [ints(10000, 1, 100, 291)])],
  "lc-62": [S("16 by 16", () => [16, 16], 1000), S("18 by 17 (answer above a billion)", () => [18, 17], 1000), S("100 by 1", () => [100, 1])],
  "lc-64": [S("200 by 200 random", () => [Array.from({ length: 200 }, (_, r) => ints(200, 0, 200, 301 + r))], 1000), S("200 by 200 zeros", () => [Array.from({ length: 200 }, () => fill(200, 0))], 1000), S("200 by 200 of 200", () => [Array.from({ length: 200 }, () => fill(200, 200))], 1000)],
  "lc-1143": [S("1000 random letters each", () => [letters(1000, "abcd", 311), letters(1000, "abcd", 312)]), S("two identical strings", () => ["a".repeat(1000), "a".repeat(1000)]), S("no letters in common", () => ["a".repeat(1000), "b".repeat(1000)])],
  "lc-72": [S("500 random letters each", () => [letters(500, "abc", 321), letters(500, "abc", 322)]), S("two identical strings", () => ["a".repeat(500), "a".repeat(500)]), S("nothing in common", () => ["a".repeat(500), "b".repeat(500)])],
  "lc-300": [S("2500 random numbers", () => [ints(2500, -10000, 10000, 331)]), S("2500 rising numbers", () => [range(2500)]), S("2500 falling numbers", () => [range(2500).reverse()])],
  "lc-416": [S("200 random numbers", () => [ints(200, 1, 100, 341)]), S("200 numbers of 100", () => [fill(200, 100)]), S("200 numbers with an odd sum", () => [[...fill(199, 100), 99]])],
  "lc-518": [S("amount 5000, coins 1 2 5", () => [5000, [1, 2, 5]]), S("amount 5000, coins 10 25 50 100", () => [5000, [10, 25, 50, 100]]), S("amount 5000, one coin of 5000", () => [5000, [5000]])],
  "lc-122": [S("30000 random prices", () => [ints(30000, 0, 10000, 351)]), S("30000 rising prices", () => [range(30000).map((i) => i % 10001)]), S("30000 falling prices", () => [range(30000).map((i) => 10000 - (i % 10001))])],
  "lc-91": [S("40 ones (many ways)", () => ["1".repeat(40)], 1000), S("40 random ones and twos", () => [letters(40, "12", 361)], 1000), S("zeros that cannot be decoded", () => ["10".repeat(20)], 1000)],
  // ---------------- CSES
  "cses-weird-algorithm": [S("n = 837799 (the longest sequence below a million)", () => [837799]), S("n = 999999", () => [999999]), S("n = 1", () => [1])],
  "cses-missing-number": [
    S("n = 200000, shuffled, one missing", () => [200000, shuffled(range(200000, 1).filter((x) => x !== 123456), 401)]),
    S("n = 200000, the first number missing", () => [200000, shuffled(range(199999, 2), 402)]),
    S("n = 200000, the last number missing", () => [200000, shuffled(range(199999, 1), 403)]),
  ],
  "cses-repetitions": [S("a million letters, all the same", () => ["A".repeat(1_000_000)]), S("a million random letters", () => [letters(1_000_000, "ACGT", 411)]), S("a million letters, alternating", () => ["AC".repeat(500_000)])],
  "cses-increasing-array": [
    S("200000 random numbers", () => [ints(200000, 1, 1_000_000_000, 421)]),
    S("200000 falling numbers", () => [range(200000).map((i) => 1_000_000_000 - i)]),
    S("200000 numbers alternating 1 and 10^9 (the answer needs 64 bits)", () => [range(200000).map((i) => (i % 2 === 0 ? 1_000_000_000 : 1))]),
  ],
  "lc-134": [
    S("100000 stations, no way round", () => {
      const cost = ints(100000, 1, 100, 371);
      const gas = cost.map((c, i) => (i === 5 ? c - 1 : c));
      return [gas, cost];
    }),
    S("100000 stations, one start works", () => {
      const n = 100000;
      const cost = fill(n, 2);
      const gas = fill(n, 0);
      gas[n - 7] = 2 * n;
      return [gas, cost];
    }),
  ],
  // ---------------- batch 5
  "lc-1094": [
    S("1000 random trips, roomy car", () => {
      const r = rng(501);
      return [Array.from({ length: 1000 }, () => { const a = between(r, 0, 999); return [between(r, 1, 100), a, between(r, a + 1, 1000)]; }), 100000];
    }),
    S("1000 trips that all overlap, too small a car", () => [Array.from({ length: 1000 }, () => [100, 0, 1000]), 99999]),
  ],
  "lc-1109": [
    S("20000 random bookings on 20000 flights", () => {
      const r = rng(502);
      return [Array.from({ length: 20000 }, () => { const a = between(r, 1, 20000); return [a, between(r, a, 20000), between(r, 1, 10000)]; }), 20000];
    }),
    S("20000 bookings that each cover every flight", () => [Array.from({ length: 20000 }, () => [1, 20000, 10000]), 20000]),
  ],
  "lc-239": [
    S("100000 random numbers, window 50000", () => [ints(100000, -10000, 10000, 503), 50000]),
    S("100000 rising numbers, window 1000", () => [range(100000).map((i) => (i % 20001) - 10000), 1000]),
    S("100000 falling numbers, window 99999", () => [range(100000).map((i) => 10000 - (i % 20001)), 99999]),
    S("100000 equal numbers, window 3", () => [fill(100000, 5), 3]),
  ],
  "lc-918": [
    S("30000 random numbers", () => [ints(30000, -30000, 30000, 504)]),
    S("30000 negative numbers", () => [ints(30000, -30000, -1, 505)]),
    S("30000 positive numbers", () => [ints(30000, 1, 30000, 506)]),
  ],
  "lc-57": [
    S("10000 intervals, the new one swallows most of them", () => [range(10000).map((i) => [i * 10, i * 10 + 5]), [5, 99990]]),
    S("10000 intervals, the new one fits in a gap", () => [range(10000).map((i) => [i * 10, i * 10 + 5]), [6, 8]]),
  ],
  "lc-435": [
    S("100000 random intervals", () => {
      const r = rng(507);
      return [Array.from({ length: 100000 }, () => { const a = between(r, -50000, 49999); return [a, between(r, a + 1, Math.min(50000, a + 500))]; })];
    }),
    S("100000 identical intervals", () => [fill(100000, [0, 1])]),
    S("100000 intervals that do not overlap", () => [range(100000).map((i) => [i - 50000, i - 49999])]),
  ],
  "lc-442": [
    S("100000 numbers with many duplicates", () => {
      const a = shuffled(range(100000, 1), 508);
      for (let i = 0; i < 25000; i++) a[i] = a[i + 50000];
      return [a];
    }),
    S("100000 numbers, no duplicates", () => [shuffled(range(100000, 1), 509)]),
  ],
  "lc-1392": [
    S("100000 letters, all the same", () => ["a".repeat(100000)]),
    S("100000 letters, ab repeated", () => ["ab".repeat(50000)]),
    S("100000 random letters from a, b", () => [letters(100000, "ab", 510)]),
    S("a long string with no happy prefix", () => ["a" + "b".repeat(99999)]),
  ],
  "lc-1011": [
    S("50000 random weights, 100 days", () => [ints(50000, 1, 500, 511), 100]),
    S("50000 random weights, 1 day", () => [ints(50000, 1, 500, 512), 1]),
    S("50000 random weights, 50000 days", () => [ints(50000, 1, 500, 513), 50000]),
  ],
  "lc-410": [
    S("1000 random numbers, 50 parts", () => [ints(1000, 0, 1_000_000, 514), 50]),
    S("1000 numbers of 10^6, 1 part (sum is 10^9)", () => [fill(1000, 1_000_000), 1]),
    S("1000 numbers of 10^6, 7 parts", () => [fill(1000, 1_000_000), 7]),
  ],
  "lc-179": [
    S("100 random numbers", () => [ints(100, 0, 1_000_000_000, 515)]),
    S("100 numbers made of 9s, tricky ties", () => [range(100).map((i) => (i % 2 ? 999999999 : 99999999))]),
    S("100 zeros", () => [fill(100, 0)]),
  ],
  "lc-315": [
    S("100000 random numbers", () => [ints(100000, -10000, 10000, 516)]),
    S("100000 falling numbers", () => [range(100000).map((i) => 10000 - (i % 20001))]),
    S("100000 equal numbers", () => [fill(100000, 7)]),
  ],
  "lc-907": [
    S("30000 random numbers", () => [ints(30000, 1, 30000, 517)]),
    S("30000 rising numbers (answer needs the modulo)", () => [range(30000).map((i) => i + 1)]),
    S("30000 equal numbers", () => [fill(30000, 30000)]),
  ],
  "lc-227": [
    S("a 300000-character expression of all four operators", () => ["7+3*2-8/4+".repeat(29999) + "1"]),
    S("a long chain of multiplications by one", () => ["1" + "*1".repeat(149999)]),
    S("spaces everywhere", () => [" 1 + 2 * 3 " + " ".repeat(200000) + "+ 4"]),
  ],
  "lc-394": [S("99[99[9[a]]] (88209 letters)", () => ["99[99[9[a]]]"]), S("300[abc]", () => ["300[abc]"]), S("deeply nested", () => ["2[2[2[2[2[2[2[2[2[2[2[a]]]]]]]]]]]"])],
  "lc-621": [
    S("100000 random tasks, n = 100", () => [Array.from(letters(100000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 518)), 100]),
    S("100000 identical tasks, n = 100", () => [fill(100000, "A"), 100]),
    S("100000 tasks, 26 letters evenly, n = 25", () => [range(100000).map((i) => String.fromCharCode(65 + (i % 26))), 25]),
  ],
  "lc-494": [
    S("20 numbers of 50, target 0", () => [fill(20, 50), 0]),
    S("20 zeros, target 0 (2^20 ways)", () => [fill(20, 0), 0]),
    S("20 numbers summing to 1000, target 100", () => [fill(20, 50), 100]),
  ],
  "lc-221": [
    S("300 x 300 all ones", () => [Array.from({ length: 300 }, () => fill(300, 1))]),
    S("300 x 300 random", () => {
      const r = rng(519);
      return [Array.from({ length: 300 }, () => Array.from({ length: 300 }, () => (r() < 0.8 ? 1 : 0)))];
    }),
    S("300 x 300 all zeros", () => [Array.from({ length: 300 }, () => fill(300, 0))]),
  ],
  "lc-309": [
    S("5000 random prices", () => [ints(5000, 0, 1000, 520)]),
    S("5000 rising prices", () => [range(5000).map((i) => i % 1001)]),
    S("5000 falling prices", () => [range(5000).map((i) => 1000 - (i % 1001))]),
  ],
  "lc-763": [
    S("500 random letters", () => [letters(500, "abcdefghijklmnopqrstuvwxyz", 521)]),
    S("250 a then 250 b", () => ["a".repeat(250) + "b".repeat(250)]),
    S("the alphabet repeated (one piece)", () => ["abcdefghijklmnopqrstuvwxyz".repeat(19).slice(0, 500)]),
  ],
  "lc-452": [
    S("100000 random balloons over the whole 32-bit range", () => {
      const r = rng(522);
      return [Array.from({ length: 100000 }, () => { const a = between(r, -2147483648, 2147483000); return [a, Math.min(2147483647, a + between(r, 1, 1_000_000_000))]; })];
    }),
    S("100000 identical balloons", () => [fill(100000, [-2147483648, 2147483647])]),
    S("100000 balloons that touch only at ends", () => [range(100000).map((i) => [i * 2, i * 2 + 2])]),
  ],
  "lc-136": [S("30000 numbers (14999 pairs and one)", () => [shuffled([...range(14999, 1), ...range(14999, 1), 20000], 523)])],
  "lc-338": [S("n = 100000", () => [100000]), S("n = 65535 (all bits set at the end)", () => [65535])],
  "lc-260": [S("30000 numbers, singles at the extremes of 32-bit", () => [shuffled([...range(14999, 1), ...range(14999, 1), 2147483647, -2147483648], 524)])],
  "lc-474": [
    S("600 random strings of up to 100 characters, m = n = 100", () => {
      const r = rng(525);
      return [Array.from({ length: 600 }, () => letters(between(r, 1, 100), "01", between(r, 1, 1_000_000_000))), 100, 100];
    }),
    S("600 single characters", () => [Array.from({ length: 600 }, (_, i) => (i % 2 ? "1" : "0")), 100, 100]),
  ],
  "lc-354": [
    S("100000 random envelopes", () => {
      const r = rng(526);
      return [Array.from({ length: 100000 }, () => [between(r, 1, 100000), between(r, 1, 100000)])];
    }),
    S("100000 envelopes of the same width", () => [range(100000).map((i) => [7, i + 1])]),
    S("100000 envelopes nested in a chain", () => [range(100000).map((i) => [i + 1, i + 1])]),
  ],
  "lc-673": [
    S("2000 random numbers", () => [ints(2000, -1_000_000, 1_000_000, 527)]),
    S("2000 equal numbers", () => [fill(2000, 3)]),
    S("2000 rising numbers", () => [range(2000)]),
  ],
  "lc-312": [S("300 random balloons", () => [ints(300, 0, 100, 528)]), S("300 balloons of 100", () => [fill(300, 100)], 3000)],
};
