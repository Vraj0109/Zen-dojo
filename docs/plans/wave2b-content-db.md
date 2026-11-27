# Wave 2 round B of "content in the database": six agents in parallel

Lead: Claude Code. Plans 0112 to 0119, overview `docs/architecture/content-in-db.md`. Read the review logs in
`docs/plans/wave1-content-db.md` and `docs/plans/wave2-content-db.md` first: they hold decisions already made.
Started 2026-11-23.

Round B makes the app use the database: every page reads content from it, the admin editor screens exist, and the web
offline copy and What's new work. After round B only round C is left: the AI button UI (0118 steps 3–4) and the cutover
(0117, deleting the files).

**Rule from the user: content comes only from the database.** After this round no page, action or API may import a
content constant from `@habit/shared` (`JUDGE_PROBLEMS`, `SOLUTIONS`, `BRUTE`, `INTERVIEW`, `LESSONS`, `STUDY_AREAS`,
`ALL_CONCEPTS`, `ALL_EXERCISES`, `PROBLEMS`, `DSA_GROUPS`, `ALL_PATTERNS`, `WALKTHROUGHS`, `LLD_*`, `PATTERN_*`,
`READING`, `QUIZ_DECK`, `CP_ALGO_ARTICLES`, `THINK_*`, …). Pure helpers and types from `@habit/shared` are fine.

## Ready for you (lead, done before this round)

- `apps/web/lib/content-repo/lookups.ts`: `getStudyAreas()`, `getStudyArea(id)`, `getAllConcepts()`,
  `getAllExercises()`, `getRoadmapProblems()`, `getDsaGroups()`, `getAllPatterns()`. They return **exactly** the old
  constants' shapes (proved by `lookups.test.ts` against a real seed), so `STUDY_AREAS` becomes `await getStudyAreas()`
  and nothing else changes.
- C5's repo (`lib/content-repo/`): `listProblemSummaries`, `getProblem`, `getProblemSpec`, `getSolutionPage`,
  `listCourses`, `getCourse`, `getLesson`, `listDocs(kind)`, `getDoc(kind, id)`; doc kinds are in `DOC_KINDS`
  (`content-model/lesson-map.ts`), for example `reading`, `quiz-deck`, `key-numbers`, `think-patterns`, `clues`,
  `cp-algorithms`, `lld-project`, `dsa-problems`, `dsa-groups`. `lessonToShape(lesson)` turns a lesson back into the old
  `Lesson`/`Walkthrough`/`LldGuide`/… value, so an old renderer keeps working.
- AG6's `apps/web/app/content-page.tsx`: renders any `ContentPage` (text, code tabs, diagrams, images).
- AG4's `lib/admin-content/write.ts` and `/api/admin/content/*`: save, delete, restore, with conflict checks and audit.

## Who does what

| Agent | Tool | Task | Plan steps | Owns |
|---|---|---|---|---|
| C7 | Claude (Haiku) | Sync hardening: full resync by epoch, round A leftovers | 0115 versioning rule 6, wave 2 log items | `apps/web/lib/content-db/meta.ts`, `migrations.ts` (append only), `apps/web/lib/content-repo/version.ts`, `apps/web/app/api/content/version/**`, `apps/web/lib/content-sync/**`, `scripts/content-snapshot.mjs`, `scripts/content-resync.mjs` (new), `packages/shared/src/content-model/parts.ts`, `notices.ts` and their tests, `apps/web/lib/admin-content/write.ts` (one `pruneChanges` call per write, nothing else) |
| C8 | Claude (Haiku) | Switch group B: study areas, courses, lessons | 0114 step 5 (group B) | `apps/web/app/study/[area]/**`, `apps/web/app/study/diagrams/**`, `apps/web/app/course-outline.tsx`, `apps/web/lib/study.ts`, `apps/web/lib/courses.ts`, `apps/web/lib/ai/lesson.ts`, `apps/web/lib/focus.ts`, `apps/web/lib/portfolio.ts`, and the tests next to them |
| C9 | Claude (Haiku) | Switch group C: revise, reading, review, stats, profile | 0114 step 5 (group C) | `apps/web/app/revise/**`, `apps/web/app/profile/page.tsx`, `apps/web/app/review/**`, `apps/web/app/study/reading/**`, `apps/web/app/components/section-scrubber.tsx`, `apps/web/lib/revise.ts`, `apps/web/lib/reading.ts`, `apps/web/lib/review.ts`, `apps/web/lib/stats.ts`, `apps/web/lib/timer.ts`, and the tests next to them |
| AG7 | Antigravity | Switch group A: DSA, problems, judge, Solution tab | 0114 steps 4–5 (group A) | `apps/web/app/dsa/**`, `apps/web/app/problem-workspace.tsx`, `apps/web/app/solution-walkthrough.tsx`, `apps/web/app/api/judge/**`, `apps/web/lib/judge/**`, `apps/web/lib/dsa.ts`, `dsa-filters.ts`, `boss.ts`, `pattern-nav.ts`, `pattern-notes.ts`, `cp-algorithms.ts`, `struggles.ts`, `weekly.ts`, `packs.ts`, `apps/web/lib/leetcode/**`, `apps/web/lib/ai/context.ts`, `apps/web/app/actions.ts`, and the tests next to them |
| AG8 | Antigravity | Admin editor screens | 0116 steps 3–8 and 10, 0119 step 1 (save note and "Tell learners") | `apps/web/app/admin/**` (except `guard.test.ts`), `apps/web/lib/admin-study.ts`, `apps/web/app/markdown-client.tsx` (new, moved from `admin/markdown-preview.tsx`), `docs/content-editing.md`; may add `@codemirror/lang-markdown` to `apps/web/package.json` |
| AG9 | Antigravity | Web offline copy, offline reader, Settings card, What's new | 0115 steps 6–7, 0119 steps 3–6 and 8 | `apps/web/app/offline/**`, `apps/web/public/sw.js`, `apps/web/app/register-sw.tsx`, `apps/web/app/profile/settings/**`, `apps/web/app/whats-new/**` (new), `apps/web/app/shell.tsx`, `apps/web/app/nav.tsx`, `apps/web/lib/db.ts` + `schema.ts` + `backup.ts` (only the `content_notices` table), `apps/web/lib/content-notices.ts` (new), `apps/desktop/main.js` (system notification only), `apps/desktop/lib/notify.js` (new), `docs/mobile.md` |

Notes per task:

- **C7**: implement 0115 versioning rule 6 exactly (`content_epoch` in `content_meta`, starts at 1; `/api/content/version`
  returns `epoch`; the client stores the epoch of its last full download; a different epoch, or a server `version`
  lower than the client's, makes `syncContent` re-download every followed unit in one transaction and return a
  "content refreshed" flag; `pnpm content:resync` bumps the epoch, needs `CONTENT_DATABASE_AUTH_TOKEN`, writes one
  `admin_audit` row with action `resync` (actor "owner")). `content-snapshot.mjs` stores the epoch it downloaded. Add a
  `refreshNotice(at)` helper to `notices.ts` for the "Content was refreshed" notice (unit `all`). Round A leftovers:
  fix `mergeChanges` in `parts.ts` so the "all" path keeps asset parts, then remove the workaround in
  `content-sync/serve.ts`; add a 3 MB byte cap to changes pages next to the 200-entity cap; call `pruneChanges` after
  each committed admin write in `lib/admin-content/write.ts`. The lead adds `content:resync` to the root `package.json`.
- **C8, C9, AG7 (page switching)**: replace every content constant in your files with the repo and lookups above.
  Pages stay server components; content reads happen in the page or in an async child (cached reads may run at the top of a
  page; anything that reads cookies, `connection()` or the user DB stays inside `<Suspense>` as today). Client
  components get content as props. Keep every page looking and behaving the same; this round changes where data comes
  from, not the UI. When a function in your files becomes `async` and is called from a file you do not own, keep the
  old function name working for those callers (for example an async version next to it) and list each such caller in
  your notes; the lead wires them after the round. In tests, mock `@/lib/content-repo/lookups` (and repo functions) to
  return the old constants from `@habit/shared`, so tests stay fast and do not need a seeded DB. Before you finish,
  `grep` your files for the constant names in the rule above and list any you could not remove, with the reason.
- **AG7** also: the Solution tab renders `getSolutionPage(id)` with `content-page.tsx` (same look as today; compare a
  problem with brute force code and one with "already optimal"); the judge gets specs from `getProblemSpec(id)`;
  the DSA list reads `listProblemSummaries()` and `getDsaGroups()`, all problems on one page, no pagination.
- **AG8**: build 0116 steps 3–8 on AG4's write functions and routes, AG6's renderer, AG2's `draft.ts` and
  `page-markdown.ts`, C1's `templates.ts`. Every page under `app/admin` reads the session only inside `<Suspense>`
  (see `app/admin/layout.tsx` `AdminGate`); `guard.test.ts` must pass. Add the 0119 step 1 footer (What changed, Tell
  learners). Put a plain "AI" button placeholder nowhere yet: the AI UI is round C.
- **AG9**: build on C6's endpoints (`/api/content/units`, `/unit/<unit>`, `/changes`, `/version`) and pure helpers in
  `content-model` (`patchEntity`, `revOf`, `noticesFrom`, `summaryLine`, `unitsFor`). Desktop shows the "Offline content"
  card with status and Check for updates; the web shows the per-unit download list. The What's new page reads notices
  from the user DB on desktop and from IndexedDB in the offline reader. The service worker must still never cache
  per-user HTML or API responses.

## Rules for every agent

1. Edit only the files you own (table above). Need a change elsewhere? Write it in your notes.
2. Do not edit `content-model/types.ts`, `rev.ts`, `index.ts`, `packages/shared/src/index.ts`, `lib/auth/admin*.ts`,
   `lib/content-repo/lookups.ts`, the root `package.json`, any plan file or these wave files, or `data/habit.db`.
3. Fast checks only: `pnpm exec vitest run <your test files>`, `npx tsc --noEmit` in `apps/web` (and
   `packages/shared` if you changed it), and `pnpm lint`; fix lint in your own files. Type errors in other agents'
   files are not yours: note them. Never run `pnpm test`, `pnpm check`, `pnpm build` or `pnpm desktop:build`.
4. Next 16 `cacheComponents`: cookies, `connection()` and user-DB reads only inside an async component under
   `<Suspense>`, never at the top of a page or layout.
5. No `git commit`, `push`, `stash`, `checkout`, `reset` or branch changes.
6. When done, write `docs/plans/notes/wave2b-<agent>.md`: files, test commands and results, deviations and why,
   callers outside your files that need wiring, constants you could not remove, questions.

## Lead review log (round B)

- **Lead, before the round:** `lib/content-repo/lookups.ts` + `lookups.test.ts` (same shapes as the old constants,
  checked against a real seed); `dsa-groups` doc added to the seed and `DOC_KINDS`; parity count 40 docs;
  `content:resync`, `content:snapshot`, `content:pull` in the root `package.json`.
- **C9 done (checked):** its files type-check clean; 38/38 tests in its area. It also added lookup mocks to
  `practice-tools.test.ts` and `weekly.test.ts` (not its files; accepted, they only add mocks).
- **C8 done (checked):** its files type-check clean; its tests pass. `lessonSource` is now async.
- **Decisions on their questions:** `PLAN_WEEKS` and `WEEK_FOCUS` (`plan-weeks.ts`, `focus.ts` in shared) are the
  16-week plan, i.e. app logic that only names content ids, so they stay in code; `content:verify` (0117) checks those
  ids exist in the DB. Shared `quizCards`, `readingFor` and `readingMinutes` still read constants internally: no app file
  calls them now (or C8 copied the formula as `readingMinutesOf`); they go away with the constants in 0117, and
  `readingMinutes` gets the lesson as a parameter then. `getLessonFacts` reading every lesson page per revise request is
  fine (cached); revisit only if the revise page is slow.
- **Lead wiring to do after AG7/AG8/AG9 finish:** `lib/ai/context.ts:98` and `app/admin/study/page.tsx:26` must await
  `lessonSource` (AG7/AG8 files; type errors until then); `lib/packs.ts resolveLesson` still falls back to `LESSONS`;
  `lib/review.ts` uses `STUDY_AREAS` at line 42 per C8 (C9 says it is clean: check). Tests now failing because code
  reaches the cached repo without `next/cache` mocks (`cacheTag() is only available with cacheComponents`):
  `backup.test.ts` (5), `packs.test.ts` (1), `packs-v2.test.ts` (2). Fix: mock `next/cache` and the lookups in those
  tests, or a shared test setup.
- **C7 done (checked):** 324/324 tests across content-db, content-sync, content-repo, content routes, content-model and
  admin-content. Epoch resync, `content:resync`, `refreshNotice`, `mergeChanges` asset fix (workaround removed), 3 MB
  page cap, `pruneChanges` after each hosted write. It updated three tests outside its row for the new `epoch` field and
  migration (accepted). It also removed `ALL_PATTERNS` from `serve.ts` (pattern names now from the `dsa-groups` doc).
  Lead fixes: (1) `getContentVersionCached` lived "forever" (`cacheLife('max')`) and `content:resync` runs outside Next,
  so a resync would never reach clients; now `cacheLife({ stale: 30, revalidate: 60, expire: 120 })`, about one tiny
  read a minute. (2) `AuditAction` gained `"resync"`.
  Open: (a) store `refreshNotice` when `syncContent` returns `refreshed: true` (sync route + desktop), after AG9's
  `content_notices` store exists (lead wiring); (b) `lib/content-repo/stress.ts` reads stress cases through
  `JUDGE_PROBLEMS[id].stress`: allowed now because stress generators are code, but 0117 must export a
  `stressFor(id)` from the `judge/stress*.ts` files before the problem files are deleted.
- **AG7, AG8, AG9 done.** Web, shared and desktop type checks pass and lint is clean (after the lead wiring below).
  Their own test runs were reported green; the lead has NOT yet re-run them or `pnpm check`.
- **Lead wiring done:** `lib/diagrams.ts` and `api/diagrams/route.ts` read exercises through `getAllExercises()`;
  "What changed" / "Tell learners" now reach the save (`cleanSaveNote` in `lib/admin-content/write.ts`, `saveProblem` /
  `saveLesson` take `extra`, forwarded on desktop and by the admin routes, stored on the `changes` row); the docs editor
  save refuses on desktop ("Edit docs on the website for now"), because it would only change the local copy;
  `main.js` shows a system notification only when the sync returns notices (it used to fire on every change, including
  silent typo fixes).
- **STILL TO DO (next session, in order):**
  1. Build notices after a desktop sync: extend `SyncOutcome` in `content-sync/sync.ts` with the applied
     `ChangeEntry[]`; in `api/content/sync/route.ts` compute followed units (`followedUnitsDesktop` with started units
     from `problem_solves` → `problems:<pattern>` and `concept_progress` → `course:<area>`, plus Follow/Mute settings
     if AG9 stored them), call `noticesFrom` and `recordNotices` (`lib/content-notices.ts`), store `refreshNotice` when
     `refreshed`, and return `notices: summaryLine(...)`.
  2. Fix the 8 failing tests: `backup.test.ts` (5), `packs.test.ts` (1), `packs-v2.test.ts` (2): mock `next/cache` and
     `@/lib/content-repo/lookups` like the other tests.
  3. Desktop path for the docs editor (a `saveDoc` in `lib/admin-content/write.ts` that forwards to a new
     `/api/admin/content/docs/[kind]/[id]` route), then remove the refusal.
  4. Re-run the AG7/AG8/AG9 tests, then `pnpm check` once, then open the app (dev server with a seeded
     `data/content.db`: `pnpm content:seed-db`) and check the DSA list, a problem's Solution tab, a study lesson,
     Quick revise, the admin editor and Settings.
  5. Round C: AI button UI (0118 steps 3–4) and the cutover (0117), including a `stressFor(id)` export.
- **Lead, after the pause (2026-11-24):**
  1. Notices after a desktop sync: `SyncOutcome.entries` (applied change entries); new
     `lib/content-sync/desktop-notices.ts` (`startedUnits` from solved problems → `problems:<pattern>` and concept
     progress → `course:<id>`; `desktopNotices` = one "Content was refreshed" notice after a full resync, else
     `noticesFrom` for "Tell learners" changes in started units, with titles); `api/content/sync/route.ts` records them
     with `recordNotices` and returns `notices: summaryLine(...)` (best effort, never fails the sync). Test:
     `desktop-notices.test.ts` (4). Follow/Mute per unit is not stored by AG9's Settings yet, so both lists are empty.
  2. `backup.test.ts`: added the `next/cache` and lookups mocks; 9/9 pass. `packs*.test.ts` were already fixed by AG7.
  3. Docs editor on desktop: `saveDoc` in `lib/admin-content/write.ts` (hosted write + audit + conflict + prune, or
     desktop forwarding) and a new admin route `api/admin/content/docs/[kind]/[id]` (GET, PUT; guard test covers it);
     `saveDocContentAction` uses it and the desktop refusal is gone. Test: `save-doc.test.ts` (4).
  4. Seeded the local `data/content.db` with the real content (`pnpm content:seed-db`: 797 changed, version 834) for
     the full check and the browser check.
- **Lead, test and build fixes (2026-11-24):** the first full `pnpm check` of round B found 55 failing tests in files
  no agent owned. Fixed: (1) a shared Vitest setup, `apps/web/test/content-global-setup.ts` (fills one temporary content
  DB per run from the repo content) and `apps/web/test/content-setup.ts` (no-op `cacheTag`/`cacheLife`, points
  `CONTENT_DATABASE_URL` at that DB unless a test chose its own); (2) 10 test files whose own `next/cache` mock lacked
  `cacheTag`/`cacheLife`; (3) the no-emoji rule (AG8 "✕" close buttons → new `CloseIcon` in `app/ui.tsx` with labels;
  AG9 "✓" removed); (4) `vitest.config.mts` now also runs `*.test.tsx` (AG6's `content-page.test.tsx` never ran).
  Build fixes: (5) AG8's client page editor imported the server-only renderer for its preview: `previewAction` now
  renders `ContentPage` on the server and the editor fetches it 400 ms after the last change; (6) AG9's What's new bell
  read `usePathname` outside `<Suspense>`, which broke prerendering of every page with params: wrapped in `<Suspense>`;
  (7) the admin docs, problem and lesson editor pages awaited `params` at the top of the page: moved inside Suspense.
- **`pnpm check` (2026-11-24): passed** (lint, typecheck, 2,788 tests / 20 skipped, build 313 pages). After it, one
  more fix with targeted tests, typecheck and lint only: (8) `syncContent` reported `refreshed` on the first sync of a
  copy that had never synced (installer or seeded copy), so every such sync added a "Content was refreshed" notice;
  now only a real epoch change from a recorded epoch counts (`sync.test.ts` updated: the first sync is silent and does
  not repeat). This had already written five "Content was refreshed" notices into the user's own `data/habit.db`
  through the user's running dev server; the lead did not touch that file (Mark all read on What's new clears them).
- **Browser check (production build on port 3312 against a copy of `data/habit.db`, local content DB seeded with the
  real content):** DSA list (496 problems, 76 patterns, one page), problem page and Solution tab (walkthrough sections,
  brute force code after "Brute force", optimal code after "Optimal approach", C++/Java/Python tabs), study area and
  lesson, Quick revise, What's new (bell, notices), Settings "Offline content" card (per-unit sizes through
  `/api/content/units?v=834`), `/admin` signed out → `/login?next=/admin` with no admin content, admin APIs 401. No
  server errors. One React hydration error (#418) appeared once in a background tab and did not reproduce in the
  foreground on any of these pages. Not checked: admin editor screens while signed in as admin, desktop app,
  offline reader with the network off.
- **Left:** round C (AI button UI, 0118 steps 3–4; cutover, 0117, including a `stressFor(id)` export); Follow/Mute per
  unit in Settings (notices use "started" units only for now).
