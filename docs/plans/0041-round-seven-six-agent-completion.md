# 0041: Round seven: six-agent parallel final sprint (CSES completion, reviews & v0.6.0)

- **Status:** implemented
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** 6 parallel agents (3 Claude Code, 3 Antigravity), 2026-11-10
- **Spec:** Balanced 6-way workload (~10-12 mins each) with zero file collisions and fast targeted test execution

## Workload Balancing Rationale

With all 27 System Designs, all 9 Java LLD systems, and all 150 logic problems completed and verified, Round Seven completes the remaining CSES problem sections, adds end-to-end visual tests for the 27 system designs, formalizes plan reviews, and prepares release `v0.6.0`.

To keep all agents finishing at the same time (~10-12 minutes):
1. **Claude Agent 1:** CSES Range Queries Section (15 problems with C++ reference solutions and stress cases).
2. **Claude Agent 2:** CSES Tree Algorithms Section (14 problems with C++ reference solutions and stress cases).
3. **Claude Agent 3:** Formal Plan Audits, Acceptance Checkboxes, and Release `v0.6.0` documentation.
4. **Antigravity Agent 1:** CSES Mathematics Section (11 unique problems with C++ reference solutions and stress cases).
5. **Antigravity Agent 2:** CSES Geometry & String Algorithms Section (14 unique problems: 7 Geometry + 7 Strings with C++ reference solutions and stress cases).
6. **Antigravity Agent 3:** UI Component & Visual Verification Test Suite (verifying all 27 System Design Deep views, architecture cards, scorecards, and ADHD buddy).

---

## Agent Assignments & File Isolation

| Agent | Platform | Primary Focus | Exact Scope | Files Owned (Zero Collision) | Fast Targeted Test Command |
|---|---|---|---|---|---|
| **Claude 1** | Claude Code | CSES Range Queries | 15 problems with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-range.ts`<br>`packages/shared/src/judge/stress-cses-range.ts` | `pnpm -r typecheck` |
| **Claude 2** | Claude Code | CSES Tree Algorithms | 14 problems with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-tree.ts`<br>`packages/shared/src/judge/stress-cses-tree.ts` | `pnpm -r typecheck` |
| **Claude 3** | Claude Code | Plan Reviews & v0.6.0 | Audit acceptance criteria for plans 0013, 0022, 0031, 0035, 0036, 0037, 0040. Write `docs/releases/v0.6.0.md`. | `docs/plans/00*.md`<br>`docs/releases/v0.6.0.md` | `git status` |
| **Antigravity 1** | Antigravity | CSES Mathematics | 11 unique problems with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-math.ts`<br>`packages/shared/src/judge/stress-cses-math.ts` | `pnpm -r typecheck` |
| **Antigravity 2** | Antigravity | CSES Geometry & Strings | 14 unique problems (7 Geometry + 7 Strings) with statements, test cases, compiling C++17 reference solutions, and stress cases | `packages/shared/src/judge/problems-cses-geo-str.ts`<br>`packages/shared/src/judge/stress-cses-geo-str.ts` | `pnpm -r typecheck` |
| **Antigravity 3** | Antigravity | UI & Visual Verification | Render tests for all 27 System Design pages, architecture cards, scorecards, and ADHD buddy | `apps/web/app/study-render.test.ts` | `pnpm exec vitest run apps/web/app/study-render.test.ts` |

---

## Acceptance Criteria

- [x] All 15 CSES Range Queries problems implemented with C++17 reference solutions, stress cases, and registered.
- [x] All 14 CSES Tree Algorithm problems implemented with C++17 reference solutions, stress cases, and registered.
- [x] All 11 CSES Mathematics problems implemented with C++17 reference solutions, stress cases, and registered without duplicate ID collisions.
- [x] All 14 CSES Geometry & String problems implemented with C++17 reference solutions, stress cases, and registered without duplicate ID collisions.
- [x] All 27 System Design Deep pages verified with automated render test suite (`study-render.test.ts`, 198 tests passing).
- [x] Plan audits, acceptance checkboxes, and `docs/releases/v0.6.0.md` completed.
- [x] Fast targeted tests pass (`judge.test.ts`, `study-render.test.ts`, `pattern-articles.test.ts`, `dsa-filters.test.ts`).
- [x] Clean workspace typecheck across all 4 packages (`pnpm -r typecheck`).
