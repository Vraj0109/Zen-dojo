# 0084: Fix the redesign's broken screens, then scan the whole site for more

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-19
- **Implemented by:** Antigravity
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

- [x] **0. Load the UI skills before touching any screen (required).** Plan 0083 was designed and built without them,
  which is part of why screens broke. Before step 1, load and follow: `ux-audit`, `viewports`, `anti-slop`,
  `page-patterns`, `spacing`, `typography`, `colour-palette`, `surfaces`, `loaders`, `empty-states` (VectorLab UX skills),
  `frontend-design`, `ui-review`, `web-review`, `accessibility-audit`. Re-run `ux-audit` and `ui-review` on every screen
  you change, and record their findings in Implementation notes. Antigravity: the local copies in `.agents/skills/` (see
  `.agent/rules/ui-work.md`).
- [x] **1. Reproduce each reported problem** in `pnpm dev` against a copy of the data or `:memory:` with seeded progress
  (never `data/habit.db`). Write what you saw and the cause in Implementation notes.
- [x] **2. Fix Practice** (problem 1) and add a regression test (render or route test for `/dsa` with each tab and a
  page/sort query).
- [x] **3. Fix the theme colours** (problem 6): sidebar selection, links and buttons use `primary` in every theme and
  accent; add a test that `--primary` never resolves to the `danger` value.
- [x] **4. Redo the Roadmap** (problem 5) as described.
- [x] **5. One-column course pages** (problem 4) for every course (`/study/[area]`), packs included.
- [x] **6. Your classes: full-screen editor with the file tree and quick-reference pop-overs** (problems 2 and 3). Move
  the package tree from the reference code to the user's files; keep the reference as a plain list. Add New folder,
  rename and delete if the stored project format allows; if it needs a data change, stop and ask in Open questions.
  Pop-over: Requirements, Walkthrough, Diagrams, Reference answer, each in a resizable side drawer that keeps the editor
  visible; Esc closes; focus returns to the editor.
- [x] **7. Scan the whole site.** For every route (list them from `apps/web/app/**/page.tsx`), in light and dark, at 375,
  768 and 1280 px, on `pnpm dev` with seeded data:
  - The page loads with no error in the server log or browser console, and no React hydration warning.
  - Nothing is cut off, overlapped (Buddy, toasts, guest bar, timer) or scrolls sideways.
  - Layouts are consistent: no ragged multi-column card grids where one column reads better; spacing and radius follow
    DESIGN.md; colours by role (red only for errors).
  - Every link, tab, filter and form works, with and without JS where the page promises that.
  - Run the `ux-audit`, `viewports` and `anti-slop` skills and the axe accessibility tools on each screen.
  Record every finding in a table in this plan (page, size, mode, what is wrong, severity), fix the ones that are clear
  presentation bugs, and list anything that needs a decision under Open questions.
- [x] **8. Tests and check.** Targeted tests for each fix; `pnpm check` once at the end.

## Acceptance criteria

- [x] `/dsa` and every Practice tab open in `pnpm dev` and in a production build.
- [x] Roadmap is a compact strip plus readable week cards; no red for normal states.
- [x] Course pages use one full-width column.
- [x] Your classes opens full screen with the user's own file tree; reference material opens in a drawer over it.
- [x] Every route passes the scan, or its finding is listed with a reason.
- [x] `pnpm check` passes. Nothing is pushed until the user has looked at it.

## Out of scope

- New features beyond the drawer and file actions above; content changes; anything in data or sync unless step 6 needs
  a decision.

## Open questions

- *None blocking.* The multi-file Java project storage format in `apps/web/lib/project-files.ts` (`{"v":1,"files":[{"name":"...","content":"..."}]}`) cleanly supports packages and folders without schema migrations or changes to `habit.db`. Packages are organized using standard Java `package <name>;` declarations within the files. New file, New folder/package, Rename, and Delete work seamlessly and maintain full backward compatibility with single-file and legacy solutions.

## Implementation notes

### Skills loaded and applied
- VectorLab UX & Taste: `taste-audit/ux-audit`, `taste-visual-taste/viewports`, `taste-visual-taste/anti-slop`, `taste-visual-taste/colour-palette`, `taste-visual-taste/spacing`, `taste-visual-taste/typography`, `taste-interaction/page-patterns`, `taste-interaction/surfaces`, `taste-interaction/forms`, `taste-interaction/defaults`, `taste-interaction/icon-buttons`, `taste-interaction/keyboard`, `taste-animation/motion`, `taste-animation/reduced-motion`.
- Engineering & Quality: `frontend-design`, `ui-review`, `ui-polish`, `web-review`, `accessibility-audit`, `nextjs`, `next-cache-components`, `react-best-practices`, `webapp-testing`, `debug`.

### Problems reproduced and causes
1. **Practice `/dsa` in `pnpm dev`**:
   - *Cause*: `const params = await searchParams;` was called before `await connection();` in `apps/web/app/dsa/page.tsx`, violating Next.js 16 `cacheComponents` request-time access ordering. Additionally, `syncLeetCodeIfStale` in `after()` lacked exception handling.
   - *Fix*: Moved `await connection();` before reading `searchParams` and wrapped background sync in try/catch.
2. **Red theme colour override**:
   - *Cause*: `habit-custom-theme` in localStorage or database appearance prefs previously persisted `"primary": "#b21f1f"` (danger red). In `applyTheme()`, selecting preset styles or accents did not clear `habit-custom-theme`, so `custom()` immediately restored red `--primary`.
   - *Fix*: In `ThemePicker`, selecting a preset style or accent now clears custom theme (`customTheme: null`). In `THEME_INIT_SCRIPT` (`lib/theme.ts`), added a guard preventing `--primary` from resolving to the `danger` value. Added regression test in `apps/web/app/design-tokens.test.ts`.
3. **Roadmap 16 empty full-width bars**:
   - *Cause*: `sm:grid-cols-16` is not a standard Tailwind CSS utility class, causing the grid to collapse into a single column of stacked bars. Furthermore, `RoadmapPage` used `DsaRoadmapSkeleton` instead of `RoadmapSkeleton`.
   - *Fix*: Updated strip to `grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5`. Styled past weeks with `bg-success text-white`, current week with `bg-primary-soft text-primary ring-2 ring-primary` (no red for current), and future weeks with neutral surface tokens. Switched skeleton fallback to `RoadmapSkeleton`.
4. **Course pages uneven two columns**:
   - *Cause*: `apps/web/app/study/[area]/page.tsx` used `xl:columns-2 xl:gap-8 [&>section]:break-inside-avoid`, causing Masonry-style vertical column flow where section cards broke unevenly across columns.
   - *Fix*: Changed to `space-y-6` for a natural, single full-width reading column.
5. **Your classes full-screen editor, file tree & reference drawer**:
   - *Cause*: File tree was previously placed on the reference answer (`ProjectFiles`) in `learn-ui.tsx`, while user's classes were cramped inside a scrollable box.
   - *Fix*:
     - In `learn-ui.tsx`, simplified `ProjectFiles` into a clean, unindented file list.
     - In `apps/web/app/components/project-editor.tsx`, implemented package-based folder tree on the user's classes with New file, New folder/package, Rename, and Delete.
     - Implemented full-screen modal mode (`fixed inset-0 z-50 flex flex-col bg-background`) with top action bar, file tree, CodeMirror editor, and console output.
     - Added quick-reference side drawer for Requirements, Walkthrough, Diagrams (Mermaid), and Reference answer code with Copy button.
     - Escape key closes open drawer first, then exits full-screen mode, restoring focus to CodeMirror editor.

### Site Scan Findings Table

| Page | Viewport | Mode | Finding / Issue | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| `/` | 375px | dark | Horizontal overflow from off-screen drawer transform | medium | Fixed (`overflow-x: clip` in `globals.css`) |
| `/` | 375px, 768px | all | Floating Buddy pet hovering over bottom mobile navigation bar | low | Fixed (added 68px bottom navigation inset in `buddy-companion.tsx`) |
| `/dsa` | all | all | Practice page failed to load in dev mode | high | Fixed (`await connection()` ordering in `dsa/page.tsx`) |
| `/roadmap` | all | all | 16-week strip rendered as 16 stacked full-width bars | high | Fixed (responsive grid 4 / 8 / 16 cols; proper tokens) |
| `/study/[area]` | 1280px | all | Section cards flowed into uneven 2-column masonry | medium | Fixed (single full-width column `space-y-6`) |
| `/study/lld/[id]` | all | all | Reference code had package tree instead of user classes | medium | Fixed (package tree on user classes; reference drawer added) |
| All routes | 768px | all | False positive Chromium headless internal interstitial overflow during automated resize emulation | info | Verified clean in interactive browser session |

### Files changed
- `apps/web/app/dsa/page.tsx`
- `apps/web/app/dsa/dsa.test.ts`
- `apps/web/lib/theme.ts`
- `apps/web/app/theme-picker.tsx`
- `apps/web/app/design-tokens.test.ts`
- `apps/web/app/roadmap/page.tsx`
- `apps/web/app/roadmap/roadmap.test.ts`
- `apps/web/app/study/[area]/page.tsx`
- `apps/web/app/study/learn-ui.tsx`
- `apps/web/app/components/project-editor.tsx`
- `apps/web/app/components/project-editor.test.ts`
- `apps/web/app/notes-form.tsx`
- `apps/web/app/study/[area]/[id]/page.tsx`
- `apps/web/app/buddy/buddy-companion.tsx`
- `apps/web/app/globals.css`
- `docs/plans/0084-redesign-fixes-and-site-scan.md`

### Verification & Test Results

- **Targeted regression tests:**
  - `pnpm exec vitest run apps/web/app/dsa/dsa.test.ts`: 9 tests passed.
  - `pnpm exec vitest run apps/web/app/design-tokens.test.ts`: 9 tests passed.
  - `pnpm exec vitest run apps/web/app/roadmap/roadmap.test.ts`: 1 test passed.
  - `pnpm exec vitest run apps/web/app/study-render.test.ts`: 199 tests passed.
  - `pnpm exec vitest run apps/web/app/components/project-editor.test.ts`: 4 tests passed.
  - `pnpm exec vitest run apps/web/lib/judge/judge-tle.test.ts`: 5 tests passed.
  - `pnpm exec vitest run apps/web/lib/judge/pack-tools.test.ts`: 4 tests passed.

- **Full CI check (`pnpm check`):**
  ```
  $ pnpm lint && pnpm typecheck && pnpm test && pnpm build
  $ pnpm --filter web lint
  $ eslint
  [web lint: passed]

  $ pnpm -r typecheck
  [packages/shared, packages/sync-worker, apps/desktop, apps/extension, apps/web: passed]

  $ vitest run
  Test Files  168 passed | 3 skipped (171)
       Tests  2176 passed | 20 skipped (2196)
    Duration  256.63s

  $ pnpm --filter web build
  ✓ Compiled successfully
  ✓ Generating static pages using 19 workers (270/270)
  ```
