# 0004: Five-item navigation and a short "Up next" Today

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code
- **Spec:** SPEC.md 7.3 (declutter), steps 1 and 2
- **Depends on:** 0001 (uses `apps/web/app/tabs.tsx`)

## Goal

The sidebar has 8 items (Today, Review, Quick revise, DSA, System design, LLD, Core CS + Roadmap, Profile) and Today
stacks banners, the day's plan, the week's tasks, an add-task form and a week focus panel. Cut navigation to five
items and make Today one short list of what to do next, with everything else one click away.

## Context

- Sidebar: `apps/web/app/nav.tsx` (`MAIN`, `SECONDARY`, `ICONS`, active-state logic in `NavLinks`).
- Today: `apps/web/app/page.tsx` (`Today()`): header chips (streak, today XP, level), countdown banner (Quick
  revise), reviews-due banner, then a two-column grid: "Today's plan" (day tasks with links from `taskLink` in
  `apps/web/lib/focus.ts`), week tasks, custom-task form, and an aside with the week focus panel and `?week=N`
  browsing.
- Study area pages: `apps/web/app/study/[area]/page.tsx`; there is no `/study` index page.
- Review: `/review` (queue) and `/revise` (Quick revise) are separate pages.
- Profile: `/profile` (stats), `/profile/settings`; Roadmap is `/roadmap`.
- Pattern borrowed: apps like Todoist/Things show "Today" as one short list; reviews show as a single counted item
  (Anki), not a separate banner.

## Out of scope

- Removing any page or route; old URLs must keep working.
- Global timer and simple mode (plan 0005).
- DSA and study page internals (plans 0001-0002).

## Steps

- [x] **1. Navigation.** In `nav.tsx` make `MAIN` = Today (`/`), Practice (`/dsa`, icon dsa), Learn (`/study/sd`,
  icon sd), Review (`/review`, icon review), and `SECONDARY` = Profile (`/profile`). Active rules: Practice for
  `/dsa*`; Learn for `/study*`; Review for `/review*` and `/revise*`; Profile for `/profile*` and `/roadmap`.
  Remove the now-unused icons. Keep the phone layout (scrolling top bar) working.
  - Done when: the sidebar shows 4 + 1 items and the right one is highlighted on every page.

- [x] **2. Learn tabs.** At the top of `apps/web/app/study/[area]/page.tsx` and on `/study/reading`,
  `/study/diagrams`, add a `Tabs` bar: System design (`/study/sd`), LLD (`/study/lld`), Core CS (`/study/core`),
  Reading list, Diagrams. Add `apps/web/app/study/page.tsx` that redirects to `/study/sd`.
  - Done when: every Learn page shows the same tab bar with the current one active.

- [x] **3. Review tabs.** On `/review` and `/revise` add a top-level `Tabs` bar: "Due today (N)" (`/review`) and
  "Quick revise" (`/revise`). Quick revise keeps its own section tabs below.
  - Done when: both pages show the bar and switch between each other.

- [x] **4. Profile tabs.** On `/profile`, `/roadmap` and `/profile/settings` add a `Tabs` bar: Stats, Roadmap,
  Settings.
  - Done when: Roadmap is reachable from Profile and shows the bar.

- [x] **5. Today "Up next".** Restructure `Today()`:
  1. Header (unchanged chips).
  2. **Up next** card: one list, at most 5 rows, each with one action button, in this order: interview countdown
     (only within 14 days, links to `/revise`); "N reviews due" (one row, links to `/review`); today's undone day
     tasks with their existing `taskLink` buttons and done checkboxes. If more than 5, show "+N more" that expands
     (`<details>`). When everything is done: "All done for today 🎉" plus the week's next suggested item.
  3. Below, collapsed by default (`<details>`), in this order: "Done today" (completed tasks), "This week" (week tasks
     + custom-task form), "Week N focus" (the current focus panel with ‹ › browsing; open it automatically when
     `?week=` is in the URL).
  4. Remove the separate countdown and reviews banners (they're rows in Up next now).
  Keep every existing action (toggle task, add/delete custom task) working.
  - Done when: at 1366×768 the header and Up next fit on screen without scrolling (check with a screenshot) and every
    action still works.

- [x] **6. Links.** `grep -rn 'href="/roadmap"\|/stats\|/settings' apps/web/app` and fix any links that now
  belong under Profile tabs. Old redirects in `next.config.ts` stay.
  - Done when: no broken or duplicate links.

- [x] **7. Check.** Run the app on a copy of the database; screenshot Today, one Learn page, Review, Profile at 1366
  and 390 px wide; attach paths in Implementation notes.

## Acceptance criteria

- [x] Sidebar: Today, Practice, Learn, Review, Profile; correct highlighting everywhere.
- [x] Learn, Review and Profile pages have tab bars linking their sub-pages.
- [x] Today shows a single Up next list (≤ 5 visible rows) with sections below collapsed.
- [x] All existing URLs still load.
- [x] `pnpm check` passes.

## Open questions

## Implementation notes

Implemented by Claude Code, 2026-11-07.

- **Navigation (`nav.tsx`):** Today, Practice (`/dsa*`), Learn (`/study*`), Review (`/review*`, `/revise*`) and Profile (`/profile*`, `/roadmap`) at the bottom. The active rule is a pure function `isActive`, tested in `nav.test.ts` (14 paths, prefix confusion like `/dsatest`, unknown pathname).
- **Tab bars:** new `section-tabs.tsx` with `LearnTabs` (System design, LLD, Core CS, Reading list, Diagrams) on the area pages, `/study/reading` and `/study/diagrams`; `ReviewTabs` ("Due today · N" and "Quick revise") on `/review` and `/revise` (`/revise` loads the count itself, with a Suspense fallback without it); `ProfileTabs` in `profile/profile-ui.tsx` is now Stats, Roadmap, Settings and is also on `/roadmap`. New `study/page.tsx` redirects `/study` to `/study/sd`. The old "Reading list / Your diagrams" link row on the area header was removed because the tabs replace it.
- **Today (`page.tsx`):** header chips unchanged; one **Up next** card with at most 5 rows (interview countdown within 14 days, "N reviews due", then undone day tasks with their done checkbox and `taskLink` button), "+N more" in a `<details>`; when nothing is left it says "All done for today." and offers the next DSA problem or week task. Collapsed below: "Done today", "This week" (week tasks plus the add-task form) and "Week N focus" (opens by itself when `?week=` is in the URL or the plan hasn't started). The two banners are gone. The week focus is now a three-column block inside its fold. The plan's "🎉" was left out because the app has no emoji (plan 0010).
- **Links:** `grep` for `/roadmap`, `/stats`, `/settings` found nothing to fix; the redirects in `next.config.ts` stay.
- **Checks:** `pnpm check` exits 0 (30 test files, 234 tests). Browser check on a copy of the database (port 3056): Today at 1366x768 is 709 px tall, so the header and Up next fit without scrolling; 390 px has no horizontal scroll; Learn, Review and Roadmap load at 1366 px without horizontal scroll. Actions checked in a real window: ticking a task moves it to "Done today" (header 0/3 to 1/3), adding a custom task adds a row, deleting it removes the row, `/?week=3` opens "Week 3 focus". All old URLs return 200 (`/study` redirects). "+N more" was not exercised with real data (the copy had 4 rows).

## Review
