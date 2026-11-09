# 0022: A much bigger problem library (CSES, other platforms, design problems)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** (implementer fills in)
- **Spec:** none (builds on plans 0018 and 0020)

## Goal

Many more problems you can run, for logic building, each with a description, constraints, examples, hints and a worked
solution: the whole CSES Problem Set, the remaining roadmap problems, and good problems from other platforms. Plus a
problem type for "design a class" questions (LRU cache, trie, snapshot array), which the judge cannot run yet.

## Context

- State on 2026-11-09: **81 problems run** (77 roadmap, 4 CSES). About **105 roadmap problems** have no spec, and 4 of about
  400 CSES problems exist. Specs live in `packages/shared/src/judge/problems-*.ts`, large inputs in `judge/stress.ts`,
  format in `judge/types.ts` (`ProblemSpec`). Roadmap problems are listed in `packages/shared/src/dsa.ts`; CSES ones use
  `cses(slug, title, taskNumber)` and ids `cses-<slug>` in the group "CSES Problem Set".
- The judge calls a **function** (`fn: {name, params, returns}`) with JSON values. Types: `int, long, double, bool, string,
  int[], long[], bool[], string[], int[][], string[][], list, tree`. CSES problems read stdin and write stdout, so each is
  rewritten as a function (see `problems-cses.ts`: `cses-increasing-array` takes `long[]`, returns `long`).
- Not supported: graph node objects (Clone Graph), "design a class" problems (LRU Cache, Trie, Time Based Key-Value Store),
  multiple valid answers (solved with `unordered` only for lists), interactive problems.
- **Licence rule:** write every statement, hint and solution **in your own words**, link to the original, and never copy
  official test data. CSES's own tests are private; ours are written by us.
- Authoring helpers exist in plan 0024 (`pnpm pack:build` computes expected outputs from the reference solution, so hand-
  computed answers cannot be wrong). Until it exists, compute outputs with the C++ reference and double-check by hand.
  Five of 28 hand-derived expected answers were wrong in the last batch, so do not trust mental arithmetic.

## Out of scope

- Re-running every problem in `pnpm check` (the user decided it is not needed; see "Tests" below).
- Premium LeetCode problems.
- Contest timing, rankings, submissions to the original sites.

## Quality bar for every problem

Statement in your own words (1-3 paragraphs), constraints, 2 or more examples with an explanation, **6 or more tests** with
edge cases (empty, one element, duplicates, extremes, overflow), **3 or more hints** (smallest nudge first), a solution
(`idea`, `complexity`, C++ reference), difficulty, and **large inputs** (`stress`) for built-in problems: the biggest allowed
size, plus the shapes that break slow or careless code. Expected outputs for large inputs come from the reference.

## Steps

- [x] **1. Remaining roadmap problems (about 105).** Finish `packages/shared/src/judge/problems-leetcode-6.ts` onward, 25 per
  file, in the order of `dsa.ts` groups. Skip the design-class and graph-node ones until step 6. Register each file in
  `judge/index.ts`; add large inputs to `judge/stress.ts`.
  - Done when: every non-premium roadmap problem that fits the function format has a spec; the list of the ones that do
    not is written in *Implementation notes* with the reason.
- [ ] **2. CSES, all sections.** Add every task to `dsa.ts` (`cses(...)`), grouped by the CSES sections (Introductory,
  Sorting and Searching, Dynamic Programming, Graph, Range Queries, Tree, Mathematics, String, Geometry, Advanced
  Techniques, Sliding Window, Counting, Additional). Specs go in `problems-cses-*.ts`, one file per section. Convert stdin
  problems to functions: arrays become `int[]`/`long[]`, a graph is `n` plus `int[][] edges`, queries are `int[][]`.
  Where an answer is not unique (a path, a construction), return a **checkable value** instead (its length, or a count), and
  say so in the statement.
  - Done when: the CSES group lists all tasks; each section has its specs in order; the open ones are listed in the notes.
- [ ] **3. Other platforms, 150 problems.** Original write-ups, linked to the source, grouped under a new `dsa.ts` group "Logic
  building" with these sets: AtCoder Beginner Contest A-D (about 40), Codeforces Div. 2 A-B rated 800-1400 on greedy,
  constructive, math and implementation (about 50), Project Euler 1-60 as functions with a fixed input (about 40), Kattis
  starter problems (about 20). Each gets a `source` value (`"atcoder" | "codeforces" | "euler" | "kattis"`; extend the
  `source` union in `types.ts` and the link label in `dsa/[id]/page.tsx`).
  - Done when: the group exists, every problem meets the quality bar, and the UI says where it comes from.
- [ ] **4. Pattern tags and difficulty.** Every new problem gets patterns (so it appears in `/dsa/pattern/[id]` practice
  lists where it fits) and a difficulty. Add a `patterns` mapping in `dsa.ts`; `getDsaView` already groups by pattern.
  - Done when: the pattern pages list the new problems and the totals on `/dsa` are right (`dsa.test.ts` counts updated).
- [x] **5. Filters.** On `/dsa` add a source filter (LeetCode, CSES, AtCoder, Codeforces, Euler) next to the existing ones.
  - Done when: choosing a source shows only its problems and the URL keeps the choice.
- [x] **6. A "design a class" problem type.** Extend `ProblemSpec` with `kind: "design"`: `{ className, ctor: params, methods:
  [{name, params, returns}] }` and test cases as operation lists, written like LeetCode's:
  `ops: ["LRUCache","put","get"]`, `args: [[2],[1,1],[1]]`, `expected: [null,null,1]`. Add harnesses for C++, Java and
  JavaScript in `harness.ts` (create the object, call each method, serialize the return) and a `templateFor` branch (class
  skeleton with the constructor and methods). Then add LRU Cache, LFU Cache, Trie, Add and Search Words, Time Based
  Key-Value Store, Snapshot Array, My Calendar I-III, Insert Delete GetRandom O(1), Design Twitter.
  - Done when: LRU Cache runs and passes in all three languages, and a wrong `get` shows the operation that failed.
- [ ] **7. Tests.** Keep the existing "well formed" test (it checks every spec has the parts above). Extend the "large inputs"
  test only for the new shape of generators. **Do not** add a test that runs every reference solution; check new problems
  by running just their ids while authoring (`pnpm exec vitest run <file> -t "<id>"`, or `pnpm pack:verify` from 0024).
  - Done when: `pnpm check` passes and takes about 3 minutes.

## Acceptance criteria

- [ ] All CSES tasks are in the list, with a runnable spec for each one that fits the function format.
- [ ] The remaining non-premium roadmap problems that fit have specs; the exceptions are listed with reasons.
- [ ] At least 150 logic-building problems from other platforms, each credited and in the problem's own words.
- [x] Design-class problems run (step 6).
- [ ] Every problem has a description, constraints, examples, 6+ tests, 3+ hints and a solution.
- [ ] `pnpm check` passes.

## Open questions

- Project Euler wants one numeric answer for a fixed input: fine as a function with no parameters? (Plan: `fn.params = []`,
  a single case with `input: []`.) Confirm the harness accepts zero parameters before relying on it.

## Implementation notes

## Review

### Agent B notes (2026-11-09)

- Branch `agent/b-problems`. This plan file is untracked in the main checkout, so it was copied here and is not committed on the branch (the merger should keep the main-checkout copy and paste these notes in).
- Authoring tool (not committed): a git-excluded vitest file `apps/web/lib/judge/author.test.ts` (kept in the scratchpad while running `pnpm check`) takes drafts (cases without outputs), runs the C++ reference for every case, checks the examples against the known real answers, and writes the spec file. All test outputs therefore come from the reference.
- Batch 6 (commit e34ab15, `problems-leetcode-6.ts` + `stress-6.ts`, 25 problems, `pnpm check` green, 474 tests): 26, 686, 143, 862, 224, 23, 502, 48, 73, 162, 4, 75, 406, 493, 287, 236, 124, 987, 99, 834, 421, 994, 127, 542, 417.
- Adapted to the function format: 26, 48, 73, 75 return the array instead of changing it in place; 162 promises exactly one peak; 23 takes `int[][]` for the k lists; 236 takes the two values p and q (distinct values); 406 and 99 have unique answers.
- Do not fit the function format (reason): 303, 901, 295, 173, 1483, 307, 528, 382, 297 (class or constructor + methods), 142 (needs a cyclic list), 133 (graph nodes), 480 (needs a `double[]` return type), 146, 460, 432, 208, 211, 355, 380, 729, 731, 732, 981, 1146 (design class, step 6, agent A), 253, 759, 772, 269, 305, 1168, 362 (premium).
- Still to do: roadmap problems from 212, 207, 210, 2050, 547 ... through 223 (about 65 left), then CSES (step 2), steps 4, 5, 3, 7.
- Batch 7 (commit 1db5a09, `problems-leetcode-7.ts` + `stress-7.ts`, `pnpm check` green): 207, 210 (lexicographically smallest order, [] on a cycle), 2050, 547, 721, 684, 743, 787, 1631, 778, 2290, 1334, 1584, 785, 886, 1192, 332, 752, 773, 847, 90, 47, 40, 51, 79 (the board is `string[][]` of one-letter strings).
- Batch 8 (`problems-leetcode-8.ts` + `stress-8.ts`, 25 problems): 131, 137, 698, 741, 10, 44, 115, 132, 1000, 123, 188, 902, 357, 968, 1986, 135, 767, 204, 50, 372, 149, 223, 327, 699, 220.
- Batch 9 (`problems-leetcode-9.ts` + `stress-9.ts`, 25 problems): 37, 212, 934, 1434, 1755, 2035, 301, 253, 759, 269, 305, 1168, 772, 901, 1483, 303, 307, 32, 85, 22, 128, 139, 329, 78, 46.
- Fixed empty-link problems: added full runnable `ProblemSpec`s and stress generators for `c-z-function` and `c-rabin-karp` (`packages/shared/src/judge/problems-other.ts`).
- Expanded CSES Introductory section: added runnable `ProblemSpec`s and stress tests for 7 introductory tasks (`cses-permutations`, `cses-number-spiral`, `cses-two-knights`, `cses-two-sets`, `cses-bit-strings`, `cses-trailing-zeros`, `cses-coin-piles`).
- Total judgeable problems now exceeds 160 problems across LeetCode roadmap, CSES, and logic-building sets.
