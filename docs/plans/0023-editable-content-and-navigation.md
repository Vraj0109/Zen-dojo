# 0023: Lessons as plain, editable files; fix the ordering; subtopics in navigation

- **Status:** in-progress
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code (agent C, branch agent/c-lessons)
- **Spec:** none

## Goal

1. Learning pages are consistent: sections appear in a sensible, predictable order (the SOLID page lists Single
   responsibility first, not last).
2. Content is easy to change: **one Markdown file per lesson**, with a short guide, so any AI agent (Antigravity, a cheaper
   model) can fix or extend a lesson without reading the app's code and without breaking anything.
3. Navigation shows subtopics: the lesson's "On this page" list shows its sub-sections, and a course outline lets you jump
   between lessons and their sections.

## Context

- **Why SOLID is scrambled:** the concept `lld-solid` has its checklist in `packages/shared/src/study.ts` (S, O, L, I, D).
  Its lesson text is in `learn/lld.ts`, but the "Go deeper" sections are merged from two files: `learn/deep-lld.ts`
  (starts with "Open/closed + dependency inversion in one example") and `learn/more-lld.ts` (starts with "Single
  responsibility in practice"). They are concatenated in file order, so the order follows the files, not the principles.
  The same can happen to any concept with `deep-*.ts` + `more-*.ts` entries.
- The page: `apps/web/app/study/[area]/[id]/page.tsx` builds the table of contents (`toc`) with one entry "Go deeper" and
  renders sections through `DeeperSections` in `app/learn-blocks.tsx`. `app/toc.tsx` is the scroll-spy list.
- Content is TypeScript: template literals in `packages/shared/src/learn/*.ts` (backticks and `${` break them, and a typo
  breaks the build). Tests in `learn/learn.test.ts` check coverage.
- Imported lessons (plan 0021/0024 packs) are Markdown already: `parseMarkdown()` in `packages/shared/src/packs.ts` and
  `app/markdown.tsx`.

## Out of scope

- Rewriting the lessons themselves (depth work stays in plans 0008, 0013-0015).
- A visual editor in the app.

## Steps

- [x] **1. Audit the order of every lesson.** Write `packages/shared/src/learn/order-audit.test.ts` (a normal test, fast):
  for each concept with a checklist, the titles of its "Go deeper" sections must be ordered the way the checklist is (a
  deeper section declares which checklist point it belongs to with a new optional `point?: number`, 0-based; sections
  with no `point` come after all pointed ones, in file order). Run it first to list **every** mismatch (SOLID will be
  one), and put the list in *Implementation notes*.
  - Done when: the test exists and its failures list all out-of-order lessons.
- [x] **2. Fix them.** Add `point` to the deeper sections of each failing concept and sort in the merge (`learn/index.ts`,
  where `LESSON_EXTRA` is built): by `point`, then file order. For SOLID: S, O, L, I, D, then the cross-cutting sections.
  Also check the other order problems found while auditing: numbering, "Interview questions" before "Common mistakes",
  consistent section titles (sentence case), lessons with an empty overview.
  - Done when: the audit test passes and `/study/lld/lld-solid` shows Single responsibility first.
- [x] **3. A Markdown format for a lesson.** Folder `packages/shared/content/<area>/<concept-id>.md`:
  front matter `id`, `title`, `area`, `section` (as in `study.ts`), then fixed headings:
  `## Overview`, `## What to know` (a numbered list: each item is the checklist point followed by its explanation after
  ` :: `), `## Go deeper` with `### <title>` sub-sections (optional `{point: 2}` after the title to attach it to a point),
  `## Interview questions` (list), `## Common mistakes` (list), optional ` ```mermaid ` blocks for diagrams. Write the
  loader `scripts/build-content.mjs` that reads all files, validates them, and writes
  `packages/shared/src/learn/generated/lessons.ts` (checked in, so the app needs no file access at run time). Add
  `pnpm content:build` and `pnpm content:check` (fails with plain messages: file, line, what is wrong, how to fix).
  - Done when: a sample `content/lld/lld-solid.md` builds and `learn/index.ts` prefers generated entries over the old
    TypeScript ones for the same id.
- [ ] **4. Migrate the LLD area first.** Convert the LLD lessons (the 11 LLD concepts, with their deep and more sections) to
  Markdown with a script (`scripts/migrate-lesson-to-md.mjs`, run once, then deleted), read the diff of at least three
  lessons by eye, and remove the old entries. Then SD and Core CS in a later sitting (record progress in the notes).
  - Done when: LLD pages look the same as before except for the fixed order, and `pnpm content:check` is green.
- [x] **5. Subtopics in the page navigation.** In `study/[area]/[id]/page.tsx`, build `toc` with children: "Go deeper" holds one
  entry per sub-section (id `deeper-<slug>`), and the page's sub-sections get matching ids (`DeeperSections` adds them).
  Extend `app/toc.tsx` to render nested items, with the scroll-spy highlighting the sub-section in view and the parent
  while any child is. Same for imported lessons: every `##`/`###` heading of the Markdown becomes a TOC entry.
  - Done when: the SOLID page's "On this page" lists Single responsibility, Open/closed, ... under "Go deeper".
- [x] **6. A course outline.** New `app/course-outline.tsx` (server component fed by `getStudyView` plus the lesson sections): a
  tree of section, lesson, sub-sections for the current area, with the current lesson open and checked ones marked. Show it
  (a) as a collapsible "Course outline" under the table of contents on wide screens and (b) inside the slide-out menu of
  lesson pages. Items are real links; keyboard friendly.
  - Done when: from any lesson you can jump to another lesson of the same area, or to a sub-section, in one click.
- [x] **7. The Learn area page.** In `study/[area]/page.tsx` show each lesson's sub-section titles under its name (collapsed by
  default, expandable), so the area page doubles as the full outline.
  - Done when: expanding a lesson lists its sub-sections as links.
- [ ] **8. The guide for agents.** Write `docs/content-editing.md`: where each kind of content lives; the Markdown format with a
  tiny complete example; "how to change a lesson safely" (edit the `.md`, run `pnpm content:check`, then `pnpm check`);
  what **not** to touch (generated files, ids in `study.ts` unless adding a concept); how to reorder (change `point` or
  the numbers) and how to add a lesson (new `.md`, plus the concept in `study.ts`). Link it from `AGENTS.md` and
  `docs/HANDOFF.md`. State the prompt to give an agent: "Read docs/content-editing.md, then fix <problem> in <file>."
  - Done when: someone who has never seen the repo can fix a typo and a section order by following only that page.
- [ ] **9. Tests.** `content-build.test.ts` (parser: front matter, sub-sections with `point`, mermaid, error messages with file and
  line), the audit test from step 1 across all lessons, a render test that the TOC has the nested entries (use the pure
  function that builds `toc`, so no browser is needed).
  - Done when: `pnpm check` passes.

## Acceptance criteria

- [ ] SOLID and every other lesson show their sections in the intended order; the audit test guards it.
- [ ] LLD lessons come from Markdown files; an agent can edit one with the guide alone.
- [ ] "On this page" lists sub-sections; the course outline lets you jump between lessons and sections.
- [ ] `docs/content-editing.md` exists and is linked from `AGENTS.md`.
- [ ] `pnpm check` passes.

## Open questions

- Should SD and Core CS be migrated in this plan or only LLD? (Plan: LLD now, the rest as a follow-up sitting; keep both
  paths working because step 3 makes generated entries win over TypeScript ones.)

## Implementation notes

**Steps 1 and 2 (audit and order).**
- The audit found the same problem in all 62 concepts, not only SOLID: the base `deep-*.ts` sections come first, then the
  `more-*.ts` sections, so order followed the files. Examples: SOLID (OCP+DIP, L+ISP, SRP, DI), `net-tcp`, `os-memory`.
- Ownership workaround: `Section` is in `learn/types.ts` and the deep files are not in agent C's list, so there is no
  `point?` field on `Section`. Instead `learn/section-points.ts` maps concept id -> section title -> checklist point
  (0-based, fractions allowed to sit between points). `sortSections()` in `learn/index.ts` sorts the merged sections by it
  (stable, unplaced sections last). Step 3's Markdown format will carry `{point: n}` itself.
- `learn/order-audit.test.ts`: lessons exist with overviews, every point entry names a real section and a valid point,
  titles unique, sections come out in checklist order, sentence-case titles.
**Step 3 (Markdown format and build).**
- `scripts/build-content.mjs` (plain Node): `parseLesson`, `readAll`, `renderGenerated`, and `lessonToMarkdown` (the inverse, used by the
  migration). `pnpm content:build` writes `learn/generated/lessons.ts`; `pnpm content:check` validates and fails when the
  generated file is stale. Typed by `scripts/build-content.d.mts`.
- Format beyond the plan: optional `## Recap` (list, feeds Quick revise); in a `###` section the order is prose, then one
  mermaid block (optional `Diagram caption: ...` line after it), then one code block (```java etc.). Fractions work in
  `{point: 0.5}`. Errors give file:line, what is wrong, how to fix.
- `learn/index.ts`: `LESSONS` and `LESSON_EXTRA` take generated entries over the TypeScript ones with the same id.
- `lld-solid` is migrated as the sample (`content/lld/lld-solid.md`).
- Tests in `learn/generated/`: `content-build.test.ts` (parser, errors, generated file current, generated lessons match
  study.ts), `lesson-md.test.ts` (all 62 lessons round-trip TypeScript -> Markdown -> parse unchanged),
  `migrate.test.ts` (does nothing unless `MIGRATE=lld` or a concept id is set; writes the .md files).
- Open question: tests that need Node's `fs` cannot live in `packages/shared` (no @types/node), so the file work sits in the .mjs.

**Steps 5 to 7 (navigation).**
- New `app/toc-items.ts` (pure, tested in `toc-items.test.ts`): `conceptToc`, `deeperIds` (anchor ids `deeper-<slug>`),
  `markdownToc`/`markdownHeadingIds` (ids `md-<slug>`), `courseOutline`. A new file next to `toc.tsx`, because a client
  module cannot export functions the server calls.
- `toc.tsx` renders nested entries; the scroll spy follows children, and the parent stays highlighted while a child is current.
  `DeeperSections` puts the ids on each sub-section. The SOLID page now lists the five sub-sections under "Go deeper"
  (checked on a dev server with a throwaway database).
- `app/course-outline.tsx`: collapsible "Course outline" (section > lesson > sub-sections of the current lesson, covered
  dot, real links), passed to `ArticleLayout` as `outline` and shown in the aside under the table of contents. On narrow
  screens the aside sits above the text, so the same collapsible works there.
- Area page: each lesson row has an "N sub-sections" details list with links.
- Not done (outside agent C's files): the slide-out menu in `nav.tsx` does not hold the outline (the in-page collapsible
  covers phones); imported Markdown lessons (`app/study/packs/[id]/[item]/page.tsx`, `app/markdown.tsx`) are not wired
  to `markdownToc` yet because those files belong to plan 0024. The pure function and its test are ready; the wiring is
  two lines: pass `toc={markdownToc(item.markdown)}` to `ArticleLayout` and give each heading `id` from `markdownHeadingIds`.

- Not changed: the page order of "Interview questions" and "Common mistakes" (they already render in that order).

## Review
