# Wave 2 round B, C9: switch group C (revise, reading, review, stats, profile)

## Files changed (all owned by C9)

- `apps/web/lib/revise.ts`: reads study areas, concepts, patterns, DSA groups, roadmap problems through `lookups`; recap and LLD patterns through `getLessonFacts()` (lesson pages, see deviations); quiz deck through `docValue("quiz-deck")`. New exports: `docValue(kind, fallback)`, `getLessonFacts()`, `quizCardsFor(area, onlyItems)`. `ReviseExercise` gained `lldPatterns: string[] | null`.
- `apps/web/lib/reading.ts`: built-in list from doc `reading`; study-item checks from `getAllConcepts` / `getAllExercises`; `readingFor` filtered inline.
- `apps/web/lib/review.ts`: `getRoadmapProblems`, `getStudyAreas`; `problemTitle` takes the roadmap map.
- `apps/web/lib/stats.ts`: `getStats()` (still async, same return shape) reads concepts, exercises and roadmap problems from `lookups`.
- `apps/web/lib/timer.ts`: `isTimerItem` is now async (concepts, exercises, patterns from `lookups`). `logFocus` awaits it.
- `apps/web/app/revise/page.tsx`: plan, DSA, area, numbers and quiz tabs read docs and `getStudyAreas()`; `NumbersTab` is async.
- `apps/web/app/revise/pattern-map/pattern-map.tsx`: async `PatternMapTab`; `loadContent()` reads the thinking-map docs and roadmap problems and passes them as props to `ReadView`, `ThinkView`, `GroupsSection`, `RecallSection`.
- `apps/web/app/revise/pattern-map/think-view.tsx`: takes `hints`, `signals`, `patterns`, `tags`, `problems` as props (no constant imports).
- `apps/web/app/revise/pattern-map/lib.ts`: `problemLink(ref, problems)`, `thinkPatternData(p, problems)` take the roadmap map.
- `apps/web/app/revise/pattern-map/read-view.tsx`: new `problems` prop.
- `apps/web/app/review/page.tsx`: `getStudyAreas()` for the concept points.
- `apps/web/app/profile/page.tsx`: `getAllConcepts()` for the covered count.
- `apps/web/app/study/reading/page.tsx`: `getAllConcepts()` / `getAllExercises()` passed into `itemLink`.
- Not changed: `app/components/section-scrubber.tsx` (its `READING` is a local regex, not a content import), `review-card.tsx`, `review/week/page.tsx`, `revise/print-button.tsx`, `profile/*` other than `page.tsx`.

## Tests

Mocks: `@/lib/content-repo/lookups`, `@/lib/content-repo/docs` (kinds mapped to the old constants, id "main") and `@/lib/content-repo/courses` (`listCourses` → `[]`, `getLesson` → `null`).

- `pnpm exec vitest run apps/web/app/revise/pattern-map/pattern-map.test.ts apps/web/lib/stats.test.ts apps/web/lib/practice-tools.test.ts apps/web/lib/weekly.test.ts`: 4 files, 38 tests, all pass.
- `cd apps/web && npx tsc --noEmit`: no errors in my files. 4 errors remain in other agents' files: `app/admin/study/page.tsx` (1), `lib/ai/context.ts` (3).
- `pnpm lint`: exit 0, no findings.

Test files changed:
- `app/revise/pattern-map/pattern-map.test.ts` (mine): new signatures (`problemLink`, `thinkPatternData`, `ReadView` `problems`, `ThinkView` props). Tests still import the old constants as fixtures.
- `lib/stats.test.ts` (mine): mocks added.
- `lib/practice-tools.test.ts` and `lib/weekly.test.ts` (NOT mine, mocks added): both reach my libs, and `weekly.test.ts` failed with "cacheTag() is only available with the cacheComponents config" once my libs read the repo. Mocks added to both, same block as `stats.test.ts`. Please check that the owners of these two files are fine with it.

## Deviations

- Recap and LLD patterns: `LESSON_EXTRA`, `WALKTHROUGH_EXTRA`, `LLD_EXTRA`, `LLD_GUIDES` and `PATTERN_GUIDES` are not single docs. They live in lesson pages, so `getLessonFacts()` reads every non-problem lesson through `listCourses()` and `getLesson()` and maps each by lesson id (the same ids those constants were keyed by; checked in `lib/content-db/seed.ts`). Each `getLesson` is cached, but `getReviseAreas`, `getRevisePatterns` and so `getWeakSpots` call it again per request. A single listing read would be cheaper later.
- `quizCards` (shared `revise.ts`) and `readingFor` (shared `reading.ts`) read their constants internally. Pages and libs no longer call them: `quizCardsFor` and an inline filter do the same job on DB data. The shared helpers still exist and still read the constants (see questions).
- `ReviseExercise` has a new field `lldPatterns`, used by the LLD card in the revise page.
- Tests in `practice-tools.test.ts` and `weekly.test.ts` quick-revise and reading checks still pass with courses mocked to empty, so recap text is not asserted there.

## Callers outside my files

No caller needs a change for these functions:
- `isTimerItem` is only used in `lib/timer.ts`.
- `getStats`, `getReviewQueue`, `splitReviewQueue`, `applySkips`, `getReviseAreas`, `getRevisePatterns`, `getWeakSpots`, `weakConceptIds`, `getCountdown`, `getReadingFor`, `getReadingList` keep their names and return shapes.
- `lib/weekly.ts` (`getWeakSpots`) and `app/today/data.ts`, `app/section-tabs.tsx`, `app/page.tsx` (`getReviewQueue`) are unchanged.
- `lib/review.ts` still calls `getStudyView` from `lib/study.ts` (C8's file); its signature is unchanged.

## Constants left in my files

- `READING_KINDS` (`app/study/reading/page.tsx`): a label map for reading kinds in shared `reading.ts`. Kept as a UI label map, not content.
- `weekFocus` (`app/study/reading/page.tsx`): shared `focus.ts` reads `WEEK_FOCUS` internally. This is content (per-week sd/lld ids), and the page still reaches it through the shared helper. Needs a DB-backed version or a parameter. Not in my files.
- `CATEGORIES` (`lib/stats.ts`): plan category targets, not in the content list. Kept.
- Shared `quizCards` and `readingFor` still exist and still read `QUIZ_DECK` and `READING`. My files no longer call them.

## Questions for the lead

1. `weekFocus` in `packages/shared/src/focus.ts` reads `WEEK_FOCUS`. Should that become a doc (for example `week-focus`) with the reading page reading it, or does C8 own the focus data?
2. Delete or parameterise shared `quizCards` and `readingFor` (no caller left in my files)?
3. Keep `READING_KINDS` as a label map, or move it into the page?
4. Is a single lesson-list read worth adding to the repo for `getLessonFacts()`, since it reads all lesson pages on each revise request (cached)?
