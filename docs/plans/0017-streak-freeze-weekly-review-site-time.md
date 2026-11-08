# 0017: Streak freeze, weekly review, time on LeetCode pages

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-08
- **Implemented by:** Claude Code, 2026-11-08
- **Spec:** SPEC.md "remaining ideas" (weekly review, streak freeze, weak-spot report, extension site-time tracking)

## Goal

Three small features that were on the "remaining ideas" list:

1. **Streak freeze.** One missed day per Monday-Sunday week can be covered so a streak survives it.
2. **Weekly review.** A page that sums up a week next to the week before, holds a short written reflection, and lists the
   weak spots to look at next.
3. **Time on LeetCode pages.** The browser extension counts the minutes spent on each problem page and the app shows them.

The **weak-spot report** already exists as Quick revise (`getWeakSpots` in `lib/revise.ts`, page `/revise`). It is not
rebuilt: the weekly review shows its top items and links to Quick revise.

## Context

- Streak maths: `currentStreak` (`packages/shared/src/game.ts`) and `bestStreak` (`stats.ts`) take a list of days. XP events
  come from `xpEvents()` in `lib/progress.ts`.
- Extension: content script on leetcode.com -> `background.js` (only part that calls the app, with an allow-list of paths)
  -> `api/ext/*` routes, pairing-key auth in `lib/leetcode/extension.ts`.
- One migration adds the three tables (never edit a shipped migration; `BACKUP_TABLES` updated).

## Out of scope

- Ollama / AI coach, the declutter plan (SPEC 6.6 and 7.3), earning freezes, more than one freeze per week.
- Counting site time in "hours studied" or XP (it would double-count a focus-timer session).
- Tracking any site other than leetcode.com problem pages, or sending page content.

## Steps

- [x] **1. Freeze rules** `packages/shared/src/freeze.ts` + `freeze.test.ts`: `streakDays`, `freezeCandidates`, `canFreeze`.
  - Done when: the tests cover week limit, window, "nothing to save", today excluded.
- [x] **2. Migration + schema + backup:** `streak_freezes`, `weekly_reviews`, `site_time` in `lib/db.ts`, `lib/schema.ts`, `lib/backup.ts`.
  - Done when: `backup.test.ts` and `db.test.ts` pass (table list and version are checked there).
- [x] **3. Freeze in the app:** `lib/progress.ts` (`frozenDays`, `applyFreeze`, `freezeOffer`), `lib/stats.ts` (streak numbers use
  frozen days; active days do not), `lib/tasks.ts` type, `freezeDayAction`, offer card on `app/page.tsx`, `lib/progress.test.ts`.
  - Done when: a missed day can be frozen once per week, the streak continues, XP is unchanged.
- [x] **4. Site time, server:** `lib/site-time.ts`, `app/api/ext/time/route.ts`, `lib/site-time.test.ts`. Entries are validated
  (day, slug, 1 s to 6 h per entry) and added up; one problem is capped at 24 h a day.
- [x] **5. Site time, extension:** `apps/extension/lib/time.js` (+ test), tracker in `content.js` (visible + focused + input in the
  last 60 s, flush every 60 s), `/api/ext/time` in the `background.js` allow-list, `lib/time.js` in the manifest, a popup
  checkbox to turn it off, version 0.2.0.
- [x] **6. Weekly review:** `lib/weekly.ts` (+ test), page `app/review/week/page.tsx`, `saveReflectionAction`, a "Weekly review"
  tab in `ReviewTabs`, site minutes on the problem page.
- [x] **7. Check:** `pnpm check`.

## Acceptance criteria

- [x] Today offers "Freeze that day" only when a missed day follows an active day and the week's freeze is unused
- [x] A frozen day keeps the streak (Today and Profile), adds no XP and is not counted as an active day
- [x] `/review/week` shows the week, the week before, a reflection form, weak spots and (with the extension) top LeetCode problems
- [x] The extension reports minutes per problem page; the problem page shows them
- [x] `pnpm check` passes (lint, typecheck, tests, build)
- [ ] Extension time tracking tried in a real browser on leetcode.com (not done: no browser session was available)

## Open questions

None.

## Implementation notes

- Files: see the steps. New: `freeze.ts`, `site-time.ts`, `weekly.ts`, `extension/lib/time.js` and their tests.
- The freeze offer is only the newest eligible day; after using it the card disappears until next week's freeze.
- Site time is stored as seconds per (day, slug) and added on every report. A report whose response is lost and is then
  re-sent would count twice; the cap and the one-minute flush keep the error small.
- Smoke test: the built app (`next start`) against a throwaway database served `/`, `/review/week`, `/profile/settings`,
  `/review` with 200; `/api/ext/time` gave 401 without the key and 403 from a web origin.
- **Found but not changed:** `docs/HANDOFF.md` says no JDK is installed; JDK 17 is now at
  `C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot`, so the Java tests ran in this check.

## Review

(pending: run `/review-plan 0017`)
