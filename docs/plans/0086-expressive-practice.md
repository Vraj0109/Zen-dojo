# 0086: Expressive redesign, part 2: Practice (every pattern on one page, no pagination)

- **Status:** ready (start after 0085 is done)
- **Planned by:** Claude Code, 2026-11-20
- **Implemented by:** (implementer fills in)
- **Spec:** the mockup canvas (https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj), boards "Practice: patterns and all
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

- [ ] **0. Load the UI skills first (required).** Load `ux-audit`, `viewports`, `page-patterns` (Practice is
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
- [ ] **2. Page header and controls** (both views):
  - Title "Practice", with a stat line underneath: "84 of 496 solved · 67 patterns in 10 groups · 6 re-solves due",
    computed from real data.
  - On the right, a tonal "Continue: <next problem>" pill (the existing next-problem logic). Hide it on phone.
  - Below: the view switch as a segmented pill (Patterns, All problems, Re-solve due · N; Boss stays a link in the aside
    and on phone).
  - Next to it, one pill search field, "Search 496 problems or 67 patterns". On the Patterns view it filters tiles by
    pattern name, `recognize` text and problem titles. On All problems it filters rows (the existing `q`).
  - The header and controls do not scroll with the content (see step 3).
  - Done when: the header matches the board at 1280 px and wraps cleanly at 768 and 390 px.
- [ ] **3. Patterns view: two scroll areas.** Inside `<main>`, below the header, a flex row fills the remaining height
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
- [ ] **4. All problems view: one long list.**
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
- [ ] **5. Pattern page** (`app/dsa/pattern/[id]/page.tsx`):
  - A breadcrumb pill back to the group.
  - A hero card on `primary-container` with the name, the "spot it when" line and a 2/4 progress ring.
  - Learn / Practice / My template segmented tabs.
  - Problem rows as cards: the next one uses `primary-container`, done ones a filled mark.
  - The cheat-sheet aside wraps under the list on narrow widths (`flex: 1 1 300px`).
  - A "Next pattern" card at the end. Previous/next pattern links stay.
  - Done when: it matches the board at 1280 and 390 px.
- [ ] **6. Boss battle** (`app/dsa/boss/page.tsx`):
  - A hero on `reward-soft` with the title, rules, best time and a big mono countdown.
  - Three round cards in an auto-fill grid: cleared, in progress (on `primary-container` with Continue), locked.
  - A reward row with the scalloped week badge.
  - Keep all current behaviour.
  - Done when: it matches the board.
- [ ] **7. Tests.**
  - `app/dsa/dsa.test.ts`: drop the page cases, and add:
    - `?tab=all` renders every problem row.
    - An old `?page=3` is ignored.
    - `topic` with two patterns filters correctly.
    - The patterns view renders all 10 group sections and every pattern tile.
  - `lib/dsa-filters.test.ts`: remove the page tests and keep the filter and sort tests.
  - Done when: `pnpm exec vitest run app/dsa/dsa.test.ts lib/dsa-filters.test.ts` passes.
- [ ] **8. Check by eye.** Run against a copy of the data (`DATABASE_URL=file:<copy>`), never `data/habit.db`.
  - Screenshot Practice (both views), Pattern and Boss at 375, 768, 1024, 1280 and 1440 px, in light and dark.
  - Run `ux-audit` and `viewports`.
  - Note the results in Implementation notes.

## Acceptance criteria

- [ ] Patterns view shows all 10 groups and every pattern; the group list jumps to a group and scrolls separately from
      the tiles; the rail, header and group list stay still while tiles scroll.
- [ ] All problems is one list of every problem with a sticky header; no Previous/Next pages anywhere in the app.
- [ ] The pattern filter can find any of the 67 patterns by typing; several can be picked; chips show and clear them.
- [ ] Filters and search work with JavaScript off.
- [ ] No squeezed tiles or headings at any width from 375 to 1440 px; no sideways page scroll.
- [ ] `pnpm check` passes.

## Open questions

(none yet)

## Implementation notes

(implementer fills in)

## Review

(reviewer fills in)
