# 0018: Problem statements, hints, solutions and a LeetCode-style Run button (roadmap + CSES)

- **Status:** in-progress (engine, list/tree types and 53 problems done; the rest is content work)
- **Planned by:** Claude Code, 2026-11-08
- **Implemented by:** Claude Code, 2026-11-08
- **Spec:** user request 2026-11-08

## Goal

Every DSA problem page shows what LeetCode shows: description, examples, constraints, hints, a solution to reveal,
and a code editor with starter code where only the function is yours and a Run button runs it on test cases. The same
for problems from the CSES Problem Set.

## Context (what exists now)

- **Spec format:** `packages/shared/src/judge/types.ts` (`ProblemSpec`: statement, constraints, function signature with
  simple types, examples, tests, hints, solution with a C++ reference). Starter code is generated from the signature
  (`templates.ts`) for C++, Java and JavaScript.
- **Runner:** `apps/web/lib/judge/` (`harness.ts` wraps your function with a test reader/printer, `run.ts` compiles with
  the local g++ / javac / node and runs with limits, `compare.ts` compares answers). Route `POST /api/judge/run`, which only
  accepts same-origin JSON requests (it runs code on this computer).
- **UI:** `app/problem-workspace.tsx` (statement, examples, hints, solution) and `app/judge-panel.tsx` (editor, Run, results,
  code kept in the browser). Shown on the Solve tab of `/dsa/[id]` when a spec exists, and on `/dsa/cses` and `/dsa/cses/[id]`.
- **Done so far (53 problems: 49 roadmap + 4 CSES):** batches 3 and 4 (`problems-leetcode-3.ts`, `-4.ts`) added `lc-347, 560, 42, 76, 904, 152, 41, 28, 54, 875, 215, 84` and `lc-55, 45, 62, 64, 1143, 72, 300, 416, 518, 122, 91, 134`. Earlier: roadmap `lc-1, 3, 11, 20, 53, 70, 121` (batch 1), `lc-92, 25, 98, 543, 102, 199, 230, 105, 337,
  238, 15, 49, 56, 739, 198, 322, 33, 200` (batch 2, in `problems-leetcode-2.ts`); CSES `weird-algorithm, missing-number,
  repetitions, increasing-array`. `judge.test.ts` compiles every reference solution and requires all cases to pass, and runs hand-written
  Java and JavaScript solutions through their harnesses.

## Decisions and limits (say these to the user)

- Statements, examples and hints are **written for this app**, not copied from LeetCode or CSES (both are copyrighted).
- **CSES's own test cases are not public** (they are only visible after you solve a task on their site). The tests here are
  written for this app and checked against a reference solution. A pass is a good sign, not proof CSES accepts it.
- CSES programs read standard input; here each is a function you fill in, so the problem differs slightly from the original.
- Running needs a compiler on the machine: g++ for C++, a JDK for Java, Node for JavaScript. The packaged desktop app does
  not ship them; when missing, the panel says what to install (or set `HABIT_GPP`, `HABIT_JAVAC`, `HABIT_JAVA`, `HABIT_NODE`).
  Python is not offered (it is not installed on the author's machine, so it could not be tested).
- Types supported: int, long, double, bool, string and arrays of them (up to two levels for int and string). Problems
  with linked lists, trees or graphs need a node type; add it to the spec types and the three harnesses first.
- JavaScript cannot represent integers above 2^53 exactly; keep such values out of tests for problems offered in JS.

## Out of scope

- Memory limits, per-test time limits (one 10 s limit covers all cases), sandboxing beyond a temp folder and timeouts.
- Marking a problem solved from a passing run, XP for CSES problems.

## Steps

- [x] **1. Spec types, templates, harness, runner, route, UI, tests** (see Context).
- [x] **2. First 11 problems** (above).
- [ ] **3. Roadmap problems, 133 left (49 of the 182 non-premium roadmap problems have a spec).** Next candidates: the graph, backtracking, heap, trie and bit problems; those that need design-class APIs (LRU Cache, Trie, Time Based Store, ...) need a method-sequence test format first. Write a spec for every other problem in `packages/shared/src/dsa.ts`, a pattern at a time
  (about 10 per sitting) in `problems-leetcode-<n>.ts`, merged in `judge/index.ts`. Problems on linked lists, trees and graphs
  first need step 4. Premium problems are skipped or written from scratch.
- [x] **4. Node types (lists and trees).** Done: `list` and `tree` types, `harness-nodes.ts` (C++, Java, JavaScript), templates with
  the node definitions, tests. **Still open:** graph inputs (adjacency lists are plain `int[][]`; problems that need a node
  graph or random pointers, cycles in lists, and design-style class problems like LRU Cache as an API are not supported).
- [ ] **5. More CSES problems.** The introductory set is about 20 problems, the full set about 400. Same file layout, one batch
  per sitting. Keep the statement a summary, link the original.
- [ ] **6. Optional:** mark a roadmap problem solved when all cases pass (ask first), "Run" badge in the problem lists.

## Acceptance criteria

- [x] A spec problem shows description, examples, constraints, 3 hints, a hidden-until-clicked solution and starter code
- [x] Run compiles and runs C++, Java and JavaScript and shows Accepted / Wrong answer (with the input) / Compile error /
  Runtime error / Time limit exceeded
- [x] Requests from other sites are refused (403)
- [x] `pnpm check` passes
- [ ] Every roadmap problem has a spec (190 of 201 missing)
- [ ] CSES: only 4 problems so far

## Open questions

None.

## Implementation notes

- Verified: 18 judge tests pass (reference C++ for all 11 problems; Java and JavaScript harnesses; wrong answer, compile
  error, crash and timeout paths). The built app ran a real C++ submission through `/api/judge/run` and refused cross-origin,
  missing-origin and form requests.
- Not checked in a browser: the editor panel look, language switching, saved code, the Run button flow in the page.
- **Found but not changed:** `pnpm check` takes about 2 minutes longer because the judge tests compile 11 C++ programs.

## Review

(pending: run `/review-plan 0018`)
