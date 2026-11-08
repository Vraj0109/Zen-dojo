# 0020: Problem workspace, CSES in the main list, Learn hub, animations, reading tracker

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-08
- **Implemented by:** Claude Code, 2026-11-08
- **Spec:** user requests 2026-11-08

## What was built

- **Problem workspace** (`app/pane-layout.tsx`, `app/judge-workspace.tsx`): a LeetCode-style screen with three panes: Problem
  (tabs: Description, Hints, Notes, Stuck log, Submissions when there are any, Pattern), Code (editor, language, Reset, Run,
  Ctrl+Enter) and Results. Drag a divider to resize (arrow keys work on a focused divider, double-click resets), drag a pane's
  title onto another pane to swap them, maximise a pane, or pick a layout (Classic, Columns, Stacked, Code focus). The layout is
  remembered in the browser. Below 1024 px the panes stack and scroll. Problems without a spec keep the old tabbed page.
- **Accepted solutions are saved**: `/api/judge/run` is called with `save: true`; when every case passes, the server stores the
  code and language in `problem_notes` (notes you wrote are kept). The page refreshes so the Notes tab shows it.
- **CSES in the main list**: the four CSES problems are roadmap problems (`cses-*`) in a new group "CSES Problem Set" (pattern
  `cses-intro`, with a guide). They use the same problem page; the LeetCode-only Submissions tab only appears when LeetCode
  submissions exist, and "Open on CSES" replaces "Open on LeetCode". The separate `/dsa/cses` pages are gone (redirects in
  `next.config.ts`).
- **Animations** (`globals.css`, `lib/theme.ts`, Settings > Animations): fades, staggered lists, a sliding marker, growing
  progress bars. Auto follows the computer's "reduce motion" setting, On always animates, Off never does
  (`<html data-motion="off">` removes every animation and transition with one CSS rule).
- **Reading tracker** (`app/toc.tsx`): the "On this page" list in lessons and articles highlights the section you are in, slides a
  marker to it, and shows how far down the page you are.
- **Learn hub** (`/study`, `lib/courses.ts`): courses as cards (System design, LLD, Core CS, DSA patterns, Reading list) with
  progress, what is left, what is due, the next step, a favourite star (stored in `settings`, so it is in backups), and a
  "Continue where you left off" card. Add a course by adding one entry to `COURSES`. Pages inside a course have a breadcrumb and
  an "Other courses" menu instead of tabs.
- **Today**: a slim progress bar beside "Up next", a "Keep learning" suggestion when everything is done, staggered rows.

## Verified in a real window (Electron, hidden)

Problem page layout, a real Run (C++ with a `cout` line, 10 of 10 passed, solution saved and shown in Notes), the Learn hub and the
CSES problem page. **Not checked by hand:** dragging dividers and swapping panes, the TOC marker while scrolling a long lesson,
the Columns/Stacked/Code focus layouts, favourites. Note for testing with screenshots: a hidden window never advances
animations, so content with an entrance animation looks blank; turn animations Off first.

## Review

(pending)
