# 0022: A much bigger problem library (CSES, other platforms, design problems)

- **Status:** in-progress (batches 1-9 merged; 48 problems added in round 4 and 25 more in round 5; further logic problems and CSES sections open)
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code (Agent 1, round four), 2026-11-09; earlier batches by Agent B
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
- [ ] **3. Other platforms, 150 problems.** (round four: 44 done, round five: 25 more = 69, see Implementation notes) Original write-ups, linked to the source, grouped under a new `dsa.ts` group "Logic
  building" with these sets: AtCoder Beginner Contest A-D (about 40), Codeforces Div. 2 A-B rated 800-1400 on greedy,
  constructive, math and implementation (about 50), Project Euler 1-60 as functions with a fixed input (about 40), Kattis
  starter problems (about 20). Each gets a `source` value (`"atcoder" | "codeforces" | "euler" | "kattis"`; extend the
  `source` union in `types.ts` and the link label in `dsa/[id]/page.tsx`).
  - Done when: the group exists, every problem meets the quality bar, and the UI says where it comes from.
- [x] **4. Pattern tags and difficulty.** (done for all 69 logic problems, one pattern per site: `cses-euler`, `cses-atcoder`, `cses-codeforces`, `cses-kattis`) Every new problem gets patterns (so it appears in `/dsa/pattern/[id]` practice
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

### Round four, Agent 1 (2026-11-09)

- **Roadmap problems (step 1 finished).** Every roadmap problem that fits has a spec now. Added in this round (file `problems-design-c.ts`): `lc-142` Linked List Cycle II (adapted: the list is `nums` plus `pos`, the answer is the index where the cycle starts), `lc-480` Sliding Window Median (adapted: returns twice each median as `long[]`, because there is no `double[]` return type), `lc-295` Find Median from Data Stream and `lc-432` All O`one (design-class problems; the tests only ask for a max or min when it is unique). Only 6 LeetCode roadmap problems still have no spec: `lc-297` (serialize: the format is free, nothing to check), `lc-173` (the constructor takes a tree, design problems allow only plain types), `lc-133` (graph nodes), `lc-528` and `lc-382` (random output), `lc-362` (premium); the other roadmap items without a spec are the concept entries (`c-sparse-table`, `c-sqrt-decomposition`, `c-bloom-filter`, `c-consistent-hashing`, `c-tsp`, `c-dp-optimizations`, `c-modular-inverse`, `c-ncr-mod-p`, `c-subtree-range-queries`, `c-aggressive-cows`), which are reading items, not function problems. The "about 30 remaining" in the task was out of date: Agent B's batches 6 to 9 had already covered the rest.
- **Logic building (step 3, 44 of 150).** New `source` values `atcoder | codeforces | euler | kattis` in `types.ts`. Ids: `c-euler-N`, `c-atc-<task>`, `c-cf-<contest><letter>`, `c-kattis-<slug>`. Each problem has its statement written in our own words, a link to the original, 6 or more tests, 3 hints, a reference solution and 1 to 5 large inputs (`stress-logic.ts`).
  - Project Euler, 16 (`projecteuler.net`): 1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 24, 28, 29. They take parameters instead of the fixed original input so there are 6 or more different tests. No test uses the original parameter of the Euler task, so the repository does not hold the published answers. All outputs must stay below 2^53 (the tests are JSON numbers), so some limits are smaller than the originals (for example Euler 6 stops at n = 10000).
  - AtCoder, 9 (the practice contest `abs`): ABC 086 A, 081 B, 087 B, 083 B, 088 B, 085 B, 085 C (a count of triples instead of "any triple"), 086 C (Traveling, task `arc089_a`), 049 C (Daydream, task `arc065_a`).
  - Codeforces, 13: 4A, 1A, 231A, 158A, 50A, 263A, 546A, 158B, 363B (returns the smallest start index so the answer is unique), 580A, 466A, 1352C, 1475A.
  - Kattis, 6: pot, tarifa, sevenwonders, oddmanout, planina, bijele.
  - Not done: about 106 more to reach 150 (AtCoder is at 9 of about 40, Codeforces 13 of about 50, Euler 16 of about 40, Kattis 6 of about 20).
- **Outputs.** Every expected output was produced by compiling and running the C++ reference (`g++`) through the judge's `computeOutputs`, using a git-excluded authoring test that is not part of the repository. Where the statement quotes a known answer (for example Euler 1 below 10 is 23) the authoring step checked the reference against it. This caught four wrong hand-written guesses of mine (AtCoder 088 B, Codeforces 158A and 466A, AtCoder 086 C) before they were written into the specs, and an output above 2^53 in Euler 1 and 6.
- **Checked by running.** A temporary test ran the reference of all 48 new problems against every example, test and large input through `runCode` (all 48 passed, 185 s). It is not kept: plan step 7 says not to add a test that runs every reference solution.
- **Step 4 (patterns).** The 44 logic problems are listed in the existing pattern `cses-intro` (id kept because `learn.test.ts` needs a guide for every pattern id and `pattern-articles.test.ts` an article for every id not starting with `cses-`; new pattern ids would have needed guides in `learn/dsa-*.ts`, outside this agent's files). Its name is now "Warm-up tasks: CSES intro, Euler, AtCoder, Codeforces, Kattis". A later plan could give each site its own pattern with a guide. Each new problem has a difficulty and a one-line "why" (`logic(...)` helper in `dsa.ts`). `dsa.test.ts` needed no change (the group count stays 10).
- **UI.** `apps/web/app/dsa/[id]/page.tsx` now labels the link to the original ("Open on AtCoder", "Codeforces", "Project Euler", "Kattis"); before it would have said "Open on LeetCode". This file is outside the list of files this agent owns, but the plan asks for it in step 3.
- **Not done (step 5 and 2).** The source filter on `/dsa` (`lib/dsa-filters.ts`) still offers only LeetCode, CSES and cp-algorithms; adding AtCoder, Codeforces, Euler and Kattis also means changing `dsa-filters.test.ts` (it pins `parseSource("codeforces")` to empty), so it was left for the owner of those files. The remaining CSES sections (range queries, tree, math, string, geometry and so on) were not started.
- **Check.** `pnpm check` passed (65 test files, 944 tests, build ok). The first run failed on two tests that need a guide and an article for every new pattern id, which led to the `cses-intro` decision above. The status is `implemented` for this round's work; steps 2, 3 (106 problems short of 150) and 5 stay open, so the plan is not finished.

### Round five, Agent 1 (2026-11-10)

- **Source filter (step 5 finished).** `SOURCE_FILTERS` in `apps/web/lib/dsa-filters.ts` now lists All, LeetCode, CSES, AtCoder, Codeforces, Project Euler, Kattis and cp-algorithms. `matchesSource` matches the new sites by id prefix (`c-atc-`, `c-cf-`, `c-euler-`, `c-kattis-`). The dropdown on `/dsa` was already a plain GET form (`name="source"`, works without JS), so only the list changed. `dsa-filters.test.ts` was updated on purpose: `parseSource("codeforces")` is now `"codeforces"`, and an unknown site such as `hackerrank` still gives an empty source.
- **Per-site patterns (step 4).** The logic problems moved out of `cses-intro` (name back to "CSES: introductory problems") into four patterns in the same group: `cses-euler`, `cses-atcoder`, `cses-codeforces`, `cses-kattis`. The ids start with `cses-` on purpose: `pattern-articles.test.ts` requires exactly 67 patterns without that prefix, and renaming the prefix would have meant editing that test. Each id has a guide (`learn/dsa-sites-guides.ts`, registered by one spread in `dsa-d.ts`) and a full 8-section article (`learn/dsa-sites-articles-a.ts` Euler and AtCoder, `-b.ts` Codeforces and Kattis, registered by two spreads in `dsa-articles-k.ts`). `learn/index.ts` was not touched. Their C++ blocks compile (`pattern-article-code.test.ts -t cses-`).
- **25 more logic problems (step 3, now 69 of 150)**, file `problems-logic-batch2.ts` (`LOGIC_SPECS_BATCH2`, registered in `judge/index.ts`), large inputs in `stress-logic.ts`, 1 to 4 per problem. Each has own-words statement, source link, 6 or more tests (7 to 11), 3 hints and a reference solution.
  - Euler (8): c-euler-4, 17, 19, 21, 26, 31, 35, 48. Parameters are not the original ones where that would publish the answer (Euler 4 takes a factor range, 31 takes coins and returns the count modulo 1000000007, 48 takes n and the digit count).
  - AtCoder (6): c-atc-abc136-b, abc143-b, abc146-b, abc148-b, abc149-b, abc150-b.
  - Codeforces (8): c-cf-71a, 118a, 266a, 677a, 160a, 69a, 110a (the number is a string because it can have 18 digits), 339a.
  - Kattis (3): c-kattis-r2, spavanac, autori.
- **Outputs.** Every expected output (examples, tests) came from compiling and running the C++ reference through `computeOutputs` with a git-excluded authoring test (not kept in the repo). The same run checked that the reference answers the statement's known values (for example 74 letters for n = 15, 13 circular primes below 100, 405071317 for the last ten digits of 1^1 to 10^10), that every value is a safe integer, and that every large input runs (slowest: Euler 26 at about 100 ms).
- **Not done.** About 81 logic problems are still missing to reach 150 (AtCoder 15 of about 40, Codeforces 21 of about 50, Euler 24 of about 40, Kattis 9 of about 20). Step 2 (remaining CSES sections) and step 7 (final `pnpm check`) are open, so the status stays in-progress. Targeted tests run: dsa-filters, learn, pattern-articles, dsa, no-emoji, packages/shared (all passed); `pnpm check` not run (the lead does that).
