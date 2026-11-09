import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for batch 7 (problems-leetcode-7.ts): graphs, shortest paths and backtracking. Fixed seeds, biggest
// allowed sizes, and the shapes that break slow solutions. Valid-input promises (DAGs, trees, symmetric lists) are kept.

const { ints, fill, range, shuffled, S, rng, between } = H;

const grid = (r: number, c: number, f: (i: number, j: number) => number) => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));

/** Random pairs [a, b] with a < b (no repeats) among 0..n-1. */
function randomPairs(n: number, m: number, seed: number, base = 0): number[][] {
  const r = rng(seed);
  const seen = new Set<number>();
  const out: number[][] = [];
  while (out.length < m) {
    const a = between(r, 0, n - 2);
    const b = between(r, a + 1, n - 1);
    const key = a * n + b;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([a + base, b + base]);
  }
  return out;
}

/** A random DAG: every edge goes from a smaller to a larger number (given as [from, to] with the labels shifted by base). */
const dag = (n: number, m: number, seed: number, base: number) => randomPairs(n, m, seed, base);

/** Adjacency lists of an undirected graph with the given edges. */
function adjacency(n: number, edges: number[][]): number[][] {
  const g: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    g[a].push(b);
    g[b].push(a);
  }
  return g;
}

/** A random connected graph: a random tree plus extra edges. */
function connected(n: number, extra: number, seed: number): number[][] {
  const r = rng(seed);
  const edges: number[][] = range(n - 1, 1).map((v) => [between(r, 0, v - 1), v]);
  const seen = new Set(edges.map(([a, b]) => a * n + b));
  while (extra > 0) {
    const a = between(r, 0, n - 2);
    const b = between(r, a + 1, n - 1);
    if (seen.has(a * n + b)) continue;
    seen.add(a * n + b);
    edges.push([a, b]);
    extra--;
  }
  return edges;
}

const pointsRandom = (n: number, seed: number) => {
  const r = rng(seed);
  const seen = new Set<string>();
  const out: number[][] = [];
  while (out.length < n) {
    const p = [between(r, -1000000, 1000000), between(r, -1000000, 1000000)];
    const k = p.join(",");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
};

/** Three-letter airport code for a number (AAA, AAB, ...). */
const code = (i: number) => String.fromCharCode(65 + (Math.floor(i / 676) % 26), 65 + (Math.floor(i / 26) % 26), 65 + (i % 26));
const board = (r: number, c: number, f: (i: number, j: number) => string) => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));

const fourDigits = (seed: number, count: number) => {
  const r = rng(seed);
  const seen = new Set<string>();
  while (seen.size < count) seen.add(String(between(r, 1, 9999)).padStart(4, "0"));
  return [...seen];
};

export const STRESS_7: Record<string, StressCase[]> = {
  "lc-207": [S("2000 courses in a chain", () => [2000, range(1999, 1).map((i) => [i, i - 1])]), S("2000 courses in a cycle", () => [2000, range(2000).map((i) => [i, (i + 1) % 2000])]), S("5000 random prerequisites (no cycle)", () => [2000, dag(2000, 5000, 801, 0).map(([a, b]) => [b, a])])],
  "lc-210": [S("2000 courses in a chain", () => [2000, range(1999, 1).map((i) => [i - 1, i])]), S("2000 courses, no prerequisites", () => [2000, []]), S("5000 random prerequisites (no cycle)", () => [2000, dag(2000, 5000, 802, 0).map(([a, b]) => [b, a])]), S("a cycle at the end", () => [2000, [...range(1998, 1).map((i) => [i, i - 1]), [0, 1999], [1999, 1998]]])],
  "lc-2050": [S("50000 courses in a chain", () => [50000, range(49999, 1).map((i) => [i, i + 1]), ints(50000, 1, 10000, 811)]), S("50000 random relations", () => [50000, dag(50000, 50000, 812, 1), ints(50000, 1, 10000, 813)]), S("no relations", () => [50000, [], ints(50000, 1, 10000, 814)])],
  "lc-547": [S("200 cities all connected", () => [grid(200, 200, () => 1)]), S("200 isolated cities", () => [grid(200, 200, (i, j) => (i === j ? 1 : 0))]), S("200 cities in a path", () => [grid(200, 200, (i, j) => (Math.abs(i - j) <= 1 ? 1 : 0))])],
  "lc-721": [S("1000 accounts, one person", () => [range(1000).map((i) => ["Sam", `e${i}@x.com`, `e${i + 1}@x.com`])]), S("1000 accounts, all different people", () => [range(1000).map((i) => [`P${i}`, `u${i}@x.com`])]), S("1000 accounts with 10 emails and overlaps", () => [range(1000).map((i) => ["Al", ...range(10).map((k) => `m${(i * 7 + k * 13) % 3000}@y.com`)])])],
  "lc-684": [S("1000 nodes in a path, the extra edge at the end", () => [[...range(999, 1).map((i) => [i, i + 1]), [1, 1000]]]), S("1000 nodes, star plus one extra edge", () => [[...range(999, 2).map((i) => [1, i]), [2, 3]]]), S("1000 nodes in a cycle", () => [[...range(999, 1).map((i) => [i, i + 1]), [1, 1000]].reverse()])],
  "lc-743": [S("100 nodes, 6000 edges", () => { const base = randomPairs(100, 4950, 821); return [[...base.map(([a, b]) => [a + 1, b + 1, (a * 31 + b * 17) % 101]), ...base.slice(0, 1050).map(([a, b]) => [b + 1, a + 1, (a * 13 + b * 7) % 101])], 100, 1]; }), S("a chain of 100 nodes", () => [range(99, 1).map((i) => [i, i + 1, 100]), 100, 1]), S("start at the end of a chain (unreachable)", () => [range(99, 1).map((i) => [i, i + 1, 1]), 100, 100])],
  "lc-787": [S("100 cities, all flights, k = 99", () => [100, randomPairs(100, 4950, 831).map(([a, b]) => [a, b, between(rng(a * 131 + b), 1, 10000)]), 0, 99, 99]), S("100 cities, all flights, k = 0", () => [100, randomPairs(100, 4950, 832).map(([a, b]) => [a, b, between(rng(a * 137 + b), 1, 10000)]), 0, 99, 0]), S("a path of 100 cities, k = 5 (unreachable)", () => [100, range(99).map((i) => [i, i + 1, 1]), 0, 99, 5])],
  "lc-1631": [S("100 by 100 random heights", () => [grid(100, 100, (i, j) => 1 + ((i * 7919 + j * 104729) % 1000000))]), S("100 by 100 flat", () => [grid(100, 100, () => 5)]), S("100 by 100 zigzag", () => [grid(100, 100, (i, j) => ((i + j) % 2 ? 1000000 : 1))])],
  "lc-778": [S("50 by 50 shuffled elevations", () => { const v = shuffled(range(2500), 841); const i0 = v.indexOf(0); [v[0], v[i0]] = [v[i0], v[0]]; return [grid(50, 50, (i, j) => v[i * 50 + j])]; }), S("50 by 50 in reading order", () => [grid(50, 50, (i, j) => i * 50 + j)]), S("50 by 50 snake", () => [grid(50, 50, (i, j) => (i % 2 ? i * 50 + (49 - j) : i * 50 + j))])],
  "lc-2290": [S("316 by 316 random obstacles", () => [grid(316, 316, (i, j) => ((i === 0 && j === 0) || (i === 315 && j === 315) ? 0 : (i * 31 + j * 17 + i * j) % 3 === 0 ? 1 : 0))]), S("50000 by 2, a wall of obstacles in one column", () => [grid(50000, 2, (i, j) => (j === 0 && i > 0 && i < 49999 ? 1 : 0))]), S("1 by 100000 row", () => [[range(100000).map((j) => (j % 2 && j < 99999 ? 1 : 0))]]), S("316 by 316, all obstacles but the corners", () => [grid(316, 316, (i, j) => ((i === 0 && j === 0) || (i === 315 && j === 315) ? 0 : 1))])],
  "lc-1334": [S("100 cities, complete graph", () => [100, randomPairs(100, 4950, 851).map(([a, b]) => [a, b, between(rng(a * 101 + b), 1, 10000)]), 5000]), S("100 cities in a path", () => [100, range(99).map((i) => [i, i + 1, 1]), 10]), S("100 cities, huge weights, tiny threshold", () => [100, randomPairs(100, 300, 852).map(([a, b]) => [a, b, 10000]), 1])],
  "lc-1584": [S("1000 random points", () => [pointsRandom(1000, 861)]), S("1000 points on a line", () => [range(1000).map((i) => [i * 1000, 0])]), S("1000 points on a grid", () => [range(1000).map((i) => [(i % 32) * 10, Math.floor(i / 32) * 10])]), S("extreme corners", () => [range(1000).map((i) => [i % 2 ? 1000000 - i : -1000000 + i, i % 3 ? 1000000 - i : -1000000 + i])])],
  "lc-785": [S("100 nodes in an even cycle", () => [adjacency(100, range(100).map((i) => [Math.min(i, (i + 1) % 100), Math.max(i, (i + 1) % 100)]))]), S("100 nodes in an odd cycle", () => [adjacency(99, range(99).map((i) => [Math.min(i, (i + 1) % 99), Math.max(i, (i + 1) % 99)]))]), S("complete bipartite 50 + 50", () => [adjacency(100, range(50).flatMap((a) => range(50).map((b) => [a, 50 + b])))])],
  "lc-886": [S("2000 people in an even cycle of dislikes", () => [2000, range(2000, 1).map((i) => (i === 2000 ? [1, 2000] : [i, i + 1]))]), S("2000 people in an odd cycle", () => [1999, range(1999, 1).map((i) => (i === 1999 ? [1, 1999] : [i, i + 1]))]), S("10000 random dislikes", () => [2000, randomPairs(2000, 10000, 871, 1)])],
  "lc-1192": [S("100000 nodes in a path", () => [100000, range(99999).map((i) => [i, i + 1])]), S("100000 nodes in a cycle", () => [100000, [...range(99999).map((i) => [i, i + 1]), [0, 99999]]]), S("50000 nodes, random connected graph", () => [50000, connected(50000, 40000, 881)])],
  "lc-332": [S("300 tickets in one long cycle", () => [range(300).map((i) => [i === 0 ? "JFK" : code(i), i === 299 ? "JFK" : code(i + 1)])]), S("150 round trips JFK-AAA", () => [range(300).map((i) => (i % 2 ? ["AAA", "JFK"] : ["JFK", "AAA"]))]), S("a star with 150 spokes", () => [range(150).flatMap((i) => [["JFK", code(i)], [code(i), "JFK"]])])],
  "lc-752": [S("eight dead ends around the target", () => [["0100", "1000", "0010", "0001", "9000", "0900", "0090", "0009"], "1111"]), S("500 random dead ends", () => [fourDigits(891, 500).filter((x) => x !== "0000" && x !== "5555"), "5555"]), S("500 random dead ends, another target", () => [fourDigits(892, 500).filter((x) => x !== "0000" && x !== "8888"), "8888"])],
  "lc-773": [S("hardest known position", () => [[[4, 1, 2], [5, 0, 3]]]), S("unsolvable position", () => [[[1, 2, 3], [5, 4, 0]]]), S("scrambled", () => [[[3, 5, 4], [2, 1, 0]]])],
  "lc-847": [S("12 nodes in a path", () => [adjacency(12, range(11).map((i) => [i, i + 1]))]), S("12 nodes in a star", () => [adjacency(12, range(11, 1).map((i) => [0, i]))]), S("12 nodes, random connected graph", () => [adjacency(12, connected(12, 10, 901))]), S("12 nodes in a cycle", () => [adjacency(12, range(12).map((i) => [Math.min(i, (i + 1) % 12), Math.max(i, (i + 1) % 12)]))])],
  "lc-90": [S("ten distinct numbers (1024 subsets)", () => [range(10, 1)]), S("ten equal numbers", () => [fill(10, 3)]), S("ten numbers with duplicates", () => [[1, 1, 2, 2, 3, 3, 4, 4, 5, 5]])],
  "lc-47": [S("eight distinct numbers (40320 permutations)", () => [range(8, 1)]), S("eight equal numbers", () => [fill(8, 2)]), S("eight numbers with duplicates", () => [[1, 1, 2, 2, 3, 3, 4, 4]])],
  "lc-40": [S("100 candidates, target 30", () => [ints(100, 1, 50, 911), 30]), S("100 ones, target 30", () => [fill(100, 1), 30]), S("many small numbers", () => [ints(100, 1, 5, 912), 30])],
  "lc-51": [S("n = 9", () => [9]), S("n = 8", () => [8])],
  "lc-79": [S("6 by 6 of one letter, impossible word", () => [board(6, 6, () => "a"), "a".repeat(10) + "b"]), S("6 by 6 of one letter, long word", () => [board(6, 6, () => "a"), "a".repeat(15)]), S("6 by 6 mixed letters", () => [board(6, 6, (i, j) => "abc"[(i * 6 + j) % 3]), "abcabcabcabcabd"])],
};
