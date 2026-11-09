import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES range queries, tree, math, and string problems (problems-cses-misc.ts).
// Fixed seeds, maximum allowed sizes, and edge case shapes.

const { ints, fill, range, letters, S } = H;

export const STRESS_CSES_MISC: Record<string, StressCase[]> = {
  "cses-static-range-sum-queries": [
    S("200000 random values, 200000 prefix queries", () => [ints(200000, 1, 1000000000, 701), Array.from({ length: 200000 }, (_, i) => [1, i + 1])]),
    S("200000 maximum values, full-array queries", () => [fill(200000, 1000000000), fill(200000, [1, 200000])]),
    S("200000 values, single-element queries", () => [range(200000, 1), Array.from({ length: 200000 }, (_, i) => [i + 1, i + 1])]),
  ],
  "cses-static-range-minimum-queries": [
    S("200000 random values, 200000 queries", () => [ints(200000, 1, 1000000000, 711), Array.from({ length: 200000 }, (_, i) => [(i % 100000) + 1, 100000 + (i % 100000) + 1])]),
    S("200000 decreasing values", () => [range(200000, 1).reverse(), Array.from({ length: 200000 }, (_, i) => [1, i + 1])]),
    S("200000 equal values", () => [fill(200000, 42), fill(200000, [1, 200000])]),
  ],
  "cses-dynamic-range-sum-queries": [
    S("200000 elements, alternating updates and queries", () => [ints(200000, 1, 1000000000, 721), Array.from({ length: 200000 }, (_, i) => (i % 2 === 0 ? [1, Math.floor(i / 2) + 1, 500000000] : [2, 1, Math.floor(i / 2) + 1]))]),
    S("200000 updates then queries", () => [fill(200000, 1), Array.from({ length: 200000 }, (_, i) => (i < 100000 ? [1, i + 1, 100] : [2, 1, 200000]))]),
    S("200000 elements, full range queries", () => [ints(200000, 1, 1000, 722), fill(200000, [2, 1, 200000])]),
  ],
  "cses-subordinates": [
    S("200000 employees in a star hierarchy", () => [200000, fill(199999, 1)]),
    S("200000 employees in a line", () => [200000, range(199999, 1)]),
    S("200000 employees in a binary tree", () => [200000, Array.from({ length: 199999 }, (_, i) => Math.floor((i + 2) / 2))]),
  ],
  "cses-tree-diameter": [
    S("200000 nodes line graph", () => [200000, Array.from({ length: 199999 }, (_, i) => [i + 1, i + 2])]),
    S("200000 nodes star graph", () => [200000, Array.from({ length: 199999 }, (_, i) => [1, i + 2])]),
    S("200000 nodes balanced binary tree", () => [200000, Array.from({ length: 199999 }, (_, i) => [Math.floor((i + 2) / 2), i + 2])]),
  ],
  "cses-exponentiation": [
    S("base and exponent 10^9", () => [1000000000, 1000000000]),
    S("0 to the power of 0", () => [0, 0]),
    S("Fermat's little theorem (exponent mod-1)", () => [2, 1000000006]),
    S("large base, zero exponent", () => [999999999, 0]),
  ],
  "cses-counting-divisors": [
    S("x = 720720 (highly composite)", () => [720720]),
    S("x = 1000000 (largest bound)", () => [1000000]),
    S("x = 999983 (large prime)", () => [999983]),
    S("x = 1 (minimum)", () => [1]),
  ],
  "cses-common-divisors": [
    S("200000 numbers with multiple 500000", () => [[...ints(199998, 1, 1000000, 731), 500000, 1000000]]),
    S("200000 consecutive integers", () => [range(200000, 800000)]),
    S("200000 equal numbers of 1000000", () => [fill(200000, 1000000)]),
    S("200000 distinct small numbers", () => [range(200000, 1)]),
  ],
  "cses-binomial-coefficients": [
    S("100000 queries near upper bound", () => [Array.from({ length: 100000 }, (_, i) => [1000000 - (i % 100), 500000 - (i % 50)])]),
    S("100000 queries with b = 0 or b = a", () => [Array.from({ length: 100000 }, (_, i) => [i + 1, i % 2 === 0 ? 0 : i + 1])]),
    S("100000 queries with a = 1000000", () => [Array.from({ length: 100000 }, (_, i) => [1000000, i + 1])]),
  ],
  "cses-fibonacci-numbers": [
    S("n = 10^18", () => [1000000000000000000]),
    S("n = 10^15", () => [1000000000000000]),
    S("n = 10^9", () => [1000000000]),
    S("n = 0", () => [0]),
  ],
  "cses-string-matching": [
    S("1000000 letters, 1000 letter pattern with overlaps", () => ["a".repeat(1000000), "a".repeat(1000)]),
    S("1000000 random letters, 5 letter pattern", () => [letters(1000000, "abcdefgh", 741), letters(5, "abcdefgh", 742)]),
    S("1000000 letters, pattern missing at the end", () => ["a".repeat(999999) + "b", "a".repeat(500) + "c"]),
    S("pattern equals string", () => ["ab".repeat(500000), "ab".repeat(500000)]),
  ],
};
