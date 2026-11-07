# 0005: One focus timer for the whole app, and Simple mode

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:**
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

- [ ] **1. Timer state in the browser.** Create `apps/web/app/timer-store.ts` (client-only module): state
  `{ itemId, label, href, startedAt (ms) | null, elapsedMs, targetMinutes }` persisted to `localStorage` key
  `habit.timer` (wrap reads/writes in try/catch), with `start(item)`, `pause()`, `resume()`, `reset()`, and a
  subscribe/`useTimer()` hook (`useSyncExternalStore`). Elapsed time is computed from `startedAt` so it survives
  navigation and reloads.
- [ ] **2. Sidebar timer.** Create `apps/web/app/global-timer.tsx` (client) rendered in the sidebar in `layout.tsx`
  (bottom, above Profile; compact row on phones). Shows the item label (linking to `href`), mm:ss counting up toward
  the target, pause/resume, and **Save** (calls `logFocusAction` with the item id and whole minutes, then resets).
  When idle it shows "No timer running".
- [ ] **3. Start buttons instead of panels.** Create `apps/web/app/start-timer.tsx` (client):
  `StartTimer({ itemId, label, defaultMinutes })` renders a small "⏱ Start" button (or "Running" if this item is the
  active one) and shows the total focused minutes passed in as a prop. Replace every `FocusTimer` usage with it, in
  the header/action bar positions chosen by plans 0001-0002. Starting a new item while another runs asks
  "Save N min on <old item> first?" (save / discard / cancel). Delete `focus-timer.tsx` when unused.
- [ ] **4. Simple mode setting.** Add `getSimpleMode()` / `setSimpleMode(on)` in a new `apps/web/lib/ui-prefs.ts`
  (settings key `simple_mode`, default **on** when unset) with a test in `apps/web/lib/ui-prefs.test.ts`. Add a
  toggle form on `/profile/settings` (server action `setSimpleModeAction` in `actions.ts`, calls `refresh()`).
- [ ] **5. Hide power features in Simple mode.** When on: hide the Boss fight link on `/dsa`; hide the cheat sheet on
  pattern guides and problem pages; hide the Diagrams and Reading list tabs/sections on study pages and in Learn
  tabs; hide the stuck-list history (keep the "I got stuck" form). Show a one-line hint at the bottom of affected
  pages: "Simple mode hides some tools. Turn it off in Profile → Settings." Routes stay reachable by URL.
- [ ] **6. Tests and check.** Tests for `ui-prefs.ts` (default on, toggle persists). Run the app on a database copy;
  start a timer on a problem, navigate to Learn and back, save, and confirm the minutes appear (Profile hours).
  Record what you checked in Implementation notes.

## Acceptance criteria

- [ ] One timer in the sidebar; it keeps running across pages and reloads; Save logs minutes to the right item.
- [ ] No page shows a full timer panel any more; item pages have a small Start button.
- [ ] Simple mode is on by default, hides the listed tools, and can be turned off in Settings.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

## Review
