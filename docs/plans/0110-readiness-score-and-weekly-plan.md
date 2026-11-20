# 0110: Readiness score per area and "what to do this week"

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0110-readiness.html

## Goal

After 16 weeks of study the question is "am I ready, and what is my weakest link?". Give every area a **readiness score from 0 to 100**
(DSA, system design, LLD, core CS, behavioural, mocks) and an overall score, each with the reasons behind it, how it changed in
the last 4 weeks, and a short, ranked **"This week" plan**: up to seven concrete actions that fit your weekly hours and your
interview date, each one a link to the screen where you do it. It is an honest estimate from your own data, not a prediction
of any company's decision.

## Context

- **What the app already knows (reuse, do not recompute):**
  - `getReviseAreas()`, `getRevisePatterns()`, `getWeakSpots()` in `apps/web/lib/revise.ts`: concept `confidence`
    (0-5; covered at `COVERED_CONFIDENCE = 4` in `packages/shared/src/study.ts`), design/LLD exercise `lastScore` (1-5),
    pattern `solved` vs `target` and `stuck`.
  - `getDsaView()` in `apps/web/lib/dsa.ts` (solve status, difficulty), `problem_solves` (kind `solve` | `resolve`, `solved_on`),
    `openStruggles()` in `apps/web/lib/struggles.ts`, boss fights in `apps/web/lib/boss.ts` (`boss_fights.results` JSON of
    `solved | hint | failed`, `fought_on`), `practice_sessions` (`practiced_on`, `score`), `concept_progress` (`covered_on`).
  - `getInterviewDate()` / `getCountdown()` in `apps/web/lib/revise.ts` (settings key `interview_date`).
  - `getStats()` in `apps/web/lib/stats.ts` and the profile pages under `apps/web/app/profile/` (tabs in
    `profile/layout.tsx`). Category weights of the roadmap are `CATEGORIES` in `packages/shared/src/plan.ts`
    (dsa 0.40, sd 0.35, behavioural + LLD 0.15, mocks 0.10).
- **From this plan set (read the merged code; the names below are the planned ones):** `mock_sessions.scores_json` and the
  rubrics (0096; saved scores only, never AI proposals from 0099), the `stories` table and principle tags (0095), company
  progress (0103), the OA (0102), design and LLD mocks (0097, 0098).
- **No new table and no migration.** The score is computed from rows that already exist, so it syncs and backs up for free. The
  trend is computed by running the same function "as of" 28 days ago over the dated rows. One setting, `weekly_hours`
  (default 10, 1-60), uses the existing `settings` table.
- **Optional sources.** A source that has not shipped, or has no rows, is `null`; the score for that signal is dropped and the
  rest are re-weighted, and the UI says "No data yet" for it. A `FEATURES` constant (below) says which new routes exist so
  the plan only links to screens that are there.
- **Conventions that apply:** pure logic and tests in `packages/shared/src/`; the data gatherer in `apps/web/lib/`; async
  request-time component with `await connection()` inside `<Suspense>` (Next 16, `AGENTS.md`); local dates from `dates.ts`;
  no emoji; plain writing.

## Design

**Inputs** (`packages/shared/src/readiness/types.ts`; the gatherer builds exactly this, dates are local `YYYY-MM-DD`):

```ts
export interface ReadinessInputs {
  today: string;
  interviewDate: string | null;
  weeklyHours: number;
  patterns: { id: string; name: string; solved: number; target: number; stuck: number }[];
  solves: { problemId: string; kind: "solve" | "resolve"; on: string; difficulty: "easy" | "medium" | "hard" | null }[];
  openStruggles: number;
  boss: { on: string; solved: number; total: number }[];             // solved = "solved in time" count
  concepts: { id: string; area: "sd" | "lld" | "core"; confidence: number; coveredOn: string | null }[];
  exercises: { id: string; area: "sd" | "lld"; title: string; lastScore: number | null; lastOn: string | null }[];
  stories: { principles: string[]; complete: boolean; hasMetric: boolean }[] | null;   // null = 0095 not available
  mocks: { kind: "coding" | "design" | "lld" | "behavioral" | "oa"; on: string; score: number }[] | null; // score 0-1
}
```

**Signals and weights.** Each signal is 0-1. If a signal is `null` (no data), it is left out and the others are scaled to sum 1.

| Area | Overall weight | Signals (weight inside the area) |
|---|---|---|
| `dsa` | 0.38 | coverage 0.40: `sum(min(solved, target)) / sum(target)` over patterns; retention 0.25: `1 - min(1, openStruggles / max(5, 0.15 x solvedCount))`; depth 0.15: `min(1, (mediums + 2 x hards solved) / 60)`; speed 0.10: solved-in-time share of the last 5 boss fights (null with none); recency 0.10: 1 if last solve is 7 days ago or less, falling linearly to 0 at 42 days |
| `sd` | 0.30 | concepts 0.35: share of sd concepts at confidence 4 or more; designs 0.35: share of sd exercises with `lastScore >= 4`; mocks 0.20: mean of the last 3 `design` mock scores (null with none); recency 0.10: latest practice, concept or mock date, same ramp |
| `lld` | 0.08 | concepts 0.35; designs 0.35 (lld exercises); mocks 0.20 (last 3 `lld` mocks); recency 0.10 |
| `core` | 0.06 | concepts 0.60; mean confidence / 5 0.30; recency 0.10 |
| `behavioral` | 0.08 | stories 0.40: `min(1, completeStoriesWithMetric / 8)`; principle coverage 0.30: share of the 16 principles with at least one story (use the list 0095 defines); mocks 0.30: mean of the last 3 `behavioral` mock scores |
| `mocks` | 0.10 | volume 0.40: `min(1, mocks in the last 28 days / 4)`; quality 0.40: mean score of the last 5 mocks; variety 0.20: kinds done in the last 28 days out of coding, design, lld, behavioral |

The overall score is the weighted mean of the areas that have at least one signal, rounded; areas without data are listed as
"Not started" and do not count as zero, but the overall shows "based on N of 6 areas". Levels: 0-24 **Getting started**,
25-49 **Building**, 50-74 **Solid**, 75-100 **Interview-ready**. These are our own cut-offs; the page says so. The weights
follow the roadmap's category shares (sd and dsa carry most of the weight) and live in one `WEIGHTS` constant so the user
can see and a later plan can change them.

**Trend.** `computeReadiness(inputs, asOf)` filters every dated row to `on <= asOf`. The page shows
`now` and `now at asOf - 28 days` and the difference. Concept confidence has no history, so concept signals use their
current value in both runs; the page footnote says "Trend counts solves, practice and mocks".

**Pace.** With an interview date: `weeksLeft = ceil(daysLeft / 7)`, `gap = max(0, 75 - overall)`,
`needed = gap / weeksLeft` points per week, compared with the last 4 weeks' gain. States: "On pace", "Behind: about N points a
week needed", "Date has passed". Without a date: no pace line and a prompt to set the date (links to Quick revise where the date is set).

**Week plan** (`packages/shared/src/readiness/plan.ts`, pure). A catalogue of action rules, each producing
`{ id, area, title, why, minutes, href, gain, signal, requires? }`:

| Rule | Fires when | Title (example) | href | Minutes |
|---|---|---|---|---|
| clear-stuck | `openStruggles >= 3` | "Clear 3 items from your stuck list" | `/review` | 45 |
| weak-pattern | a pattern has `solved < target` (lowest ratio first) | "Solve 3 problems in Sliding window" | `/dsa/pattern/<id>` | 90 |
| resolve-due | re-solves are due | "Re-solve 2 due problems" | `/dsa?tab=resolve` | 40 |
| boss | no boss fight in 14 days and dsa coverage over 0.4 | "One boss fight (2 problems, 2 hours)" | `/dsa/boss` | 120 |
| design-practice | lowest-scoring or unpractised sd exercise | "Practise 'Design a news feed' and score yourself" | `/study/sd/<id>` | 60 |
| lld-practice | same for lld | | `/study/lld/<id>` | 60 |
| concepts | core or sd concepts below 4 | "Review 4 shaky concepts in Core CS" | `/study/core` | 40 |
| mock | no mock of a kind in 14 days (needs `FEATURES.mocks`) | "Do a design mock" | `/mock/<kind>/new` | 60 |
| stories | fewer than 8 complete stories or uncovered principles (needs `FEATURES.stories`) | "Write 2 stories for Ownership and Dive deep" | the story bank route 0095 defines | 40 |
| company | company list under 60% solved and a chosen company (needs `FEATURES.companies`) | "Finish Amazon's classic problems" | `/dsa/companies/<id>` | 90 |
| oa | interview within 60 days, no OA in 28 days (needs `FEATURES.oa`) | "Take one online assessment" | `/mock/oa/new` | 100 |

`gain` is the estimated rise of the overall score if the action is done: `areaWeight x signalWeight x deltaSignal x 100`,
where `deltaSignal` is the action's own estimate (for example "3 problems in a pattern with target 5" adds `3/ sum(target)`).
`buildWeekPlan(readiness, inputs, features)` sorts by `gain / minutes`, fills the weekly budget (`weeklyHours x 60` minutes,
at most 7 actions, at most 3 from one area), always includes one action for the weakest area, and adds a mock action when the
mocks area is below 50 and the feature exists. Ties break by area order. If `daysLeft <= 7`, only revision rules
(clear-stuck, resolve-due, concepts, mock) are allowed. Every action carries `why`: one sentence quoting the signal ("3 of 12
design exercises scored 4 or more").

`FEATURES` (`readiness/features.ts`): `{ mocks, stories, companies, oa, designMock, lldMock }`, set by step 0 by checking which
plans are merged; a test asserts every `href` of an enabled feature is a route that exists in `apps/web/app` (path match against
the folder tree).

## Screens

- `/profile/readiness` (a new tab "Readiness" in `profile/layout.tsx`): overall dial with level and pace line; one card per area
  (score, level chip, 4-week change, the signals as small labelled bars with the number behind each, "No data yet" where
  null, and the single weakest signal marked); "This week" list (action, why, minutes, a tick to "Add to Today", gain shown as
  "worth about +2"); the weekly hours field and the interview date shown with a link to change it; a footnote that explains
  the method in 4 lines and links to a "How this is calculated" section on the same page.
- Today (`apps/web/app/page.tsx`, `apps/web/app/today/today-ui.tsx`): a small card "Readiness 58, Solid. This week: 3 actions
  left" linking to the page. Hidden when there is no data at all.
- Interview hub (`/mock`, 0096): one card linking to the page. Add the card component only.

## Out of scope

- Predicting offers or any company's decision; a pass/fail verdict.
- AI-written advice (the plan is rules, so it is testable and explainable). A later plan can phrase the "why" with the AI.
- New tracking (no time-on-task, no new tables). Weights are not user-editable.
- Changing XP, streaks, badges or the roadmap's weekly tasks (the plan can add tasks to Today but does not edit the roadmap).
- Notifications and email.

## Dependencies

- Hard: **0095** (stories) and **0096** (mocks), because the behavioural and mocks areas read them and the Interview hub card
  needs `/mock`.
- Soft, each switches on actions and signals when merged: **0097**, **0098** (design and LLD mocks), **0102** (OA),
  **0103** (company progress), **0099** (no direct use: AI scores count only after you save them).
- Ship this plan last in the set.

## Steps

Step 0, then agents A-D in parallel on disjoint files.

- [ ] **0. Foundation (lead).** Create `packages/shared/src/readiness/types.ts` (`ReadinessInputs` above, `AreaId`,
  `SignalResult { id, label, value: number | null, weight, detail }`, `AreaResult { id, label, score: number | null, level,
  signals: SignalResult[], weakest?: string, change: number | null }`, `Readiness { overall: number | null, areasUsed: number,
  level, areas: AreaResult[], pace: ... }`, `WeekAction`), `readiness/weights.ts` (`WEIGHTS`, `LEVELS`, `AREA_ORDER`),
  `readiness/features.ts`, `readiness/index.ts` exporting everything, and a `computeReadiness(inputs, asOf)` combiner that
  calls `areaSignals[...]` functions (stubs returning `[]` until agents fill them; the combiner re-weights null signals,
  computes levels, the overall and the trend). Export from the shared index. Add skeletons
  `apps/web/lib/readiness.ts` (`getReadiness()` returns empty inputs) and `apps/web/app/profile/readiness/page.tsx`
  (renders "Readiness" and the overall), plus the profile tab.
  - Done when: `pnpm -r typecheck` passes and `pnpm exec vitest run packages/shared/src/readiness` passes the combiner tests
    (re-weighting of null signals, overall over used areas, level cut-offs at 24/25/49/50/74/75, trend uses `asOf`).
- [ ] **1. Agent A: area signals for dsa, sd, lld, core.** Files: `packages/shared/src/readiness/areas-study.ts`,
  `areas-study.test.ts`. Implement the signal functions exactly as in the table, plus the `weakest` pick. Context budget (read
  only this): this plan's Design table, `readiness/types.ts`, `readiness/weights.ts`, `dates.ts` (`daysBetween`, `addDays`).
  - Done when: tests cover each signal with hand-computed numbers (including empty input, all solved, 0 target patterns,
    `lastScore` null, the 7/42-day ramp at 7, 24.5 and 42 days, hard-weighted depth) and the asOf filtering of dated rows.
- [ ] **2. Agent B: signals for behavioural and mocks, plus the week plan.** Files:
  `packages/shared/src/readiness/areas-people.ts`, `plan.ts`, `areas-people.test.ts`, `plan.test.ts`. Implement the
  behavioural and mocks signals, then `buildWeekPlan` with the rule catalogue and budget logic above. Context budget: this
  plan, `types.ts`, `weights.ts`, `features.ts`, the principle list and the rubric score scale from 0095/0096 (names only).
  - Done when: tests cover: null `stories`/`mocks` give null signals; the plan never exceeds the minute budget, 7 actions or 3
    per area; the weakest area always gets an action; `daysLeft <= 7` allows revision rules only; disabled features produce no
    action; actions are sorted by gain per minute; `why` text contains the real numbers; the same input gives the same plan
    (no randomness).
- [ ] **3. Agent C: the data gatherer.** Files: `apps/web/lib/readiness.ts`, `apps/web/lib/readiness.test.ts`. Build
  `ReadinessInputs` from the sources in Context (one `Promise.all`), `getWeeklyHours()`/`setWeeklyHours()` (settings key
  `weekly_hours`, clamp 1-60), and `getReadiness()` returning `{ now, before, plan, inputs summary }`. Read `mock_sessions`
  with a query that tolerates the table's absence only if 0096 is not merged (it is a hard dependency, so import it
  normally). Never write anything. Test with `DATABASE_URL=":memory:"`, reset `globalThis.habitDb`, fake only `Date`
  (`vi.useFakeTimers({ toFake: ["Date"] })`), per `AGENTS.md`. Context budget: this plan, `lib/revise.ts`, `lib/dsa.ts`,
  `lib/boss.ts`, `lib/struggles.ts`, `lib/schema.ts`, the `mock_sessions` and `stories` schema, an existing DB test such as
  `lib/progress.test.ts` for the pattern.
  - Done when: tests seed rows and prove the gatherer's numbers (patterns, solves with difficulty, open struggles, boss
    results parsed from JSON, concept coverage, exercise last scores, mocks normalised to 0-1) and that a fresh database
    gives all-null inputs and an `overall` of null without throwing.
- [ ] **4. Agent D: UI.** Files: `apps/web/app/profile/readiness/page.tsx`, `readiness-ui.tsx`, `week-plan.tsx`,
  `actions.ts` (`setWeeklyHoursAction`, `addPlanToTodayAction` using `lib/tasks.ts`), `apps/web/app/today/readiness-card.tsx`
  (+ the one-line mount in `today-ui.tsx`/`page.tsx`), the hub card file for `/mock`. Match the mockup: dial, area cards, "This
  week" list, pace line, empty state (no data: "Do a few things and come back", with three starter links), phone layout (one
  column, 44px targets). Async data component + `<Suspense>` + skeleton. Context budget: this plan, the mockup,
  `profile/layout.tsx`, `app/ui.tsx` (shared bits), `today/today-ui.tsx`, `lib/tasks.ts` (adding a task).
  - Done when: in the browser at 1280 and 390 px, light and dark, the three states (empty, partial data, full data) render
    without overflow; ticking an action adds a task visible on `/`; changing weekly hours changes the plan; every action link
    opens a real page.
- [ ] **5. Review (lead).** `pnpm -r typecheck`, targeted tests, `pnpm check` once. Run the page against a copy of the data
  (never `data/habit.db`) and check that the numbers match a hand calculation for one area.
  - Done when: acceptance criteria below are ticked.

## Acceptance criteria

- [ ] `/profile/readiness` shows an overall score and six area scores, each with its level, 4-week change and the signals behind
      it; missing data shows "No data yet" and is not counted as zero.
- [ ] "This week" shows up to 7 actions within your weekly hours, each with a reason that quotes your own numbers, a minute
      estimate and a working link; ticking adds it to Today.
- [ ] With an interview date, the page says whether you are on pace; with 7 days or fewer left, only revision actions appear.
- [ ] Only saved mock scores count; AI-proposed scores from 0099 do not until you save them.
- [ ] The method (weights and cut-offs) is visible on the page; the page says it is an estimate.
- [ ] Nothing in `data/habit.db` or any table schema changes; `pnpm check` passes.
- [ ] No changes outside the files listed above (the Today card mount and hub card are explained in *Implementation notes*).

## Estimate

- Step 0: 0.25 agent-day. Agents A-D in parallel: A 0.5, B 0.75, C 0.75, D 1 agent-day. Review and fixes: 0.5 day.
- Total: about 1.5 calendar days, after 0095 and 0096 are merged (and best after 0097-0103, so every action exists).
- Main risk: a score that feels wrong ("I solved 200 problems and it says Building"). Mitigation: show the signals and
  weights, keep one `WEIGHTS` constant, and tune the cut-offs after the first review against the user's own data copy.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
