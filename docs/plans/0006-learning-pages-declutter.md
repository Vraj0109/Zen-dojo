# 0006: Learning pages: one calm reading layout, no summaries inside lessons

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:**
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

- [ ] **1. Remove summaries from lesson pages.** Delete every `<RecapCard …/>` from the study concept, walkthrough and
  LLD views and from the pattern page, and remove the now-unused imports. Keep `RecapCard` exported only if
  `apps/web/app/revise/page.tsx` uses it (check; otherwise delete the component). On `/revise` the lines stay as they
  are.
  - Done when: `grep -rn "RecapCard" apps/web/app/study apps/web/app/dsa` finds nothing, and `/revise` still shows
    the recap lines for concepts, designs, LLD and DSA patterns.

- [ ] **2. Article layout component.** In `apps/web/app/learn-blocks.tsx` add:
  - `ArticleLayout({ toc, rail, children })`: grid `xl:grid-cols-[minmax(0,1fr)_16rem]`; the right column is
    `xl:sticky xl:top-6 self-start` and holds the table of contents (`toc: {id, title}[]` rendered as a plain link
    list, current section not highlighted, no JS) followed by `rail` (the timer from plan 0002). Below `xl` the TOC
    becomes a closed `<details>` "On this page" at the top.
  - `ArticleSection({ id, title, children })`: `<section id=… className="scroll-mt-6">` with an `<h2>` (text-xl,
    semibold, **no emoji**) and a thin top border `border-t border-line pt-6` except for the first one. No card
    background.
  - `Prose` styling: paragraphs `leading-7`, lists with normal bullets, spacing `space-y-4`.
  - Done when: components exist and are used by the pages in steps 3-5.

- [ ] **3. Concept pages.** In `apps/web/app/study/[area]/[id]/page.tsx` `ConceptView`: wrap in `ArticleLayout`; each of
  Overview, What to know, Go deeper, Interview questions, Common mistakes becomes an `ArticleSection` with no card.
  Deeper sections render **open** (`<details open>` removed; plain subsections with `<h3>`), because this is reading
  material, not a quiz. Keep the code blocks (`CodeBlock`) as the only boxed elements. Keep plan 0002's "Your turn"
  form and Reading after the article, as plain sections.
  - Done when: a concept page (e.g. `/study/system-design/<any concept>`) shows no emoji headings, no card borders
    around prose, the TOC lists every section, and the checklist/confidence/notes still save.

- [ ] **4. Design and LLD pages.** Same treatment for `ExerciseView`: the reference walkthrough and reference answer
  stay **closed by default** (you should attempt first) but inside the article flow, styled as an `ArticleSection`
  whose body is the `<details>`; follow-ups stay collapsed one by one. Remove the "Remember" boxes (step 1).
  - Done when: a design page and an LLD page read top to bottom without summary boxes; the log-a-practice form and
    notes still work.

- [ ] **5. Pattern page shell.** In `apps/web/app/dsa/pattern/[id]/page.tsx` use `Tabs` (`apps/web/app/tabs.tsx`) with
  tabs `learn` (default) and `practice`, driven by `?tab=`. `learn` renders the current guide content inside
  `ArticleLayout` (idea, how to spot, how to apply, template, variations, pitfalls as `ArticleSection`s; the template
  stays a `CodeBlock`). `practice` holds the problem list, cheat sheet and `FocusTimer` that today sit in the aside.
  Leave a clearly marked place where plan 0003 will add a `reference` tab and plan 0007 will replace the guide body.
  Prev/next pattern links stay at the bottom of both tabs.
  - Done when: `/dsa/pattern/hash-map` opens on the lesson with no right-hand cards other than the TOC;
    `?tab=practice` shows the problems; the old aside is gone.

- [ ] **6. Quiet the headings elsewhere.** In `apps/web/app/study/learn-ui.tsx` and `learn-blocks.tsx` remove emoji
  from lesson headings (`🎤`, `⚠️`, `📘`, `🔬`, `🧩`, `💡`, `🔎`, `🪜`, `🔀`, `🎯`, `⚡`). Keep emoji only where they carry
  meaning in lists (review kinds on `/review`).
  - Done when: `grep -rn "🎤\|⚠️\|📘\|🔬\|🧩\|💡\|🔎\|🪜\|🔀\|🎯\|⚡" apps/web/app/study apps/web/app/dsa apps/web/app/learn-blocks.tsx`
    finds only files outside lesson pages (or nothing).

- [ ] **7. Check it in a browser.** Run the app against a **copy** of the data (`DATABASE_URL` pointing at a copy of
  `data/habit.db`, or `:memory:`), open one concept, one design, one LLD problem and one pattern at 1440 px and 390 px
  wide and compare with before. Note in *Implementation notes* anything still cluttered.
  - Done when: no horizontal scroll at 390 px, TOC collapses on mobile, notes recorded.

## Acceptance criteria

- [ ] No "Remember" or summary box on any concept, design, LLD or pattern page; `/revise` still shows them.
- [ ] Every learning page has one wide reading column, a TOC rail on wide screens, no card-per-paragraph look and no
  emoji headings.
- [ ] Pattern pages have Learn and Practice tabs; practice tools no longer sit beside the lesson.
- [ ] Existing saves (confidence, notes, checklist, practice logs, patterns notes) still work.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

## Review
