import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES tree problems (problems-cses-tree.ts). Fixed seeds, the biggest allowed sizes and the shapes
// that break slow or careless code: a long chain (deep recursion, worst case for naive walking), a star (huge degree),
// a balanced binary tree, a random tree and a broom (a long handle with a big star on the end).

const { ints, fill, range, rng, S } = H;

const N = 200000;
type Shape = "path" | "star" | "binary" | "random" | "broom";

/** Parent of node i (index 2..n) for a tree shape; indexes 0 and 1 are unused. */
function parents(n: number, shape: Shape, seed: number): number[] {
  const r = rng(seed);
  const p: number[] = [0, 0];
  for (let i = 2; i <= n; i++) {
    if (shape === "path") p.push(i - 1);
    else if (shape === "star") p.push(1);
    else if (shape === "binary") p.push(i >> 1);
    else if (shape === "broom") p.push(i <= n / 2 ? i - 1 : Math.floor(n / 2));
    else p.push(1 + Math.floor(r() * (i - 1)));
  }
  return p;
}
/** Edge list [child, parent] for the shape. */
const edgesOf = (n: number, shape: Shape, seed: number): number[][] => {
  const p = parents(n, shape, seed);
  return range(n - 1, 2).map((i) => [i, p[i]]);
};
/** Boss array: bosses[i] is the boss of employee i + 2. */
const bossesOf = (n: number, shape: Shape, seed: number): number[] => parents(n, shape, seed).slice(2);
/** q random pairs of numbers in 1..n */
const pairs = (q: number, n: number, seed: number): number[][] => {
  const a = ints(q, 1, n, seed);
  const b = ints(q, 1, n, seed + 1);
  return a.map((x, i) => [x, b[i]]);
};
/** Alternate point updates and queries. kind "sub": [2, s]; "pair": [2, a, b]. */
const mixed = (q: number, n: number, seed: number, kind: "sub" | "pair"): number[][] => {
  const a = ints(q, 1, n, seed);
  const b = ints(q, 1, n, seed + 1);
  const v = ints(q, 1, 1000000000, seed + 2);
  return a.map((x, i) => (i % 2 === 0 ? [1, x, v[i]] : kind === "sub" ? [2, x] : [2, x, b[i]]));
};

export const STRESS_CSES_TREE: Record<string, StressCase[]> = {
  "cses-tree-matching": [
    S("200000 nodes in a line", () => [N, edgesOf(N, "path", 1)]),
    S("200000 nodes in a star", () => [N, edgesOf(N, "star", 1)]),
    S("200000 nodes in a binary tree", () => [N, edgesOf(N, "binary", 1)]),
    S("200000 nodes in a random tree", () => [N, edgesOf(N, "random", 2001)]),
  ],
  "cses-tree-distances-i": [
    S("200000 nodes in a line", () => [N, edgesOf(N, "path", 1)]),
    S("200000 nodes in a star", () => [N, edgesOf(N, "star", 1)]),
    S("200000 nodes in a broom", () => [N, edgesOf(N, "broom", 1)]),
    S("200000 nodes in a random tree", () => [N, edgesOf(N, "random", 2011)]),
  ],
  "cses-tree-distances-ii": [
    S("200000 nodes in a line (sums near 2e10)", () => [N, edgesOf(N, "path", 1)]),
    S("200000 nodes in a star", () => [N, edgesOf(N, "star", 1)]),
    S("200000 nodes in a binary tree", () => [N, edgesOf(N, "binary", 1)]),
    S("200000 nodes in a random tree", () => [N, edgesOf(N, "random", 2021)]),
  ],
  "cses-company-queries-i": [
    S("200000 employees in a line, random queries", () => [N, bossesOf(N, "path", 1), pairs(N, N, 2031)]),
    S("200000 employees in a line, k always one", () => [N, bossesOf(N, "path", 1), range(N, 1).map((x) => [x, 1])]),
    S("200000 employees in a random tree", () => [N, bossesOf(N, "random", 2032), pairs(N, N, 2033)]),
    S("200000 employees in a binary tree", () => [N, bossesOf(N, "binary", 1), pairs(N, N, 2034)]),
  ],
  "cses-company-queries-ii": [
    S("200000 employees in a line", () => [N, bossesOf(N, "path", 1), pairs(N, N, 2041)]),
    S("200000 employees in a star", () => [N, bossesOf(N, "star", 1), pairs(N, N, 2042)]),
    S("200000 employees in a random tree", () => [N, bossesOf(N, "random", 2043), pairs(N, N, 2044)]),
    S("200000 employees in a broom", () => [N, bossesOf(N, "broom", 1), pairs(N, N, 2045)]),
  ],
  "cses-distance-queries": [
    S("200000 nodes in a line", () => [N, edgesOf(N, "path", 1), pairs(N, N, 2051)]),
    S("200000 nodes in a star", () => [N, edgesOf(N, "star", 1), pairs(N, N, 2052)]),
    S("200000 nodes in a random tree", () => [N, edgesOf(N, "random", 2053), pairs(N, N, 2054)]),
    S("200000 nodes in a binary tree", () => [N, edgesOf(N, "binary", 1), pairs(N, N, 2055)]),
  ],
  "cses-counting-paths": [
    S("200000 nodes in a line, random paths", () => [N, edgesOf(N, "path", 1), pairs(N, N, 2061)]),
    S("200000 nodes in a line, every path end to end", () => [N, edgesOf(N, "path", 1), fill(N, [1, N])]),
    S("200000 nodes in a random tree", () => [N, edgesOf(N, "random", 2062), pairs(N, N, 2063)]),
    S("200000 nodes in a star", () => [N, edgesOf(N, "star", 1), pairs(N, N, 2064)]),
  ],
  "cses-subtree-queries": [
    S("200000 nodes in a line, mixed queries", () => [ints(N, 1, 1000000000, 2071), edgesOf(N, "path", 1), mixed(N, N, 2072, "sub")]),
    S("200000 nodes in a star, mixed queries", () => [fill(N, 1000000000), edgesOf(N, "star", 1), mixed(N, N, 2073, "sub")]),
    S("200000 nodes in a random tree, mixed queries", () => [ints(N, 1, 1000000000, 2074), edgesOf(N, "random", 2075), mixed(N, N, 2076, "sub")]),
    S("200000 maximum values, root sums only", () => [fill(N, 1000000000), edgesOf(N, "binary", 1), fill(N, [2, 1])]),
  ],
  "cses-path-queries": [
    S("200000 nodes in a line, mixed queries", () => [ints(N, 1, 1000000000, 2081), edgesOf(N, "path", 1), mixed(N, N, 2082, "sub")]),
    S("200000 nodes in a star, mixed queries", () => [fill(N, 1000000000), edgesOf(N, "star", 1), mixed(N, N, 2083, "sub")]),
    S("200000 nodes in a random tree, mixed queries", () => [ints(N, 1, 1000000000, 2084), edgesOf(N, "random", 2085), mixed(N, N, 2086, "sub")]),
    S("200000 maximum values in a line, deepest node sums", () => [fill(N, 1000000000), edgesOf(N, "path", 1), fill(N, [2, N])]),
  ],
  "cses-path-queries-ii": [
    S("200000 nodes in a line, mixed queries", () => [ints(N, 1, 1000000000, 2091), edgesOf(N, "path", 1), mixed(N, N, 2092, "pair")]),
    S("200000 nodes in a star, mixed queries", () => [ints(N, 1, 1000000000, 2093), edgesOf(N, "star", 1), mixed(N, N, 2094, "pair")]),
    S("200000 nodes in a binary tree, mixed queries", () => [ints(N, 1, 1000000000, 2095), edgesOf(N, "binary", 1), mixed(N, N, 2096, "pair")]),
    S("200000 nodes in a random tree, mixed queries", () => [ints(N, 1, 1000000000, 2097), edgesOf(N, "random", 2098), mixed(N, N, 2099, "pair")]),
    S("200000 nodes in a broom, queries between far nodes", () => [ints(N, 1, 1000000000, 2100), edgesOf(N, "broom", 1), range(N).map((i) => (i % 2 === 0 ? [1, i + 1, 1000000000 - i] : [2, 1, N - (i % 1000)]))]),
  ],
  "cses-distinct-colors": [
    S("200000 nodes in a line, all colors different", () => [range(N, 1), edgesOf(N, "path", 1)]),
    S("200000 nodes in a line, one color", () => [fill(N, 7), edgesOf(N, "path", 1)]),
    S("200000 nodes in a random tree, 1000 colors", () => [ints(N, 1, 1000, 2111), edgesOf(N, "random", 2112)]),
    S("200000 nodes in a star, huge color values", () => [ints(N, 1, 1000000000, 2113), edgesOf(N, "star", 1)]),
  ],
  "cses-finding-a-centroid": [
    S("200000 nodes in a line", () => [N, edgesOf(N, "path", 1)]),
    S("200000 nodes in a star", () => [N, edgesOf(N, "star", 1)]),
    S("199999 nodes in a line (odd, one centroid)", () => [N - 1, edgesOf(N - 1, "path", 1)]),
    S("200000 nodes in a random tree", () => [N, edgesOf(N, "random", 2121)]),
  ],
  "cses-fixed-length-paths-i": [
    S("200000 nodes in a line, k = 100000", () => [N, 100000, edgesOf(N, "path", 1)]),
    S("200000 nodes in a star, k = 2", () => [N, 2, edgesOf(N, "star", 1)]),
    S("200000 nodes in a random tree, k = 5", () => [N, 5, edgesOf(N, "random", 2131)]),
    S("200000 nodes in a binary tree, k = 12", () => [N, 12, edgesOf(N, "binary", 1)]),
    S("200000 nodes in a broom, k = 50000", () => [N, 50000, edgesOf(N, "broom", 1)]),
  ],
  "cses-fixed-length-paths-ii": [
    S("200000 nodes in a line, lengths 1 to 200000", () => [N, 1, N, edgesOf(N, "path", 1)]),
    S("200000 nodes in a star, lengths 2 to 2", () => [N, 2, 2, edgesOf(N, "star", 1)]),
    S("200000 nodes in a random tree, lengths 3 to 8", () => [N, 3, 8, edgesOf(N, "random", 2141)]),
    S("200000 nodes in a binary tree, lengths 5 to 20", () => [N, 5, 20, edgesOf(N, "binary", 1)]),
    S("200000 nodes in a broom, lengths 1000 to 90000", () => [N, 1000, 90000, edgesOf(N, "broom", 1)]),
  ],
};
