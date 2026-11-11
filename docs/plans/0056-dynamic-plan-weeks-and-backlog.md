# 0056: Dynamic plan weeks and a Backlog page

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** replaces the "Shift schedule" idea of plan 0036; answers 0036's open streak question
- **Estimate at this project's pace:** about one round (4 to 6 hours with two or three agents)

## Goal

The plan's "current week" stops following the calendar and follows what you have actually finished.

- Miss a week and you are still on week 3 with 14 weeks left (3 to 16), not on week 4 with a pile of overdue work.
- Today still shows today's tasks, taken from the current plan week.
- A **Backlog** page lists the tasks of this plan week that were planned for earlier days, with the date they were
  planned for. Nothing is red or alarming; it is information.
- You can sit down for one day, finish the whole plan week (backlog, today's tasks, and the days ahead), and the
  plan moves to the next week by itself.
- Tasks you skip **stay inside their original week**. Finishing that week clears them. (Decided with the user.)

## Context (verified in the code, 2026-11-11)

- `apps/web/lib/tasks.ts`: `getTodayView()` calls `planWeekNumber(planStart, today)` (calendar math from
  `packages/shared/src/dates.ts`) and `ensureTasks(today, weekNo)`, which creates **only today's** day tasks and this
  calendar Monday's three weekly goals. A day you skip leaves no row, so there is nothing to back-log today.
- `shiftPlanSchedule(days)` (plan 0036) only moves `plan_start_date`, deletes open generated tasks and moves
  `solved_on` of pending re-solves (which also changes XP, heatmap and streak dates). It is superseded by this plan.
- The `tasks` table has a unique index on `(date, scope, template_key)` and is **synced** to the cloud with a fixed
  column list (`SYNC_TABLE_MAP` in `apps/web/lib/sync-triggers.ts`, and the Worker's column list in
  `packages/sync-worker/src/index.ts`). **Do not add a column** to `tasks`; that would need a Worker and D1 change.
  This plan encodes the plan week inside `template_key` instead (see Design).
- `settings` rows sync too (except the denylist), so the new settings below follow you across devices.
- `planWeekNumber(planStart, ...)` is used by: `lib/tasks.ts`, `lib/roadmap.ts`, `lib/boss.ts:48`,
  `lib/weekly.ts:138`, `app/profile/page.tsx:35`. All of them must move to the new position (see step 4).
- Templates: `WEEKDAY_TEMPLATE` (3 tasks), `WEEKEND_TEMPLATE` (3 tasks), `WEEK_TEMPLATE` (3 weekly goals) in
  `packages/shared/src/plan.ts`; `PLAN_WEEKS` has 16 weeks.
- The streak comes from XP events (`lib/progress.ts`), not from tasks. A week of doing nothing breaks the streak the
  same way as today; streak freezes still work. No streak change is needed.
- AGENTS.md conventions that apply: dates are local `YYYY-MM-DD` strings (use `dates.ts` helpers); server actions
  call `refresh()` after mutating; Next 16 `cacheComponents` (request-time data in an async component with
  `await connection()` inside `<Suspense>`); never edit a shipped migration (this plan needs none); tests use
  `DATABASE_URL=":memory:"`, reset `globalThis.habitDb`, and fake only `Date`.

## Design (decided)

**Plan position** is three settings rows (all strings):

| key | meaning |
|---|---|
| `plan_week_cursor` | the current plan week, `1` to `16` |
| `plan_week_start` | the local date the current plan week began; its 7 day-slots are due on `start + 0..6` |
| `plan_week_history` | JSON `[{"week":2,"start":"2026-11-09","end":"2026-11-12"}]`, appended when a week completes |
| `plan_finished` | `"1"` once week 16 is complete |

**A plan week owns 24 generated tasks, created together** when the week starts (and safely re-created if missing):
3 weekly goals (`scope: "week"`, `date = plan_week_start`) and 7 day-slots of 3 tasks each (`scope: "day"`,
`date = start + k - 1` for slot `k = 1..7`, the weekday or weekend template chosen by that date). Their
`template_key` is **prefixed with the plan week**: `w3:dsa-warmup`, `w3:week-dsa`. This keeps the existing unique
index valid, needs no migration, and syncs with no Worker change. Rows with an unprefixed key are "legacy": they are
never generated again, never counted as backlog, and stay as history if done.

**Today's slot** is `clamp(daysBetween(plan_week_start, today) + 1, 1, 7)`. Today's tasks are that slot's three tasks.
If you are more than 7 days into a week, today is slot 7 and slots 1 to 6 are backlog.

**Backlog** = open generated day tasks of the current plan week whose slot is *earlier* than today's slot (planned for
a day that has passed). Open weekly goals join the backlog only after `plan_week_start + 6` has passed. Slots *later*
than today's are "Rest of this week" (you may work ahead; they are real rows you can tick).

**Complete** = every generated row of this plan week (prefix `w{N}:` **and** `date` inside
`plan_week_start .. plan_week_start + 6`) is `done`. The date window matters: it stops old done rows from an earlier
run of the same week (after a restart) from counting. Custom tasks (`template_key IS NULL`) never count.

**Advance** (`advancePlanWeekIfComplete`): append to history `{week, start, end: today}`; if `cursor < 16` set
`cursor + 1` and `plan_week_start = today` and create the new week's 24 rows; if `cursor == 16` set
`plan_finished = "1"`. Called after every `toggleTask` and from `getTodayView()`.

**First run for an existing user** (no `plan_week_cursor` yet): `cursor = clamp(planWeekNumber(plan_start_date, today), 1, 16)`,
`plan_week_start = addDays(plan_start_date, (cursor - 1) * 7)`, history empty. If `plan_start_date > today`, cursor `1`
and start `plan_start_date` and nothing is generated until that day (the "Plan not started" banner stays).
Delete legacy open generated tasks once (rows with a non-null, unprefixed `template_key` and `status = 'todo'`), exactly
as `setPlanStart` does today, so they do not linger invisibly.

**Skip the rest of this week** (`skipPlanWeek`): deletes the open generated rows of the current plan week and advances
(history gets the week). This is the escape hatch for "I am not doing this week". It needs a confirmation checkbox.

**`setPlanStart(date)`** (Settings "start date"): sets `plan_start_date`, `cursor = 1`, `plan_week_start = date`,
clears history and `plan_finished`, deletes open generated tasks (prefixed or not). Done rows stay.

**Roadmap** shows state per week: done, current, upcoming; "weeks left" = `16 - cursor + 1` (0 when finished); the
current week card shows how many of its 24 tasks are done and how many are in the backlog. Per-week stats for past
weeks use the history ranges; weeks before the history began fall back to the old calendar formula
`addDays(plan_start_date, (week - 1) * 7)`.

## Out of scope

- Re-solve review scheduling (`solved_on` dates are no longer shifted by anything). The "Catch up" review drawer from
  0036 stays as it is.
- Changing XP amounts or streak rules.
- A "skipped" task status, partial week skipping, or per-task dates you can move.
- Cloud sync changes: settings and `tasks` already sync; no Worker, D1 or `SYNC_TABLE_MAP` edit.

## Steps

Targeted tests only (`pnpm exec vitest run <file>`, `pnpm -r typecheck`); the lead runs one `pnpm check` at the end.
Local commits with explicit paths; no push, no attribution; never touch `data/habit.db` (tests use `:memory:`).

Suggested split: Agent A (steps 1 to 3 and 6), Agent B (steps 4, 5 and 7).

- [x] **1. Pure rules** in a new `packages/shared/src/plan-weeks.ts` (export it from the package index) with
  `SLOTS_PER_WEEK = 7`, `weekKey(week, key)`, `parseWeekKey(key)`, `slotDueDate(start, slot)`,
  `todaySlot(start, today)`, `weeksLeft(cursor, finished)`, `isWeekComplete(rows, week, start)` and
  `splitBacklog(rows, week, start, today)` returning `{ overdue, today, upcoming, goals: { open, overdue } }`.
  Rows are `{ id, date, scope, templateKey, status }`-shaped (generic over the row type).
  - Done when: `packages/shared/src/plan-weeks.test.ts` passes (`pnpm exec vitest run packages/shared/src/plan-weeks.test.ts`)
    covering: slot clamping at 1 and 7, a week not complete with one open row, complete when all 24 are done, old
    rows outside the date window ignored, legacy keys ignored, goals overdue only after day 7.
- [x] **2. Position and generation** in `apps/web/lib/tasks.ts`: add `getPlanPosition()`, `ensurePlanWeek(week, start)`
  (single `insert ... onConflictDoNothing` of all 24 rows, titles from `weekFor(week)` templates),
  `advancePlanWeekIfComplete(today)`, `skipPlanWeek(today)`. Remove `ensureTasks`. Change `setPlanStart` as in Design.
  - Done when: after `getPlanPosition()` on an empty database the settings rows exist and 24 rows exist for the week;
    calling it twice creates no duplicates.
- [x] **3. Today** in `apps/web/lib/tasks.ts` `getTodayView()` and `apps/web/app/page.tsx`: `weekNo` becomes the cursor;
  `dayTasks` are today's slot, `weekTasks` the three goals of this plan week; add `weeksLeft`, `backlogCount`,
  `finished` to `TodayView`. In the header show `Week 3 of 16` with a muted `14 weeks left`, and a plain link
  `Backlog: 9 tasks` to `/backlog` (hidden at 0; no red styling). `toggleTask` calls `advancePlanWeekIfComplete`.
  - Done when: `pnpm -r typecheck` passes and Today still renders for a fresh database and for a finished plan.
- [ ] **4. Move the other consumers off the calendar:** `lib/roadmap.ts` (states, weeks left, history ranges),
  `app/roadmap/page.tsx` (render them; remove the "Shift" forms), `lib/boss.ts:48` (use the cursor),
  `lib/weekly.ts:138` (plan week = the history entry or current week overlapping that Monday, else `null`),
  `app/profile/page.tsx:35` (cursor).
  - Done when: no remaining import of `planWeekNumber` outside the first-run code in `tasks.ts` and `dates.ts`
    (check with Grep), typecheck passes.
- [ ] **5. Backlog page** `apps/web/app/backlog/page.tsx` (async server component with `connection()` in
  `<Suspense>`, wide layout). Sections: **Overdue** (grouped by planned date, oldest first, each row "planned Mon 9 Nov,
  4 days ago"), **Weekly goals**, **Rest of this week** (work ahead). Each row has the same checkbox form as Today
  (reuse the existing toggle server action in `apps/web/app/actions.ts`). A "Skip the rest of this week" form
  (`skipPlanWeekAction`, confirmation checkbox, plain wording about what it does). Add `/backlog` to the `matches` of the
  Today item in `apps/web/app/nav.tsx` so Today stays highlighted. Empty state: "Nothing behind. Good."
  - Done when: with a copy of the database whose `plan_week_start` is 10 days ago, the page lists 6 overdue days,
    ticking one updates the count on Today after `refresh()`.
- [x] **6. Remove the superseded shift feature:** delete `shiftPlanSchedule` and its test in `lib/tasks.ts` /
  `lib/tasks.test.ts`, `shiftPlanScheduleAction` in `app/actions.ts`, and the shift forms in `app/profile/settings/page.tsx`
  (Settings keeps the start-date control). Add one line to plan 0036: "Schedule shifting superseded by 0056."
  - Done when: Grep finds no `shiftPlanSchedule` anywhere except the 0036 plan text.
- [x] **7. Tests** in `apps/web/lib/tasks.test.ts` (and adjust the roadmap, weekly, boss tests that assumed calendar
  weeks): first run for an existing user; 10 idle days gives today = slot 7 and 6 overdue days; ticking everything
  advances the week and starts the next one today; working ahead finishes a week early; `skipPlanWeek`;
  `setPlanStart` reset; week 16 completes into `plan_finished`; ensure is idempotent; legacy rows are ignored.
  - Done when: `pnpm exec vitest run apps/web/lib/tasks.test.ts apps/web/lib/roadmap.test.ts apps/web/lib/weekly.test.ts`
    passes (use the test files that exist; add `roadmap.test.ts` only if there is none).

## Acceptance criteria

- [ ] On a copy of your database with `plan_week_start` set 10 days ago, Today says "Week N of 16" for the *same* N as
  before the gap, shows today's three tasks, and shows a quiet "Backlog: 6 days of tasks" link.
- [ ] The Backlog page lists each missed day with its planned date; ticking everything on it, today's tasks and the
  rest of the week moves Today to week N+1 immediately, and the Roadmap shows N done, N+1 current.
- [ ] Skipping the rest of a week works only after ticking the confirmation and lands on the next week.
- [ ] The Roadmap and Settings no longer offer "Shift schedule"; "Weeks left" is `16 - N + 1`.
- [ ] A device that has never opened Today after the update gets the same cursor from sync (settings rows sync); no
  Worker change was needed.
- [ ] `pnpm check` passes.

## Pitfalls

- Do **not** add a column to `tasks` (cloud sync would break); the prefix is the design.
- `isWeekComplete` must use the date window, or a restarted plan completes weeks instantly.
- Two devices can both advance a week; the history may then contain a duplicate week number. Make `advance` read the
  cursor inside the same call and ignore a history entry whose `week` already exists.
- No `Date.now()` / `Math.random()` during render; compute `today` in `lib/` (existing pattern).
- The streak is not touched; do not add pausing.

## Open questions

## Implementation notes

Agent A (steps 1, 2, 3, 6, 7): plan-weeks.ts + tests; getPlanPosition, getBacklogView, skipPlanWeek, advancePlanWeekIfComplete in lib/tasks.ts; skipPlanWeekAction; Today header shows weeks left and a Backlog link; shift feature removed (0036 already carried the superseded line). Custom tasks still show on Today (today for day, this calendar Monday for week). TodayView also has beforeStart. Step 7 roadmap/weekly/boss tests are Agent B. Known breakage outside A: prefixed keys break exact-key lookups in boss.ts, leetcode/sync.ts, focus.ts taskLink and the tests for them.

## Review
