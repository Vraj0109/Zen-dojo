# 0041: Round seven: six-agent parallel final sprint (CSES completion, reviews & v0.6.0)

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** 6 parallel agents (3 Claude Code, 3 Antigravity)
- **Spec:** Balanced 6-way workload (~10-12 mins each) with zero file collisions and fast targeted test execution

## Workload Balancing Rationale

With all 27 System Designs, all 9 Java LLD systems, and all 150 logic problems completed and verified, Round Seven completes the remaining CSES problem sections, adds end-to-end visual tests for the 27 system designs, formalizes plan reviews, and prepares release `v0.6.0`.

To keep all agents finishing at the same time (~10-12 minutes):
1. **Claude Agent 1:** CSES Range Queries Section (15 problems with C++ reference solutions and stress cases).
2. **Claude Agent 2:** CSES Tree Algorithms Section (14 problems with C++ reference solutions and stress cases).
3. **Claude Agent 3:** Formal Plan Audits, Acceptance Checkboxes, and Release `v0.6.0` documentation.
4. **Antigravity Agent 1:** CSES Mathematics Section (15 problems with C++ reference solutions and stress cases).
5. **Antigravity Agent 2:** CSES Geometry & String Algorithms Section (15 problems with C++ reference solutions and stress cases).
6. **Antigravity Agent 3:** UI Component & Visual Verification Test Suite (verifying all 27 System Design Deep views, architecture cards, scorecards, and ADHD buddy).

---

## Agent Assignments & File Isolation

| Agent | Platform | Primary Focus | Exact Scope | Files Owned (Zero Collision) | Fast Targeted Test Command |
|---|---|---|---|---|---|
| **Claude 1** | Claude Code | CSES Range Queries | 15 problems with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-range.ts`<br>`packages/shared/src/judge/stress-cses-range.ts` | `pnpm -r typecheck` |
| **Claude 2** | Claude Code | CSES Tree Algorithms | 14 problems with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-tree.ts`<br>`packages/shared/src/judge/stress-cses-tree.ts` | `pnpm -r typecheck` |
| **Claude 3** | Claude Code | Plan Reviews & v0.6.0 | Audit acceptance criteria for plans 0013, 0022, 0031, 0035, 0036, 0037, 0040. Write `docs/releases/v0.6.0.md`. | `docs/plans/00*.md`<br>`docs/releases/v0.6.0.md` | `git status` |
| **Antigravity 1** | Antigravity | CSES Mathematics | 15 problems with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-math.ts`<br>`packages/shared/src/judge/stress-cses-math.ts` | `pnpm -r typecheck` |
| **Antigravity 2** | Antigravity | CSES Geometry & Strings | 15 problems (7 Geometry + 8 Strings) with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-geo-str.ts`<br>`packages/shared/src/judge/stress-cses-geo-str.ts` | `pnpm -r typecheck` |
| **Antigravity 3** | Antigravity | UI & Visual Verification | Render tests for all 27 System Design pages, architecture cards, scorecards, and ADHD buddy | `apps/web/app/study-render.test.ts`<br>`apps/web/app/buddy.test.ts` | `pnpm exec vitest run apps/web/app/study-render.test.ts` |

---

## Speed & Testing Rules (Mandatory)

1. **NO full `pnpm test` or `pnpm check` during work**: Run ONLY fast targeted tests or `pnpm -r typecheck` (2-5 seconds).
2. **Zero file collisions**: Each agent touches only its assigned files.
3. Master registration in `judge/index.ts` and `dsa.ts` will be merged cleanly upon completion.
