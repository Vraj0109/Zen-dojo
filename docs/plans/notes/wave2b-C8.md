# Wave 2 round B, C8: switch group B (study areas, courses, lessons) to the content database

Agent C8 (Claude, Haiku). Plan 0114 step 5, group B. Files owned: `apps/web/app/study/[area]/**`,
`apps/web/app/study/diagrams/**`, `apps/web/app/course-outline.tsx`, `apps/web/lib/study.ts`, `apps/web/lib/courses.ts`,
`apps/web/lib/ai/lesson.ts`, `apps/web/lib/focus.ts`, `apps/web/lib/portfolio.ts`, and the tests next to them.

## Files changed

- `apps/web/lib/study.ts`: new exports `getLessonValue(id)` (a stored lesson in its learn/ shape, via `getLesson` +
  `lessonToShape`), `deeperTitlesFor(ids)` (go-deeper titles per concept), `readingMinutesOf(lesson, extra)` (the shared
  `readingMinutes` formula, given the lesson text), type guards `asConceptShape`, `asDesignShape`, `asLldShape` and the
  types `LessonShape`, `ConceptShape`, `DesignShape`, `LldShape`. Constants replaced: `ALL_CONCEPTS`, `ALL_EXERCISES`,
  `STUDY_AREAS`, `getStudyArea` now come from `lib/content-repo/lookups` (`await`). `getStudyView`, `getConceptDetail`,
  `saveConcept`, `rateConcept`, `getExerciseDetail`, `logPractice`, `getStudyDue` keep their signatures (they were already
  async).
- `apps/web/lib/courses.ts`: `getContinue` reads the concept and exercise lookups and the study areas (`await`).
- `apps/web/lib/focus.ts`: `getWeekFocus` reads `getAllConcepts`, `getAllExercises`, `getDsaGroups`. `patternHref` now takes
  the group map as a second argument: `patternHref(id, groupOf)`. Its only callers are in this file (checked by grep).
- `apps/web/lib/portfolio.ts`: `getPortfolio` reads `getStudyAreas` and `getAllConcepts`.
- `apps/web/lib/ai/lesson.ts`: `lessonSource(id)` is now `async` (returns a Promise). It reads the lookups and `getLesson`.
- `apps/web/app/course-outline.tsx`: go-deeper titles via `deeperTitlesFor`.
- `apps/web/app/study/[area]/page.tsx`: `generateStaticParams` and `generateMetadata` async; `ConceptRow` takes a `titles`
  prop (from `deeperTitlesFor`) instead of `LESSON_EXTRA`.
- `apps/web/app/study/[area]/[id]/page.tsx`: `generateStaticParams`, `generateMetadata`, `Item` read the lookups. `ConceptView`
  reads `getLessonValue(id)` in its `Promise.all`; `resolveLesson` gets the stored lesson as fallback. `ExerciseView` reads
  `getLessonValue(id)` and `getDoc("lld-project", id)` (LLD project files; the doc id is the lesson id). Reference material
  uses the exercise from `getExerciseDetail` instead of `ALL_EXERCISES[id]`.
- `apps/web/app/study/diagrams/page.tsx`: `Gallery` reads `getStudyAreas` and `getAllExercises` (after `connection()`).
- Tests: `apps/web/lib/study.test.ts`, `apps/web/lib/focus.test.ts`, `apps/web/lib/course-library.test.ts`,
  `apps/web/lib/ai/lesson.test.ts`. Each mocks `./content-repo/lookups` (and `courses`/`docs` where needed) to serve the old
  constants from `@habit/shared`. `lesson.test.ts` builds the lesson rows with `lessonFromFile` from the constants. Added
  one test in `study.test.ts`: `readingMinutesOf` equals `readingMinutes` for every concept.

## Test and check results

- `pnpm exec vitest run apps/web/lib/study.test.ts apps/web/lib/focus.test.ts apps/web/lib/course-library.test.ts apps/web/lib/ai/lesson.test.ts`: 4 files, 30 tests, all pass.
- `cd apps/web && npx tsc --noEmit`: no errors in my files. Remaining errors, all in other agents' files:
  - `app/admin/study/page.tsx(26)`: uses `lessonSource(id)` synchronously (AG8).
  - `lib/ai/context.ts(98)`: uses `lessonSource(...)` synchronously (AG7).
  - `lib/review.ts(63)`: `Record<string, Problem>` vs `{title, number}` (C9, from `getRoadmapProblems`).
  - `app/revise/pattern-map/pattern-map.tsx(65)`: type union (C9 or AG7 area).
- `pnpm lint`: exit 0 (no findings in the repo).
- Not run: `pnpm test`, `pnpm check`, `pnpm build` (as instructed). The pages were not rendered in a browser, and the
  rename-the-files manual check (0114 step 5) was not done.

## Deviations and why

- `lessonSource` became `async`. The lesson text is in the database now, so it cannot stay synchronous. There is no
  sync version: a sync function would need the constants. Callers must `await` it (see below).
- `patternHref` got a second argument (the group map), because the group map comes from the database.
- `ConceptRow` in the area page takes `titles` as a prop (the server component computes them with `deeperTitlesFor`).
- `readingMinutes` lives in `packages/shared/src/learn/index.ts` and reads the `LESSONS` constant. The page now uses
  `readingMinutesOf(lesson, extra)` (a copy of the formula in `lib/study.ts`), with a test that the two agree for every
  concept. The shared one should take the lesson as a parameter. That file is not mine (lead).
- The lesson page reads the stored lesson for the fallback of `resolveLesson`. When there is no stored lesson, `resolveLesson`
  falls back to the `LESSONS` import inside `lib/packs.ts` (AG7's file). That still reads a constant; see the list below.

## Callers outside my files that need wiring

1. `apps/web/lib/ai/context.ts` line 96-98 (AG7): `const src = await lessonSource(req.lessonId);`. Currently a type error.
2. `apps/web/app/admin/study/page.tsx` line 26 (AG8): `lessonSource(id)` inside a `map`. Needs an async map (`await Promise.all`).
3. `apps/web/lib/packs.ts` `resolveLesson(conceptId, fallback?)` (AG7): still imports `LESSONS` from `@habit/shared` when no
   fallback is given. After the switch the study pages always pass the stored lesson, so the import is only reached for ids
   without a stored lesson. Remove the import when AG7 wires the packs path.
4. Tests outside my files that call `lib/study.ts` or `lib/courses.ts` and now need the lookups mock or a seeded content DB
   (not run by me):
   - `apps/web/lib/backup.test.ts` (saveConcept, logPractice, getConceptDetail)
   - `apps/web/lib/practice-tools.test.ts` (saveConcept, logPractice, rateConcept, getConceptDetail)
   - `apps/web/lib/stats.test.ts` (logPractice, saveConcept)
   - `apps/web/lib/packs.test.ts`, `apps/web/lib/packs-v2.test.ts` (getCourses from `courses.ts`)
   - Tests of C9's files that call `getStudyView` or `getStudyDue` indirectly (for example `lib/review` tests, if any).
   Suggested fix: the same `vi.mock("./content-repo/lookups", ...)` block as in `lib/study.test.ts`, or a shared test helper.
5. `apps/web/lib/review.ts` (C9): `STUDY_AREAS.map((a) => getStudyView(a.id))` still uses the constant (C9 owns it).
6. `app/today/data.ts`: `cache(getWeekFocus)` keeps its signature, so no change is needed. `app/page.tsx` uses `taskLink`
   (sync, unchanged) and `getContinue` (unchanged signature).

## Constants left in my files

None in code. Remaining imports from `@habit/shared` are helpers and config, not content:
`studyHref`, `COVERED_CONFIDENCE`, `CONFIDENCE_LABELS`, `CONCEPT_XP`, `averageScore`, `conceptReviewDue`, `practiceState`,
`lessonToShape`, `toLocalDate`, `PLAN_WEEKS`, `TOTAL_WEEKS`, `weekFocus`, `parseWeekKey`, `packItems`.

## Questions for the lead

1. `PLAN_WEEKS` and `weekFocus` (shared `focus.ts`, `plan-weeks`) are plan structure, and `weekFocus` returns content ids
   (patterns, concept ids, design ids per week). I left them as shared helpers. Should the week-to-content mapping move
   into the content DB?
2. Should `readingMinutes` in shared take the lesson as a parameter (like `readingMinutesOf` here)? Then the copy in
   `lib/study.ts` can go.
3. `getLessonValue` returns the learn/ shape, so the pages keep their old renderers. The LLD project files come from
   `getDoc("lld-project", id)`, read in `ExerciseView`.
4. `generateStaticParams` in the study pages now awaits the lookups. Builds need a content DB (0114 step 6b).
