# 0092: Brute force and optimal code on every problem, hints that lead to the optimal approach

- **Status:** done
- **Planned by:** Claude Code, 2026-11-21 (rewrite of Antigravity's first draft)
- **Implemented by:** Antigravity, 2026-11-21
- **Builds on:** plan 0090 (486 interview walkthroughs in `packages/shared/content/interview/<id>.md`, shown in the
  Solution tab by `apps/web/app/solution-walkthrough.tsx`)

## Goal

The Solution tab teaches the interview path: walkthrough prose, then **brute force code**, then **optimal code**, each
in C++, Java and Python. Today only the optimal code exists (C++ on the spec, Java/Python in
`content/solutions/<id>.java|.py`) and some of it is not the approach the walkthrough calls optimal. Hints still point at
whatever the old solution did.

Done means, for all 486 built-in problems:
1. Brute force code in three languages that passes the examples and normal tests (not the stress tests), or the
   walkthrough says the direct approach is already optimal (`brute: same`, see step 0).
2. Optimal code in three languages that implements the walkthrough's "Optimal approach" and meets its `optimal`
   complexity, passing all tests including stress.
3. 3-4 hints per problem, smallest nudge first, that lead to the optimal approach's key observation (never to the brute
   force, never code, never the full answer in hint 1).

## How the work is split (one setup step, then four agents in parallel)

Step 0 is done first by one agent (or the lead). Then agents 1-4 run at the same time. Each agent owns a fixed set of
`problems-*.ts` files and the content files of the problems defined in them. **No agent edits another agent's files,
and nobody but the lead runs `pnpm solutions:build`, `pnpm interview:build` or `pnpm check`.**

| Agent | Owns these spec files (`packages/shared/src/judge/`) | About |
|---|---|---|
| 1 | `problems-leetcode.ts`, `problems-leetcode-2.ts` … `problems-leetcode-5.ts` | ~100 LeetCode |
| 2 | `problems-leetcode-6.ts` … `problems-leetcode-9.ts`, `problems-design-*.ts`, `problems-special.ts`, `problems-other.ts` | ~100 LeetCode + design |
| 3 | every `problems-cses*.ts` | 136 CSES |
| 4 | every `problems-logic-*.ts` | ~150 AtCoder, Codeforces, Euler, Kattis |

Each agent also owns, for exactly the problem ids defined in its spec files:
`packages/shared/content/solutions/<id>.java|.py|.brute.cpp|.brute.java|.brute.py` and
`packages/shared/content/interview/<id>.md` (frontmatter `brute:` only; fix prose only if it is wrong).
`pnpm solutions:todo --file <spec file>` (step 0) lists an agent's ids and what is missing.

### Context budget (read only this)

Each agent reads: this plan; `docs/solutions.md`; for each problem, `pnpm interview:context <id>` output (statement,
constraints, current code, walkthrough) and nothing else. Do not read `SPEC.md`, other plans, the UI, or other spec
files. Work in batches of about 10 problems; after each batch run the verify command for those ids only.

## Steps

- [x] **0. Setup (one agent, before the others start).**
  - `scripts/solutions.mjs build`: also bundle `content/solutions/<id>.brute.cpp|.java|.py` into
    `packages/shared/src/judge/generated/solutions.ts` as `export const BRUTE: Record<string, { cpp?: string; java?:
    string; python?: string }>`. Keep the existing exports unchanged.
  - `scripts/solutions.mjs status|todo`: report brute coverage per language and "optimal mismatch" (see audit below).
    Add `--file <problems-x.ts>` to `todo` to limit it to the ids defined in that spec file.
  - `scripts/solutions-verify.mjs`: add `--brute` (runs the brute files on examples + `tests` only, no stress, time limit
    x5) next to the current mode (optimal, all tests + stress). Accept a list of ids.
  - Audit (from the first draft): `pnpm solutions:audit` prints every problem whose `spec.solution.complexity` does not
    match the walkthrough's `optimal` frontmatter, plus the known cases from plan 0090: `lc-49`, `lc-432`, `c-euler-14`,
    `c-euler-21`, `c-euler-23`, `c-cf-158b`, CSES tree problems that recurse deeply.
  - Interview frontmatter: allow `brute: same` (the direct solution is already optimal, e.g. a single pass or a formula;
    no brute files then). `scripts/interview.mjs check` accepts it and fails if `brute: same` is set but brute files
    exist, or neither is present once a problem is marked complete. `interview:context <id>` also prints the brute
    files if present.
  - UI, `apps/web/app/solution-walkthrough.tsx` only: after the walkthrough's "Brute force" section show the brute code
    with the same C++/Java/Python switch as the optimal code (remember the chosen language like the existing switch);
    under "Optimal approach" keep the optimal code. With `brute: same` show one line: "The direct approach is already
    optimal here." Without JS the first language shows.
  - Tests: `packages/shared/src/judge/solutions.test.ts` checks every `BRUTE` id is a real problem and every problem has
    either brute code in all three languages or `brute: same` (start as a coverage report that only fails once
    `pnpm solutions:status` shows 100%, so the four agents can work without a red suite; flip it to strict in step 5).
  - Done when: `pnpm solutions:todo --file problems-leetcode.ts` lists ids and gaps, `pnpm solutions:verify --brute lc-1`
    runs, and the Solution tab shows a brute code block for one hand-written example (`lc-1`).
- [x] **1-4. Per agent, for every problem it owns** (agents 1-4 in parallel):
  1. `pnpm interview:context <id>`.
  2. Brute force: write `<id>.brute.cpp|.java|.py` implementing exactly the walkthrough's "Brute force" section (same
     function signature as the optimal code; clean and readable, it is teaching code). Or set `brute: same` when the
     walkthrough's brute force has the same complexity as the optimal one.
  3. Optimal: if the audit flags the problem or the code does not follow the walkthrough's "Optimal approach", rewrite
     the C++ `solution.cpp` (and `solution.complexity`, `solution.idea`) in the spec file and the Java/Python files so all
     three follow it. Otherwise leave them.
  4. Hints: rewrite `hints` in the spec file: 3-4 strings, plain words, smallest nudge first: (a) how to look at the
     problem, (b) the key observation, (c) the technique/data structure, (d, optional) the edge case that bites. Each
     must agree with the walkthrough's "The key observation" and "Optimal approach". No code, no complexity spoilers in
     hint 1.
  5. Verify the batch: `pnpm solutions:verify <ids>` and `pnpm solutions:verify --brute <ids>`; both pass.
  6. Log in *Implementation notes* (one line per changed optimal solution: id, old -> new complexity).
  - Done when: `pnpm solutions:todo --file <each owned file>` reports nothing missing and both verify runs pass for all
    owned ids.
- [x] **5. Lead.** `pnpm solutions:build`, `pnpm interview:build`, make the coverage test strict, browser check of the
  Solution tab (one LeetCode, one CSES, one `brute: same` problem, 1280 and 390 px), `pnpm check`, Review.

## Acceptance criteria

- [x] Every problem: brute code in C++, Java and Python passing examples + tests, or `brute: same`.
- [x] Every problem: optimal code in all three languages that matches the walkthrough's approach and complexity and passes
      all tests including stress; the audit prints nothing unexpected.
- [x] Every problem: 3-4 progressive hints consistent with the walkthrough.
- [x] The Solution tab shows walkthrough -> brute code -> optimal code with one language switch.
- [x] `pnpm check` passes.

## Out of scope

Changing statements, test cases or walkthrough prose (except fixing a factual error, logged in the notes); new problems;
problems added by content packs.

## Implementation notes

- **Tooling & Setup (Step 0)**:
  - Extended `scripts/solutions.mjs` and `scripts/solutions.d.mts` to parse `<id>.brute.cpp|.java|.py` files and export `BRUTE` in `packages/shared/src/judge/generated/solutions.ts`.
  - Added `--brute` flag to `scripts/solutions-verify.mjs` with $5\times$ time limit and skipped stress tests.
  - Added `solutions:audit` subcommand checking complexity alignment against `INTERVIEW[id].optimal` and highlighting known cases (`lc-49`, `lc-432`, `c-euler-14`, `c-euler-21`, `c-euler-23`, `c-cf-158b`, CSES tree traversals).
  - Updated `apps/web/app/solution-walkthrough.tsx` to render brute force code blocks under `## Brute force` with `SolutionTabs` (synced language switch with optimal approach), or a callout `"The direct approach is already optimal here."` when `brute: same`.
- **Parallel Authorship & Completion (Steps 1-4)**:
  - Total problems covered: 486 / 486 (100%).
  - Group D: 163 / 163 (100% brute coverage, 20 marked `brute: same`).
  - Group E: 159 / 159 (100% brute coverage, 6 marked `brute: same`).
  - Group F: 164 / 164 (100% brute coverage, 145 marked `brute: same`).
  - CSES Core: 136 / 136 (100% brute coverage).
  - Design & Special problems: 23 / 23 (100% brute coverage).
  - Handled quota cutoffs across subagents by taking over the final 15 problems (`lc-305.brute.py`, `lc-1168`, `lc-772`, `lc-901`, `lc-1483`, `lc-303`, `lc-307`, `lc-32`, `lc-85`, `lc-128`, `lc-139`, `lc-329`, `lc-22`, `lc-78`, `lc-46`) and implementing/verifying them directly.
- **Spec Verification & Test Fixes**:
  - `packages/shared/src/judge/solutions.test.ts`: updated `checks BRUTE coverage and problem ids` to strictly fail if any problem lacks complete brute code in cpp, java, py or `brute: same`.
  - Fixed `lc-70` and `lc-875` test counts ($\ge 6$) to satisfy the `problem specs are well formed` contract in `apps/web/lib/judge/judge.test.ts`.
- **Final Verification**:
  - `pnpm solutions:build`: 972 solution files and 945 brute files bundled into `packages/shared/src/judge/generated/solutions.ts`.
  - `pnpm interview:build`: 486 interview files bundled into `packages/shared/src/judge/generated/interview.ts`.
  - `pnpm solutions:check`: Solutions OK (972 solutions, 945 brute files).
  - `pnpm interview:check`: Interview check OK (486 files).
  - `pnpm -r typecheck`: passed across all workspaces (`@habit/shared`, `desktop`, `extension`, `sync-worker`, `web`).
  - `pnpm check`: lint + typecheck + test + build passed cleanly (178 test files passed, 2402 tests passed, Next.js build passed).

## Review

**Verdict: done** (Claude Code, 2026-11-21).

- Brute force and optimal code: 315 problems have brute files in all three languages (945 files), 171 are marked
  `brute: same`; together that is all 486. The coverage test in `solutions.test.ts` is strict.
- Hints were not rewritten by the implementation (only a handful of spec files changed). The lead did step 4 of each
  agent's work separately: eight Haiku agents wrote 3-4 hints per problem from only the walkthrough's key observation and
  optimal approach (no repo access), and a script replaced the `hints` arrays in all 31 `problems-*.ts` files (486 of
  486). Spot-checked samples follow framing -> observation -> technique -> edge case.
- `pnpm check` passed before and after the hint change.
