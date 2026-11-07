# 0002: Study pages: all the learning first, your notes and tools after

- **Status:** done
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Antigravity
- **Spec:** SPEC.md 7.3 (declutter), step 3
- **Depends on:** 0001 (uses `apps/web/app/tabs.tsx` only if you choose tabs in step 3; otherwise independent)

## Goal

On concept pages the reading is interrupted by your own tools: the overview and "Remember" box are followed by the
focus timer, then the checklist inside a form with confidence and notes, and only after that the deeper sections and
interview questions. Reorder every study page so you read top to bottom without interruptions, then reach the
"your turn" part: rate yourself, notes, reading list, diagrams.

## Context

Pattern borrowed: course sites (Coursera, AlgoMonster, Brilliant) and read-later apps (Readwise) put the lesson
first and the learner's actions (quiz, notes, highlights) after it.

Current order in `apps/web/app/study/[area]/[id]/page.tsx`:
- `ConceptView`: header (title, confidence dots, "≈ N min read") → Overview → `RecapCard` (Remember) →
  `FocusTimer` → `<form action={saveConceptAction}>` containing the "What to know" checklist (each point with a
  checkbox and its explanation), the confidence radio buttons, the notes textarea and Save → `DeeperSections` →
  `LessonQuestions` (interview questions + common mistakes) → `ReadingSection`.
- `ExerciseView` (designs and LLD problems): header → practice status → `FocusTimer` → "Log a practice" form →
  walkthrough / LLD reference answer → Remember + follow-ups (design) or flow + edge cases (LLD) → diagrams →
  reading → design notes form.
- The checklist checkboxes must keep posting with the confidence/notes form. HTML lets an input outside a `<form>`
  belong to it with the `form="<form id>"` attribute; use that so checkboxes can stay next to their explanations
  while the form element itself moves to the end.
- `saveConceptAction` in `apps/web/app/actions.ts` reads `point` (multiple), `confidence`, `notes`, `conceptId`;
  don't change it.

## Out of scope

- Content changes, new data, server actions or `lib/` changes.
- DSA pages (plan 0001) and the pattern guide (plan 0003).
- The global timer (plan 0005): keep `FocusTimer` on these pages, just move it as described.

## Steps

- [x] **1. Concept page order.** Rewrite `ConceptView`'s JSX order to:
  1. Header (unchanged), with the `FocusTimer` moved into a compact spot next to it: on `xl` screens a right-hand
     sticky column (`xl:grid-cols-[minmax(0,1fr)_18rem]`, aside `xl:sticky xl:top-6 self-start`); on smaller screens
     directly under the header. The aside holds only the timer (and nothing else).
  2. Overview.
  3. Remember (`RecapCard`).
  4. What to know: the checklist with explanations. Checkboxes keep `name="point"` and get `form="concept-form"`.
     Keep the hint line under the list.
  5. Go deeper (`DeeperSections`).
  6. Interview questions and common mistakes (`LessonQuestions`).
  7. A divider heading "Your turn", then the `<form id="concept-form" action={saveConceptAction}>` with the hidden
     `conceptId`, the confidence radios, notes textarea and Save button.
  8. Reading (`ReadingSection`).
  - Done when: reading the page top to bottom never shows a form or tool between lesson sections; ticking
    checkboxes, picking confidence and saving still persists all three (verify by reloading).

- [x] **2. Exercise page order.** Rewrite `ExerciseView` to:
  1. Header + practice status line (unchanged), timer placed as in step 1.
  2. One line of guidance: "Attempt it first (timer on), then compare with the reference." (designs) /
     "Write your classes first, then compare." (LLD).
  3. Reference walkthrough / LLD reference answer (still collapsed by default).
  4. Remember + follow-ups (design) or Remember + flow + edge cases (LLD).
  5. "Your turn" heading, then: Log a practice form, your notes/code form, diagrams, reading.
  - Done when: lesson material comes first, all forms and personal sections after; logging a practice and saving
    notes still work.

- [ ] **3. Optional: tabs for the "Your turn" part.** Only if the page still feels long after steps 1-2: put
  "Your turn" sections in tabs using `apps/web/app/tabs.tsx` from plan 0001 (`?tab=practice|notes|diagrams|reading`).
  Skip this step if 0001 isn't merged yet, and say so in Implementation notes.

- [x] **4. Check both page types in the browser.** Run the app against a copy of the database
  (`DATABASE_URL=file:<copy>`), open one concept from each area and one design and one LLD problem, and confirm
  the order, the sticky timer on a wide window, and that saving works.
  - Done when: noted in Implementation notes with the URLs you checked.

## Acceptance criteria

- [x] Concept pages: overview → remember → what to know → deeper → questions → your turn (rating, notes) → reading.
- [x] Design/LLD pages: guidance → reference → remember/follow-ups → your turn (practice log, notes, diagrams, reading).
- [x] The timer never sits between lesson sections; on wide screens it stays visible while scrolling.
- [x] Saving confidence, checked points and notes still works.
- [x] `pnpm check` passes.

## Open questions

(None)

## Implementation notes

### Files changed
- `apps/web/app/study/[area]/[id]/page.tsx`:
  - `StudyItemPage`: removed `narrow` from `PageMain` so wide layouts have sufficient room for the main reading area and the sticky 18rem aside.
  - `ConceptView`: restructured order:
    1. Header at top.
    2. Grid (`xl:grid-cols-[minmax(0,1fr)_18rem]`) with `aside` (`order-1 xl:order-2 xl:sticky xl:top-6 self-start`) containing only `FocusTimer`. On small screens it renders directly below the header.
    3. Main column (`order-2 xl:order-1`): Overview, RecapCard, What to know (with checkboxes keeping `name="point"` and using `form="concept-form"`), Go deeper, Interview questions & mistakes, "Your turn" heading followed by `<form id="concept-form" action={saveConceptAction}>` (confidence radios, notes textarea, Save button), and Reading.
  - `ExerciseView`: restructured order:
    1. Header and practice status line at top.
    2. Grid (`xl:grid-cols-[minmax(0,1fr)_18rem]`) with sticky `aside` containing only `FocusTimer`.
    3. Main column: one-line guidance, walkthrough / LLD reference answer, recap and follow-ups (design) or flow and edge cases (LLD), "Your turn" heading followed by log practice form, history sessions (if any), design notes form, diagrams, and reading.
  - Step 3 (optional tabs for "Your turn") was skipped: the linear layout keeps notes and diagrams directly accessible without extra clicks, and plan 0001 is awaiting review.

### Verified URLs
Tested against a copy of the database (`DATABASE_URL=file:<copy>`):
- Concept (System design): `/study/sd/sd-caching`
- Concept (LLD): `/study/lld/lld-solid`
- Concept (Core CS): `/study/core/core-processes-threads`
- Exercise (System design): `/study/sd/sdd-url-shortener`
- Exercise (LLD): `/study/lld/lldp-parking-lot`
Verified:
- Lesson reading is continuous with no tool or form interruptions between sections.
- `FocusTimer` sits on the right as a sticky sidebar on `xl` windows (`xl:sticky xl:top-6 self-start`) and directly below the header on smaller screens.
- Form submissions with `form="concept-form"` persist confidence, ticked points, and notes correctly.
- Practice log form submits and records sessions properly.

### Verification results
- `pnpm test`:
  ```
  Test Files  25 passed (25)
       Tests  206 passed (206)
    Duration  6.04s
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

**Verdict: done** (Claude Code, 2026-11-07)
- Read the diff of `apps/web/app/study/[area]/[id]/page.tsx` against every step and acceptance criterion. Concept order, exercise order, the sticky timer (`xl:sticky`, below the header on small screens) and the `form="concept-form"` checkboxes are all as planned. `saveConceptAction` and the `lib/` code are untouched, so scope is respected.
- `pnpm test` (206 passed) and `pnpm check` (exit 0) pass.
- Step 3 (optional tabs) was skipped with a reason in the notes. That is allowed.
- Not fixed here, left to later plans: the "Remember" boxes still sit inside the lesson, and the cards and emoji headings remain. Plan 0006 removes them.
- Suggested commit: `Study pages: lesson first, timer in a side column, rating and notes after the lesson`
