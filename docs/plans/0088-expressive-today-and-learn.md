# 0088: Expressive redesign, part 4: Today and every Learn page

- **Status:** ready (start after 0085 is done; can run alongside 0086, 0087 and 0089)
- **Planned by:** Claude Code, 2026-11-20
- **Implemented by:** (implementer fills in)
- **Spec:** `docs/mockups/expressive/` (mockup sources in the repo; see its README), from the mockup canvas (https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj).
  - Desktop boards: "Today", "Learn hub", "Course page", "Lesson", "LLD project", "Your classes: full-screen editor",
    "System design walkthrough", "Reading list", "Diagrams".
  - Phone galleries A, B and C, plus Today light and dark.

## Goal

Move Today and every Learn screen onto the Expressive look. Make them fill the width sensibly: Course pages run full
width, and side panels make room on narrow windows instead of squeezing the content.

## Context

- Needs plan 0085: tokens, components (`Scallop`, `WavyProgress`, `SubjectShape`, pill buttons, segmented tabs), the
  fixed shell with `<main>` as the `@container` scroll area, and the layout rules in `globals.css`.
- **Pages:**
  - Today: `app/page.tsx`, `app/today/page.tsx`, `app/today/today-ui.tsx`, `app/today/data.ts`.
  - Learn hub: `app/study/page.tsx`, `app/study/study-ui.tsx`, `app/study/library-download.tsx`.
  - Course: `app/study/[area]/page.tsx`. 0084 made it one column, but `PageMain` still caps it at about 960 px.
  - Lesson, LLD project and SD walkthrough: `app/study/[area]/[id]/page.tsx`, with `app/study/learn-ui.tsx`,
    `app/learn-blocks.tsx`, `app/toc.tsx`, `lesson-ai.tsx` and `project-playground.tsx`.
  - Your classes: `app/components/project-editor.tsx`. 0084 made it full screen with a file tree and a reference drawer.
  - Reading list: `app/study/reading/page.tsx`.
  - Diagrams: `app/study/diagrams/page.tsx`.
  - Packs: `app/study/packs`.
- **Behaviour stays:** the 0084 behaviour of Your classes stays (file tree for the user's own files with New file, New
  folder, rename and delete; drawer for Requirements, Walkthrough, Diagrams and Reference answer; Esc handling). Only
  layout and style change here.
- **Pitfall (0083/0084):** Mermaid diagrams in SD lessons showed as raw text in one review. Check they render, and fix
  if they don't.

## Out of scope

- Lesson content, data, sync, AI features.
- Practice and the problem workspace (plans 0086, 0087), and Review, profile and settings (plan 0089).

## Steps

- [ ] **0. Load the UI skills first (required):** `ux-audit`, `viewports`, `page-patterns`, `spacing`, `typography`,
  `colour-palette`, `anti-slop`, `surfaces`, `empty-states`, `loaders`, `motion`, `reduced-motion`, `frontend-design`,
  `ui-review`. Antigravity: `.agents/skills/`. Record them in Implementation notes.
- [ ] **1. Today** (Dashboard pattern):
  - Header: "Week N of 16 · <weekday, date>", the title "Three things today" (the count is real), and a pill search on
    the right on desktop.
  - Hero card on `primary-container`:
    - A scalloped ring showing tasks done (1/3).
    - Kicker "Today's plan" and a one-line message with the time left.
    - "Start focus · 25 min" (primary) and "See the week" (tonal).
    - On desktop, the streak in a `Scallop` on `reward-soft`.
  - Stat cards in the auto-fill grid:
    - Level card with a `WavyProgress` XP bar and "N XP to level M".
    - "This week" mini bar chart by day, with today in `primary`.
    - "Due for review" card with its count and a "Review now" tonal button.
  - "Up next" rows: check circle, `SubjectShape`, title, meta, then an "Open" outline button or a "+N XP" chip when
    done. Done rows are struck through in muted.
  - Phone: the stat cards are hidden and a "Focus" FAB (`reward-soft`, bottom right, above the nav bar) appears.
  - Done when: it matches the Today boards in light and dark at 1280 and 390 px.
- [ ] **2. Learn hub:**
  - A "Pick up where you left off" card on `primary`, with a big play tile.
  - Course cards in the auto-fill grid (min 260 px), each in its subject tone: icon shape, name, blurb, progress, and
    "x of y · next: …".
  - The course library (plan 0081) as a horizontal row of cards with Download or Open.
- [ ] **3. Course page:**
  - Remove the 960 px cap (`PageMain` width option or a page-level override) so it uses the content width, up to about
    1240 px.
  - A teal hero in the subject tone, then About / Learn / Projects tabs.
  - A vertical path stepper of sections: done, current (with Continue) and not started.
  - Rows inside a section can use the full width.
  - Done when: at 1440 px the course content is not a narrow column, and at 390 px it reads in one column.
- [ ] **4. Lesson page** (Detail pattern, three columns):
  - **Left:** the lesson list for the course (240 px), with done dots and the current lesson highlighted. Hidden below
    about 900 px of page width, and reachable from a "Lessons" button in the breadcrumb bar.
  - **Middle:** the article in a `max-w-[70ch]` column on a `surface` card:
    - kicker "Section · 15 min", title, lead paragraph
    - h2 sections and tip callouts (on `primary-soft` with a shape icon)
    - at the end, "Mark as learned · +20 XP" (primary) and "Next: …" (tonal)
  - **Right:** the "On this page" outline (220 px), sticky, with the current section marked and "Ask AI about this
    lesson" at the bottom. Hidden below about 1180 px of page width, and reachable from an "Outline" button instead.
  - Side panels use container queries on `<main>`, not viewport media queries.
  - Phone: a back bar with progress, the outline behind a button, and Ask AI / Mark learned sticky at the bottom above
    the nav bar.
  - Done when: at 1440, 1280, 1100, 900 and 390 px the article column never drops under about 60ch on desktop, and
    nothing overlaps.
- [ ] **5. LLD project page:**
  - Breadcrumb pill.
  - Hero in the LLD tone: "Project n of 24 · about 45 min", title, one-line brief, and a big "Write your classes" button
    ("Opens the full-screen editor").
  - Segmented tabs: Walkthrough, Diagrams, Reference, Edge cases, Your turn.
  - Four numbered step cards in the auto-fill grid (min 200 px).
  - A reference answer card with file chips and "Reveal after you try".
- [ ] **6. Your classes editor** (`project-editor.tsx`, full screen from 0084):
  - Restyle to the board: top bar with back, title, reference buttons and Run; file tree pane; editor pane with tabs;
    output pane.
  - Responsive: under about 1100 px of window width the reference drawer **floats over** the editor (absolute, right
    side) instead of pushing it. Under about 820 px the file tree collapses behind a "Files" button.
  - Behaviour does not change.
  - Done when: at 1000 px, opening Requirements leaves the editor at full width under the drawer.
- [ ] **7. System design walkthrough:**
  - A purple hero with "Design n of 27 · 45-minute interview" and the title.
  - Stepper pills for the seven steps (done, current, not started).
  - Step content, then the diagram drawn with the theme's tokens.
  - Trade-off and numbers cards in the auto-fill grid (min 300 px).
  - The Java snippet in a fold-out, and "Next step" plus "Draw it in Diagrams" links.
  - Check that Mermaid renders and doesn't show raw text.
- [ ] **8. Reading list:**
  - Filter chips (This week, Books, Papers, Posts, Read).
  - Cards in the auto-fill grid (min 240 px): a cover block in the subject tone with a type pill, title, "With <topic> ·
    N min", and Open (outline) plus Mark read (tonal; becomes filled "Read" when done). Read cards fade to 75% opacity.
- [ ] **9. Diagrams:**
  - Header with "Add a diagram".
  - A dashed drop and paste area, "PNG or JPG up to 5 MB".
  - Cards in the auto-fill grid (min 240 px): thumbnail in the subject tone, name, subject pill and age.
  - Keep upload and serving as they are (`api/diagrams/[id]`).
- [ ] **10. Tests.** Update the render or snapshot tests for these pages only where markup changed. Add a test that the
  Course page no longer sets the 960 px cap, and one that the lesson page renders the outline and the lesson list with
  the container-query classes. Keep `skeletons.test.ts` and `no-emoji.test.ts` passing.
- [ ] **11. Check by eye.** Use a copy of the data. Screenshot every page in this plan at 375, 768, 1024, 1280 and 1440
  px, in light and dark. Run `ux-audit` and `viewports`, and write the results in Implementation notes.

## Acceptance criteria

- [ ] Today, Learn hub, Course, Lesson, LLD project, Your classes, SD walkthrough, Reading and Diagrams match their
      boards in light and dark.
- [ ] Course pages use the content width; lesson side panels hide or open from buttons on narrow windows instead of
      squeezing the article.
- [ ] In Your classes the reference drawer floats over the editor on narrow windows.
- [ ] Mermaid diagrams render.
- [ ] No sideways scroll and no overlaps from 375 to 1440 px.
- [ ] `pnpm check` passes.

## Open questions

(none yet)

## Implementation notes

(implementer fills in)

## Review

(reviewer fills in)
