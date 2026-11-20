# 0101: Follow-up variants on every problem ("what if...")

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** SPEC.md section, if any
- **Mockup:** docs/mockups/interview-prep/0101-followup-variants.html
- **Depends on:** 0092 (brute force + optimal code per problem). Part of the interview-prep set 0095-0111; 0099 (AI
  interviewer) and 0110 (readiness) may read the data this plan creates but are not required.

## Goal

Interviewers rarely stop after the first solution. They change one thing: "what if the array is sorted", "what if it
does not fit in memory", "what if values arrive one at a time". Today every walkthrough ends with two to four loose
bullets under `## Follow-ups`. Replace the guesswork with **2-4 structured follow-up variants per problem**: the
interviewer's question, what changes, the approach, the new cost, and the trap. The problem page gets a **Follow-ups**
tab where you answer out loud first, reveal the answer, and rate yourself. Variants you rate shaky come back in
the Review queue.

## Context

- All 486 files in `packages/shared/content/interview/<id>.md` already have an optional `## Follow-ups` section (loose
  bullets, bundled into `INTERVIEW` in `packages/shared/src/judge/generated/interview.ts`, shown by
  `apps/web/app/solution-walkthrough.tsx`). **Leave them alone.** They stay as the short list under the walkthrough.
- Plan 0092 (in progress, other tool) edits `problems-*.ts`, `content/solutions/*`, the `brute:` front matter of
  `content/interview/*.md`, `scripts/interview.mjs`, `scripts/solutions*.mjs`, `solution-walkthrough.tsx` and the
  generated `solutions.ts`. **How this plan avoids conflicts with 0092:**
  - New content lives in its own folder `packages/shared/content/followups/<problem-id>.md`; no 0092 file is touched.
  - New build script `scripts/followups.mjs` (copy the shape of `scripts/interview.mjs`; it may `import` from it but must
    not edit it) writes its own generated file `packages/shared/src/judge/generated/followups.ts`.
  - The new tab is added in `apps/web/app/dsa/[id]/page.tsx` (the `judgedTabs` list) with a new component
    `apps/web/app/followup-variants.tsx`; `solution-walkthrough.tsx` is not edited.
  - Variants must agree with the walkthrough's "Optimal approach". 0092 may change an optimal approach for a few
    problems (it logs them in its *Implementation notes*). Step 5 re-checks exactly those ids.
- Problem ids: roadmap LeetCode `lc-<n>`, `cses-<slug>`, `c-<slug>` (euler, atcoder, codeforces, kattis, other), design
  problems. They all have an interview file, so `INTERVIEW` keys are the list of ids to cover.
- Reuse: `STRUGGLE_RETRY_DAYS` pattern in `apps/web/lib/struggles.ts` (due date after a delay), `apps/web/lib/review.ts`
  (`ReviewItem` union, `getReviewQueue`), `apps/web/app/review/review-card.tsx`, `PROBLEM_TABS` and `parseProblemTab` in `apps/web/lib/dsa-filters.ts` (with its test)
  , server actions in `apps/web/app/actions.ts`.
- AGENTS.md conventions that apply: migration appended to `MIGRATIONS` in `apps/web/lib/db.ts` plus `schema.ts`, table
  added to `BACKUP_TABLES` (`lib/backup.ts`) and to the sync map (`SYNC_TABLE_MAP_V3`, a new array next to V2 in
  `lib/sync-triggers.ts`; if another plan already added V3, add V4); dates are local `YYYY-MM-DD`; no emoji.

## Content format (the contract for the agents)

File `packages/shared/content/followups/<problem-id>.md`:

```markdown
---
id: lc-1
---
## Input is already sorted {kind: constraint}

Ask: What if the array is already sorted?
Change: You no longer need the hash map; the order tells you which way to move.
Approach: Two pointers, one at each end. If the sum is too small move the left one right, if too big move the right one left. Stop when they meet.
Cost: O(n) time, O(1) extra space
Pitfall: Returning positions in the sorted copy instead of the original array.
```

- 2-4 variants per file (roadmap problems, the ones in `packages/shared/src/dsa.ts`: 3-4; every other problem: 2-3).
  At least two different kinds in a file when it has three or more.
- `kind` is one of `constraint` (sorted, in place, O(1) space, no extra data structure), `scale` (does not fit in memory,
  stream, many machines), `online` (values arrive or change between queries), `shape` (different input: duplicates,
  negatives, 2D, tree instead of array, cyclic), `output` (return all, count, k-th best, the path itself), `proof` (why is
  this correct, what breaks if the greedy choice is changed).
- Fields in this order, one line each (a field may wrap onto following lines): `Ask` (what the interviewer says, up to
  200 characters), `Change` (what stops working in your first solution, up to 300), `Approach` (1-4 sentences, up to
  600), `Cost` (new time and space, written like `O(n log n) time, O(1) extra space`), `Pitfall` (one trap, up to 300).
- Our own words. Never copy LeetCode "Follow up:" lines, editorials or books. Plain short sentences, no emoji, no hype.
- A variant must be answerable with ideas the learner already has from the walkthrough, not a different problem.
  Never describe a trap or cost you are unsure of; drop that variant instead.
- The variant slug (lowercased heading, words joined by `-`) is its progress key: unique within the file, and never
  renamed after release.

## Out of scope

- Editing the `## Follow-ups` bullets in `content/interview/*.md`, the walkthrough UI, solutions, hints (all 0092).
- Code for the variants, running or judging variants, new test cases, AI-generated variants (0099 may use this data).
- Packs and admin-edited problems (they have no follow-ups file; the tab simply does not show).
- Quiz or flashcard decks in `revise.ts`.

## Steps

Step 0 is one agent. Steps 1-4 run in parallel after step 0 (and may start the same day 0092's agents run). Step 5 is the lead.
Nobody except the lead runs `pnpm followups:build`, `pnpm check` or full `pnpm test`.

- [ ] **0. Foundation (one agent, about 0.75 day).**
  - `packages/shared/src/followups.ts`: types `FollowupKind`, `Followup { slug, title, kind, ask, change, approach, cost, pitfall }`,
    `FOLLOWUP_KINDS` (label + one-line help per kind), `parseFollowups(markdown): { ok, followups | errors }` (pure; enforces
    the format above and returns errors with the heading name), `followupSlug(title)`, and the schedule
    `followupDueOn(level, ratedOn)`: level 1 (missed it) due after 2 days, level 2 (got part) after 7, level 3 never.
    Export from `packages/shared/src/index.ts`.
  - `scripts/followups.mjs` (and `scripts/followups.d.mts` if `interview.mjs` has one): commands `build` (writes
    `packages/shared/src/judge/generated/followups.ts`: `export const FOLLOWUPS: Record<string, Followup[]>`), `check [id...]`,
    `status` (coverage per source: leetcode, cses, other, atcoder, codeforces, euler, kattis, design), `todo --group a|b|c|d`
    (ids without a file; the groups are: a = the first half of `lc-*` sorted by number, b = the second half of `lc-*` plus
    every design, special and `c-` "other" problem, c = every `cses-*`, d = every euler, atcoder, codeforces and kattis id).
    `check` also fails on: an id that is not a real problem, a heading used twice, forbidden phrases (import
    `FORBIDDEN_PHRASES` from `scripts/interview.mjs`), a variant over its length limits. Add `followups:build`,
    `followups:check`, `followups:status`, `followups:todo` to the root `package.json` scripts (append only; the file has
    uncommitted changes from other work).
  - Three hand-written sample files: `lc-1.md`, one CSES problem and one design problem. Run `followups:build`.
  - Migration (append to `MIGRATIONS`): `CREATE TABLE followup_progress (problem_id TEXT NOT NULL, variant TEXT NOT NULL,
    level INTEGER NOT NULL, rated_on TEXT NOT NULL, PRIMARY KEY (problem_id, variant));` plus the sync triggers entry for
    it (`SYNC_TABLE_MAP_V3`, composite key `problem_id, variant`, cols `problem_id, variant, level, rated_on`; add the
    default row values to `DEFAULTS` in `lib/sync-engine.ts`). `schema.ts` table `followupProgress`. Add
    `"followup_progress"` to `BACKUP_TABLES`.
  - `apps/web/lib/followups.ts`: `getFollowupProgress(problemId)`, `rateFollowup(problemId, variant, level)` (validates the
    problem has that variant and level is 1-3; upsert; local date), `dueFollowups(today)`.
  - `apps/web/app/actions.ts`: `rateFollowupAction(formData)` (calls `rateFollowup`, then `refresh()`).
  - UI: `apps/web/app/followup-variants.tsx` and the tab. See the mockup: collapsed "Ask me" list; pressing a variant
    shows only the `Ask` line; **Show answer** reveals Change, Approach, Cost, Pitfall; then three rating buttons
    "Missed it", "Got part of it", "Nailed it" post to the action (work without JS as plain forms: each variant is a
    `<details>`, the buttons are `<button formaction>`); done variants show their level chip and the date. Add the tab
    `{ id: "followups", label: "Follow-ups" }` to `judgedTabs` in `apps/web/app/dsa/[id]/page.tsx` only when
    `FOLLOWUPS[p.id]` exists, and add `"followups"` to `PROBLEM_TABS` in `apps/web/lib/dsa-filters.ts` (extend `dsa-filters.test.ts`). Before the problem is solved the tab shows a
    one-line note ("Solve it first, or open the variants anyway") and the list stays collapsed; never lock it.
  - Review integration: `apps/web/lib/review.ts` gets `ReviewItem` kind `"followup"` (`REVIEW_KIND_LABELS`:
    "Follow-up"; detail = the variant title, href = `/dsa/<id>?tab=followups`), built from `dueFollowups`; handle the new
    kind in `apps/web/app/review/review-card.tsx`.
  - Done when: `pnpm exec vitest run packages/shared/src/followups.test.ts apps/web/lib/followups.test.ts` passes
    (cases in step 6), `pnpm -r typecheck` passes, `pnpm followups:status` runs, `/dsa/lc-1?tab=followups` shows the
    sample variants, a rating is saved and a "Missed it" rating shows in `/review` two days later (test with a faked date).
- [ ] **1. Agent A: `todo --group a`** (about 100 problems, 3-4 variants each).
- [ ] **2. Agent B: `todo --group b`** (about 110 problems: LeetCode second half plus design, special and "other").
- [ ] **3. Agent C: `todo --group c`** (136 CSES problems, 2-3 variants each).
- [ ] **4. Agent D: `todo --group d`** (about 150 euler, atcoder, codeforces and kattis problems, 2-3 variants each).
  - Each agent owns only `packages/shared/content/followups/<id>.md` for the ids in its group. Per problem:
    `pnpm interview:context <id>` (statement, constraints, walkthrough), write the file, `pnpm followups:check <ids>`.
    Work in batches of about 10 ids.
  - Context budget (read only this): this plan; the `interview:context` output of the problem you are on. Do not read
    SPEC.md, other plans, the UI, `solutions/`, or other agents' groups.
  - Done when: `pnpm followups:todo --group <yours>` prints nothing and `pnpm followups:check` passes for your ids.
- [ ] **5. Lead.** `pnpm followups:build`, read the "changed optimal solution" log in 0092's *Implementation notes* and
  re-check the variants of those ids, browser check of `/dsa/lc-1?tab=followups` and one CSES problem (1280 px and 390 px,
  light and dark, with and without JS), `pnpm check`, Review.
- [ ] **6. Tests (written in step 0, extended by the lead).**
  - `packages/shared/src/followups.test.ts`: `parseFollowups` accepts the sample, rejects: missing field, field order wrong,
    duplicate heading, 1 or 5 variants, unknown kind, over-long field; `followupSlug`; `followupDueOn` for levels 1-3.
  - `packages/shared/src/judge/followups-content.test.ts`: every key of `FOLLOWUPS` is a real problem id; every variant
    has all fields; once `followups:status` shows 100% (flip the coverage assertion to strict in step 5), every id in
    `INTERVIEW` has 2-4 variants.
  - `apps/web/lib/followups.test.ts`: `:memory:` DB, rate then read back; second rating of the same variant updates it;
    unknown variant or level 4 is refused; review item appears only after the due date (fake only `Date`); backup export
    contains the table.

## Acceptance criteria

- [ ] Every problem with an interview walkthrough has 2-4 follow-up variants (3-4 for roadmap problems), each with
      Ask, Change, Approach, Cost and Pitfall, in our own words.
- [ ] The Follow-ups tab shows on those problems; answers stay hidden until you press Show answer; rating is saved.
- [ ] A variant rated "Missed it" or "Got part of it" appears in the Review queue when due (2 and 7 days) and leaves it
      when you rate it "Nailed it".
- [ ] Ratings are in backups and sync (`followup_progress`), and an existing database migrates without losing data.
- [ ] 0092 files are untouched by this plan (no edit in `solution-walkthrough.tsx`, `scripts/interview.mjs`, `problems-*.ts`,
      `content/solutions`, `content/interview`).
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Estimate

- Step 0: about 0.75 agent-day (migration, sync, data layer, tab UI, review integration).
- Steps 1-4: four agents in parallel, about 1.5 days each (about 490 files, short ones; tier B is quick).
- Step 5 and review: about 0.5 day.
- Total: about 3 calendar days at the current pace (step 0 can run beside 0092; content agents start once step 0 lands).
- Main risk: quality drift. Variants that sound plausible but have a wrong cost or a missing trap. Mitigation: the "drop it if
  unsure" rule, `check` limits, and a lead spot check of 5 files per agent against their walkthroughs.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
