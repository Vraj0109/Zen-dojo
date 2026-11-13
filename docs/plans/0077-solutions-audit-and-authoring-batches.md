# 0077: Solutions audit and multi-approach authoring batches

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-13
- **Implemented by:** (implementer fills in)
- **Spec:** content work on top of plan 0076 (model, tooling, UI). **Do not start step 4 onward before 0076 is `done`.**
  Steps 1 to 3 (audit tooling) can start earlier because they only read the problem files.

## Goal

1. Find, repeatably, the problems whose reference solution is probably not the one an interviewer expects (Group Anagrams is the
   known example).
2. Rewrite the most asked interview problems first, then everything else, as several approaches from brute force to optimal
   with complexity, trade-off text, and C++, Java and Python code that all pass the existing tests.
3. Split the 486 problems into batches of about 25 that parallel agents can own without touching the same files.

## Context (verified 2026-11-13)

- **Group Anagrams (`lc-49`), what it does today.** C++ (`packages/shared/src/judge/problems-leetcode-2.ts`, `id: "lc-49"`,
  around lines 678 to 705): copies each string, `sort`s it, uses it as the `unordered_map` key; complexity text
  "O(n * k log k) time, O(n * k) space." `packages/shared/content/solutions/lc-49.java` sorts a `char[]` and uses
  `new String(arr)` as the key; `lc-49.py` uses `''.join(sorted(s))`. So all three languages use the sorted-word key, which is
  O(n*k*log k). The optimal for lowercase letters is a 26-length count array used as the key (O(n*k)); the problem's own hint
  and idea text already mention this ("a key made of the 26 letter counts avoids sorting each word"). Nothing was changed.
  Constraints and tests are not re-read here; the implementer confirms the alphabet is lowercase letters in the statement
  before writing the count-key version.
- Other files in the folder for the priority list exist as pairs: `lc-1`, `lc-3`, `lc-15`, `lc-56`, `lc-207`, `lc-238`,
  `lc-347`, `lc-560` (all `.java` and `.py`). Their text was not reviewed for optimality: that is the audit's job.
- Problems: 486 built-in, defined in `packages/shared/src/judge/problems-*.ts` and arranged in three author groups in
  `packages/shared/src/judge/solution-groups.ts` (`SOLUTION_GROUPS`, `groupIds`, `groupOf`): `d` 163, `e` 159, `f` 164.
- Patterns (the 67 in `packages/shared/src/dsa.ts`, pattern ids in `dsa.ts` such as `hash-map`, `two-pointers`,
  `sliding-window`, `heap-top-k`) link only about 201 problems; they do not cover all 486. Batches below therefore follow the
  spec arrays (file ownership), with pattern ids used for priority.
- Tools: `pnpm solutions:status|todo|verify|check` (plan 0063/0076). `pnpm solutions:build` is lead-only.

## Verified ids for the first batch (priority tier 0)

Exist (file in `packages/shared/src/judge/`): `lc-1` (problems-leetcode.ts), `lc-49`, `lc-15`, `lc-56`, `lc-238`, `lc-200`,
`lc-322` (problems-leetcode-2.ts), `lc-347`, `lc-560`, `lc-76`, `lc-215`, `lc-42` (problems-leetcode-3.ts), `lc-3`, `lc-121`,
`lc-53`, `lc-70`, `lc-11` (problems-leetcode.ts), `lc-300` (problems-leetcode-4.ts), `lc-207` (problems-leetcode-7.ts),
`lc-128`, `lc-253` (problems-leetcode-9.ts), `lc-146` (problems-design-a.ts).
**Do not exist:** `lc-242` (Valid Anagram), `lc-125` (Valid Palindrome). Do not add problems in this plan; if wanted, that is a
separate plan (0022 area). Record "missing" in the audit output.

## Out of scope

- Adding or changing problems, tests, hints, `idea` or `complexity` of the spec (except the one-line summary rule in step 5).
- Running `pnpm solutions:build` (lead only) and editing `generated/*`.
- Editing `docs/plans/README.md` (the lead adds index rows).
- UI or tooling changes (plan 0076).
- Claiming audit results that were not computed by the script and reviewed by a person.

## Steps

### Part A: the audit (repeatable)

- [ ] **1. Expected-optimal metadata.** Create `packages/shared/content/solution-audit/expected.json` (not in the `solutions/` folder:
  `solutions:check` rejects other file names there):
  `{ "<problem-id>": { "time": "O(n)", "space": "O(n)", "notes": "short, optional", "sourcedFrom": "interview-standard" } }`.
  Seed it for the tier 0 and tier 1 ids below only (about 60 entries), written by hand. Everything else is simply absent
  (unknown), never guessed.
  - Done when: the file parses, every key is an existing problem id (checked by the test in step 3), no entry has an empty `time`.
- [ ] **2. Audit script.** `scripts/solutions-audit.mjs` (pure helpers exported, TypeScript imported via
  `scripts/lib/register-ts.mjs` as `solutions.mjs` does) and a root script `solutions:audit` in `package.json`. Output
  (stdout, plus `--json` for a machine file) one row per problem with a verdict:
  - `declared`: the spec's `solution.complexity` text (parsed time, space as strings; no big-O algebra, only a normalised string
    compare such as `O(n * k log k)` vs `O(n * k)` after removing spaces and `*`).
  - `expected`: from `expected.json` or empty.
  - `status`: `mismatch` (both known and different), `unreviewed` (no expected entry), `match`, `has-approaches` (an
    `.approaches.json` exists and one approach is `kind: optimal` with the expected complexity).
  - Heuristic flags (signals only, labelled as such): the C++ contains `sort(` while the problem is in a hash-map or counting
    pattern; nested loops `for (...) { for (...)` with `n` up to 10^5 in the constraints text; `.py` or `.java` file differs in
    algorithm keywords from the C++ (`sort`, `unordered_map`, `priority_queue`) - these are hints for the reviewer, never a verdict.
  - `--tier 0|1|2`, `--group d|e|f`, `--unreviewed-only`.
  - Done when: `pnpm solutions:audit --tier 0` prints one row per tier-0 id and shows `lc-49` as `mismatch` (declared
    `O(n * k log k)` vs expected `O(n * k)`), and `lc-242` and `lc-125` as `missing problem`; `--json` writes valid JSON.
- [ ] **3. Audit tests.** `scripts/solutions-audit.test.ts` or `apps/web/lib/judge/solutions-audit.test.ts` (match where
  `solutions-files.test.ts` lives): the complexity normaliser, the status logic with fixtures, and "every key of
  `expected.json` is a real problem id".
  - Done when: `pnpm exec vitest run` on that file passes.
- [ ] **4. Manual review checklist.** Add `docs/solutions-audit.md`: how to run the audit, and a checklist a person (or Claude)
  ticks per problem: (a) What would a strong candidate say first, second, last? (b) Is our recommended approach the last
  one, and is it the expected optimal? (c) Is there a real time-versus-space trade-off to show as separate entries (hash map vs
  sort, recursion vs iteration, O(1) space in-place vs O(n) extra)? (d) Is the stated complexity true for each language's
  library calls (Python `sorted` is O(n log n); Java `String +=` in a loop is O(n^2); `list.pop(0)` is O(n))? (e) Do the tests
  actually distinguish the approaches (a large input that kills the brute force)? Record the result per id in
  `packages/shared/content/solution-audit/reviewed.json` (`{ id: { by, date, verdict: "ok"|"needs-approaches"|"wrong", note } }`),
  which the audit script reads to move a problem out of `unreviewed`.
  - Done when: the doc exists, the script reads `reviewed.json` (may start as `{}`), and the audit counts are reproducible.
- [ ] **5. Authoring template and rubric into the docs.** Add the two sections below ("Authoring template" and "Quality rubric")
  to `docs/solutions.md` (short form) so agents find them from the existing entry point. Rule for the spec summary: after an
  approach set is done, `solution.idea` and `solution.complexity` in the problem file must describe the **recommended**
  approach; if they do not, the batch owner edits those two fields and nothing else in the problem file (this is the only
  allowed edit in `problems-*.ts`, and the batch owner for that file is the only one who may touch it).
  - Done when: `docs/solutions.md` links the template, rubric and the batch table in this plan.

### Part B: authoring (needs plan 0076 done)

- [ ] **6. Tier 0 pilot (one agent, then reviewed).** Convert these to full approach sets, three languages each, in this order
  of difficulty: `lc-1` (brute force O(n^2) time O(1) space; sort plus two pointers O(n log n) time with O(1) extra space if only
  values are needed and O(n) when original indices must be kept, so it keeps `(value, index)` pairs; hash map O(n) time O(n)
  space), `lc-49` (sorted key O(n k log k); 26-count key O(n k), recommended), `lc-347` (sort by frequency O(n log n); heap of
  size k O(n log k); bucket sort O(n)), `lc-3`, `lc-15`, `lc-56`, `lc-238`, `lc-560`, `lc-207`, then the rest of the tier 0 list.
  A `lc-242` equivalent is out (missing problem).
  - Done when: `pnpm solutions:verify <each id>` prints only `ok` for all files; `pnpm solutions:audit --tier 0` shows no
    `mismatch`; a Claude review of the pilot passes the rubric. **Do this before launching the parallel batches**, so the
    template is proven.
- [ ] **7. Parallel batches.** Run one agent per batch from the table below; each agent owns only the listed arrays' ids (the
  files `<id>.*` of those problems plus, for step 5, the two spec fields in the listed `problems-*.ts`). Each agent:
  `pnpm solutions:audit --group <g> --unreviewed-only` for its ids, review them with the checklist, write `reviewed.json`
  entries, author approach sets only where the verdict is `needs-approaches` or `wrong`, and verify per problem.
  - Done when (per batch): `pnpm solutions:verify <ids of the batch>` is all `ok`; `pnpm solutions:audit` for those ids shows
    every problem `reviewed`; a reviewer applied the rubric to at least a third of the new approach sets (every set for tier 0
    and 1).
- [ ] **8. Lead integration.** The lead runs `pnpm solutions:check`, then `pnpm solutions:build` once, then one `pnpm check`.
  - Done when: `pnpm check` passes and the app shows the stepper on the converted problems.

## Priority tiers

- **Tier 0 (first, pilot):** the ids listed above: Two Sum, Group Anagrams, Top K Frequent, Longest Substring Without Repeating
  Characters, 3Sum, Merge Intervals, Product of Array Except Self, Subarray Sum Equals K, Course Schedule, plus Best Time to
  Buy and Sell Stock (`lc-121`), Maximum Subarray (`lc-53`), Longest Consecutive Sequence (`lc-128`), Minimum Window Substring
  (`lc-76`), Kth Largest (`lc-215`), Trapping Rain Water (`lc-42`), Container With Most Water (`lc-11`), Climbing Stairs
  (`lc-70`), Number of Islands (`lc-200`), Coin Change (`lc-322`), LIS (`lc-300`), Meeting Rooms II (`lc-253`), LRU Cache
  (`lc-146`).
- **Tier 1:** all other problems that appear in a pattern's `problems` list in `packages/shared/src/dsa.ts` (about 201 minus
  tier 0), because the roadmap sends the learner to them. Review the pattern ids in this order: `hash-map`, `prefix-sums`,
  `two-pointers`, `sliding-window`, `kadane`, `intervals`, `search-sort`, `bs-index`, `bs-answer`, `heap-top-k`,
  `monotonic-stack`, `tree-dfs`, `tree-bfs`, `graph-bfs`, `graph-dfs`, `topo-sort`, `union-find`, `dijkstra`, `dp-1d`, `knapsack`,
  `lis`, `grid-dp`, `two-string-dp`, `backtracking-bits`, `subsets`, then the rest.
- **Tier 2:** CSES, Project Euler, AtCoder, Codeforces, Kattis and logic problems (groups `e` CSES part and `f`). Many have one
  natural algorithm; the audit decides whether a second approach teaches anything. Skip a problem when the reviewer records
  `ok` in `reviewed.json`.

## Batches (about 25 problems each, by file ownership)

Counts are the number of `id:` entries per file counted on 2026-11-13; CSES sorting and DP counts were not counted separately
(together about 35 from group totals). **Step 7 starts by generating the exact ids per batch** with a small addition to
`scripts/solutions-audit.mjs` (`--batches` prints each batch with its ids from `SOLUTION_GROUPS` in file order, cut every 25),
so two agents never share an id even where this table is approximate.

| Batch | Group | Spec arrays (in `packages/shared/src/judge/`) | About |
|---|---|---|---|
| D1 | d | `problems-leetcode.ts`, `problems-leetcode-2.ts` | 25 (tier 0 and pattern hash-map, two-pointers, prefix-sums, graph) |
| D2 | d | `problems-leetcode-3.ts`, `problems-leetcode-4.ts` | 24 |
| D3 | d | `problems-leetcode-5.ts` | 28 |
| D4 | d | `problems-leetcode-6.ts` | 25 |
| D5 | d | `problems-leetcode-7.ts` | 25 |
| D6 | d | `problems-leetcode-8.ts` | 25 |
| D7 | d | `problems-cses-math.ts` | 11 (tier 2) |
| E1 | e | `problems-leetcode-9.ts` | 25 |
| E2 | e | `problems-cses.ts`, `problems-cses-intro.ts` | 23 (tier 2) |
| E3 | e | `problems-cses-sorting.ts` plus first part of `problems-cses-dp.ts` | about 18 (tier 2) |
| E4 | e | rest of `problems-cses-dp.ts` | about 17 (tier 2) |
| E5 | e | `problems-cses-graph.ts`, `problems-cses-misc.ts` | 24 (tier 2) |
| E6 | e | `problems-cses-range.ts`, `problems-cses-tree.ts` | 29 (tier 2) |
| E7 | e | `problems-design-a.ts`, `-b.ts`, `-c.ts`, `problems-special.ts`, `problems-other.ts` | 23 (design classes; approaches may mean data-structure choices) |
| F1 | f | `problems-logic-euler.ts`, `problems-logic-atcoder.ts` | 25 (tier 2) |
| F2 | f | `problems-logic-codeforces.ts`, `problems-logic-kattis.ts`, `problems-cses-geo-str.ts` | 33, cut in two by file order |
| F3 | f | `problems-logic-batch2.ts` | 25 |
| F4 | f | `problems-logic-c.ts` | 40, cut in two |
| F5 | f | `problems-logic-d.ts` | 41, cut in two |

Total check: d 163 = D1 to D7; e 159 = E1 to E7; f 164 = F1 to F5 (the table's "about" numbers sum to the group totals; the
script output is the authority). Launch order: D1, D2, D3, E1 (tier 0 and 1 heavy), then D4 to D6, then the tier 2 batches.
Batches are independent: each touches only `<id>.*` files of its own ids (and `reviewed.json` entries; to avoid conflicts on one
JSON file, each batch writes `packages/shared/content/solution-audit/reviewed-<batch>.json` and the script merges all
`reviewed*.json`).

## Authoring template (one approach)

Fill in the json entry (see plan 0076) and the three code files. Per approach:

1. **Idea in one sentence** (`idea`, at most 300 chars).
2. **Complexity**: `time` and `space` in terms of the input names from the statement (n, k, m), counting output space only if
   it dominates; say "extra space" in the `tradeoff` text when it matters.
3. **Why slower or faster** (`why`): the loop or data-structure operation that costs it, and what the previous approach did
   differently.
4. **Trade-off** (`tradeoff`): what it spends to gain speed, or what it gives up to save memory.
5. **When preferred** (`whenToPrefer`): the interview situation (follow-up "O(1) extra space?", "the array is sorted",
   "the stream is huge").
6. **Code** in C++, Java, Python: same algorithm in all three, same I/O contract as the starter, comments that say *why*, not
   what. Keep each file under 40 KB; no network, files or processes.
7. **Edge cases the tests cover** (kept in the batch notes, not in the file): empty or single element, duplicates, negative
   numbers, max size. If the tests cannot tell approaches apart, write it down under *Found but not changed*; do not edit tests.
8. **Order and `kind`**: brute force first, then better, optimal last with `recommended: true`; add a `time` or `space` entry
   only when there is a true trade-off, not to pad the list. Typically 2 to 4 approaches. A problem with one natural
   approach stays single (no json).

## Quality rubric (reviewer)

Score each approach pass or fail; any fail needs a fix.

- **Correct:** passes `pnpm solutions:verify <id>` in all three languages (or is listed in `skipStress` only for being slow on
  purpose).
- **Actually the stated complexity:** read the code, not the label. Watch hidden costs: sorting inside a loop, string
  concatenation, `list.pop(0)`, `vector::erase`, Python `in` on a list, Java `substring` copies, recursion depth on 10^5.
- **Optimal is really optimal** for the constraints and is what an interviewer expects (`expected.json` entry agrees, or the
  reviewer explains the difference in `reviewed.json`).
- **Readable:** meaningful names, one idea per function, no cleverness that hides the idea.
- **Comments explain why:** the key invariant or the reason a data structure is chosen, in two or three comments at most.
- **Same I/O contract:** the starter's signature, return order rules (for example when any order is accepted, the judge's
  comparer in `apps/web/lib/judge/compare.ts` decides), no `main`, no printing.
- **Text is true and short:** `why` and `tradeoff` match the code; no hype; consistent with the spec summary of the
  recommended approach.
- **Same algorithm across languages** within one approach (a Python shortcut like `Counter` is fine if the complexity is the
  same and a comment says so).

## Verification per batch

```
pnpm solutions:verify lc-1 lc-49 ...        # every file of each id, all approaches and languages
pnpm solutions:verify --group d             # when a whole group is finished
pnpm solutions:audit --group d --unreviewed-only
pnpm solutions:check                        # names and json; it will report a stale bundle until the lead builds: expected
```

Agents run only these (never `pnpm test` or `pnpm check`, never `pnpm solutions:build`). **Agents must not run
`pnpm solutions:build`; only the lead does, once at the end, so the generated files never conflict.** Do not touch
`data/habit.db`.

## Acceptance criteria

- [ ] `pnpm solutions:audit` runs, is reproducible, and its tier 0 output flags `lc-49` as a complexity mismatch before the pilot
      and shows no mismatch after it; no result in this plan is claimed that the script did not produce.
- [ ] `docs/solutions-audit.md` and the template and rubric in `docs/solutions.md` exist.
- [ ] Every tier 0 problem that exists has 2 to 4 approaches, brute force to optimal, recommended last, each in three languages
      and verified; Group Anagrams recommends the 26-count key (O(n*k)).
- [ ] Each batch lists reviewed problems; every tier 0 and tier 1 problem is `reviewed` (`ok` or converted).
- [ ] Two agents never edited the same file; no batch touched another batch's ids.
- [ ] `pnpm check` passes after the lead builds the bundle once.

## Pitfalls

- Valid Anagram and Valid Palindrome are not problems here; do not invent ids for them.
- The 26-count key is correct only for lowercase letters; check the statement's constraints. Java needs a string or list key
  (for example `Arrays.toString(count)`); Python needs a tuple; C++ a string of counts or a `vector<int>` key with a hash.
- Output order of groups may be unordered; the judge's compare rule for this problem decides. Check `compare.ts` and the
  starter before changing return order.
- A brute force may time out the large inputs: use `verify.skipStress` for that language only, never skip examples or tests.
- Python recursion limits and Java stack depth on deep inputs make the "recursive" variants fail large inputs; mark or pick
  an iterative version.
- Do not "improve" a solution by changing the problem's tests or hints; report the id and case instead.
- Windows: `pnpm.cmd` in PowerShell. Never touch `data/habit.db`.

## Open questions

(Implementer: write questions here and set the status to `blocked`.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
