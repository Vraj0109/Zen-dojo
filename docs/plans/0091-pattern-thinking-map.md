# 0091: Pattern thinking map in Quick revise (thinking map, how to read a problem, groups, recall)

- **Status:** done
- **Planned by:** Claude Code, 2026-11-20 (the user asked Claude to implement it, with parallel agents)
- **Implemented by:** Claude Code agents
- **Change 2026-11-20:** the user does not want an Akinator-style question engine; view 2 teaches how to read a
  problem instead (routine, clues, worked examples, optimisation moves).
- **Spec:** approved mockup `docs/mockups/pattern-map/pattern-map.html` (also https://claude.ai/artifact/5aabiW4ojFHZT7jbrqP1hb,
  private). Read it before building: the UI must match it.

## Goal

A **Pattern map** section in Quick revise (`/revise?tab=map`) that teaches *how to think* when you meet a new problem:

1. **Thinking map** (default view): Step 1 constraints → time budget; Step 2 a branching tree *signal → pattern →
   variation*. Every pattern and variation has "use it when", a key idea, "watch out for", a template with complexity,
   example LeetCode problems, and links into the app (pattern guide, practice).
2. **How to read a problem** (replaces the mockup's "Which pattern?"). Not a quiz or a question-and-answer bot (the
   user rejected that): it *teaches the identification method* the way a good mentor would:
   - a short **reading routine** (5-6 steps: read constraints and turn n into a time budget; name the input shape;
     name exactly what is asked; underline clue words; write the brute force and ask what repeats/what it wastes; pick
     the pattern that removes that waste and check it against the constraints);
   - a **clue dictionary**: phrase you see in a statement -> what it points to -> why (and the common false friend),
     grouped by clue type (constraint clues, wording clues, input clues, output clues), searchable/filterable;
   - **worked examples** (about 20-30 across all signals): a one-line paraphrase of the problem (own words, never the
     LeetCode text), its clues highlighted, the reasoning in 3-5 short steps, the brute force and why it is too slow,
     the pattern + variation chosen, and the trap people fall into;
   - **brute force -> optimisation moves**: "if the brute force recomputes a range sum -> prefix sums", "rescans a
     window -> sliding window", "tries every split -> interval DP"... a table that teaches how to get from naive to
     the pattern.
3. **Pattern groups**: the group mind map from the mockup.
4. **Recall**: the cue → name-the-pattern drill; "Shaky" adds a review item using the existing review/struggle machinery
   only if one fits cleanly, otherwise it stays local (say which in Implementation notes).

**Coverage is a tested property, not a claim:** every pattern in `DSA_GROUPS` (76 ids) and every official LeetCode topic
tag (list below) is reachable from the thinking map, and every pattern is reachable from at least one clue.

## Data model (contract between the two agents: implement exactly these exports)

New file `packages/shared/src/thinking-map.ts` (pure, no I/O), exported from `packages/shared/src/index.ts`:

```ts
export type FeatureKey =
  | "input"      // "array" | "string" | "linked-list" | "tree" | "graph" | "grid" | "intervals" | "numbers" | "matrix" | "stream" | "design" | "bits"
  | "ask"        // "optimal-value" | "count-ways" | "all-solutions" | "exists" | "kth" | "path" | "order" | "transform" | "query" | "simulate"
  | "shape"      // "contiguous" | "subsequence" | "pairs" | "subsets" | "ranges" | "levels" | "components" | "dependencies" | "none"
  | "sorted"     // "yes" | "can-sort" | "no"
  | "size"       // "tiny" (<=20) | "small" (<=5e3) | "large" (<=1e6) | "huge" (>1e6 or value range)
  | "weights"    // "none" | "non-negative" | "negative" | "binary"
  | "updates"    // "static" | "point-updates" | "range-updates" | "online"
  | "overlap";   // "yes" (same subproblem repeats) | "no"
export type Features = Partial<Record<FeatureKey, string[]>>; // values that fit this node; missing key = any

export interface ThinkVariation {
  id: string; label: string; when: string; key: string;
  examples?: string[];          // app problem ids (e.g. "lc-3") or LeetCode slugs "slug:minimum-window-substring"
  features?: Features;          // narrows the parent pattern's features
}
export interface ThinkPattern {
  id: string;                   // a DSA pattern id from DSA_GROUPS when one exists, else a new id (e.g. "simulation")
  label: string; when: string; key: string; watch: string[];
  template?: { lang: "python"; code: string; complexity: string };
  variations: ThinkVariation[];
  features: Features;
  tags: string[];               // LeetCode topic tags this pattern covers (from LEETCODE_TAGS)
  appPattern?: string;          // DSA_GROUPS pattern id to link to the guide/practice (often === id)
  covers?: string[];            // other DSA_GROUPS ids this node also stands for (e.g. "tree-dp-2" under "tree-dp")
}
export interface ThinkSignal { id: string; label: string; when: string; patterns: string[] /* ThinkPattern ids */ }
export interface ConstraintHint { n: string; budget: string; fits: string }

export const CONSTRAINT_HINTS: ConstraintHint[];
export const THINK_SIGNALS: ThinkSignal[];          // ~12-16 signals, each pattern in >=1 signal
export const THINK_PATTERNS: Record<string, ThinkPattern>;
export const LEETCODE_TAGS: string[];               // official LeetCode topic tags (see list below)

// How to read a problem
export interface ReadStep { id: string; title: string; body: string; ask: string[] /* questions to ask yourself */ }
export const READING_ROUTINE: ReadStep[];
export type ClueKind = "constraint" | "wording" | "input" | "output";
export interface Clue {
  id: string; kind: ClueKind;
  phrase: string;               // what you see, e.g. "longest substring ... at most k distinct"
  points: string[];             // ThinkPattern ids (or "pattern/variation")
  why: string;                  // why it points there
  falseFriend?: string;         // when the same words mean something else
}
export const CLUES: Clue[];
export interface WorkedExample {
  id: string; title: string;    // short own-words title
  problem?: string;             // app problem id or "slug:<leetcode-slug>"
  statement: string;            // one-line paraphrase in our own words
  clues: string[];              // Clue ids it shows
  steps: string[];              // 3-5 reasoning steps
  brute: string;                // brute force and why it is too slow
  pattern: string; variation?: string;
  trap: string;
}
export const WORKED_EXAMPLES: WorkedExample[];
export interface OptimizeMove { waste: string; fix: string; pattern: string }
export const OPTIMIZE_MOVES: OptimizeMove[];
```


`LEETCODE_TAGS` (official topic tags, include all): Array, String, Hash Table, Dynamic Programming, Math, Sorting, Greedy,
Depth-First Search, Binary Search, Database (map to "out of scope: SQL" node, see below), Matrix, Tree, Breadth-First
Search, Bit Manipulation, Two Pointers, Prefix Sum, Heap (Priority Queue), Simulation, Binary Tree, Graph, Stack,
Counting, Sliding Window, Design, Enumeration, Backtracking, Union Find, Linked List, Number Theory, Ordered Set,
Monotonic Stack, Segment Tree, Trie, Combinatorics, Bitmask, Divide and Conquer, Queue, Recursion, Geometry, Binary
Indexed Tree, Memoization, Hash Function, Binary Search Tree, Shortest Path, String Matching, Topological Sort, Rolling
Hash, Game Theory, Interactive, Data Stream, Monotonic Queue, Brainteaser, Doubly-Linked List, Randomized, Merge Sort,
Counting Sort, Iterator, Concurrency, Probability and Statistics, Quickselect, Suffix Array, Line Sweep, Minimum
Spanning Tree, Bucket Sort, Shell, Reservoir Sampling, Strongly Connected Component, Eulerian Circuit, Radix Sort,
Rejection Sampling, Biconnected Component.

Database, Shell and Concurrency are not algorithm patterns: put them in one clearly labelled "Not an algorithm problem"
signal (SQL / shell / threads) with short guidance, so the map still covers them honestly.

## Steps

- [x] **1. Data + engine (agent A).** `thinking-map.ts` with the exports above. Content: all signals from the mockup plus
  what is needed for full coverage (math/number theory, simulation and enumeration, string matching/rolling hash/suffix
  array/trie, linked list operations, design/iterator/data stream, game theory/brainteaser/interactive, geometry/line
  sweep, randomized/sampling, bit manipulation, sorting family, divide and conquer, ordered set, SCC/bridges/Euler, MST,
  shortest path variants…). Every one of the 76 `DSA_GROUPS` pattern ids appears as a `ThinkPattern` (or as
  `appPattern` of one). Original text, plain and accurate; templates in Python, correct and short. 2-6 variations for
  the main patterns. Reading routine, 60+ clues covering every pattern, 20-30 worked examples (at least one per signal),
  15+ optimisation moves. All text in our own words.
  - Done when: the tests in step 3 pass.
- [x] **2. UI (agent B).** `apps/web/app/revise/page.tsx`: add tab `{ id: "map", label: "Pattern map" }` to `TABS` and
  render `<PatternMapTab />` (new files under `apps/web/app/revise/pattern-map/`). Views as segmented tabs with the
  shared `SlidingPill`/`Tabs` (`?view=think|read|groups|recall`, default think), matching the mockup: constraints strip,
  collapsible horizontal tree with connectors (vertical indented list under 760px of content width via container query),
  side detail card (sticky on desktop), "Open every branch / Close all". Read view (`?view=read`, replaces `find`) = the routine as numbered
  steps, the clue dictionary (filter chips by kind + text filter, each clue links to its pattern node in the thinking
  map), worked examples as expandable cards (statement, highlighted clues, steps, brute force, answer, trap; answer
  hidden behind "Show the pattern" so the reader thinks first, works without JS via `<details>`), and the optimisation
  moves table. Groups view = mockup mind map (SVG). Recall = mockup
  drill. Real progress: solved/total per pattern from `getDsaView()` (server) passed as props; mastery = solid when all
  solved, shaky when some solved or re-solve due, else not started. Works without JS for the thinking map (render the
  tree server-side with `<details>` so branches open without JS; enhance with JS). Respect motion-off. Tokens only.
  - Done when: `/revise?tab=map` matches the mockup at 1280 and 390 px, light and dark.
- [x] **3. Tests (agent A).** `packages/shared/src/thinking-map.test.ts`:
  - every `DSA_GROUPS` pattern id (except the `cses-*` source buckets, which are problem sources, not patterns) is a
    `THINK_PATTERNS` key, some pattern's `appPattern`, or in some pattern's `covers`;
  - every built-in problem (`DSA_PROBLEMS` or whatever `dsa.ts` exports) has a pattern that maps to a think node;
  - every `LEETCODE_TAGS` tag is in at least one pattern's `tags`;
  - every pattern is in at least one signal, every signal's pattern ids exist, ids unique;
  - every variation `examples` entry is a real app problem id or a `slug:` string;
  - every pattern is pointed to by at least one clue; every clue/example/move references existing pattern
    (and variation) ids; every worked example's clue ids exist; at least one worked example per signal;
  - templates are non-empty and contain no tab characters; no emoji in any text.
  UI tests (agent B): `apps/web/app/revise/pattern-map/*.test.ts(x)` render test: map tab renders the constraints strip,
  every signal, and the reading routine.
- [x] **4. Lead:** review, browser check, `pnpm check`, plan Review.

## Implementation notes (agent A, 2026-11-21)

- `packages/shared/src/thinking-map.ts` (exports and types unchanged from the contract) now holds: 12 constraint hints,
  82 patterns (67 non-cses `DSA_GROUPS` ids with `tree-dp-2` under `tree-dp` and `bitmask-dp-assign` under
  `bitmask-dp-subsets` via `covers`, plus 17 extra nodes for the remaining LeetCode tags), 258 variations, 77 Python
  templates, 16 signals, 6 reading steps, 132 clues (21 constraint, 85 wording, 13 input, 13 output; 39 with a false
  friend), 30 worked examples and 37 optimisation moves. All 71 `LEETCODE_TAGS` are covered.
- Decisions: the graph signal holds all 12 graph patterns (shortest path and MST included) to keep the signal count at 16;
  Tarjan carries the SCC and biconnected tags, Eulerian carries Eulerian Circuit; Database, Shell and Concurrency live in
  one `not-algorithm` node under a signal with the same id. A `pattern/variation` string is valid wherever a pattern id
  is allowed in `Clue.points` and `OptimizeMove.pattern`; `WorkedExample.variation` is the bare variation id.
  Pattern ids with no `DSA_GROUPS` entry have no `appPattern`.
- The `cses-*` buckets are problem sources, not patterns, so they are not nodes (the test skips them).
- `packages/shared/src/thinking-map.test.ts` (25 tests) checks coverage, references, counts, templates (no tabs) and
  emoji. All 77 templates were also parsed and run against small inputs with a throwaway Python script (not committed).
- Checked: `pnpm exec vitest run packages/shared/src/thinking-map.test.ts` passes; `tsc --noEmit` passes in
  `packages/shared` and `apps/web`. Group "Pattern groups" and Recall (Shaky) are agent B's work (step 2).

## Implementation notes (agent B, 2026-11-21)

- `apps/web/app/revise/pattern-map/`: `pattern-map.tsx` (view strip on the shared `Tabs`), `think-view.tsx` +
  `think-map.tsx` (server-rendered `<details>` tree, `?node=` selects without JS, client detail card),
  `read-view.tsx` + `clue-dictionary.tsx`, `groups-view.tsx` (SVG from 760px content width, list below),
  `recall-view.tsx` (client-only Solid/Shaky; no review integration, stated on the page), `mastery.tsx`, `lib.ts`,
  `reveal.ts`, `pattern-map.css`, `pattern-map.test.ts` (`.ts` because the root Vitest config only picks up `*.test.ts`
  under `apps/`). Template code is a plain `<pre>` (no Shiki) to keep the payload small for 80 patterns.

## Review (Claude Code, 2026-11-21)

**Verdict: done.**

- Contract, coverage tests and UI match the plan after the change to a teaching view (no question engine).
- Fixed during review: the pattern summary of a node with variations had no `aria-current` (the `?node=` test failed
  with real data); the wide tree was centred vertically, which left tall empty gaps, and needed four columns so the
  variations were cut off beside the detail card. The tree is now top-aligned (`--pm-stub`), the decorative "New
  problem" root is hidden and nodes are 230px max, so signal -> pattern -> variation fits beside the card at 1280px.
- Browser (dev server, the user's data read-only): 1280px thinking map, groups, recall; 390px read view (routine, clue
  dictionary, worked examples), no page overflow. Light mode and 768px not checked separately.
- Not verified: the `slug:` examples were written from memory and are only format-checked.
- `pnpm check`: see the final report.

## Out of scope

Changing pattern guides, problems or the Practice pages; AI generation; new database tables.
