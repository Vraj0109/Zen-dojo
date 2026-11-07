# 0004: Five-item navigation and a short "Up next" Today

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:**
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

- [ ] **1. Navigation.** In `nav.tsx` make `MAIN` = Today (`/`), Practice (`/dsa`, icon dsa), Learn (`/study/sd`,
  icon sd), Review (`/review`, icon review), and `SECONDARY` = Profile (`/profile`). Active rules: Practice for
  `/dsa*`; Learn for `/study*`; Review for `/review*` and `/revise*`; Profile for `/profile*` and `/roadmap`.
  Remove the now-unused icons. Keep the phone layout (scrolling top bar) working.
  - Done when: the sidebar shows 4 + 1 items and the right one is highlighted on every page.

- [ ] **2. Learn tabs.** At the top of `apps/web/app/study/[area]/page.tsx` and on `/study/reading`,
  `/study/diagrams`, add a `Tabs` bar: System design (`/study/sd`), LLD (`/study/lld`), Core CS (`/study/core`),
  Reading list, Diagrams. Add `apps/web/app/study/page.tsx` that redirects to `/study/sd`.
  - Done when: every Learn page shows the same tab bar with the current one active.

- [ ] **3. Review tabs.** On `/review` and `/revise` add a top-level `Tabs` bar: "Due today (N)" (`/review`) and
  "Quick revise" (`/revise`). Quick revise keeps its own section tabs below.
  - Done when: both pages show the bar and switch between each other.

- [ ] **4. Profile tabs.** On `/profile`, `/roadmap` and `/profile/settings` add a `Tabs` bar: Stats, Roadmap,
  Settings.
  - Done when: Roadmap is reachable from Profile and shows the bar.

- [ ] **5. Today "Up next".** Restructure `Today()`:
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

- [ ] **6. Links.** `grep -rn 'href="/roadmap"\|/stats\|/settings' apps/web/app` and fix any links that now
  belong under Profile tabs. Old redirects in `next.config.ts` stay.
  - Done when: no broken or duplicate links.

- [ ] **7. Check.** Run the app on a copy of the database; screenshot Today, one Learn page, Review, Profile at 1366
  and 390 px wide; attach paths in Implementation notes.

## Acceptance criteria

- [ ] Sidebar: Today, Practice, Learn, Review, Profile; correct highlighting everywhere.
- [ ] Learn, Review and Profile pages have tab bars linking their sub-pages.
- [ ] Today shows a single Up next list (≤ 5 visible rows) with sections below collapsed.
- [ ] All existing URLs still load.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

## Review
