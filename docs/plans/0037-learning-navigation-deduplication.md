# 0037: Learning navigation deduplication

- **Status:** in-review
- **Planned by:** Claude Code & Antigravity, 2026-11-09
- **Implemented by:** Antigravity, 2026-11-09
- **Spec:** Study Page Reading Experience & Navigation Rails

## Goal

Deduplicate the dual navigation bars on study and lesson pages. Remove the redundant "Course outline" from the reading sidebar and keep "On this page" as the primary animated reading tracker, moving whole-course switching into the header breadcrumb.

## Context

On study lesson pages (such as `apps/web/app/study/[area]/[id]/page.tsx` for Low-Level Design, System Design, Core CS, and DSA patterns), `ArticleLayout` in `apps/web/app/learn-blocks.tsx` currently renders two competing navigation widgets in the right-hand aside column:
1. **"On this page" (`apps/web/app/toc.tsx`):** Displays the headings within the current lesson, dynamically tracking the reader's scroll position with a sliding accent indicator and smooth scrolling.
2. **"Course outline" (`apps/web/app/course-outline.tsx`):** A nested `<details>` accordion listing every single lesson and section in the entire topic area.

Having both stacked together causes:
- Visual clutter and competing hierarchy in the sidebar.
- Redundant heading links (the current lesson's subtopics appear in both widgets).
- Dual scrolling containers on smaller viewports.

The user explicitly requested:
> "why on the learning pages there is a index of on this page and course outline it should have only 1 of them and i think on this page is better one since it has all the good animations and navigation capabilities"

## Out of scope

- Removing the course outline capability entirely: users still need a way to navigate to the next or previous lesson without going back to the `/study` home page.
- Changing the problem workspace (`/dsa/[id]`), which has its own custom pane layout.

## Architecture and Design

### 1. Dedicated "On This Page" Aside
- In `apps/web/app/learn-blocks.tsx`:
  - `ArticleLayout` aside column will exclusively render the `Toc` component ("On this page") and any supplemental reference rail (e.g., interactive cheatsheets).
  - The `outline` prop on `ArticleLayout` is removed or made optional and deprecated.

### 2. Clean Course Navigation via Header Breadcrumbs
- In `apps/web/app/study/[area]/[id]/page.tsx`:
  - The top bar already features breadcrumbs: `Study / [Area Title] / [Lesson Title]`.
  - Transform the `[Area Title]` or `[Lesson Title]` breadcrumb into an accessible dropdown / quick-jump menu:
    - Clicking it opens a lightweight popover showing the course outline with progress indicators (covered vs unstudied).
    - Includes "Previous lesson" and "Next lesson" shortcut buttons at the bottom of the article.
  - This keeps the reading canvas clean and focused on reading comprehension, while retaining one-click navigation across the curriculum.

## Steps

- [x] **1. Clean up `ArticleLayout` aside in `apps/web/app/learn-blocks.tsx`.**
  - Remove `outline` from the aside DOM tree in `ArticleLayout`.
  - Ensure the sidebar gives full vertical room to the `Toc` component and its active scroll tracker.
  - Done when: Study pages show only "On this page" in the right-hand rail.

- [x] **2. Move course navigation to breadcrumb quick-picker in `apps/web/app/study/[area]/[id]/page.tsx`.**
  - Integrate a compact lesson jump menu in the page header breadcrumb.
  - Retain "Next lesson" and "Previous lesson" navigation buttons at the bottom footer of the lesson text.
  - Done when: Navigating between lessons remains seamless from the header and footer.

- [x] **3. Update responsive mobile view.**
  - On mobile (< 1280px), the sticky aside collapses into a single clean `<details>` drawer labeled "On this page" at the top of the content.
  - Done when: Mobile view is completely free of nested double accordions.

- [x] **4. Tests.**
  - Update `apps/web/app/toc-items.test.ts` and `apps/web/lib/study.test.ts`.
  - Verify that `ArticleLayout` renders cleanly without duplicate nav landmarks.
  - Done when: `pnpm test` passes.

## Acceptance criteria

- [x] Lesson pages show exactly ONE table of contents in the sidebar ("On this page" with smooth animations and scroll tracking).
- [x] No duplicate headings or redundant course trees on the reading canvas.
- [x] Users can still jump to adjacent or other lessons via header breadcrumb or footer links.
- [x] `pnpm check` passes with 0 errors.

## Open questions

- None. The design direction is unambiguous.

## Implementation notes

- Removed `outline` from the aside DOM tree in `ArticleLayout` (`apps/web/app/learn-blocks.tsx`). Deprecated the `outline` prop. The right-hand aside now dedicates its vertical height solely to `Toc` ("On this page") and its active position tracker/progressbar (plus optional rail widget).
- On mobile (< 1280px), `ArticleLayout` displays only the clean `<details>` drawer labeled "On this page", eliminating competing double accordions.
- Updated `CourseOutline` in `apps/web/app/course-outline.tsx` into a compact dropdown popover for the header breadcrumb. Displays course title, covered/total progress counts, section breakdown, lesson links with status dots, and practice exercises without duplicate subheadings.
- In `apps/web/app/study/[area]/[id]/page.tsx`, integrated the `CourseOutline` quick-picker into the breadcrumb (`Study / [Area] / [Lesson Title ▾]`) and added `LessonNav` footer buttons for adjacent "Previous lesson" and "Next lesson" navigation.
- Added verification test in `apps/web/app/toc-items.test.ts` to ensure `ArticleLayout` renders `Toc` without duplicate outline landmarks. Targeted test suites `toc-items.test.ts` and `study.test.ts` both pass cleanly.

## Review

(To be filled in by reviewer).
