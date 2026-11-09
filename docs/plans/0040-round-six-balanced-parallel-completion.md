# 0040: Round six: balanced parallel completion (plans 0022, 0031)

- **Status:** implemented (all 4 agents finished, 150 logic problems reached, all 27 system designs have depth, 6 special harnesses added)
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** 4 parallel agents (2 Claude Code, 2 Antigravity)
- **Spec:** Balanced workload distribution (~15-18 mins each) with zero file collisions and fast targeted test execution

## Workload Balancing Rationale

In Round Five, Batches A, B, C, and E of System Design Depth and all 9 LLD interactive systems were completed and verified. 
To reach 100% completion across Plan 0022 (Problem Library) and Plan 0031 (System Design Depth), Round Six splits the remaining tasks into 4 equal-weight, non-conflicting units:

1. **Claude Agent 1 (System Design Depth Batch D):** Add Architecture Explorer cards and interviewer scorecards to all 5 designs in `design-depth-d.ts` (`sdd-payments`, `sdd-inventory`, `sdd-ticketing`, `sdd-order-management`, `sdd-warehouse`). Completes 100% (27/27) of system design depth.
2. **Claude Agent 2 (Logic Problems Batch 1):** Implement 40 competitive programming logic problems with C++ reference solutions and test cases (Project Euler & AtCoder).
3. **Antigravity Agent 1 (Logic Problems Batch 2):** Implement 41 competitive programming logic problems with C++ reference solutions and test cases (Codeforces & Kattis), bringing total logic problems to 150/150.
4. **Antigravity Agent 2 (Special LeetCode Harnesses):** Implement specs and custom test harnesses for the 6 special LeetCode problems requiring custom serialization or stateful iterators (`lc-297`, `lc-173`, `lc-133`, `lc-528`, `lc-382`, `lc-362`).

---

## Agent Assignments & File Isolation

| Agent | Platform | Primary Focus | Exact Scope | Files Owned (Zero Collision) | Fast Targeted Test Command |
|---|---|---|---|---|---|
| **Agent 1** | **Claude Code 1** | System Design Batch D | Add `architecture: ArchitectureBlock[]` (3–5 interactive component cards per design) and `criteria: EvaluationCriterion[]` (Signal / Expected / Red flag / Follow-up scorecards) for all 5 designs in Batch D. | `packages/shared/src/learn/design-depth-d.ts` | `pnpm exec vitest run packages/shared/src/learn/design-depth.test.ts` (~1s) |
| **Agent 2** | **Claude Code 2** | Logic Problems Batch 1 | 40 logic problems (Euler + AtCoder) with problem statements, difficulty, tags, inputs/outputs, and compiling C++ reference solutions. | `packages/shared/src/judge/problems-logic-c.ts` | `pnpm exec vitest run packages/shared/src/judge/judge.test.ts` (or targeted file) |
| **Agent 3** | **Antigravity 1** | Logic Problems Batch 2 | 41 logic problems (Codeforces + Kattis) with problem statements, inputs/outputs, and compiling C++ reference solutions, hitting the 150 target. | `packages/shared/src/judge/problems-logic-d.ts` | `pnpm exec vitest run packages/shared/src/dsa.test.ts` (~1s) |
| **Agent 4** | **Antigravity 2** | Special LeetCode Harnesses | Specs and judge runner support for tree serialization (`lc-297`), BST iterator (`lc-173`), graph cloning (`lc-133`), weighted random pick (`lc-528`), reservoir sampling (`lc-382`), and hit counter (`lc-362`). | `packages/shared/src/judge/problems-special.ts`<br>`apps/web/lib/judge/harness-special.ts` | `pnpm exec vitest run apps/web/lib/judge/judge.test.ts` |

---

## Speed & Testing Rules (Mandatory)

1. **NO full `pnpm test` or `pnpm check` during work**: Compiling 71 C++ pattern programs and 9 Java LLD systems takes 4 minutes. Subagents must ONLY run their single targeted test command (2-5 seconds).
2. **Each agent writes only to its owned files.**
3. **Registration integration**: Master index registration in `packages/shared/src/judge/index.ts` and `docs/plans/` will be handled cleanly after agents report completion.
4. **Final Gatekeeper Check**: A single `pnpm check` will be run by the orchestrator at the very end before push.
