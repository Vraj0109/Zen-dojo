import { H, type TN } from "./stress";
import type { StressCase } from "./types";

// Large inputs for batch 6 (problems-leetcode-6.ts). Same rules as stress.ts: fixed seeds, biggest allowed sizes, and
// the shapes that break slow or careless code. Where a problem promises a unique or valid input, the generator keeps it.

const { ints, fill, range, shuffled, level, bstFromSorted, chain, S, rng, between } = H;

const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
const grid = (r: number, c: number, f: (i: number, j: number) => number) => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));

/** A valid BST of n nodes with two values swapped, as a level-order array. */
function swappedBst(n: number, i: number, j: number): (number | null)[] {
  const root = bstFromSorted(range(n, 1)) as TN;
  const inorder: TN[] = [];
  const walk = (x: TN | null) => {
    if (!x) return;
    walk(x.l);
    inorder.push(x);
    walk(x.r);
  };
  walk(root);
  [inorder[i].v, inorder[j].v] = [inorder[j].v, inorder[i].v];
  return level(root);
}

/** A valid queue for "Queue Reconstruction": distinct heights in a random order, with k computed from it, then shuffled. */
function people(n: number, seed: number): number[][] {
  const queue = shuffled(range(n, 1), seed).map((h) => h * 7);
  const out = queue.map((h, i) => [h, queue.slice(0, i).filter((x) => x >= h).length]);
  return shuffled(out, seed + 1);
}

/** n + 1 numbers from 1..n where `dup` appears `times` times and the other values at most once. */
function duplicates(n: number, dup: number, times: number, seed: number): number[] {
  const rest = shuffled(range(n, 1).filter((x) => x !== dup), seed).slice(0, n + 1 - times);
  return shuffled([...rest, ...fill(times, dup)], seed + 1);
}

function randomTreeEdges(n: number, seed: number): number[][] {
  const r = rng(seed);
  return range(n - 1, 1).map((v) => [between(r, 0, v - 1), v]);
}

function wordSet(count: number, len: number, alphabet: string, seed: number): string[] {
  const r = rng(seed);
  const seen = new Set<string>();
  while (seen.size < count) {
    let w = "";
    for (let i = 0; i < len; i++) w += alphabet[Math.floor(r() * alphabet.length)];
    seen.add(w);
  }
  return [...seen];
}

export const STRESS_6: Record<string, StressCase[]> = {
  "lc-26": [S("30000 sorted random numbers", () => [sorted(ints(30000, -100, 100, 601))]), S("30000 equal numbers", () => [fill(30000, 7)]), S("201 distinct numbers, each three times", () => [sorted([...range(201, -100), ...range(201, -100), ...range(201, -100)])])],
  "lc-686": [S("a is one letter, b is 10000 letters", () => ["a", "a".repeat(10000)]), S("b needs a third copy of a", () => ["a".repeat(4999) + "b", "b" + "a".repeat(4999) + "b" + "a".repeat(4998)]), S("no match in 10000 letters", () => ["ab".repeat(5000), "ab".repeat(4999) + "ba"])],
  "lc-143": [S("50000 random nodes", () => [ints(50000, 1, 1000, 611)]), S("49999 nodes (odd length)", () => [ints(49999, 1, 1000, 612)]), S("50000 equal nodes", () => [fill(50000, 5)])],
  "lc-862": [S("100000 random numbers, k = 1000000", () => [ints(100000, -10000, 10000, 621), 1000000]), S("100000 times 10000, k = 10^9 (the whole array)", () => [fill(100000, 10000), 1000000000]), S("100000 negative numbers, k = 1", () => [fill(100000, -5), 1]), S("alternating 10000 and -10000, k = 10000", () => [range(100000).map((i) => (i % 2 ? -10000 : 10000)), 10000])],
  "lc-224": [S("deeply nested brackets (10000 levels)", () => ["(".repeat(10000) + "1" + ")".repeat(10000)]), S("15000 terms", () => ["1+".repeat(14999) + "1"]), S("nested subtractions", () => ["1-(".repeat(5000) + "1" + ")".repeat(5000)])],
  "lc-23": [S("20 lists of 500", () => [range(20).map((i) => sorted(ints(500, -10000, 10000, 630 + i)))]), S("10000 lists of one", () => [ints(10000, -10000, 10000, 631).map((x) => [x])]), S("9999 empty lists and one full", () => [[...fill(9999, [] as number[]), sorted(ints(500, 0, 100, 632))]])],
  "lc-502": [S("100000 projects, k = 100000, w = 0", () => [100000, 0, ints(100000, 0, 10000, 641), ints(100000, 0, 20000, 642)]), S("all capital 0", () => [100000, 0, ints(100000, 0, 10000, 643), fill(100000, 0)]), S("nothing affordable", () => [100000, 0, ints(100000, 0, 10000, 644), fill(100000, 1000000000)]), S("capital rising with the index", () => [50000, 1, ints(100000, 1, 10000, 645), range(100000).map((i) => i * 3)])],
  "lc-48": [S("20 by 20 numbers", () => [grid(20, 20, (i, j) => ((i * 37 + j * 91) % 2001) - 1000)]), S("1 by 1", () => [[[5]]])],
  "lc-73": [S("200 by 200 with a few zeros", () => [grid(200, 200, (i, j) => ((i * 7 + j * 13) % 97 === 0 ? 0 : ((i + j) % 50) + 1))]), S("200 by 200 all zeros", () => [grid(200, 200, () => 0)]), S("200 by 200 without a zero", () => [grid(200, 200, (i, j) => i + j + 1)])],
  "lc-162": [S("100000 numbers rising then falling", () => [[...range(60000), ...range(40000).map((i) => 59998 - i)]]), S("100000 rising numbers", () => [range(100000)]), S("100000 falling numbers", () => [range(100000).map((i) => 100000 - i)]), S("peak in the first third, extreme first value", () => [[-2147483648, ...range(33333, -1000), ...range(66666).map((i) => -1001 - i)]])],
  "lc-4": [S("two sorted arrays of 1000", () => [sorted(ints(1000, -1000000, 1000000, 651)), sorted(ints(1000, -1000000, 1000000, 652))]), S("all of one array is smaller", () => [range(1000, -5000), range(1000, 5000)]), S("one array of 1000 and one empty", () => [[], sorted(ints(1000, -1000000, 1000000, 653))]), S("1000 equal numbers each", () => [fill(1000, 5), fill(1000, 5)])],
  "lc-75": [S("300 random colours", () => [ints(300, 0, 2, 661)]), S("300 in reverse order", () => [[...fill(100, 2), ...fill(100, 1), ...fill(100, 0)]]), S("300 twos", () => [fill(300, 2)])],
  "lc-406": [S("2000 people", () => [people(2000, 671)]), S("2000 people, all k = 0 (rising queue)", () => [shuffled(range(2000, 1).map((h) => [h, 0]), 672)]), S("2000 people in a falling queue", () => [shuffled(range(2000, 1).map((h) => [h, 2000 - h]), 673)])],
  "lc-493": [S("50000 random numbers over the whole range", () => [ints(50000, -2147483648, 2147483647, 681)]), S("50000 falling numbers (many pairs)", () => [range(50000).map((i) => 2147483647 - i * 40000)]), S("50000 equal numbers", () => [fill(50000, 1073741824)]), S("50000 rising numbers", () => [range(50000)])],
  "lc-287": [S("100001 numbers, one value twice", () => [duplicates(100000, 77777, 2, 691)]), S("100001 copies of the same number", () => [fill(100001, 100000)]), S("half the array is the duplicate", () => [duplicates(100000, 5, 50000, 692)])],
  "lc-236": [S("10000-node chain, the two deepest nodes", () => [chain(range(10000, 1), "left"), 10000, 9999]), S("complete tree of 100000 nodes", () => [range(100000, 1), 100000, 99999]), S("complete tree, nodes in different halves", () => [range(100000, 1), 65536, 32768])],
  "lc-124": [S("complete tree of 30000 random values", () => [ints(30000, -1000, 1000, 701)]), S("10000-node chain", () => [chain(ints(10000, -1000, 1000, 702), "right")]), S("30000 nodes, all -1000", () => [fill(30000, -1000)]), S("30000 nodes, all 1000", () => [fill(30000, 1000)])],
  "lc-987": [S("complete tree of 1000 nodes", () => [range(1000, 0)]), S("1000-node chain", () => [chain(range(1000, 0), "left")]), S("1000 nodes with equal values", () => [fill(1000, 5)])],
  "lc-99": [S("1000 nodes, far-apart values swapped", () => [swappedBst(1000, 3, 996)]), S("1000 nodes, neighbouring values swapped", () => [swappedBst(1000, 499, 500)]), S("1000-node chain, the two ends swapped", () => [chain([1, ...range(998).map((i) => 999 - i), 1000], "left")])],
  "lc-834": [S("30000-node path", () => [30000, range(29999).map((i) => [i, i + 1])]), S("30000-node star", () => [30000, range(29999, 1).map((i) => [0, i])]), S("random tree of 30000 nodes", () => [30000, randomTreeEdges(30000, 711)])],
  "lc-421": [S("200000 random numbers", () => [ints(200000, 0, 2147483647, 721)]), S("200000 equal numbers", () => [fill(200000, 2147483647)]), S("200000 small numbers", () => [ints(200000, 0, 1000, 722)])],
  "lc-994": [S("10 by 10, one rotten corner", () => [grid(10, 10, (i, j) => (i === 0 && j === 0 ? 2 : 1))]), S("10 by 10 mixed", () => [grid(10, 10, (i, j) => ((i * 5 + j * 3) % 7 === 0 ? 2 : (i + j) % 5 === 0 ? 0 : 1))]), S("10 by 10, the far corner is walled off", () => [grid(10, 10, (i, j) => (i === 0 && j === 0 ? 2 : i + j === 9 ? 0 : 1))])],
  "lc-127": [S("5000 random words of length 10", () => { const w = wordSet(5000, 10, "abc", 731); return [w[0], w[4999], w.slice(1)]; }), S("5000 words, end word not in the list", () => { const w = wordSet(5000, 10, "abc", 732); return [w[0], "zzzzzzzzzz", w.slice(1)]; }), S("5000 words of length 4", () => { const w = wordSet(5000, 4, "abcdefghijklmnopqrstuvwxyz", 733); return [w[0], w[1], w.slice(2)]; })],
  "lc-542": [S("100 by 100, one zero in a corner", () => [grid(100, 100, (i, j) => (i === 0 && j === 0 ? 0 : 1))]), S("10000 by 1 column, zero at the end", () => [grid(10000, 1, (i) => (i === 9999 ? 0 : 1))]), S("100 by 100 with zeros spread out", () => [grid(100, 100, (i, j) => ((i * 31 + j * 17) % 11 === 0 ? 0 : 1))])],
  "lc-417": [S("200 by 200 random heights", () => [grid(200, 200, (i, j) => (i * 977 + j * 463) % 100001)]), S("200 by 200 all equal", () => [grid(200, 200, () => 0)]), S("200 by 200 rising diagonally", () => [grid(200, 200, (i, j) => i + j)]), S("200 by 200 bowl", () => [grid(200, 200, (i, j) => Math.abs(i - 100) + Math.abs(j - 100))])],
};
