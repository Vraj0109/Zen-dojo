# Design review of the redesigned app (2026-11-19)

What was looked at: the current `main` (plan 0083 merged, not pushed), production build (`next start`), a copy of the
desktop data, default Dojo theme, dark mode, at 1280 px and 375 px. Skills used: `web-review`, `ux-audit`,
`anti-slop`, `page-patterns`, `viewports`, `typography`, `colour-palette`, `spacing`.

Not yet done: comparison with real products (UXKIN not connected yet; nothing below claims to match a named product),
light mode, 768 px, keyboard-only pass, `pnpm dev` (the user saw Practice fail there).

## Findings across the app

**Must fix**

1. **Custom accent turns every action red.** The user's saved custom theme has accent `#b21f1f`; the app applies it to
   `primary`, so selected nav, buttons and the current-week cell look like errors. Not a code bug, but the theme editor
   allows an accent that reads as danger. Fix: warn when the chosen primary is close to `danger` in hue, and never
   use `primary` for "current" markers that should read as neutral progress.
2. **Phone problem page is the desktop pane layout squeezed into 375 px.** Title truncates to "49. Gr...", status text
   wraps into a column, three panes sit side by side at ~150 px each. The planned phone view (tabs Problem / Code /
   Last run / Notes) does not appear. Pattern: Detail on narrow.
3. **All problems table has an empty Problem column.** The header "Problem" overlaps "Pattern"; titles are missing at
   1280. On phone the titles truncate to 6 characters ("Two S...") and an "Undo" button sits inside every row.
   Pattern 1 (List): primary cell must be readable and link-coloured; no row actions inline.
4. **System design diagrams show raw Mermaid source** ("flowchart LR / C[Client] --> LB...") instead of a drawing on
   the design page. Needs checking with the pane visible; if it still happens, the diagram viewer is not mounting.
5. **Roadmap breaks in `pnpm dev`.** In the production build the 16-cell strip and the week cards render correctly at
   1280 and 1600; in the user's `pnpm dev` the strip became 16 full-width bars. The grid classes are not applied in
   dev, so the layout must not depend on them silently (verify dev CSS generation and add a fallback).
6. **Practice fails to open in `pnpm dev`** (user report; production build opens). Reproduce in dev.

**Should fix**

7. **"Study mode on this phone" banner on every page.** It takes the top 110 px of every phone screen until dismissed
   and repeats per route. Show once, then remember; or move it to Settings.
8. **Course pages use half the width.** The Topics card fills only the left half at 1280 with empty space on the
   right, then the Classic problems list is full width: two different widths on one page. One full-width column.
9. **Auth page keeps the app sidebar.** Pattern 3 (auth) is a centred card with no app chrome.
10. **Profile activity grid is small and left-aligned** with ~60% empty panel; month labels show Aug to Nov for
    "last 12 weeks". Size the grid to the panel or put the stats beside it.
11. **Pattern progress says "5 of 4".** Counts solved extras against the pattern size. Cap or say "5 solved (4 in the
    set)".
12. **Nested cards on Practice > Patterns.** Group card > pattern card > problem rows: three frames deep. Pattern 1
    allows one frame (L1) with hairlines; flatten to one frame per group.
13. **Workspace header crowding.** Status, Undo, timer and the four layout icons share one line with the title; the
    breadcrumb sits above in tiny text. Fine at 1280, breaks below 1100.
14. **Lesson "Overview" paragraph is semibold** for the whole block; body text should be regular weight.
15. **Typography weights.** DESIGN.md allows 700; the typography skill caps at 600 and three weights. Page titles use
    700. Switch titles to 600.
16. **LLD "Your classes" is a small embedded editor at the bottom of a long page** with a file list of one file.
    Should be a full-screen editor with the user's own file tree and the reference in a drawer (plan 0084).

**Nice to have**

17. Sidebar "Profile · Sign in · sync" row is cramped; give Sign in its own line on narrow sidebars.
18. Back/forward arrows float alone at the top of every page; move them into a slim page header row with the title.
19. Review flashcard is centred text on a large card; give the card a max width and left-align the prompt.

## Compared with real products (looked at in the browser, 2026-11-19)

Public pages only, logged out. Patterns taken, not looks.

| Our page | Looked at | What they do that we should take |
|---|---|---|
| Practice list / All problems | LeetCode problemset, NeetCode practice | One compact toolbar (search, sort, filter icon, "n/total solved" on the right). Topic chips with counts above the list. Rows are one line: status icon, "number. title" as the primary cell, then difficulty as coloured text (not a pill), acceptance. Zebra rows instead of borders. Progress lives in a right rail (solved ring split Easy/Medium/Hard, streak calendar), not above the list. |
| Problem workspace | LeetCode problem page | The workspace owns the whole window: no app sidebar, one 40 px top bar (problem list, prev/next, Run/Submit centred, settings right). Panes run edge to edge with 4 px gaps and rounded corners. Each pane has its own small tab strip (Description / Editorial / Solutions / Submissions; Testcase / Test result). Statement uses bold "Example 1:" labels and indented Input/Output lines. |
| Roadmap | NeetCode roadmap | Topics drawn as a dependency tree (what unlocks what) with a progress bar under each node; progress ring and streak calendar on the right. Our 16-week plan is time-based, so keep the week strip, but show progress per week cell and put the phase cards below. |
| Course page | Exercism track page | Track header (icon, name, learner count), then three tabs: About / Learn / Practice. Learn is the concept list, Practice is the exercise list. Same for our courses: Concepts and Designs/Projects as tabs, one column. |
| Lesson | MDN article | Three columns: left sibling lessons (filterable list of the course), centre article, right "In this article" outline. Breadcrumb above. We have the right outline but not the left lesson list. |
| Profile activity | GitHub profile | Headline "N contributions in the last year", the grid spans the full panel width with month labels on top and weekday labels left, a year switcher on the right, then an activity feed below. |

## Page by page (what to change in the mockups)

| Page | Pattern | Main changes |
|---|---|---|
| Today | 4 Dashboard | Keep. Tighten the three progress cards into one row strip; move back/forward into the header. |
| Practice: Patterns | 1 List | One frame per group, no nested cards; side panel (Boss battle, LeetCode sync) below the list on narrow. |
| Practice: All problems | 1 List | Readable Problem column (link colour), sticky header, no inline Undo, pagination labels; phone: two-line rows. |
| Pattern page | 2 Detail | Fix count; tabs Learn / Practice / My template; outline as sticky side nav (6+ sections). |
| Problem workspace | 8 Split pane (desktop) / 2 Detail (phone) | Header in two rows; real phone view with four tabs. |
| Learn hub | 4 Dashboard | Keep cards; library below. |
| Course page | 2 Detail | One full-width column; topics as a list in one frame. |
| Lesson | 2 Detail | Regular-weight body; keep 68ch column and side outline. |
| LLD project | 2 Detail + full-screen editor | Sections as tabs; "Write your classes" opens the full-screen editor with drawer. |
| System design design page | 2 Detail | Diagrams render; reference behind "Reveal"; steps rail. |
| Review | 10 Inbox | Queue list with one focused card; left-aligned prompt. |
| Roadmap | 7-like timeline (Detail) | Strip of 16 cells, then phase sections of week cards (already right in production). |
| Profile | 4 Dashboard | KPI strip (max 5), activity grid sized to panel, balance. |
| Settings | 5 Settings | Keep. |
| Sign in | 3 Form (auth) | No app sidebar. |
