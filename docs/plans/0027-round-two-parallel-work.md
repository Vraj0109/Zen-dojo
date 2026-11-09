# 0027: Round two: the rest of the open work, for the same four agents

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** agents A, B, C, D (same sessions, same branches as plan 0026)
- **Spec:** none (coordination plan; follows 0026, same rules: worktrees, branches, ownership, merge order)

## Goal

Round one (0026) finished 0021 (A), 0023 (C) and a good part of 0025 (D) and 0022 (B). This plan hands out everything still
open so each agent keeps working on its own branch, again without touching the others' files.

## State at the start of round two (2026-11-09)

| Plan | State |
|---|---|
| 0021 | implemented (A), needs review |
| 0022 | 25 of about 130 roadmap problems done (B); CSES, other platforms, filters, design-class type open |
| 0023 | implemented (C); Security design and Core CS lessons not migrated to Markdown; imported Markdown lessons not wired to `markdownToc` |
| 0024 | not started |
| 0025 | in progress (D): five projects committed (booking, splitwise, library, food delivery, cab) |
| 0014, 0015 | not started |
| 0008 | 22 of 67 DSA articles; steps 4 to 11 open |
| 0012 | step 4 (offline and build check) open |
| 0013 | superseded by 0025 for what is left (mark it so when 0025 is done) |

## Rules (unchanged from 0026, plus these)

- Keep working on your **own branch** from round one. Do not merge or rebase yourself unless told; the merger (session
  `habbitmanager-7a`) does it in the order D, B, A, C and tells you if you have to rebase.
- **Ownership moves.** Files owned by an agent in 0026 stay with that agent, except where this plan hands them over (below).
- Commit after each finished unit (a project, a batch of problems, a plan step group): plain English, own branch only, no
  `Co-Authored-By`, never push, never touch `main`. Each commit leaves `pnpm check` green.
- When your list is done or you must stop, write what is done and what is not in your plan's *Implementation notes*, then
  message `habbitmanager-7a` with branch, commits and check result.
- Work down your list in order; stop at any point cleanly. Do not start an item you cannot finish and commit.

## Assignments

### Agent A (branch `agent/a-judge`): design-class problems, then content packs v2

1. **0022 step 6**, the "design a class" problem type: `kind: "design"` in `judge/types.ts`, harnesses for C++/Java/JavaScript in
   `harness.ts`, `templateFor` branch, then LRU Cache, LFU Cache, Trie, Add and Search Words, Time Based Key-Value Store,
   Snapshot Array, My Calendar I-III, Insert Delete GetRandom O(1), Design Twitter (B lists them in its notes as "do not fit
   the function format"). New problem files: `judge/problems-design-*.ts`; register in `judge/index.ts` **by appending one
   line** (B also appends there; this merges). Do not wait for B to be merged; expect a small rebase later.
2. **0024 steps 4 and 5** (`pnpm pack:check`, `pnpm pack:build`, declarative stress generators). Do these first of 0024: B can
   use `pack:build` to check expected outputs.
3. **0024 steps 1, 2, 3, 6 to 11** (pack format v2, target into an existing course, patch lessons, mermaid in packs, feed and
   updates, safety, export, docs, tests). The Markdown lesson format and `scripts/build-content.mjs` exist now (from 0023); use
   them for patches.
4. Also wire imported Markdown lessons to the new navigation (C notes: pass `toc={markdownToc(item.markdown)}` to `ArticleLayout`
   in `app/study/packs/[id]/[item]/page.tsx` and give headings ids from `markdownHeadingIds`).

**Handed to A from C:** `app/study/[area]/**` (only for 0024 step 2 merging pack items into area views), `lib/study.ts`,
`lib/courses.ts`, `app/study/packs/**`, `app/markdown.tsx`, `app/actions.ts` (pack actions), `app/pack-importer.tsx`. C must not
edit these in round two. Only A adds database migrations (0024 patches need a table).

### Agent B (branch `agent/b-problems`): keep going on the problem library

Unchanged: 0022 steps 1 (remaining roadmap problems, about 65 more), 2 (all CSES), 4, 5, 3, 7. Expected outputs from the C++
reference (or `pack:build` once A has it), never by hand. Skip anything in your "do not fit" list that needs design classes
(A does those). Commit per 25 problems. Also, in your notes, list the final problems that do not fit.
Add at the end: 0008 step 11 (retire the old pattern guide in `app/dsa/pattern/[id]/page.tsx`) **only if** agent D reports all 67
articles exist; otherwise leave it.

### Agent C (branch `agent/c-lessons`): core subjects and system design depth, as editable Markdown

1. **0023 follow-up:** migrate the Core CS lessons and then System design lessons to `packages/shared/content/**` with the
   existing migration script (read at least three diffs by eye per area; `pnpm content:check` green).
2. **0015 (core subjects depth)**, batches A to D (OS, databases, networking, Java concurrency): write the new depth **directly in
   the Markdown files** (one file per concept, diagrams in mermaid blocks, `{point: n}` ordering). Target 1,200+ words per
   concept as in the plan. Java demos: compile each once with `javac`.
3. **0014 (system design depth)**, batches A to E: designs (walkthroughs, diagrams, failure modes, Java key parts) in new files
   `packages/shared/src/learn/design-depth-*.ts` plus any Markdown for lessons. Do not touch `lld*` files (D's).
4. **0012 step 4:** confirm `pnpm build` and `pnpm --filter desktop prepare-server` include the mermaid bundle; record the result.

C keeps `learn/index.ts` merge code, `section-points.ts`, `scripts/build-content.mjs`, `content/**`, `learn/generated/**`,
`app/toc*.tsx`, `app/course-outline.tsx`, `app/learn-blocks.tsx`. If a Markdown file you migrate is an LLD lesson, leave it
(D owns LLD content); redo of the LLD migration happens at merge time.

### Agent D (branch `agent/d-lld`): finish 0025, then DSA pattern articles

1. **Finish 0025** as planned: batch D (games, file system, key-value store), batch E (hotel, meeting rooms), step 6 (concept
   lessons), step 5 (batch F as time allows), step 7 (counts and tests). Then mark `0013` superseded in its Implementation notes
   (do not edit its other text).
2. **0008 (DSA pattern articles)**, steps 4 to 10 in order (`dsa-articles-e.ts` through `dsa-articles-k.ts`; trees first). The
   structure and C++ compile tests exist: follow the exemplars, check each article compiles and traces right. Skip step 11
   (B may do it).

## Merge (same as 0026)

1. D, 2. B, 3. A, 4. C, with `pnpm check` after each. Before merging: plan files 0021 to 0027 are untracked in the main
   checkout while agent branches contain copies. The user commits the plan files on `main` first (or the merger keeps the
   branch copy when a merge complains about "untracked files would be overwritten"). After A merges, run `pnpm content:build`
   and `pnpm content:check` (generated lessons file can conflict with C's). Redo C's LLD migration on top of D's lessons.
   Then update the plans index and `docs/HANDOFF.md`, remove the worktrees, run `/review-plan` for each plan.

## Acceptance criteria

- [ ] Each agent's branch only changes files it owns (check `git diff --stat main...agent/x`).
- [ ] Each agent leaves its plan files and *Implementation notes* up to date and reports to `habbitmanager-7a`.
- [ ] `pnpm check` passes on `main` after the final merge.

## Open questions

- Time and usage limits: items are ordered by value, not size. Whoever runs out first stops after the last clean commit.

## Implementation notes

## Review
