# 0001: DSA pages: the problem first, everything else in tabs

- **Status:** done
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Antigravity
- **Spec:** SPEC.md 7.3 (declutter), steps 2 and 5

## Goal

On `/dsa` the "🔁 Re-solve today" list sits above the patterns, so the first thing you see is old work instead of
what to learn next. On a problem page (`/dsa/[id]`) the problem is followed by a stack of panels (patterns, status,
timer, stuck list, submissions, notes). Make each page lead with its main job and move the rest into tabs, so the
page stays short and the problem is the focus.

## Context

Patterns borrowed from sites that do this well:
- **LeetCode problem page:** the problem and the actions sit at the top; Editorial / Solutions / Submissions are tabs;
  topic tags are hidden behind a toggle so they don't spoil the approach.
- **NeetCode roadmap:** the pattern list with progress is the page; nothing sits above it.
- **Anki / spaced repetition apps:** reviews are a separate queue with a count badge, never mixed into new learning.

Current code:
- `apps/web/app/dsa/page.tsx`: `Dsa()` renders a 4-stat row, then in the main column `due.length > 0` → section
  "🔁 Re-solve today" (a `<ul>` of `ProblemRow`), then the "Patterns" section (filter bar + collapsible groups), then
  an aside with the boss fight link, `SyncStatus`, and "Other LeetCode solves" (`extras`).
- `apps/web/app/dsa/[id]/page.tsx`: `Problem()` renders header → "Pattern(s)" section (names + your template) →
  status bar with Mark solved / Undo → `FocusTimer` → `StuckPanel` → submissions list → `NotesForm`.
- `apps/web/app/dsa/problem-ui.tsx`: `ProblemRow`, `ProblemTitle`, `CheatSheet`, `fmt`, `DIFFICULTY_STYLE`.
- The Quick revise page (`apps/web/app/revise/page.tsx`) already has URL-driven tabs (`?tab=…` + `Link`s styled as
  pills). Reuse that pattern: tabs are links, so they work without JavaScript, survive reloads and are shareable.
- Conventions (AGENTS.md): request-time data inside `<Suspense>` with `await connection()`; forms post to server
  actions; Tailwind theme tokens; wide layouts.

## Out of scope

- Navigation sidebar, Today page, global timer, simple mode (plans 0004 and 0005).
- Any change to data, server actions, `lib/` logic or the database.
- The pattern guide page `/dsa/pattern/[id]` (plan 0003 adds a tab there).

## Steps

- [x] **1. Shared tab bar.** Create `apps/web/app/tabs.tsx` exporting
  `Tabs({ tabs, active, hrefFor, label })`, where `tabs` is `{ id: string; label: string; count?: number }[]`,
  `hrefFor(id)` returns the URL, and `label` is the nav's aria-label. Render a `<nav aria-label>` of `Link`s styled
  like the revise page tabs (active: `bg-accent text-on-accent`; inactive: `border border-line text-muted`), with
  `aria-current="page"` on the active one and a count badge when `count` > 0 (e.g. "Re-solve due · 3").
  Use `scroll={false}` on the links. Then switch `apps/web/app/revise/page.tsx` to use it (same look, same URLs).
  - Done when: `/revise` looks and behaves as before, using the shared component.

- [x] **2. `/dsa` tabs.** In `apps/web/app/dsa/page.tsx`, read `?tab=` (`patterns` default, `resolve`, `other`).
  Put the tab bar right under the stat row (keep the stats). Tabs:
  - **Patterns** (default): the existing filter bar + groups, unchanged.
  - **Re-solve due** (count = `due.length`): the existing re-solve list, with one line of explanation
    ("Solved 14+ days ago: solve again from scratch, then tick."). Empty state: "Nothing due. 🎉".
  - **Other solves** (count = `extras.length`): move the "Other LeetCode solves" list from the aside here.
  Remove the "🔁 Re-solve today" section from above the patterns. Keep the aside (boss fight link, sync status).
  Preserve existing query params used by filters (`q`, `difficulty`, `status`, `group`, etc.: check
  `lib/dsa-filters.ts` `parseDsaFilters`) when switching to the Patterns tab, so filters aren't lost; other tabs can
  drop them.
  - Done when: `/dsa` opens on Patterns with nothing above them but the stats and tabs; `/dsa?tab=resolve` shows the
    due list; the stat "Re-solves due" links to `?tab=resolve`.

- [x] **3. Problem page: the problem first.** In `apps/web/app/dsa/[id]/page.tsx`, restructure `Problem()`:
  1. Header (title, difficulty, ⚡) and one **action bar** directly under it: "Open on LeetCode ↗" as the primary
     button, the solve status text, Mark solved / re-solved, Undo, and the `FocusTimer` (keep its current props).
  2. **Tabs** (`?tab=`), default `solve`:
     - **Solve**: a hints block, collapsed by default (`<details>` "Stuck? Show the pattern"), containing the
       pattern names with a link to each pattern guide (`/dsa/pattern/{id}`), their "recognize by" line and your
       saved template (the current Pattern(s) section content). Then the open stuck entries, if any, as a short
       warning line linking to the Stuck tab. Topic tags move inside the hints block too (they're spoilers).
     - **Notes & code**: the `NotesForm` (unchanged).
     - **Submissions** (count): the submissions list (unchanged markup). Hide the tab when there are none.
     - **Stuck log** (count of open entries): the `StuckPanel` (unchanged).
  3. Keep `id="stuck"` on the stuck panel; anything linking to `#stuck` should now link to `?tab=stuck#stuck`
     (search the app for `#stuck`).
  - Done when: a problem page shows title, actions and timer first; the pattern isn't visible until you open hints;
    each tab shows its content; forms on each tab still work (they post and `refresh()`).

- [x] **4. Links into tabs.** Update links that pointed at sections that moved: re-solve links on Today
  (`apps/web/app/page.tsx` and `apps/web/lib/focus.ts` `taskLink`, check for `/dsa#…` or similar) and the review
  queue (`apps/web/app/review/page.tsx`, stuck items) should land on the right tab. Use `grep -rn "/dsa" apps/web/app
  apps/web/lib` to find them.
  - Done when: every link to a moved section opens the matching tab.

- [x] **5. Tests.** There's no component test setup; keep logic out of components. If you extract a pure helper
  (e.g. `parseDsaTab(sp)` returning a valid tab id), put it in `apps/web/lib/dsa-filters.ts` and test it in
  `dsa-filters.test.ts` (unknown value → default, valid values pass through).
  - Done when: `pnpm test` passes.

## Acceptance criteria

- [x] `/dsa` shows stats, tabs, then patterns; re-solves and other solves are tabs with counts.
- [x] A problem page leads with the problem and its actions; patterns/topics are hidden until "Show the pattern".
- [x] Notes, submissions and stuck log each live in their own tab and still save correctly.
- [x] Tabs work without JavaScript (plain links) and the URL reflects the tab.
- [x] `/revise` tabs look the same as before, via the shared `Tabs` component.
- [x] `pnpm check` passes.

## Open questions

(None)

## Implementation notes

### Files changed
- `apps/web/app/tabs.tsx`: Created shared `Tabs({ tabs, active, hrefFor, label })` component rendering accessible `<nav aria-label>` with plain `Link`s, `scroll={false}`, `aria-current="page"`, and count badge (` · {count}`).
- `apps/web/app/revise/page.tsx`: Replaced inlined `<nav>` tab bar with `<Tabs>`, updated stuck weak spot link to `?tab=stuck#stuck`.
- `apps/web/app/ui.tsx`: Added optional `href` prop to `Stat` component so it can render as a clickable Link card.
- `apps/web/lib/dsa-filters.ts`: Added `DSA_TABS`, `DsaTab`, `parseDsaTab`, `PROBLEM_TABS`, `ProblemTab`, and `parseProblemTab`.
- `apps/web/lib/dsa-filters.test.ts`: Added unit tests for `parseDsaTab` and `parseProblemTab`.
- `apps/web/app/dsa/page.tsx`: Added DSA tab bar directly below stats; moved re-solves to "Re-solve due" tab with count and explanation / empty state; moved synced solves outside roadmap to "Other solves" tab with count; preserved query parameters when switching to Patterns tab; linked "Re-solves due" stat to `?tab=resolve`.
- `apps/web/app/dsa/[id]/page.tsx`: Restructured `Problem()` to put problem title/difficulty and action bar (primary "Open on LeetCode ↗", solve status, Mark solved / Undo, FocusTimer) first; added tabs for Solve, Notes & code, Submissions (hidden when empty), and Stuck log; moved pattern guides, saved template, and topics inside collapsed `<details>` "Stuck? Show the pattern"; added stuck warning line linking to `?tab=stuck#stuck`.
- `apps/web/lib/focus.ts`: Updated `taskLink` for `dsa-warmup` to link to `/dsa?tab=resolve` when `due.resolve > 0`.
- `apps/web/lib/focus.test.ts`: Updated unit test expectation for `dsa-warmup`.
- `apps/web/app/review/page.tsx`: Updated struggle review items to link to `?tab=stuck#stuck`.

### Verification results
- `pnpm test`:
  ```
  Test Files  25 passed (25)
       Tests  206 passed (206)
    Duration  6.44s
  ```
- `pnpm check`:
  ```
  $ pnpm lint && pnpm typecheck && pnpm test && pnpm build
  - eslint: passed
  - tsc --noEmit (shared, desktop, extension, web): passed
  - vitest: 25 test files passed (206 tests)
  - next build: compiled successfully, 192 static pages generated
  ```

## Review

**Verdict: done** (Claude Code, 2026-11-07).

Checked against every step and acceptance criterion:
- Shared `Tabs` (`apps/web/app/tabs.tsx`) is used by `/dsa`, `/dsa/[id]` and `/revise`; plain links, `aria-current`, count badges.
- `/dsa`: stats, then tabs (Patterns | Re-solve due · 66 | Other solves · 788), then patterns. The re-solve list no longer sits above the patterns; filters survive switching back to Patterns; the "Re-solves due" stat links to `?tab=resolve`.
- `/dsa/[id]`: title, then one action bar (Open on LeetCode, status, Mark solved/Undo), timer, tabs (Solve, Notes & code, Submissions, Stuck log). The pattern, template and topics are hidden behind "Stuck? Show the pattern". The Submissions tab is hidden when there are none (code path read, not tried on a page).
- Links into moved sections fixed (`focus.ts` re-solve link, review queue and Quick revise stuck links use `?tab=stuck#stuck`).
- Ran: `pnpm check` passes (25 files, 206 tests, build OK). Started the built app on a copy of the database and requested every tab (all 200, notes has its form, stuck has `#stuck`, submissions show code); screenshots of `/dsa` and a problem page look as planned.

Non-blocking notes (no changes requested):
1. The Solve tab is nearly empty below the hint box and the timer panel is tall. Plan 0005 replaces the timer panel, and the empty Solve tab can get a one-line prompt then.
2. `Stat` got an optional `href`; fine, reused later by Today (plan 0004).

Suggested commit message:
```
DSA pages: patterns first, re-solves and other solves as tabs; problem page leads with the problem

- /dsa: Patterns | Re-solve due | Other solves tabs; filters preserved
- /dsa/[id]: action bar and timer first; pattern hints collapsed;
  Solve | Notes & code | Submissions | Stuck log tabs
- Shared Tabs component (also used by Quick revise); links into the
  moved sections updated
```
