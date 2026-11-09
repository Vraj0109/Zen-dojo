# 0026: Run plans 0021 to 0025 with four Claude agents at once

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** (the four agents, see below)
- **Spec:** none (coordination plan; the work itself is in plans 0021 to 0025)

## Goal

Four Claude agents work at the same time, each on its own plan, without editing the same files or waiting for each other.
This plan says who owns which files, what each agent does in what order, and how the work is merged.

## How they stay apart

1. **One git worktree and one branch per agent.** Each agent runs in its own folder, so nobody sees half-finished edits.
   Start each in a separate terminal (or with the Agent tool, `isolation: "worktree"`):
   ```powershell
   cd C:\MyStuff\Projects\HabbitManager
   git worktree add ..\zd-a -b agent/a-judge main
   git worktree add ..\zd-b -b agent/b-problems main
   git worktree add ..\zd-c -b agent/c-lessons main
   git worktree add ..\zd-d -b agent/d-lld main
   # in each folder: pnpm.cmd install   (fast, the store is shared)
   ```
   `data/habit.db` is git-ignored, so worktrees never see the real data. Run the dev server (if needed) on different ports
   (`pnpm.cmd dev -p 3001`, 3002, ...).
2. **Commits (needs your OK).** Merging needs commits. The repo rule says commit only when you ask. Tell the agents:
   "You may commit on your own `agent/*` branch, never on `main`, never push, no Co-Authored-By." If you say no, agents
   leave changes uncommitted in their worktree and you merge by copying; this is slower.
3. **File ownership.** An agent edits only files it owns (table below). A file marked *shared* is edited only in the exact
   place described. If an agent needs a change in a file owned by someone else, it writes the request in its plan's
   *Open questions* and works around it; it does not edit the file.
4. **Plan files:** each agent updates only its own plan (checkboxes, *Implementation notes*, status). Nobody edits
   `docs/plans/README.md`, `docs/HANDOFF.md` or this file; the merger does that at the end.
5. **Checks:** while working, run only targeted tests (`pnpm.cmd exec vitest run <file>`). Run the full `pnpm.cmd check`
   once, at the end, in your own worktree (about 3.5 minutes; four at once will be slower, so stagger them).
   Never `pnpm desktop:build`.
6. **If blocked,** set your plan to `blocked`, write the question, stop. Do not guess at another agent's files.

## The four workstreams

| Agent | Branch | Plans | Why it is separate |
|---|---|---|---|
| **A: Judge and editor** | `agent/a-judge` | 0021, then 0022 step 6, then 0024 steps 4 and 5 | Everything here touches the judge engine and the problem page |
| **B: Problem library** | `agent/b-problems` | 0022 steps 1 to 5 and 7 (not step 6) | Mostly new data files and the `/dsa` list |
| **C: Lessons and navigation** | `agent/c-lessons` | 0023 | Lesson pipeline, study pages, table of contents |
| **D: LLD content** | `agent/d-lld` | 0025 | Mostly new Java project files and walkthroughs |

Left for later (after the first merge): 0024 steps 1 to 3 and 6 to 11 (they need 0023's Markdown format and the study
page), 0014, 0015, 0008.

### File ownership

| Files | Owner |
|---|---|
| `packages/shared/src/judge/harness*`, `templates.ts`, `apps/web/lib/judge/*` (harness, run, templates tests), `app/judge-workspace.tsx`, `judge-panel.tsx`, `app/api/judge/run/route.ts`, `lib/solution-runs.ts`, `lib/notes.ts`, `lib/db.ts` (**the only agent allowed a migration this round**), `schema.ts`, `lib/backup.ts`, `scripts/pack-*` | A |
| `packages/shared/src/judge/problems-*.ts` (new files), `judge/stress.ts`, `judge/index.ts`, `judge/types.ts` (the `source` union only), `dsa.ts`, `dsa.test.ts`, `app/dsa/**` | B |
| `packages/shared/src/learn/index.ts` (the merge code for `LESSON_EXTRA` only), `learn/order-audit.test.ts`, `learn/generated/*`, `packages/shared/content/**`, `scripts/build-content.mjs`, `app/study/[area]/**`, `app/toc.tsx`, `app/course-outline.tsx`, `app/learn-blocks.tsx`, `docs/content-editing.md`, `AGENTS.md` (one link) | C |
| `packages/shared/src/learn/lld-projects-*.ts`, `lld-deep-*.ts`, `lld-diagrams-*.ts` (new and existing), `learn/lld*.ts` text, `study.ts` (LLD exercises only), `study.test.ts`, `learn.test.ts` (ranges only), `lld-projects.test.ts` | D |

Shared hot spots and the rule for each:

- `learn/index.ts`: **C** changes how sections are merged and sorted; **D** only adds new entries to `LLD_PROJECTS`,
  `LLD_DEEP`, `LLD_GUIDES`, `LLD_EXTRA` by appending a line to the existing lists. Different places, so git merges it.
- `judge/types.ts`: **B** adds the `source` values. **A** adds `kind: "design"` in step 6, which starts only after B's
  branch is merged (see order).
- `harness.ts`: only **A** (0022 step 6 moves to A for this reason).
- `learn.test.ts` and `study.test.ts`: **C** must not change them. If C's audit test or ordering change breaks one, C
  writes the failure in its *Open questions*.
- Migrations: only **A** (0021 step 5). Nobody else adds a table this round.

## Order of work inside each agent

**A:** 0021 steps 1 to 10 (merge-ready, then run `pnpm check`) -> 0022 step 6 (after B is merged into `main`, rebase first:
`git rebase main`) -> 0024 steps 4 and 5 (`pack:check`, `pack:build`, stress generators; new scripts and
`judge/stress-gen.ts`, no conflicts).

**B:** 0022 step 1 (roadmap problems, 25 per file) -> step 2 (CSES) -> step 4 and 5 (patterns, filters) -> step 3 (other
platforms) -> step 7. Commit after each file of 25 problems. Check each new problem by running only its id. Do **not**
trust hand-computed outputs (five of 28 were wrong last time): compute them from the C++ reference. B can stop at any
point, since each committed batch is complete on its own.

**C:** 0023 steps 1 and 2 (audit and fix the order) -> 3 (Markdown format and build script) -> 5, 6, 7 (navigation) -> 4
(migrate LLD lessons to Markdown; do this last because D is adding LLD walkthroughs) -> 8 and 9.

**D:** 0025 step 1 (vending machine and ATM) -> 2 (batch C) -> 3 (batch D) -> 4 (batch E) -> 6 (concept lessons) -> 5 (batch F as
time allows) -> 7. Compile every new project once with `javac -Xlint:all` (JDK 17) and write the list in the notes.

## Merging (you, or one Claude session at the end)

Merge in this order, running `pnpm.cmd check` after each, fixing only the merge itself:

1. D (`agent/d-lld`): content only, least likely to conflict.
2. B (`agent/b-problems`).
3. A (`agent/a-judge`): rebase on `main` first; then A starts 0022 step 6.
4. C (`agent/c-lessons`): rebase onto `main`; C's step 4 (migrating LLD lessons to Markdown) is redone on top of D's
   additions if D's lessons changed. Ask C to re-run the audit test.

Then update `docs/plans/README.md` and `docs/HANDOFF.md`, remove the worktrees (`git worktree remove ..\zd-a`, ...), and
run `/review-plan` for each plan. Suggest one commit message per merged branch.

## Prompts to paste (one per agent, each in its own worktree folder)

All four start with: "Read AGENTS.md, docs/HANDOFF.md and docs/plans/0026-parallel-agents.md. You may commit on your own
`agent/*` branch only; never push, never touch `main`, no Co-Authored-By. Edit only the files your row in the ownership
table lists."

- **A:** "You are agent A. Implement docs/plans/0021-run-button-v2.md, then 0022 step 6 once I say B is merged, then 0024
  steps 4 and 5. Follow the order in 0026."
- **B:** "You are agent B. Implement docs/plans/0022-problem-library.md except step 6, in the order given in 0026. Commit
  after each batch of 25 problems. Compute expected outputs with the C++ reference, never by hand."
- **C:** "You are agent C. Implement docs/plans/0023-editable-content-and-navigation.md in the order given in 0026. Do not
  touch learn.test.ts or study.test.ts; report breakage in Open questions."
- **D:** "You are agent D. Implement docs/plans/0025-more-lld-topics.md in the order given in 0026. Compile every project with
  javac -Xlint:all and list them in the notes. Write the code in TypeScript template literals (no backticks, no `${`)."

## Acceptance criteria

- [ ] Each branch contains changes only in its owner's files (check with `git diff --stat main...agent/x`).
- [ ] The four branches merge into `main` without manual conflict edits except the lines in `learn/index.ts` noted above.
- [ ] `pnpm check` passes on `main` after the last merge.
- [ ] Plans 0021 to 0025 each have their checkboxes, *Implementation notes* and status updated by their own agent.

## Open questions

- Is it OK for agents to commit on their own `agent/*` branches (rule 2)? Without it, merging is manual.
- Four heavy `pnpm check` runs at the same time can starve each other of CPU. If the machine is slow, stagger them or use
  three agents (merge D into B's slot: B first, D after).

## Implementation notes

## Review
