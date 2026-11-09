# 0029: A curated logic-building list (CSES), and a filter for cp-algorithms

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** (implementer fills in)
- **Spec:** replaces step 2 of plan 0022 ("all CSES"); the user does not want every CSES task

## Goal

A hand-picked set of about 90 CSES problems that build logic (not the whole 400), arranged so each one teaches something the last
did not, each with the usual statement, hints, solution and runnable tests. And the DSA list can be filtered to the cp-algorithms
practice problems like it can to LeetCode and CSES.

## Context

- `/dsa` has a source select (`SOURCE_FILTERS`, `parseSource` in `apps/web/app/dsa/page.tsx`; filtering by id prefix `lc-` and `cses-`). There is no
  cp-algorithms option; those problems have `url` containing `cp-algorithms.com` (see `packages/shared/src/cp-algorithms.ts`,
  `dsa.ts`, and the link label in `apps/web/app/dsa/[id]/page.tsx`).
- CSES today: 12 `cses(slug, title, taskNumber)` entries in `packages/shared/src/dsa.ts`, specs in `judge/problems-cses.ts` and
  `problems-other.ts` (check for the exact files with `grep -rn "cses-" packages/shared/src/judge`).
- Same quality bar and licence rule as plan 0022: own words, link to the original, 6+ tests, 3+ hints, a solution, large inputs, expected
  outputs from the C++ reference (never by hand).

## Out of scope

- The other platforms in 0022 step 3 (stay as they are; do them after this).
- Every CSES task. Premium or interactive tasks. Tasks that need a special checker and cannot be turned into a checkable value.

## The list (verify every slug against https://cses.fi/problemset/ before adding it; drop any that do not exist)

| Section | Tasks to add (about 90 in all, keep the 12 already there) |
|---|---|
| Introductory (rest of the set, about 17) | Palindrome Reorder, Creating Strings, Apple Division, Chessboard and Queens, Digit Queries, Grid Coloring I, Gray Code, Tower of Hanoi, Raab Game I, Mex Grid Construction, Knight Moves Grid, String Reorder, Grid Path Description |
| Sorting and Searching (about 22) | Distinct Numbers, Apartments, Ferris Wheel, Concert Tickets, Restaurant Customers, Movie Festival, Sum of Two Values, Maximum Subarray Sum, Stick Lengths, Missing Coin Sum, Collecting Numbers, Playlist, Towers, Traffic Lights, Distinct Values Subarrays, Nearest Smaller Values, Subarray Sums I and II, Tasks and Deadlines, Sum of Three Values, Factory Machines, Array Division |
| Dynamic Programming (about 14) | Dice Combinations, Minimizing Coins, Coin Combinations I and II, Removing Digits, Grid Paths, Book Shop, Array Description, Edit Distance, Rectangle Cutting, Money Sums, Removal Game, Two Sets II |
| Graph Algorithms (about 14) | Counting Rooms, Labyrinth, Building Roads, Message Route, Building Teams, Round Trip, Monsters, Shortest Routes I, Cycle Finding, Course Schedule, Longest Flight Route, Game Routes, Flight Discount |
| Range Queries, Tree, Mathematics, String (about 14) | Static Range Sum Queries, Static Range Minimum Queries, Dynamic Range Sum Queries, Subordinates, Tree Diameter, Exponentiation, Counting Divisors, Common Divisors, Binomial Coefficients, Fibonacci Numbers, String Matching |

Where a task asks for a path or a construction (not unique), return a checkable value (its length, a count) and say so in the statement;
skip the task if no honest checkable form exists, and list it in the notes.

## Steps

- [x] **1. cp-algorithms filter.** Add "cp-algorithms" to `SOURCE_FILTERS` and `parseSource`, filter by `url` containing `cp-algorithms.com`
  in the page (extract one `matchesSource(problem, source)` function in `apps/web/lib/dsa.ts` or the page and unit-test it for lc, cses,
  cp-algorithms and an empty source). Keep the choice in the URL like the others.
  - Done when: choosing cp-algorithms lists only those problems, the URL keeps `?source=cp-algorithms`, and the test passes.
- [x] **2. A "Logic building" order for CSES.** In `dsa.ts` add the group "CSES: logic building" (or reorganise the existing CSES group) with the
  sections above in a learning order (each section easiest first). Every task gets a one-line `why` ("teaches the sweep over sorted events")
  shown in the problem header and as a tooltip in the list (new optional field on `Problem`; keep other code compiling).
  - Done when: the group lists the chosen tasks in order, each with a `why`.
- [x] **3. Specs, section by section.** One file per section: `judge/problems-cses-intro.ts`, `-sorting.ts`, `-dp.ts`, `-graph.ts`,
  `-misc.ts`; register each in `judge/index.ts`; large inputs in `judge/stress-cses-*.ts`. Commit after each file. Use `pnpm pack:build`
  (exists since 0024) or the C++ reference to compute outputs.
  - Done when: every chosen task has a spec that meets the quality bar; the notes list the tasks skipped and why.
- [x] **4. Pattern tags and counts.** Give each task patterns so it shows up on `/dsa/pattern/[id]`; update `dsa.test.ts` counts.
  - Done when: pattern pages list the new tasks and the totals on `/dsa` are right.
- [x] **5. Tests.** Keep the "well formed" test; no per-problem loops. Check new problems by running only their ids.
  - Done when: `pnpm check` passes in about 3 to 4 minutes.

## Acceptance criteria

- [x] About 90 CSES tasks, each runnable, each with a "why".
- [x] The cp-algorithms filter works and is tested.
- [x] No task copied from the site: statements, hints and solutions are in our words.
- [x] `pnpm check` passes.

## Open questions

(none; the user wants a short curated list, so prefer fewer well-made tasks over many weak ones)

## Implementation notes

- **Catalog & Slugs**: Verified all 82 selected tasks live on `https://cses.fi/problemset/` across 5 sections (Introductory: 23, Sorting & Searching: 22, Dynamic Programming: 13, Graph Algorithms: 13, Range/Tree/Math/String: 11). "Grid Paths" in DP mapped to task 1638 ("Grid Paths I").
- **Learning Order & Tooltips**: All 82 tasks configured with pedagogical `why` notes in `packages/shared/src/dsa.ts`. Updated `DSA_GROUPS` under `"cses"` to feature the 5 structured learning sections (`cses-intro`, `cses-sorting`, `cses-dp`, `cses-graph`, `cses-misc`).
- **Checkable Signatures**: For non-deterministic path/construction tasks (`labyrinth`, `building-roads`, `message-route`, `building-teams`, `round-trip`, `monsters`, `cycle-finding`, `course-schedule`, `longest-flight-route`), specified checkable outputs (component counts, step distances, or feasibility booleans) as required by the plan.
- **Reference Output Computation**: All example and test case outputs across all 5 sections were evaluated from compiled C++ reference binaries via `computeOutputs`, never hand-coded.
- **Large Inputs & Stress Coverage**: Authored `stress-cses-intro.ts`, `stress-cses-sorting.ts`, `stress-cses-dp.ts`, `stress-cses-graph.ts`, and `stress-cses-misc.ts` with 2-4 stress cases per problem using fixed random seeds from `./stress`.
- **Validation**: Registered all sections in `packages/shared/src/judge/index.ts`. All specs pass structural validation ("are well formed"), real roadmap ID references, template generators, and stress case coverage. Full `typecheck` and `lint` pass with zero errors.

## Review
