# 0033: Round three: who does what (plans 0028 to 0031)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** agents A, B, C, D (same worktrees and branches as 0026/0027)
- **Spec:** none (coordination; same rules as 0026)

## Rules (same as 0026 and 0027)

- Work on your own branch in your own worktree (`agent/a-judge` in `zd-a`, `agent/b-problems` in `zd-b`, `agent/c-lessons` in `zd-c`,
  `agent/d-lld` in `zd-d`). All four branches start at `main` (commit `1be940b` or later). Before you start: `git fetch` is not needed;
  run `git merge main` if `main` moved, then `pnpm.cmd install`.
- Commit per finished unit with `pnpm.cmd check` green, plain English, own branch only, no Co-Authored-By, never push, never touch `main`.
- Edit only the files your row lists. Anything else goes in your plan's *Open questions*.
- Update your plan's checkboxes and *Implementation notes*; do not edit `docs/plans/README.md` or `docs/HANDOFF.md`.
- Stop at a clean commit when you run low; message the main session (see `ListAgents`) with branch, commits and check result.
- Four `pnpm check` runs at once are slow: run targeted tests while working, one full check per handover, never `pnpm desktop:build`.

## Assignments

| Agent | Plan | Files it owns this round |
|---|---|---|
| **A** | 0028 problem workspace polish | `app/judge-workspace.tsx`, `app/code-editor.tsx`, `app/shell.tsx`, `app/pane-layout.tsx`, `lib/notes.ts`, `lib/solution-runs.ts`, `app/actions.ts` (the save action only), the two slow tests named in 0028 step 5 |
| **B** | 0029 logic-building list and cp-algorithms filter | `packages/shared/src/dsa.ts`, `dsa.test.ts`, `judge/problems-cses-*.ts`, `judge/stress-cses-*.ts`, `judge/index.ts` (append lines), `app/dsa/**` |
| **C** | 0031 system design parity | `app/study/[area]/[id]/page.tsx`, `app/design-deep.tsx`, `app/toc-items.ts`, `learn/design-depth-*.ts`, `learn/designs-*.ts`, `learn/design-extra.ts`, `learn/index.ts` (`DESIGN_DEEP` line), `learn/learn.test.ts` and `design-depth.test.ts` guards |
| **D** | 0030 content without releases | `lib/db.ts` (**only migration author**), `schema.ts`, `lib/backup.ts`, `lib/content.ts`, `lib/packs.ts`, `lib/dsa.ts`, `app/api/admin/**`, `app/api/judge/run/route.ts` (spec lookup only), `packages/shared/src/packs.ts`, `scripts/content-*.mjs`, root `package.json` scripts, `docs/content-*.md`, `docs/hosting.md`, `docs/examples/` |

Shared spots: `judge/index.ts` (B appends; D does not touch), `app/actions.ts` (A adds one action, D none), `learn/index.ts` (C edits only the
`DESIGN_DEEP` line). If A and D both need `app/dsa/[id]/page.tsx`, D wins and A asks in *Open questions*.

## Merge

Merge order: A, B, C, D (D last: it changes the data path). `pnpm check` after each merge. Then update the plans index and `docs/HANDOFF.md`.

## Not this round

0032 (hosted site roadmap) is a design for the owner to decide on; 0008 (remaining DSA articles), 0022 steps 3 and 6 follow-ups, 0025 batch F.

## Implementation notes

## Review
