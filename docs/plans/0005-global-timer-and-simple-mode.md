# 0005: One focus timer for the whole app, and Simple mode

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code
- **Spec:** SPEC.md 7.3 (declutter), steps 4 and 6
- **Depends on:** 0001, 0002, 0004 (they move the per-page timers; this plan replaces them)

## Goal

Every problem, concept, design and pattern page has its own timer panel. Replace them with one timer in the sidebar
that keeps running while you move between pages, and add a Simple mode (on by default) that hides power features
until you want them.

## Context

- `apps/web/app/focus-timer.tsx`: client component `FocusTimer({ itemId, defaultMinutes, presets, totalMinutes })`;
  saves via `logFocusAction` (`apps/web/app/actions.ts`) → `logFocus(itemId, minutes)` in `apps/web/lib/timer.ts`,
  which validates `itemId` with `isTimerItem` (problems, concepts, exercises, `boss`, `pattern:<id>`).
- Used on: `/dsa/[id]`, `/dsa/pattern/[id]`, `/dsa/boss`, `/study/[area]/[id]`.
- Layout: `apps/web/app/layout.tsx` renders the sidebar (`aside`) and pages.
- Settings: key/value `settings` table; examples of reading/writing a key in `apps/web/lib/revise.ts`
  (`getInterviewDate` / `setInterviewDate`). Settings page: `apps/web/app/profile/settings/page.tsx`.
- AGENTS.md: no `Date.now()`/`Math.random()` during render; timers are client components, which is fine.

## Out of scope

- Changing how focus minutes are stored or counted.
- Removing any feature: Simple mode only hides UI.

## Steps

- [x] **1. Timer state in the browser.** Create `apps/web/app/timer-store.ts` (client-only module): state
  `{ itemId, label, href, startedAt (ms) | null, elapsedMs, targetMinutes }` persisted to `localStorage` key
  `habit.timer` (wrap reads/writes in try/catch), with `start(item)`, `pause()`, `resume()`, `reset()`, and a
  subscribe/`useTimer()` hook (`useSyncExternalStore`). Elapsed time is computed from `startedAt` so it survives
  navigation and reloads.
- [x] **2. Sidebar timer.** Create `apps/web/app/global-timer.tsx` (client) rendered in the sidebar in `layout.tsx`
  (bottom, above Profile; compact row on phones). Shows the item label (linking to `href`), mm:ss counting up toward
  the target, pause/resume, and **Save** (calls `logFocusAction` with the item id and whole minutes, then resets).
  When idle it shows "No timer running".
- [x] **3. Start buttons instead of panels.** Create `apps/web/app/start-timer.tsx` (client):
  `StartTimer({ itemId, label, defaultMinutes })` renders a small "⏱ Start" button (or "Running" if this item is the
  active one) and shows the total focused minutes passed in as a prop. Replace every `FocusTimer` usage with it, in
  the header/action bar positions chosen by plans 0001-0002. Starting a new item while another runs asks
  "Save N min on <old item> first?" (save / discard / cancel). Delete `focus-timer.tsx` when unused.
- [x] **4. Simple mode setting.** Add `getSimpleMode()` / `setSimpleMode(on)` in a new `apps/web/lib/ui-prefs.ts`
  (settings key `simple_mode`, default **on** when unset) with a test in `apps/web/lib/ui-prefs.test.ts`. Add a
  toggle form on `/profile/settings` (server action `setSimpleModeAction` in `actions.ts`, calls `refresh()`).
- [x] **5. Hide power features in Simple mode.** When on: hide the Boss fight link on `/dsa`; hide the cheat sheet on
  pattern guides and problem pages; hide the Diagrams and Reading list tabs/sections on study pages and in Learn
  tabs; hide the stuck-list history (keep the "I got stuck" form). Show a one-line hint at the bottom of affected
  pages: "Simple mode hides some tools. Turn it off in Profile → Settings." Routes stay reachable by URL.
- [x] **6. Tests and check.** Tests for `ui-prefs.ts` (default on, toggle persists). Run the app on a database copy;
  start a timer on a problem, navigate to Learn and back, save, and confirm the minutes appear (Profile hours).
  Record what you checked in Implementation notes.

## Acceptance criteria

- [x] One timer in the sidebar; it keeps running across pages and reloads; Save logs minutes to the right item.
- [x] No page shows a full timer panel any more; item pages have a small Start button.
- [x] Simple mode is on by default, hides the listed tools, and can be turned off in Settings.
- [x] `pnpm check` passes.

## Open questions

## Implementation notes

Implemented by Claude Code, 2026-11-07.

- **Timer:** `timer-math.ts` (pure: start, pause, resume, target, whole minutes to log, clock, parsing; 7 tests in `timer-math.test.ts`), `timer-store.ts` (localStorage key `habit.timer`, memory fallback when storage is blocked, `useTimer`, `useNow`), `global-timer.tsx` (sidebar: item label as a link, mm:ss counting up to the target with a thin progress bar, Pause/Resume, Save N min, Discard, target presets 15/25/45/60 while idle, a beep and the tab title at the target; "No timer running" when idle), `start-timer.tsx` (small "Start timer" button; shows "Timer running, see the sidebar" for the active item; starting while another item has at least one minute asks "Save N min on X first?" with Save and start, Discard it, Cancel). `layout.tsx` puts the timer above Profile in the sidebar (under the top bar on phones); `nav.tsx` now exports `NavFooter` for the Profile link so the timer can sit between them. `focus-timer.tsx` was deleted. Saving still goes through `logFocusAction` / `logFocus`.
- **Fix found by the build:** an earlier clock hook called `Date.now()` while the layout was prerendered, which Next's `cacheComponents` rejects. `useNow` is now an external store (server snapshot 0), so the server never reads the clock.
- **Simple mode:** `lib/ui-prefs.ts` (`getSimpleMode` default on, `setSimpleMode`; key `simple_mode` in the settings table; tests in `ui-prefs.test.ts`), `setSimpleModeAction` in `actions.ts`, an "Interface" section with the toggle on `/profile/settings`. When on: no Boss fight link on `/dsa`; no cheat sheet on pattern pages and no "Your template" in the problem hints; no Reading and Diagrams on concept and exercise pages (also removed from their contents list); Reading list and Diagrams tabs hidden in Learn (the page you are on keeps its tab); the stuck-list history is hidden, the "I got stuck" form stays; a one-line hint ("Simple mode hides some tools. Turn it off in Profile → Settings.") appears on the affected pages. Routes still open by address. It is **on by default**, so after this release the tools above are hidden until you turn it off.
- **Checks:** `pnpm check` exits 0 (32 test files, 243 tests). Browser run against a copy of the database with 28 checks, all passing: idle sidebar, no timer panel on item pages, Start works, clock runs, it keeps running through client-side navigation and a full reload, Save 5 min logs 5 minutes on the problem ("5 min focused here so far"), starting another item asks first and "Save and start" logs the old 3 minutes (8 total), Simple mode hides each listed tool and shows the hint, the settings toggle turns everything back on and off again.
- **Test fix:** the Shiki-based tests (`cp-algorithms.test.ts`, `highlight.test.ts`) now have a 30 s timeout; the first call loads 13 grammars and timed out once under load.

## Review
