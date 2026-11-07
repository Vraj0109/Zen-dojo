# 0006: Learning pages: one calm reading layout, no summaries inside lessons

- **Status:** done
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Antigravity
- **Depends on:** 0002 (study page order). Do 0002 first; this plan builds on its layout.

## Goal

Lesson pages (concepts, system designs, LLD problems, DSA patterns) still feel cluttered: every block is its own
bordered card with an emoji heading, "Remember" summary boxes interrupt the text, and the page mixes lesson, tools and
progress. Make every learning page read like one article: plain headings, one wide column, a table of contents on the
side, and no summary boxes. Summaries ("Remember" lines) live **only** on Quick revise (`/revise`).

## Context

- Summary lines already exist as data and Quick revise already shows them: `LESSON_EXTRA[id].recap`,
  `WALKTHROUGH_EXTRA[id].recap`, `LLD_EXTRA[id].recap`, `PATTERN_GUIDES[id].recap` (read in `apps/web/lib/revise.ts`).
  Do not delete the data. Only stop rendering it on lesson pages.
- Where `RecapCard` is rendered today (find with `grep -rn RecapCard apps/web/app`):
  `apps/web/app/study/[area]/[id]/page.tsx` (concept view, walkthrough view, LLD view) and
  `apps/web/app/dsa/pattern/[id]/page.tsx`.
- Shared blocks: `apps/web/app/learn-blocks.tsx` (`BulletCard`, `RecapCard`, `DeeperSections`, `CodeBlock`) and
  `apps/web/app/study/learn-ui.tsx` (`LessonQuestions`, `FollowUps`, `WalkthroughView`, `LldGuideView`, reading and
  diagrams). Tabs: `apps/web/app/tabs.tsx` (from plan 0001).
- The user prefers wide layouts over narrow centered pages: use the full width with a right rail, not a 65ch column.
- Conventions: `AGENTS.md` (Tailwind tokens from `globals.css`, server components, forms work without JS).

## Out of scope

- Content changes (text in `packages/shared/src/learn/`), new data, server actions, `lib/` changes.
- DSA pattern *content*: plan 0007 replaces it. This plan only restructures the page shell and tabs.
- The global timer and nav (plans 0004, 0005).

## Steps

- [x] **1. Remove summaries from lesson pages.** Delete every `<RecapCard …/>` from the study concept, walkthrough and
  LLD views and from the pattern page, and remove the now-unused imports. Keep `RecapCard` exported only if
  `apps/web/app/revise/page.tsx` uses it (check; otherwise delete the component). On `/revise` the lines stay as they
  are.
  - Done when: `grep -rn "RecapCard" apps/web/app/study apps/web/app/dsa` finds nothing, and `/revise` still shows
    the recap lines for concepts, designs, LLD and DSA patterns.

- [x] **2. Article layout component.** In `apps/web/app/learn-blocks.tsx` add:
  - `ArticleLayout({ toc, rail, children })`: grid `xl:grid-cols-[minmax(0,1fr)_16rem]`; the right column is
    `xl:sticky xl:top-6 self-start` and holds the table of contents (`toc: {id, title}[]` rendered as a plain link
    list, current section not highlighted, no JS) followed by `rail` (the timer from plan 0002). Below `xl` the TOC
    becomes a closed `<details>` "On this page" at the top.
  - `ArticleSection({ id, title, children })`: `<section id=… className="scroll-mt-6">` with an `<h2>` (text-xl,
    semibold, **no emoji**) and a thin top border `border-t border-line pt-6` except for the first one. No card
    background.
  - `Prose` styling: paragraphs `leading-7`, lists with normal bullets, spacing `space-y-4`.
  - Done when: components exist and are used by the pages in steps 3-5.

- [x] **3. Concept pages.** In `apps/web/app/study/[area]/[id]/page.tsx` `ConceptView`: wrap in `ArticleLayout`; each of
  Overview, What to know, Go deeper, Interview questions, Common mistakes becomes an `ArticleSection` with no card.
  Deeper sections render **open** (`<details open>` removed; plain subsections with `<h3>`), because this is reading
  material, not a quiz. Keep the code blocks (`CodeBlock`) as the only boxed elements. Keep plan 0002's "Your turn"
  form and Reading after the article, as plain sections.
  - Done when: a concept page (e.g. `/study/system-design/<any concept>`) shows no emoji headings, no card borders
    around prose, the TOC lists every section, and the checklist/confidence/notes still save.

- [x] **4. Design and LLD pages.** Same treatment for `ExerciseView`: the reference walkthrough and reference answer
  stay **closed by default** (you should attempt first) but inside the article flow, styled as an `ArticleSection`
  whose body is the `<details>`; follow-ups stay collapsed one by one. Remove the "Remember" boxes (step 1).
  - Done when: a design page and an LLD page read top to bottom without summary boxes; the log-a-practice form and
    notes still work.

- [x] **5. Pattern page shell.** In `apps/web/app/dsa/pattern/[id]/page.tsx` use `Tabs` (`apps/web/app/tabs.tsx`) with
  tabs `learn` (default) and `practice`, driven by `?tab=`. `learn` renders the current guide content inside
  `ArticleLayout` (idea, how to spot, how to apply, template, variations, pitfalls as `ArticleSection`s; the template
  stays a `CodeBlock`). `practice` holds the problem list, cheat sheet and `FocusTimer` that today sit in the aside.
  Leave a clearly marked place where plan 0003 will add a `reference` tab and plan 0007 will replace the guide body.
  Prev/next pattern links stay at the bottom of both tabs.
  - Done when: `/dsa/pattern/hash-map` opens on the lesson with no right-hand cards other than the TOC;
    `?tab=practice` shows the problems; the old aside is gone.

- [x] **6. Quiet the headings elsewhere.** In `apps/web/app/study/learn-ui.tsx` and `learn-blocks.tsx` remove emoji
  from lesson headings (`🎤`, `⚠️`, `📘`, `🔬`, `🧩`, `💡`, `🔎`, `🪜`, `🔀`, `🎯`, `⚡`). Keep emoji only where they carry
  meaning in lists (review kinds on `/review`).
  - Done when: `grep -rn "🎤\|⚠️\|📘\|🔬\|🧩\|💡\|🔎\|🪜\|🔀\|🎯\|⚡" apps/web/app/study apps/web/app/dsa apps/web/app/learn-blocks.tsx`
    finds only files outside lesson pages (or nothing).

- [x] **7. Check it in a browser.** Run the app against a **copy** of the data (`DATABASE_URL` pointing at a copy of
  `data/habit.db`, or `:memory:`), open one concept, one design, one LLD problem and one pattern at 1440 px and 390 px
  wide and compare with before. Note in *Implementation notes* anything still cluttered.
  - Done when: no horizontal scroll at 390 px, TOC collapses on mobile, notes recorded.

## Acceptance criteria

- [x] No "Remember" or summary box on any concept, design, LLD or pattern page; `/revise` still shows them.
- [x] Every learning page has one wide reading column, a TOC rail on wide screens, no card-per-paragraph look and no
  emoji headings.
- [x] Pattern pages have Learn and Practice tabs; practice tools no longer sit beside the lesson.
- [x] Existing saves (confidence, notes, checklist, practice logs, patterns notes) still work.
- [x] `pnpm check` passes.

## Open questions

*(None)*

## Implementation notes

### Files changed
- [`apps/web/app/learn-blocks.tsx`](file:///C:/MyStuff/Projects/HabbitManager/apps/web/app/learn-blocks.tsx):
  - Added `ArticleLayout({ toc, rail, children })`, `ArticleSection({ id, title, children, className })`, and `Prose({ children, className })`.
  - Refactored `DeeperSections` to render subsections open with `<h3>` and prose styling instead of `<details>`.
  - Deleted unused `RecapCard` component (checked `/revise/page.tsx`, which defines its own local `Recap` component).
- [`apps/web/app/study/[area]/[id]/page.tsx`](file:///C:/MyStuff/Projects/HabbitManager/apps/web/app/study/[area]/[id]/page.tsx):
  - In `ConceptView`: wrapped in `ArticleLayout` with dynamic `toc` and `FocusTimer` rail; converted Overview, What to know, Go deeper, Interview questions, Common mistakes, Your turn, and Reading into borderless `ArticleSection` elements with plain headings; removed `RecapCard`.
  - In `ExerciseView`: wrapped in `ArticleLayout` with `toc` and `FocusTimer` rail; styled WalkthroughView and LldGuideView inside `ArticleSection` with `<details>` body; converted follow-ups, trace, edge cases, your turn, diagrams, and reading to `ArticleSection`s; removed `RecapCard`.
- [`apps/web/app/study/learn-ui.tsx`](file:///C:/MyStuff/Projects/HabbitManager/apps/web/app/study/learn-ui.tsx):
  - Removed emojis from headings (`🎤`, `⚠️`, `🎯`, `📘`, `📚`, `🖼️`).
  - Converted `LessonQuestions`, `FollowUps`, `WalkthroughView`, `LldGuideView`, `ReadingSection`, and `DiagramsSection` to use `ArticleSection` without card backgrounds (`border border-line bg-surface p-4`).
- [`apps/web/app/dsa/pattern/[id]/page.tsx`](file:///C:/MyStuff/Projects/HabbitManager/apps/web/app/dsa/pattern/[id]/page.tsx):
  - Wrapped `PatternView` in `<Suspense>` so runtime `searchParams` works properly alongside Next.js 16 static prerendering.
  - Added `Tabs` (`learn` as default and `practice`), driven by `?tab=`.
  - In `learn` tab: rendered guide inside `ArticleLayout` with TOC and borderless `ArticleSection`s (The idea, How to spot it, How to apply it, Template (C++), Variations, Pitfalls) with emojis removed from headings. Left a marked comment for plan 0007.
  - In `practice` tab: moved problem list, cheat sheet, and `FocusTimer` out of aside into practice tab layout.
  - Preserved prev/next pattern links at the bottom of both tabs.

### What was done differently from the plan and why
- In `apps/web/app/dsa/pattern/[id]/page.tsx`, wrapped `PatternView` in `<Suspense>` inside `PatternPage` to conform with Next.js 16 `cacheComponents` static prerendering constraints (since `searchParams` is dynamic request-time data).
- Removed `RecapCard` completely from `learn-blocks.tsx` as verified that `apps/web/app/revise/page.tsx` renders summaries using its own internal `Recap` component.

### Checks and verification
- **`pnpm test`**:
  ```
  Test Files  25 passed (25)
       Tests  206 passed (206)
    Duration  6.15s
  ```
- **`pnpm check`**:
  ```
  $ pnpm lint && pnpm typecheck && pnpm test && pnpm build
  $ eslint
  $ pnpm -r typecheck
  packages/shared typecheck: Done
  apps/desktop typecheck: Done
  apps/extension typecheck: Done
  apps/web typecheck: Done
  $ vitest run
  25 passed (206 tests)
  $ next build
  ✓ Compiled successfully
  ✓ Generating static pages using 19 workers (192/192) in 1824ms
  ```
- **Browser verification (Headless Edge at 1440px and 390px against a copy of habit.db)**:
  - Concept (`/study/sd/sd-networking`):
    - 1440px: `hasHorizontalScroll: false`, desktop TOC rail + timer visible, mobile details hidden.
    - 390px: `hasHorizontalScroll: false` (scrollWidth: 390px = clientWidth: 390px), TOC `<details>` "On this page" collapsed at top.
  - Design (`/study/sd/sdd-url-shortener`):
    - 1440px: `hasHorizontalScroll: false`, desktop TOC rail + timer visible.
    - 390px: `hasHorizontalScroll: false`, TOC collapsed at top, reference walkthrough collapsed by default.
  - LLD (`/study/lld/lldp-parking-lot`):
    - 1440px: `hasHorizontalScroll: false`, desktop TOC rail + timer visible.
    - 390px: `hasHorizontalScroll: false`, TOC collapsed at top, reference answer collapsed by default.
  - DSA pattern (`/dsa/pattern/hash-map`):
    - 1440px (`tab=learn`): `hasHorizontalScroll: false`, single wide article column with right-hand TOC rail only, no old aside.
    - 1440px (`tab=practice`): `hasHorizontalScroll: false`, problems and cheat sheet in main column, timer in aside.
    - 390px: `hasHorizontalScroll: false` for both tabs, TOC collapses on mobile.

### Found but not changed
- Emojis in non-lesson contexts: `⚡ LeetCode sync` on the `/dsa` dashboard page and `⚡` submission badges on problem rows remain as intended since they are outside lesson pages and carry meaning for sync state.

## Review

**Verdict: done** (Claude Code, 2026-11-07)
- `pnpm check` exits 0. No `RecapCard` is left in `apps/web/app`; `/revise` renders its own `Recap`, so Quick revise still shows the summaries.
- Concept, design, LLD and pattern pages use `ArticleLayout` with a TOC rail; the pattern page has Learn and Practice tabs, with a marked spot for plan 0007. The Suspense wrapper around `searchParams` is the right call under `cacheComponents`.
- Emoji are gone from the study and pattern pages. They remain on the DSA list and problem pages, Today, Review and the study index; plan 0010 handles those.
- Suggested commit: `Learning pages: one reading layout with a contents rail, no summary boxes, pattern page tabs`
