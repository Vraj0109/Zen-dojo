# 0057: Three UI fixes (Today scroll, course page columns, account arrow)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Estimate at this project's pace:** one agent, 1 to 2 hours

## Goal

Three small things the user noticed in the desktop app:

1. The Today page has a **horizontal scroll bar**. There should be none at any normal window width.
2. On a course page (for example system design) the two-column layout leaves a **big empty gap**: section C starts
   below the end of the taller of A and B, so a short A leaves a hole above C.
3. The **arrow on the account button** (bottom of the sidebar) points the wrong way.

## Context (verified)

- Course page layout: `apps/web/app/study/[area]/page.tsx` line 84:
  `<div className="grid gap-8 xl:grid-cols-2">` wrapping `sections.map(...)` and `separate.map(...)`. A CSS grid
  makes each row as tall as its tallest cell, which causes the gap. Other `grid-cols-2` uses in `app/study/**` are rows
  of equal-height cards and are fine.
- Account arrow: `apps/web/app/components/account-popover.tsx` lines 151 to 153:
  `className={`text-muted transition-transform ${open ? "" : "rotate-180"}`}` with `ICON.chevron = "m6 15 6-6 6 6"`,
  which is an **up** chevron. The menu opens **upwards** (`absolute bottom-full`). So the closed button shows a *down*
  arrow and the open one shows *up*; it should be the reverse (closed: up, "opens upward"; open: down, "close").
  Checked: no other arrow in `app/profile/**` or `nav.tsx`. If the user meant a different arrow, this plan's step 3 says
  where to look.
- Today page: `apps/web/app/page.tsx` (header chips, Up Next rows, freeze banner) inside `apps/web/app/shell.tsx`. The
  cause of the scroll was **not** found by reading; step 1 finds it by measuring.
- Conventions: Tailwind v4 tokens, no emoji (use SVG), wide layouts preferred.

## Out of scope

- Redesigning Today or the course pages; mobile layout (plan 0059); the Backlog/week work (plan 0056 touches
  `app/page.tsx` too, so merge carefully if both are in flight).

## Steps

Targeted checks only (`pnpm -r typecheck`, `cd apps/web; pnpm exec eslint <files>`). Check visually in the built-in
browser at `http://localhost:3000` against a **copy** of the database (`DATABASE_URL=file:C:/Temp/habit-test.db`).

- [ ] **1. Find and fix the Today scroll.** Open `/` at widths 900, 1100, 1280 and 1600 (resize the browser pane) and
  run in the console:
  `[...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(e => e.tagName + "." + e.className)`.
  Fix the **cause** (typical: a flex child missing `min-w-0`, a long title without `truncate`, a row that needs
  `flex-wrap`, a fixed `w-[..]`). Do not hide it with `overflow-x-hidden` on `body` or `main`, unless the wide thing
  is a table or code block, which must get its own `overflow-x-auto` wrapper instead. Also check the desktop app
  window (`pnpm desktop:dev` with `pnpm dev` already running; do not run `pnpm desktop:build`).
  - Done when: at all four widths `document.documentElement.scrollWidth <= document.documentElement.clientWidth` on `/`,
    with the freeze banner, the Catch-up drawer closed and open, and a long custom task title present.
- [ ] **2. Even course columns.** In `apps/web/app/study/[area]/page.tsx` replace the grid wrapper with CSS columns so
  blocks pack upward with no holes: `className="xl:columns-2 xl:gap-8 [&>section]:mb-8 [&>section]:break-inside-avoid"`
  (keep one column below `xl`, same order as today). Each section stays a direct child `<section>` of the wrapper.
  - Done when: on `/study/sd` and a core CS area at 1440 px wide, sections flow down the left column then the right
    with no vertical gap larger than the normal 2rem, and on a narrow window the order is unchanged.
- [ ] **3. Account arrow.** In `account-popover.tsx` change the class to
  `${open ? "rotate-180" : ""}` (closed: chevron up; open: chevron down). If, after looking, the arrow the user means is
  elsewhere (Profile page, sidebar section toggles), note where in *Implementation notes* and fix that one too.
  - Done when: closed shows an up chevron, open shows a down chevron, and the animation still turns.

## Acceptance criteria

- [ ] No horizontal scrollbar on Today at widths 900 to 1600 in the browser and in the desktop window.
- [ ] A course page's two columns have no big gaps; C sits right under A.
- [ ] The account button arrow points up when closed and down when open.
- [ ] `pnpm check` passes.
- [ ] Only the files named above changed (plus whichever file step 1 shows is the cause, listed in *Implementation notes*).

## Pitfalls

- CSS columns fill the left column first, so the reading order on wide screens is A, C, ... then B, D. That is the
  intended trade-off for no gaps; do not add JavaScript balancing.
- `break-inside-avoid` on a very tall section can leave one column longer; accept it.

## Open questions

## Implementation notes

Done by Claude agent B, round twelve (not yet reviewed).

- **Today scroll (step 1), measured** in the browser on a copy of the database at 900, 1100, 1280 and 1600 px. Two causes:
  1. `.anim-fade-up` (the page wrapper in `ui.tsx`) used `animation-fill-mode: both`, so `<main>` kept a transform after the
     fade-in. That made `<main>` the containing block of the `fixed` Catch-up drawer, which sits at `translate-x-full` when
     closed, so it stuck out 384 px to the right (scrollWidth 1469 vs 1085). Fix: `apps/web/app/globals.css`, `both` changed
     to `backwards`. After the fix scrollWidth equals clientWidth with the drawer closed. (The 0.28 s fade-in still has the
     transform for a moment on load.)
  2. A custom task title with no spaces pushed the row wider (scrollWidth 1774 at 900 px). Fix: `break-words` on the title
     `<p>` in `apps/web/app/page.tsx` (both the Up next row and the task row).
  Not checked in the Electron window itself (same web content; the browser pane was used).
- **Course columns (step 2):** `study/[area]/page.tsx` now uses CSS columns. On `/study/sd` at 1440 px: A and C start at the same
  height, B follows A with a 32 px gap, no larger holes.
- **Account arrow (step 3):** class flipped as planned. No other arrow was changed.
- Files changed: `app/globals.css`, `app/page.tsx`, `app/study/[area]/page.tsx`, `app/components/account-popover.tsx`.

## Review
