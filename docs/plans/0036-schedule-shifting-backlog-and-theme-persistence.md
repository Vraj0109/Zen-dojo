# 0036: Schedule shifting, review backlog management, and theme database persistence

- **Status:** implemented
- **Planned by:** Claude Code & Antigravity, 2026-11-09
- **Implemented by:** Antigravity Subagent, 2026-11-09
- **Spec:** Review Backlog, Schedule Controls, and Appearance Persistence

## Goal

Prevent review overwhelm by capping daily reviews on the Today page, moving excess items to a secondary "Catch up" backlog drawer, allowing users to shift their entire roadmap calendar when taking a break (e.g. festivals, exams, illness), enabling working ahead on future tasks, and persisting theme and appearance preferences into the SQLite database so desktop app updates never reset them.

## Context

### 1. Theme Resetting on Desktop Updates
- Currently, `apps/web/lib/theme.ts` saves appearance choices (`mode`, `accent`, `style`, `font`, `gamify`, `bionic`, `motion`) exclusively to browser `localStorage`.
- In `apps/desktop/main.js`, the local server binds to `http://127.0.0.1:${port}`, picking dynamic fallback ports if port 3000 is busy.
- In Chromium, `localStorage` is strictly partitioned by origin (`scheme://host:port`). If the port changes or the NSIS Windows installer updates the webview directory, `localStorage` is cleared or inaccessible.
- Meanwhile, user data (solves, notes, streak, freezes) lives safely in SQLite (`%APPDATA%\HabitManager\habit.db`) and is backed up via `backupIfVersionChanged`.
- The SQLite `settings` table (`apps/web/lib/schema.ts`, `apps/web/lib/ui-prefs.ts`) already stores `simple_mode`, `plan_start`, and notes. Appearance should also be persisted there.

### 2. Overwhelming Review Queue (64 Reviews Due)
- `apps/web/lib/dsa.ts` and `apps/web/lib/review.ts` mark any solved problem as `resolveDue: true` whenever `daysBetween(resolveOn, today) >= 0`.
- If a user misses 7–14 days (or solves a batch of problems around the same time), all problems mature simultaneously, dumping 60+ items onto "Today" all at once.
- There is currently:
  1. No daily review cap (e.g., maximum 5 spaced reviews per day).
  2. No distinction between "urgent/scheduled today" and "overflow backlog".
  3. No calendar shift mechanism to pause or shift the schedule during a vacation or festival.
  4. No mechanism to work ahead on tomorrow's or next week's tasks early.

## Out of scope

- Complex Anki-style SM-2 or FSRS algorithm overhauls (the 14-day re-solve interval is intuitive; it just needs queue capping and schedule shifting).
- Cloud sync of appearance or backlog state (Zen Dojo remains local-first and offline).

## Architecture and Design

### 1. Theme Persistence in SQLite
- Define `APPEARANCE_SETTING_KEY = "appearance_prefs"` in `apps/web/lib/theme.ts` or `apps/web/lib/ui-prefs.ts`.
- Server actions / endpoints:
  - `getAppearancePrefs()`: reads from `settings` table with fallback to defaults.
  - `saveAppearancePrefs(prefs)`: upserts into `settings` table.
- Client hydration: On initial page mount, if `localStorage` is empty or differs from server settings, synchronize both layers. This guarantees that installer updates, port reassignments, or webview cache purges never reset themes.

### 2. Review Queue Capping & Secondary Catch-up Backlog
- Update `apps/web/lib/review.ts`:
  - Introduce `DAILY_REVIEW_CAP` (default 5, configurable up to 10 in Settings).
  - Split `getReviewQueue()` into:
    - `todayItems`: the top $N$ prioritized items (struggles first, then oldest due re-solves).
    - `backlogItems`: the remaining overdue items.
- On `apps/web/app/today/page.tsx`:
  - Today section shows only `todayItems` (e.g., "5 reviews for today").
  - A discreet secondary badge / drawer appears: *"59 more reviews in Catch-up Backlog"*. Clicking opens a slide-over panel where users can review more at their own pace without cognitive dread.

### 3. Vacation & Festival Schedule Shift ("Pause / Shift Plan")
- In Roadmap and Settings, add a "Shift Schedule" action:
  - User can choose to shift their roadmap by $N$ days or $W$ weeks (e.g., "+7 days for Diwali/Holiday").
  - Updates `plan_start` in the `settings` table by adding $N$ days.
  - Shifts all pending re-solve target dates forward by $N$ days in `problem_solves`.
  - Zero streak penalty: marks the vacation window as paused so streak calculations do not trigger false breaks.

### 4. Working Ahead
- In Roadmap view (`apps/web/app/roadmap/`):
  - Upcoming week cards display an "Advance / Work Ahead" toggle.
  - Solving future tasks immediately marks them complete and updates progress bars, dynamically adjusting the required pace for subsequent weeks.

## Steps

- [x] **1. Appearance persistence in SQLite settings.**
  - Add `getAppearanceSetting()` and `setAppearanceSetting()` to `apps/web/lib/ui-prefs.ts`.
  - Sync appearance preferences between `localStorage` and `settings` table on load in `apps/web/app/shell.tsx`.
  - Done when: Clearing browser `localStorage` and refreshing restores the chosen theme and accent from the database.

- [x] **2. Review queue capping helper & backlog separation.**
  - In `apps/web/lib/review.ts`, add `splitReviewQueue(items, cap)` returning `{ dueToday: ReviewItem[], backlog: ReviewItem[] }`.
  - Prioritize: open struggles > earliest due re-solves > concepts > exercises.
  - Done when: Review items exceeding the cap are returned in `backlog` instead of cluttering `dueToday`.

- [x] **3. Secondary Catch-Up drawer on Today page.**
  - Update `apps/web/app/today/page.tsx` and `apps/web/app/today/today-ui.tsx` to render the primary capped list (max 5) and a collapsible "Catch-up backlog" drawer.
  - Done when: A user with 64 overdue items sees 5 items on Today and an unobtrusive "59 in catch-up" link.

- [x] **4. Schedule shift action in Roadmap and Settings.**
  - Add `shiftPlanSchedule(days: number)` in `apps/web/lib/tasks.ts`.
  - Adjusts `plan_start` in `settings` and offsets pending `problemSolves` re-solve dates.
  - Add UI trigger in `apps/web/app/roadmap/` and `apps/web/app/profile/settings/`.
  - Done when: Shifting by 7 days moves upcoming tasks and due re-solves 7 days forward.

- [x] **5. Work ahead in Roadmap.**
  - Ensure completing tasks scheduled for future dates correctly links to solves without requiring the system date to be in the future.
  - Done when: Future tasks can be launched and solved directly from the roadmap.

- [x] **6. Tests.**
  - Add unit tests in `apps/web/lib/practice-tools.test.ts` for review queue capping and prioritization.
  - Add unit tests in `apps/web/lib/tasks.test.ts` for schedule shifting.
  - Done when: Targeted unit tests pass.

## Acceptance criteria

- [x] Installing a new app build or changing port does not reset the user's theme, font, or accent.
- [x] Today page never displays an overwhelming list of 50+ reviews; reviews are capped to a manageable batch (default 5).
- [x] Users can open the Catch-up Backlog drawer to inspect and clear excess items when they have extra time.
- [ ] Users can shift their entire schedule by 1 or more weeks for holidays/festivals without streak loss. (unverified: see Round 7 audit)
- [x] Users can work ahead on future roadmap days.

## Open questions

- Should the daily review cap be adjustable in settings between 3, 5, and 10 items? (Yes, default to 5 with an option in Settings > Focus & Pacing).

## Implementation notes

1. **Appearance persistence:**
   - In `apps/web/lib/theme.ts`: Added `DEFAULT_APPEARANCE`, `parseAppearance`, and `readStoredAppearance`.
   - In `apps/web/lib/ui-prefs.ts`: Added `getAppearanceSetting()` and `setAppearanceSetting()`.
   - In `apps/web/app/actions.ts`: Added `getAppearanceAction()` and `setAppearanceAction()`.
   - In `apps/web/app/shell.tsx`: Added synchronization on mount between client `localStorage` and SQLite `settings` table, plus a listener on `THEME_EVENT` to automatically sync subsequent theme selections to the database.
   - Tested in `apps/web/lib/ui-prefs.test.ts`.

2. **Review queue capping & backlog:**
   - In `apps/web/lib/review.ts`: Implemented `DAILY_REVIEW_CAP = 5` and `splitReviewQueue(items, cap = 5)` prioritizing `struggle` > `resolve` > `concept` > `exercise`.
   - In `apps/web/app/today/today-ui.tsx`: Created `CatchUpDrawer` client component for slide-over drawer viewing and direct access to postponed items.
   - In `apps/web/app/page.tsx` & `apps/web/app/today/page.tsx`: Capped review queue display to `dueToday.length` and placed `<CatchUpDrawer backlog={backlog} />` in the Up Next header.
   - In `apps/web/app/review/page.tsx`: Capped active items and added collapsible "Catch-up backlog" details section.
   - Tested in `apps/web/lib/practice-tools.test.ts`.

3. **Schedule shifting:**
   - In `apps/web/lib/tasks.ts`: Implemented `shiftPlanSchedule(days: number)` to adjust `plan_start_date` in `settings`, clear obsolete open generated tasks, and offset pending `problemSolves` dates forward by `days` (preserving already completed re-solves).
   - In `apps/web/app/actions.ts`: Added `shiftPlanScheduleAction(formData)`.
   - In `apps/web/app/profile/settings/page.tsx` & `apps/web/app/roadmap/page.tsx`: Added schedule shifting controls (+1 week / +2 weeks).
   - Tested in `apps/web/lib/tasks.test.ts`.

## Review

(To be filled in by reviewer).

### Round 7 audit (Claude Agent 3, 2026-11-10, read-only; no tests run)

- Verified by reading: `DAILY_REVIEW_CAP = 5` and `splitReviewQueue` in `lib/review.ts` with tests in `practice-tools.test.ts`; `CatchUpDrawer` in `app/today/today-ui.tsx` used from `app/page.tsx`; `shiftPlanSchedule` in `lib/tasks.ts` with `shiftPlanScheduleAction` and forms in `roadmap/page.tsx` and `profile/settings/page.tsx`, tested in `tasks.test.ts`; `getAppearanceSetting`/`setAppearanceSetting` in `lib/ui-prefs.ts`, the `shell.tsx` sync and tests in `ui-prefs.test.ts`; a "Work ahead" label on future weeks in `roadmap/page.tsx`. Steps 1 to 6 and the other four acceptance items match the code.
- The acceptance item on streak loss is unticked. The plan's design says the vacation window is "marked as paused" so streaks do not break, but `shiftPlanSchedule` only moves `plan_start`, deletes open generated tasks and moves `solvedOn` on pending solves. No pause marker was found in `progress.ts` or `stats.ts`. Moving `solvedOn` of an original solve also changes the date that solve counts for in XP, the heatmap and the streak, which may not be intended. This needs a decision before the plan is called done.
- The open question says the cap should be adjustable (3, 5 or 10) in Settings; no setting for it was found, only the constant of 5.
- Status was `completed`, which is not in the status list; the file now says `implemented`, as `README.md` already did.
