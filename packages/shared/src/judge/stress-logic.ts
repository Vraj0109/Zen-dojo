import { callList } from "./design";
import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for plan 0022: the remaining roadmap problems (problems-design-c.ts) and the logic-building problems
// from AtCoder, Codeforces, Project Euler and Kattis (problems-logic-*.ts). Fixed seeds, the biggest allowed sizes and
// the shapes that break slow or careless code. The expected answers come from the C++ reference at run time.

const { ints, fill, range, shuffled, letters, S, rng, between } = H;

const words = ["dream", "dreamer", "erase", "eraser"];
function daydream(len: number, seed: number): string {
  const r = rng(seed);
  let s = "";
  for (;;) {
    const w = words[between(r, 0, 3)];
    if (s.length + w.length > len) break;
    s += w;
  }
  return s;
}

/** 100000 plan legs that are all possible: the traveller moves right one step every time unit. */
const walkPlan = (n: number) => range(n, 1).map((i) => [i, i, 0]);

export const STRESS_LOGIC: Record<string, StressCase[]> = {
  // ---- remaining roadmap problems
  "lc-142": [
    S("100000 nodes, cycle at the head", () => [ints(100000, -100000, 100000, 7001), 0]),
    S("100000 nodes, cycle at the last node", () => [ints(100000, -100000, 100000, 7002), 99999]),
    S("100000 nodes, no cycle", () => [ints(100000, -100000, 100000, 7003), -1]),
    S("100000 nodes, cycle in the middle", () => [ints(100000, -100000, 100000, 7004), 50000]),
  ],
  "lc-480": [
    S("100000 random numbers, k = 50000", () => [ints(100000, -2147483648, 2147483647, 7011), 50000]),
    S("100000 random numbers, k = 1", () => [ints(100000, -2147483648, 2147483647, 7012), 1]),
    S("100000 sorted numbers, k = 1001", () => [range(100000).map((i) => i * 20000 - 1000000000), 1001]),
    S("100000 equal numbers, k = 99999", () => [fill(100000, 2147483647), 99999]),
    S("100000 numbers, k = n", () => [ints(100000, -1000, 1000, 7013), 100000]),
  ],
  "lc-295": [
    S("100000 random adds and medians", () => {
      const r = rng(7021);
      const ops: string[] = ["MedianFinder"];
      const args: unknown[][] = [[]];
      let added = 0;
      for (let i = 0; i < 99999; i++) {
        if (added > 0 && r() < 0.4) { ops.push("findMedian"); args.push([]); }
        else { ops.push("addNum"); args.push([between(r, -100000, 100000)]); added++; }
      }
      return callList(ops, args);
    }),
    S("50000 rising numbers then 50000 medians", () => {
      const ops: string[] = ["MedianFinder"];
      const args: unknown[][] = [[]];
      for (let i = 0; i < 50000; i++) { ops.push("addNum"); args.push([i - 25000]); }
      for (let i = 0; i < 49999; i++) { ops.push("findMedian"); args.push([]); }
      return callList(ops, args);
    }),
    S("alternating add and median with equal numbers", () => {
      const ops: string[] = ["MedianFinder"];
      const args: unknown[][] = [[]];
      for (let i = 0; i < 50000; i++) { ops.push("addNum"); args.push([7]); ops.push("findMedian"); args.push([]); }
      return callList(ops, args);
    }),
  ],
  "lc-432": [
    S("key i counted i + 1 times (all counts different), then max and min", () => {
      const ops: string[] = ["AllOne"];
      const args: unknown[][] = [[]];
      for (let i = 0; i < 440; i++) {
        const key = "k" + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26));
        for (let j = 0; j <= i; j++) { ops.push("inc"); args.push([key]); }
      }
      ops.push("getMaxKey", "getMinKey");
      args.push([], []);
      return callList(ops, args);
    }),
    S("one key up and down 25000 times, asking each time", () => {
      const ops: string[] = ["AllOne"];
      const args: unknown[][] = [[]];
      for (let i = 0; i < 25000; i++) {
        ops.push("inc", "getMaxKey", "getMinKey", "dec");
        args.push(["x"], [], [], ["x"]);
      }
      return callList(ops, args);
    }),
    S("a key counted 99000 times", () => {
      const ops: string[] = ["AllOne"];
      const args: unknown[][] = [[]];
      for (let i = 0; i < 99000; i++) { ops.push("inc"); args.push(["big"]); }
      ops.push("getMaxKey", "getMinKey");
      args.push([], []);
      return callList(ops, args);
    }),
  ],

  // ---- Project Euler
  "c-euler-1": [S("limit 10^8 with 3 and 5", () => [100000000, 3, 5]), S("a = b", () => [100000000, 7, 7]), S("a and b near 10^6", () => [99999999, 999983, 1000000])],
  "c-euler-2": [S("limit 4 * 10^15", () => [4000000000000000]), S("limit just below", () => [3999999999999999])],
  "c-euler-3": [S("a prime near 10^14", () => [99999999999973]), S("a number near 10^14", () => [99999980000001]), S("2^46", () => [70368744177664])],
  "c-euler-5": [S("n = 40", () => [40]), S("n = 39", () => [39])],
  "c-euler-6": [S("n = 10000", () => [10000]), S("n = 9999", () => [9999])],
  "c-euler-7": [S("the 1000000th prime", () => [1000000]), S("n = 999999", () => [999999]), S("n = 500000", () => [500000])],
  "c-euler-8": [
    S("1000 random digits, k = 13", () => [letters(1000, "0123456789", 7101), 13]),
    S("1000 nines, k = 13", () => ["9".repeat(1000), 13]),
    S("mostly zeros, k = 13", () => [letters(1000, "000000000123456789", 7102), 13]),
  ],
  "c-euler-9": [S("p = 30000", () => [30000]), S("p = 29998", () => [29998]), S("p = 27720", () => [27720])],
  "c-euler-10": [S("limit 20000000", () => [20000000]), S("limit 19999999", () => [19999999])],
  "c-euler-12": [S("more than 500 divisors", () => [500]), S("more than 499 divisors", () => [499])],
  "c-euler-14": [S("limit 3000000", () => [3000000]), S("limit 2999999", () => [2999999])],
  "c-euler-15": [S("100000 by 100000", () => [100000, 100000]), S("100000 by 0", () => [100000, 0]), S("99999 by 1", () => [99999, 1])],
  "c-euler-16": [S("2^50000", () => [50000]), S("2^49999", () => [49999])],
  "c-euler-24": [S("the last permutation of 10 digits", () => [10, 3628800]), S("the first", () => [10, 1]), S("the middle one", () => [10, 1814400])],
  "c-euler-28": [S("side 99999", () => [99999]), S("side 99997", () => [99997])],
  "c-euler-29": [S("n = 1000", () => [1000], 4000), S("n = 999", () => [999], 4000)],

  // ---- AtCoder
  "c-atc-abc086-a": [S("the biggest numbers", () => [10000, 9999])],
  "c-atc-abc081-b": [S("200 times 2^29", () => [fill(200, 536870912)]), S("200 random even numbers", () => [ints(200, 1, 500000000, 7201).map((x) => x * 2)]), S("200 random numbers", () => [ints(200, 1, 1000000000, 7202)])],
  "c-atc-abc087-b": [S("50 coins of each, 20000", () => [50, 50, 50, 20000]), S("50 coins of each, 10000", () => [50, 50, 50, 10000]), S("no 500s", () => [0, 50, 50, 5000])],
  "c-atc-abc083-b": [S("n = 10^6, all digit sums", () => [1000000, 1, 100]), S("n = 10^6, middle digit sums", () => [1000000, 20, 30])],
  "c-atc-abc088-b": [S("100000 random cards", () => [ints(100000, 1, 100, 7211)]), S("100000 equal cards", () => [fill(100000, 100)]), S("100000 cards in order", () => [range(100000).map((i) => (i % 100) + 1)])],
  "c-atc-abc085-b": [S("100000 random diameters", () => [ints(100000, 1, 100000, 7221)]), S("100000 equal diameters", () => [fill(100000, 5)]), S("100000 different diameters", () => [shuffled(range(100000, 1), 7222)])],
  "c-atc-abc085-c": [S("2000 bills, 20000000 yen", () => [2000, 20000000]), S("2000 bills, 3000000 yen", () => [2000, 3000000]), S("2000 bills, 12345000 yen", () => [2000, 12345000])],
  "c-atc-arc089-a": [
    S("100000 possible legs", () => [walkPlan(100000)]),
    S("100000 legs, the last one breaks the plan", () => { const p = walkPlan(100000); p[99999] = [100000, 100000, 1]; return [p]; }),
    S("100000 legs with spare time to burn", () => [range(100000, 1).map((i) => [i * 4, i, i])]),
  ],
  "c-atc-arc065-a": [
    S("100000 letters of dream", () => ["dream".repeat(20000)]),
    S("100000 letters of random words", () => [daydream(100000, 7231)]),
    S("random words plus a wrong ending", () => [daydream(99990, 7232) + "dreamerx"]),
    S("eraser repeated", () => ["eraser".repeat(16666)]),
  ],

  // ---- Codeforces
  "c-cf-4a": [S("w = 100", () => [100]), S("w = 99", () => [99])],
  "c-cf-1a": [S("10^7 by 10^7 with side 1", () => [10000000, 10000000, 1]), S("odd sizes", () => [10000000, 9999999, 3])],
  "c-cf-231a": [S("1000 random rows", () => [Array.from({ length: 1000 }, (_, i) => ints(3, 0, 1, 7301 + i))])],
  "c-cf-158a": [S("50 equal scores", () => [fill(50, 7), 25]), S("50 falling scores", () => [range(50).map((i) => 50 - i), 50])],
  "c-cf-50a": [S("10000 by 10000", () => [10000, 10000]), S("9999 by 9999", () => [9999, 9999])],
  "c-cf-263a": [S("the 1 in the corner", () => [[[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 1]]])],
  "c-cf-546a": [S("the biggest numbers", () => [100000, 0, 100000]), S("enough money", () => [100000, 1000000000, 100000])],
  "c-cf-158b": [S("100000 random groups", () => [ints(100000, 1, 4, 7311)]), S("100000 groups of 1", () => [fill(100000, 1)]), S("50000 threes and 50000 ones", () => [shuffled([...fill(50000, 3), ...fill(50000, 1)], 7312)]), S("100000 groups of 2", () => [fill(100000, 2)])],
  "c-cf-363b": [S("150000 random heights, k = 75000", () => [ints(150000, 1, 100, 7321), 75000]), S("150000 equal heights, k = 1", () => [fill(150000, 100), 1]), S("150000 random heights, k = 3", () => [ints(150000, 1, 100, 7322), 3])],
  "c-cf-580a": [S("100000 random earnings", () => [ints(100000, 1, 1000000000, 7331)]), S("100000 equal earnings", () => [fill(100000, 5)]), S("100000 rising earnings", () => [range(100000, 1)])],
  "c-cf-466a": [S("the biggest numbers", () => [1000, 999, 1, 1000]), S("a special ticket that pays off", () => [1000, 7, 10, 5])],
  "c-cf-1352c": [S("n = 2, k = 10^9", () => [2, 1000000000]), S("n = k = 10^9", () => [1000000000, 1000000000])],
  "c-cf-1475a": [S("2^46", () => [70368744177664]), S("a number near 10^14", () => [99999999999999])],

  // ---- Kattis
  "c-kattis-pot": [S("100 copies of 309", () => [fill(100, 309)]), S("100 random numbers", () => [ints(100, 10, 309, 7401)])],
  "c-kattis-tarifa": [S("100 months, nothing used", () => [100, fill(100, 0)]), S("100 months, some used", () => [100, ints(100, 0, 100, 7411)])],
  "c-kattis-sevenwonders": [S("50 random cards", () => [letters(50, "TCG", 7421)]), S("50 equal cards", () => ["T".repeat(50)])],
  "c-kattis-oddmanout": [S("99999 codes", () => { const base = range(49999, 1000000000); return [shuffled([...base, ...base, 777], 7431)]; }), S("a single code", () => [[2000000000]])],
  "c-kattis-planina": [S("n = 15", () => [15]), S("n = 14", () => [14])],
  "c-kattis-bijele": [S("ten of everything", () => [fill(6, 10)]), S("nothing found", () => [fill(6, 0)])],

  // ---- batch 2 (round five)
  "c-euler-4": [S("four-digit factors", () => [1000, 9999]), S("the full range", () => [1, 9999]), S("a narrow top range", () => [9000, 9999]), S("no palindrome exists", () => [10, 10])],
  "c-euler-17": [S("n = 99999", () => [99999]), S("n = 10000", () => [10000]), S("n = 1000", () => [1000])],
  "c-euler-19": [S("years 1900 to 100000", () => [1900, 100000]), S("a late short range", () => [99000, 100000]), S("1900 to 20000", () => [1900, 20000])],
  "c-euler-21": [S("limit 10^6", () => [1000000]), S("limit 500000", () => [500000]), S("limit 10^5", () => [100000])],
  "c-euler-26": [S("limit 20000", () => [20000]), S("limit 19999", () => [19999]), S("limit 10000", () => [10000])],
  "c-euler-31": [S("100 coins, target 10^5", () => [range(100, 1), 100000]), S("big coins, target 10^5", () => [range(100, 99901), 100000]), S("three coins, target 10^5", () => [[1, 99999, 50000], 100000])],
  "c-euler-35": [S("limit 10^7", () => [10000000]), S("limit 10^6 + 1", () => [1000001]), S("limit 9999999", () => [9999999])],
  "c-euler-48": [S("n = 10^5, 15 digits", () => [100000, 15]), S("n = 10^5, 10 digits", () => [100000, 10]), S("n = 99999, 1 digit", () => [99999, 1])],
  "c-atc-abc136-b": [S("n = 10^9", () => [1000000000]), S("n = 999999999", () => [999999999])],
  "c-atc-abc143-b": [S("50 hundreds", () => [fill(50, 100)]), S("50 random", () => [ints(50, 0, 100, 7511)])],
  "c-atc-abc146-b": [S("10000 random letters, n = 13", () => [13, letters(10000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 7521)]), S("10000 Z, n = 1", () => [1, "Z".repeat(10000)]), S("n = 26", () => [26, letters(10000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 7522)])],
  "c-atc-abc148-b": [S("100 + 100 letters", () => [letters(100, "abcdefghijklmnopqrstuvwxyz", 7531), letters(100, "abcdefghijklmnopqrstuvwxyz", 7532)])],
  "c-atc-abc149-b": [S("all 10^12", () => [1000000000000, 1000000000000, 1000000000000]), S("k eats into Aoki", () => [999999999999, 1000000000000, 1500000000000]), S("k too large", () => [1000000000000, 1, 1000000000000])],
  "c-atc-abc150-b": [S("50 letters of ABC repeating", () => ["ABC".repeat(16) + "AB"]), S("50 random A, B, C", () => [letters(50, "ABC", 7541)])],
  "c-cf-71a": [S("100 letters", () => [letters(100, "abcdefghijklmnopqrstuvwxyz", 7551)]), S("exactly 11 letters", () => ["abcdefghijk"])],
  "c-cf-118a": [S("100 random letters", () => [letters(100, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 7561)]), S("100 consonants", () => ["BcDfGhJkLmNpQrStVwXz".repeat(5)])],
  "c-cf-266a": [S("50 equal", () => ["R".repeat(50)]), S("50 random", () => [letters(50, "RGB", 7571)])],
  "c-cf-677a": [S("1000 random friends", () => [ints(1000, 1, 1000, 7581), 500]), S("1000 tall friends", () => [fill(1000, 1000), 500])],
  "c-cf-160a": [S("100 random coins", () => [ints(100, 1, 100, 7591)]), S("100 equal coins", () => [fill(100, 100)])],
  "c-cf-69a": [S("100 random forces", () => [Array.from({ length: 100 }, (_, i) => ints(3, -100, 100, 7601 + i))]), S("100 forces that cancel", () => [[...Array.from({ length: 50 }, (_, i) => ints(3, -100, 100, 7701 + i)), ...Array.from({ length: 50 }, (_, i) => ints(3, -100, 100, 7701 + i).map((x) => -x))]])],
  "c-cf-110a": [S("18 sevens", () => ["7".repeat(18)]), S("18 random digits", () => ["9" + letters(17, "0123456789", 7611)]), S("seven fours then others", () => ["4444444" + "1".repeat(11)])],
  "c-cf-339a": [S("99 terms", () => [Array.from({ length: 50 }, (_, i) => String(1 + ((i * 7) % 3))).join("+")]), S("49 threes", () => [fill(49, "3").join("+")])],
  "c-kattis-r2": [S("extremes", () => [-1000, 1000]), S("extremes reversed", () => [1000, -1000])],
  "c-kattis-spavanac": [S("23:59", () => [23, 59]), S("midnight", () => [0, 0])],
  "c-kattis-autori": [S("long name", () => [Array.from({ length: 25 }, () => "Abc").join("-")]), S("single letters", () => [Array.from({ length: 50 }, () => "A").join("-")])],
};
