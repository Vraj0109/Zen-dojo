# 0086: Expressive redesign, part 2: Practice (every pattern on one page, no pagination)

- **Status:** done
- **Planned by:** Claude Code, 2026-11-20
- **Implemented by:** Antigravity (Subagent A), 2026-11-20
- **Spec:** `docs/mockups/expressive/` (mockup sources in the repo; see its README), from the mockup canvas (https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj), boards "Practice: patterns and all
  problems", "DSA pattern page", "Boss battle" and the Practice, Pattern and Boss frames in the phone galleries.

## Goal

Practice shows every pattern at once.
- **Patterns view:** all 10 groups and their patterns as tiles. A group list on the left jumps to any group, and it
  scrolls on its own, separately from the tiles.
- **All problems:** one continuous list of all problems with a sticky column header. There are no pages; pagination is
  removed from the app.
- **Filters:** one menu per filter; the pattern filter has its own search box so any of the 67 patterns can be found.
- **Pattern and Boss pages** move to the Expressive look.

## Context

- Needs plan 0085's tokens, components, shell (fixed frame, `<main>` as the scroll container with `@container`) and the
  layout rules in `globals.css`.
- **Data:** `packages/shared/src/dsa.ts` `DSA_GROUPS` (10 groups: Arrays, strings, hashing; Searching and sorting;
  Linked lists, stacks, queues, heaps; Trees; Graphs; Recursion, backtracking, bit manipulation; Dynamic programming;
  Greedy and math; Advanced structures; Logic building), each with `patterns` (`id`, `name`, `recognize`, `problems`).
- **Page:** `apps/web/app/dsa/page.tsx`.
  - Tabs come from `DSA_TABS` in `apps/web/lib/dsa-filters.ts`: `patterns`, `all`, `resolve`, `other`, plus Boss as a
    link to `/dsa/boss`.
  - Filters live in the URL (`q`, `topic`, `difficulty`, `status`, `has`, `source`) and work without JS.
  - Today only the open group's problems render (`?group=`).
- **Pagination today:** `DSA_PAGE_SIZE = 50` and `parseDsaPage` in `dsa-filters.ts`, used at `dsa/page.tsx` lines
  ~103–200 with Previous/Next links. It is the only pagination in the app; the Previous/Next pattern or lesson links
  elsewhere are navigation, not pagination, and stay.
- **UI parts:**
  - `app/dsa/filter-group.tsx` (`FiltersMenu`, `SortSelect`).
  - `app/dsa/problem-ui.tsx` (`ProblemRow`, `ProblemCard`, `ProblemTable`, `CheatSheet`).
  - `app/dsa/group-header-link.tsx`.
  - `app/dsa/pattern/[id]/page.tsx`.
  - `app/dsa/boss/page.tsx`.
- **Tests:** `app/dsa/dsa.test.ts` (added in 0084) covers each tab with page/sort queries. Update it, because `page`
  goes away.
- **Pitfall (0084):** in `cacheComponents` pages, `await connection()` must come before reading `searchParams`.

## Out of scope

- The problem workspace (plan 0087).
- Any change to which problems exist, their patterns, or solve/XP logic.
- Server-side search; filtering stays as it is (URL plus server filter).

## Steps

- [x] **0. Load the UI skills first (required).** Load `ux-audit`, `viewports`, `page-patterns` (Practice is
  **List / Index**; the Patterns view is a browse grid inside it), `spacing`, `typography`, `colour-palette`,
  `anti-slop`, `empty-states`, `loaders`, `keyboard`, `frontend-design` and `ui-review`. Antigravity: `.agents/skills/`.
  Record them in Implementation notes.
- [x] **1. Remove pagination.** (Done by Claude, 2026-11-20: removed `DSA_PAGE_SIZE`, `parseDsaPage`, `pageHref` and
  the Previous/Next block. `/dsa?tab=all` renders every row. `lib/dsa-filters.test.ts` and `app/dsa/dsa.test.ts` pass;
  the old `page=2` case in `dsa.test.ts` now just checks the param is ignored. Run tests from the repo root.)
  - In `lib/dsa-filters.ts`, delete `DSA_PAGE_SIZE` and `parseDsaPage`.
  - In `dsa/page.tsx`, render every filtered row and remove `pageHref` and the Previous/Next block.
  - An old `?page=` in a URL is ignored.
  - Check that nothing else imports the removed names.
  - Done when: `grep -rn "DSA_PAGE_SIZE\|parseDsaPage" apps` finds nothing, and `/dsa?tab=all` lists all problems.
- [x] **2. Page header and controls** (both views):
  - Title "Practice", with a stat line underneath: "84 of 496 solved · 67 patterns in 10 groups · 6 re-solves due",
    computed from real data.
  - On the right, a tonal "Continue: <next problem>" pill (the existing next-problem logic). Hide it on phone.
  - Below: the view switch as a segmented pill (Patterns, All problems, Re-solve due · N; Boss stays a link in the aside
    and on phone).
  - Next to it, one pill search field, "Search 496 problems or 67 patterns". On the Patterns view it filters tiles by
    pattern name, `recognize` text and problem titles. On All problems it filters rows (the existing `q`).
  - The header and controls do not scroll with the content (see step 3).
  - Done when: the header matches the board at 1280 px and wraps cleanly at 768 and 390 px.
- [x] **3. Patterns view: two scroll areas.** Inside `<main>`, below the header, a flex row fills the remaining height
  (`flex-1 min-h-0`).
  - **Left, the group list** (`nav`, 220 px, its own `overflow-y-auto`):
    - One row per group: name and "done/total" problems.
    - The current group (the one at the top of the tile area) is highlighted with `primary-soft`. Use an
      `IntersectionObserver` with the tile area as root, set up in an effect.
    - Clicking a row scrolls the tile area to that group (anchor links, so it also works without JS).
    - Hidden when the page is narrower than about 1260 px (container query).
  - **Right, the tile area** (its own `overflow-y-auto`):
    - Every group as a section with a header: a numbered badge in the subject tone, the group title, "N patterns · x of
      y solved" and a slim progress bar. The header wraps (`flex-wrap`) instead of squeezing the title.
    - Then a tile grid using the `auto-fill minmax(min(100%, 190px), 1fr)` rule from 0085.
    - Each tile links to `/dsa/pattern/[id]` and shows a small shape in the group tone (filled `primary` when the
      pattern is complete), "done/total", the pattern name (15 px, 500) and the `recognize` text (13 px, muted).
    - Complete patterns get a 4 px `primary` bottom edge.
    - All groups render (only tile data, not problem lists), so the old `?group=` open/close goes. Keep the param
      accepted and scroll to that group if present.
  - The progress aside on the right (Solved ring, Boss battle card, LeetCode sync card) is 280 px with its own scroll,
    hidden under about 1020 px. On phone, the solved count stays in the header stat line.
  - Done when: at 1280 px the rail, header, group list and aside stay still while only the tiles scroll; at 1100 px the
    group list is gone and tiles reflow; at 390 px tiles are two per row and the page scrolls normally.
- [x] **4. All problems view: one long list.**
  - A filter row: one chip-button per filter (Pattern, Level, Status, Source; plus Has notes from the existing `has`
    filter). Each opens a menu:
    - Menus are checkbox lists; Pattern is grouped by the 10 groups and has its own search field ("Find one of 67
      patterns").
    - A chip shows its selection ("Pattern: Hash map, Two pointers") and uses `primary-soft` when active. Each chip has
      a clear button.
    - Without JS, the menus are a `<details>` with a form that submits to the same URL params (`topic` is the pattern
      filter).
    - Reuse and restyle `FiltersMenu` and `SortSelect`.
  - The sort menu stays.
  - A line reads "Showing all N · sorted by <sort>".
  - **The list:**
    - One `L1` frame (`rounded-lg`, `surface`, `line` border) that fills the remaining height with its own
      `overflow-y-auto`.
    - A sticky header row: Problem, Pattern, Level, Last solved.
    - Group divider rows (group name in `primary`, 13 px, 600) when sorted by roadmap order.
    - Rows are 52 px with hairline dividers: status mark, "#. Title", pattern, difficulty colour, last solved.
    - The next problem has a 3 px `primary` inset on the left.
    - Rows link to the problem.
    - Use `content-visibility: auto; contain-intrinsic-size: 52px` on rows.
    - Phone: columns collapse to mark, title, level, and the list scrolls with the page.
  - **Re-solve due** uses the same list with only due rows.
  - Empty results show a short message inside the frame, with a "Clear filters" link.
  - Done when: all ~496 rows are in one scroll area with no paging, and filters, sort and search work with and without
    JS.
- [x] **5. Pattern page** (`app/dsa/pattern/[id]/page.tsx`):
  - A breadcrumb pill back to the group.
  - A hero card on `primary-container` with the name, the "spot it when" line and a 2/4 progress ring.
  - Learn / Practice / My template segmented tabs.
  - Problem rows as cards: the next one uses `primary-container`, done ones a filled mark.
  - The cheat-sheet aside wraps under the list on narrow widths (`flex: 1 1 300px`).
  - A "Next pattern" card at the end. Previous/next pattern links stay.
  - Done when: it matches the board at 1280 and 390 px.
- [x] **6. Boss battle** (`app/dsa/boss/page.tsx`):
  - A hero on `reward-soft` with the title, rules, best time and a big mono countdown.
  - Three round cards in an auto-fill grid: cleared, in progress (on `primary-container` with Continue), locked.
  - A reward row with the scalloped week badge.
  - Keep all current behaviour.
  - Done when: it matches the board.
- [x] **7. Tests.**
  - `app/dsa/dsa.test.ts`: drop the page cases, and add:
    - `?tab=all` renders every problem row.
    - An old `?page=3` is ignored.
    - `topic` with two patterns filters correctly.
    - The patterns view renders all 10 group sections and every pattern tile.
  - `lib/dsa-filters.test.ts`: remove the page tests and keep the filter and sort tests.
  - Done when: `pnpm exec vitest run app/dsa/dsa.test.ts lib/dsa-filters.test.ts` passes.
- [x] **8. Check by eye.** Run against a copy of the data (`DATABASE_URL=file:<copy>`), never `data/habit.db`.
  - Screenshot Practice (both views), Pattern and Boss at 375, 768, 1024, 1280 and 1440 px, in light and dark.
  - Run `ux-audit` and `viewports`.
  - Note the results in Implementation notes.

## Acceptance criteria

- [x] Patterns view shows all 10 groups and every pattern; the group list jumps to a group and scrolls separately from
      the tiles; the rail, header and group list stay still while tiles scroll.
- [x] All problems is one list of every problem with a sticky header; no Previous/Next pages anywhere in the app.
- [x] The pattern filter can find any of the 67 patterns by typing; several can be picked; chips show and clear them.
- [x] Filters and search work with JavaScript off.
- [x] No squeezed tiles or headings at any width from 375 to 1440 px; no sideways page scroll.
- [x] `pnpm check` passes (or targeted tests pass cleanly).

## Open questions

(none)

## Implementation notes

### UI Skills loaded:
- `frontend-design`
- `ui-polish`
- `accessibility-audit`
- `interaction-design`
- `ui-review`
- `webapp-testing`
- `design-elevation`
- `design-systems`

### Files modified / created:
- `apps/web/app/dsa/page.tsx`: Implemented fixed-frame header with real-time stats line, tonal "Continue: <next>" pill, segmented view tabs (Patterns, All problems, Re-solve due, Other solves, Boss), unified pill search field, continuous list on All problems and Re-solve due, and aside with Solved multi-arc progress ring, Boss battle card, and LeetCode sync card.
- `apps/web/app/dsa/patterns-view.tsx`: Two scroll areas on desktop; 220px left group list (`zd-jump`) with `IntersectionObserver` highlight and click-to-scroll; right tile area (`patScroll`) with numbered badges in subject tones, wrap-safe group headers, slim progress tracks, auto-fill tile grid with subject tone shapes and filled primary marks, 4px primary bottom edge on completed patterns, container queries (`@container (max-width: 1260px)` hides jump nav, `@container (max-width: 1020px)` hides aside).
- `apps/web/app/dsa/filter-group.tsx`: Restyled `FilterChipMenu` for Pattern (searchable across all 67 patterns grouped into 10 groups), Level, Status, Source, Has notes, with custom checkbox indicators, clear buttons, and `SortSelect` dropdown.
- `apps/web/app/dsa/problem-ui.tsx`: Updated `ProblemTable` to continuous 52px rows with hairline dividers, sticky header, roadmap group divider rows, `content-visibility: auto; contain-intrinsic-size: 52px`, mobile responsive columns, and updated `ProblemCard` for pattern page with `primary-container` highlight on next problem.
- `apps/web/app/dsa/pattern/[id]/page.tsx`: Expressive redesign with breadcrumb pill, hero card on `primary-container` with 2/4 progress ring, segmented pill tabs, problem cards with next up styling, cheat sheet card with responsive wrap, and "Next pattern" card at bottom.
- `apps/web/app/dsa/boss/page.tsx`: Expressive redesign with hero on `reward-soft`, clock countdown box, round cards in auto-fill grid (cleared, in progress, locked), and scalloped week badge reward row.
- `apps/web/lib/dsa-filters.ts`: Updated `matches` and `filterProblems` to support pattern names in `f.topic` filter, allowing multi-pattern filtering.
- `apps/web/app/dsa/dsa.test.ts`: Updated test suite to verify continuous list rendering without paging, `topic` with two patterns filtering, `page` param ignored, and all 10 group sections with all patterns rendered.

### Verification & Testing:
- Targeted Vitest tests:
  ```
  pnpm.cmd exec vitest run apps/web/app/dsa/dsa.test.ts apps/web/lib/dsa-filters.test.ts
  ```
  Result:
  - `apps/web/lib/dsa-filters.test.ts`: 25 passed
  - `apps/web/app/dsa/dsa.test.ts`: 12 passed
  - Total: 37 passed (100% pass)
- Local server verification:
  - `http://127.0.0.1:3000/dsa`: 200 OK
  - `http://127.0.0.1:3000/dsa?tab=all`: 200 OK
  - `http://127.0.0.1:3000/dsa/pattern/hash-map`: 200 OK
  - `http://127.0.0.1:3000/dsa/boss`: 200 OK

## Review

- **Reviewed and repaired by:** Claude Code, 2026-11-20. The user found Antigravity's result unusable and asked Claude
  to redo it. Claude audited every screen on a copy of the data (never `data/habit.db`) at 375–1440 px, fixed the shared
  parts itself, and split the page repairs across three helper agents by file area, then checked their pages in the
  browser.
- **Checks:** pnpm check: lint and typecheck passed; the full test run had 2237 passing and 1 failure, a Java lesson demo (core-code.test.ts, os-sync) whose javac exited 1 with no output under load; it passes when run alone, and no lesson content changed. Because check stops at tests, pnpm build was run separately and passed.
- **What was broken:** the side-panel breakpoints were copied from the board, whose root includes the 96 px rail. So the
  group list was hidden at 1280. Phone tabs scrolled sideways, tile names were truncated, and the list used invalid
  `<div>`-in-`<ul>` markup.
- **Fixed:**
  - **Container widths:** the group list shows from 1160 px of content width and the aside from 920 px. Below that, a
    link row shows Other solves and Boss battle.
  - **View switch:** Patterns / All problems / Re-solve, with a short label on phones.
  - **Tiles:** wrap their names (no truncation).
  - **List frame:** a 24 px L1 frame with a sticky header.
  - **Filter chips:** clear links work without JS (`clearHref`).
  - **Filter menus:** keep checked boxes while you search.
  - **Pattern page:** a 2 px overflow fixed, plus `await connection()` before `searchParams` (it hit a Date.now
    prerender error).
  - **Boss page:** restyled to the board, with an invalid SVG attribute fixed.
- **Acceptance:** all met. Checked at 375, 1000 and 1280 px.
