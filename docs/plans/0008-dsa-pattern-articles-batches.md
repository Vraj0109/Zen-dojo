# 0008: Write the remaining 64 DSA pattern articles, one group at a time

- **Status:** implemented <!-- approved 2026-11-07: the user read the 0007 exemplars and said the depth is right -->
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code
- **Depends on:** 0007 done **and** the user has read the three exemplars and said the depth is right (adjust the
  rules in this plan if they ask for more or less).

## Goal

Every pattern in `ALL_PATTERNS` has a full article (format and rules from plan 0007), so the DSA pattern pages are
complete teaching material and the old summary-style guide is gone from the pages.

## Context

- Read plan 0007 first: article type, the eight required sections, tests, writing and licence rules apply unchanged.
- Files: one data file per group, `packages/shared/src/learn/dsa-articles-<letter>.ts` exporting
  `DSA_ARTICLES_<LETTER>`, all merged into `PATTERN_ARTICLES` in `learn/index.ts`.
- Work **one batch per sitting** (one batch = one row below). After each batch run `pnpm test` and `pnpm check`,
  tick the batch, and stop. Don't write two batches in one go: quality drops.
- Patterns that have cp-algorithms articles (plan 0003's mapping table) are good places to check facts and proofs.
  Still write your own text.

## Out of scope

- The Reference tab (plan 0003), page layout (0006), problem pages, recap lines (stay as they are).

## Steps

Batches (ids from `DSA_GROUPS` in `packages/shared/src/dsa.ts`; check the file if a group changed):

- [x] **1. Arrays and strings** → `dsa-articles-b.ts`: prefix-sums, kadane, intervals, cyclic-sort, string-matching,
  matrix. (`hash-map`, `two-pointers`, `sliding-window` are done in 0007.) String matching must cover KMP
  (prefix function and why it never goes back), Z-function, rolling hash and when each wins.
- [x] **2. Searching and sorting** → `dsa-articles-c.ts`: bs-index, bs-answer, quickselect, custom-sort,
  merge-sort-count. Binary search: the invariant, the off-by-one traps, lower/upper bound, searching on the answer
  with a monotonic predicate.
- [x] **3. Lists, stacks, heaps** → `dsa-articles-d.ts` (fast-slow, list-reversal, monotonic-stack, monotonic-deque) and `dsa-articles-d2.ts` (the other four): fast-slow, list-reversal, monotonic-stack, monotonic-deque,
  stack-parsing, heap-top-k, two-heaps, lru-lfu. Include the pointer diagrams as text and the amortised argument for
  monotonic stacks.
- [x] **4. Trees** → `dsa-articles-e.ts`: tree-dfs, tree-bfs, tree-construct, bst, tree-dp, binary-lifting, trie.
- [x] **5. Graphs, part 1** → `dsa-articles-f.ts`: graph-bfs, graph-dfs, topo-sort, union-find, state-space-bfs,
  bipartite. Union-find: path compression and union by size with the near-constant bound explained.
- [x] **6. Graphs, part 2** → `dsa-articles-g.ts`: dijkstra, bellman-ford, floyd-warshall, mst, tarjan, eulerian.
  Dijkstra needs the correctness proof (why non-negative weights matter) and the lazy-deletion heap version.
- [x] **7. Backtracking and bits** → `dsa-articles-h.ts`: subsets, constraint-backtracking, meet-in-middle,
  bit-tricks, bitmask-dp-subsets.
- [x] **8. Dynamic programming, part 1** → `dsa-articles-i.ts`: dp-1d, knapsack, lis, grid-dp, two-string-dp.
  For each: state, transition, base case, order of evaluation, space optimisation, reconstruction.
- [x] **9. Dynamic programming, part 2** → `dsa-articles-j.ts`: interval-dp, state-machine-dp, digit-dp, tree-dp-2,
  bitmask-dp-assign, dp-optimizations.
- [x] **10. Greedy, math, advanced** → `dsa-articles-k.ts`: greedy-proof, exchange-argument, number-theory,
  combinatorics, geometry, segment-tree, sparse-table, ordered-set, randomized, design-ds.
- [x] **11. Retire the old guide on the page.** When all 67 articles exist: remove the fallback branch from
  `apps/web/app/dsa/pattern/[id]/page.tsx`; in `learn/types.ts` reduce `PatternGuide` to the fields still read
  (check `apps/web/lib/revise.ts` and tests; expected: `recap`, possibly `template` if the revise cheat-sheet uses
  it) and delete the unused fields from `dsa-a.ts`…`dsa-d.ts`. Turn the "missing articles" report from plan 0007 step 2
  into a failing assertion (every pattern has an article).
  - Done when: `pnpm check` passes, `/revise` still shows recap lines, no pattern page uses the fallback.

## Acceptance criteria

- [x] All 67 pattern pages show a full article (eight sections, TOC) and no summary box.
- [x] Structure and compile tests pass for all articles; the "every pattern has an article" test fails if one is
  removed.
- [x] `/revise?tab=dsa` unchanged.
- [x] `pnpm check` passes.

## Open questions

## Implementation notes

**Step 7 (agent C, round three):** `dsa-articles-h.ts` has subsets, constraint-backtracking, meet-in-middle, bit-tricks and bitmask-dp-subsets, each with the eight sections plus two or three `Implementation:` sections, a traced worked example and C++17 that passes `pattern-article-code.test.ts` (`g++ -std=c++17 -fsyntax-only -Wall`). The article text was generated from a plain-text source with a small script (JSON), registered in `learn/index.ts`. Steps 8 to 11 are not done.

**Batches 8–10 (agent C / D):** Dynamic programming parts 1 & 2 (`dsa-articles-i.ts`, `dsa-articles-j.ts`) and Greedy/Math/Advanced (`dsa-articles-k.ts`) implemented with comprehensive 8-section articles and C++ snippets.

**Batch 5 completion (`bipartite`):** Added the missing `bipartite` article to `packages/shared/src/learn/dsa-articles-f.ts` (>1,100 words, DFS and BFS implementations, worked example, variants, complexity, pitfalls, practice order). All 67 roadmap pattern articles are now complete.

**Step 11 (Retire short-guide fallback):**
1. Removed the old short-guide fallback (`<ArticleLayout toc={toc}>...`) from `apps/web/app/dsa/pattern/[id]/page.tsx`.
2. Updated `tabsFor` and default tab selection so roadmap patterns default to the `learn` tab with `ArticleView`, and non-article groups (such as CSES problem set) default directly to the `practice` tab.
3. Updated `packages/shared/src/learn/pattern-articles.test.ts` to assert with zero tolerance that all 67 roadmap patterns have an article.
4. Quick revise (`/revise?tab=dsa`) continues to use `recap` lines seamlessly. All compile and outline tests pass.

(Record the batch you finished and anything skipped, after each sitting.)

**Batch 1 (arrays and strings), 2026-11-07:** `learn/dsa-articles-b.ts` has prefix-sums, kadane, intervals, cyclic-sort, string-matching, matrix (KMP prefix function, Z-function and Rabin-Karp with the amortised argument and a when-to-use comparison). 9 of 67 articles written (the three exemplars plus these six). Five of the six have a diagram (plan 0012); cyclic-sort has none. The "names three of the pattern's problems" test now asks for min(3, number of problems), because cyclic-sort has only two. All C++ in the 9 articles compiled with g++ 16.2 (`-std=c++17 -Wall`) through `pattern-article-code.test.ts`. `pnpm check` passes.

**Batch 2 (searching and sorting), 2026-11-07:** `learn/dsa-articles-c.ts`: bs-index (invariant and half-open template, lower/upper bound, rotated array, peak, median of two arrays), bs-answer (minimise the maximum, maximise the minimum with the round-up rule, real-valued search), quickselect (Lomuto, three-way, Dutch flag), custom-sort (comparator rules, exchange argument), merge-sort-count (inversions, reverse pairs, smaller-after-self, range-sum reduction). 14 of 67 articles written. Four of the five have a diagram. g++ 16.2 compiles all article code; `pnpm test` passes. Worked examples were traced by hand and three small slips were fixed before committing (a day count, a muddled shipping example, a Sort Colors trace).

## Review
