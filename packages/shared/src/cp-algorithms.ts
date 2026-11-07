/**
 * Mapping of DSA pattern IDs to matching articles on cp-algorithms.com.
 * Paths are relative to `src/` in cp-algorithms/cp-algorithms, without `.md`.
 */
export const CP_ALGO_ARTICLES: Record<string, string[]> = {
  "sliding-window": ["data_structures/stack_queue_modification"],
  kadane: ["others/maximum_average_segment"],
  "string-matching": [
    "string/prefix-function",
    "string/z-function",
    "string/rabin-karp",
    "string/string-hashing",
  ],
  "bs-index": ["num_methods/binary_search"],
  "bs-answer": ["num_methods/binary_search"],
  quickselect: ["sequences/k-th"],
  "fast-slow": ["others/tortoise_and_hare"],
  "monotonic-deque": ["data_structures/stack_queue_modification"],
  "stack-parsing": [
    "string/expression_parsing",
    "combinatorics/bracket_sequences",
  ],
  "tree-dfs": ["graph/depth-first-search"],
  "tree-bfs": ["graph/breadth-first-search"],
  "binary-lifting": ["graph/lca_binary_lifting", "graph/lca"],
  trie: ["string/aho_corasick"],
  "graph-bfs": ["graph/breadth-first-search"],
  "graph-dfs": [
    "graph/depth-first-search",
    "graph/search-for-connected-components",
  ],
  "topo-sort": ["graph/topological-sort"],
  "union-find": ["data_structures/disjoint_set_union"],
  dijkstra: ["graph/dijkstra", "graph/dijkstra_sparse"],
  "bellman-ford": ["graph/bellman_ford", "graph/01_bfs"],
  "floyd-warshall": ["graph/all-pair-shortest-path-floyd-warshall"],
  mst: [
    "graph/mst_kruskal",
    "graph/mst_kruskal_with_dsu",
    "graph/mst_prim",
  ],
  bipartite: ["graph/bipartite-check"],
  tarjan: [
    "graph/bridge-searching",
    "graph/cutpoints",
    "graph/strongly-connected-components",
  ],
  eulerian: ["graph/euler_path"],
  "state-space-bfs": ["graph/breadth-first-search"],
  subsets: ["combinatorics/generating_combinations"],
  "bit-tricks": ["algebra/bit-manipulation", "algebra/gray-code"],
  "bitmask-dp-subsets": [
    "algebra/all-submasks",
    "dynamic_programming/profile-dynamics",
  ],
  "bitmask-dp-assign": ["algebra/all-submasks"],
  "dp-1d": ["dynamic_programming/intro-to-dp"],
  knapsack: ["dynamic_programming/knapsack"],
  lis: ["dynamic_programming/longest_increasing_subsequence"],
  "interval-dp": ["dynamic_programming/knuth-optimization"],
  "dp-optimizations": [
    "dynamic_programming/divide-and-conquer-dp",
    "dynamic_programming/knuth-optimization",
    "geometry/convex_hull_trick",
  ],
  "greedy-proof": ["schedules/schedule_one_machine"],
  "exchange-argument": ["schedules/schedule_one_machine"],
  "number-theory": [
    "algebra/sieve-of-eratosthenes",
    "algebra/binary-exp",
    "algebra/euclid-algorithm",
    "algebra/module-inverse",
  ],
  combinatorics: [
    "combinatorics/binomial-coefficients",
    "combinatorics/inclusion-exclusion",
  ],
  geometry: [
    "geometry/basic-geometry",
    "geometry/oriented-triangle-area",
    "geometry/convex-hull",
  ],
  "segment-tree": ["data_structures/segment_tree", "data_structures/fenwick"],
  "sparse-table": [
    "data_structures/sparse-table",
    "data_structures/sqrt_decomposition",
  ],
  "ordered-set": ["data_structures/treap"],
};

export function cpAlgoUrl(path: string): string {
  return `https://cp-algorithms.com/${path}.html`;
}
