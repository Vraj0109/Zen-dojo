# 0084: Fix the redesign's broken screens, then scan the whole site for more

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-19
- **Implemented by:** (implementer fills in)
- **Spec:** DESIGN.md, plan 0083, the mockup canvas

## Goal

Plan 0083 landed (merged on `main`, not pushed) but the user found broken screens in `pnpm dev`. Fix those, then walk
every page systematically and fix what else is wrong, before anything is pushed or released.

## Problems the user reported (2026-11-19)

1. **Practice does not open in `pnpm dev`** (`/dsa`). Find the error (server log, browser console, React overlay) and fix
   the cause. Likely suspects from phase 3: the new `router.replace` filter flow, the `"all"` tab / paging parsing in
   `lib/dsa-filters.ts`, a server/client boundary in `filter-group.tsx`, or a Suspense/`connection()` mistake
   (`cacheComponents` rules). Also check `/dsa?tab=all`, `/dsa?tab=resolve`, a pattern page and `/dsa/boss`.
2. **LLD file tree is on the wrong thing.** The tree was built for the reference "Full code". It belongs to the user's own
   classes ("Your classes" / Your turn): their files and folders, New file, New folder, rename, delete. The reference code
   can stay a simple file list.
3. **Your classes must be a full-screen experience.** Today it scrolls inside the page and looks cramped. Make it an
   editor view that fills the window (like the DSA workspace: own top bar, file tree, editor tabs, run output), with an
   exit back to the project page. Reference material (requirements, the walkthrough, diagrams, the reference answer) opens
   as a **pop-over panel or drawer** for quick looks without leaving the editor.
4. **Course pages (Learn > LLD etc.) look broken.** Section cards sit in uneven columns (A, C side by side, B below A).
   Use **one full-width column** of section cards in reading order; rows inside a card can use the width.
5. **Roadmap is broken.** The "16-week strip" renders as 16 full-width stacked bars with only a number, current week in
   solid red, next in red outline, and no content; the whole thing is one huge card. Redo it: a compact horizontal strip
   (16 small cells in one row, wraps on phones) with labels/tooltips, then the week cards grouped by phase underneath with
   their real content (focus, tasks done, a link). Red must not be used for "current week": use `primary` (current),
   `success` (done), neutral (upcoming); red is only for errors.
6. **Wrong colour in the screenshot:** the sidebar's selected item and the roadmap use red, which means the user's theme
   or accent mapping is off (default accent renamed "Theme colour" in phase 1, palette `primary` override in phase 5).
   Check every theme and accent combination; `danger` must never stand in for `primary`. Check the Buddy and other
   overlays don't cover content (the floating pet over the roadmap's right edge).

## Steps

- [ ] **0. Load the UI skills before touching any screen (required).** Plan 0083 was designed and built without them,
  which is part of why screens broke. Before step 1, load and follow: `ux-audit`, `viewports`, `anti-slop`,
  `page-patterns`, `spacing`, `typography`, `colour-palette`, `surfaces`, `loaders`, `empty-states` (VectorLab UX skills),
  `frontend-design`, `ui-review`, `web-review`, `accessibility-audit`. Re-run `ux-audit` and `ui-review` on every screen
  you change, and record their findings in Implementation notes. Antigravity: the local copies in `.agent/skills/` (see
  `.agent/rules/ui-work.md`).
- [ ] **1. Reproduce each reported problem** in `pnpm dev` against a copy of the data or `:memory:` with seeded progress
  (never `data/habit.db`). Write what you saw and the cause in Implementation notes.
- [ ] **2. Fix Practice** (problem 1) and add a regression test (render or route test for `/dsa` with each tab and a
  page/sort query).
- [ ] **3. Fix the theme colours** (problem 6): sidebar selection, links and buttons use `primary` in every theme and
  accent; add a test that `--primary` never resolves to the `danger` value.
- [ ] **4. Redo the Roadmap** (problem 5) as described.
- [ ] **5. One-column course pages** (problem 4) for every course (`/study/[area]`), packs included.
- [ ] **6. Your classes: full-screen editor with the file tree and quick-reference pop-overs** (problems 2 and 3). Move
  the package tree from the reference code to the user's files; keep the reference as a plain list. Add New folder,
  rename and delete if the stored project format allows; if it needs a data change, stop and ask in Open questions.
  Pop-over: Requirements, Walkthrough, Diagrams, Reference answer, each in a resizable side drawer that keeps the editor
  visible; Esc closes; focus returns to the editor.
- [ ] **7. Scan the whole site.** For every route (list them from `apps/web/app/**/page.tsx`), in light and dark, at 375,
  768 and 1280 px, on `pnpm dev` with seeded data:
  - The page loads with no error in the server log or browser console, and no React hydration warning.
  - Nothing is cut off, overlapped (Buddy, toasts, guest bar, timer) or scrolls sideways.
  - Layouts are consistent: no ragged multi-column card grids where one column reads better; spacing and radius follow
    DESIGN.md; colours by role (red only for errors).
  - Every link, tab, filter and form works, with and without JS where the page promises that.
  - Run the `ux-audit`, `viewports` and `anti-slop` skills and the axe accessibility tools on each screen.
  Record every finding in a table in this plan (page, size, mode, what is wrong, severity), fix the ones that are clear
  presentation bugs, and list anything that needs a decision under Open questions.
- [ ] **8. Tests and check.** Targeted tests for each fix; `pnpm check` once at the end.

## Acceptance criteria

- [ ] `/dsa` and every Practice tab open in `pnpm dev` and in a production build.
- [ ] Roadmap is a compact strip plus readable week cards; no red for normal states.
- [ ] Course pages use one full-width column.
- [ ] Your classes opens full screen with the user's own file tree; reference material opens in a drawer over it.
- [ ] Every route passes the scan, or its finding is listed with a reason.
- [ ] `pnpm check` passes. Nothing is pushed until the user has looked at it.

## Out of scope

- New features beyond the drawer and file actions above; content changes; anything in data or sync unless step 6 needs
  a decision.

## Open questions

## Implementation notes

## Review
