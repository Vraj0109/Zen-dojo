# 0114: Read content from the content database, with server and HTTP caching

- **Status:** in-progress (wave 1 done, see docs/plans/wave1-content-db.md)
- **Planned by:** Claude Code, 2026-11-23
- **Implemented by:** (implementer fills in)
- **Series:** content in the database (0112 to 0119), overview `docs/architecture/content-in-db.md`.
- **Needs:** 0112 (content DB, mappers, seed, parity test), 0113 (read/write client split).

## Goal

Every page, the judge and a small public JSON API read courses, lessons, problems, test cases, hints and solutions from
the content database instead of the files in `packages/shared/`. Reads are cached on the server with Next 16 cache tags
and are invalidated exactly for what an admin changed. Public JSON responses are cacheable by browsers and the CDN
using versioned URLs. After this plan the files are no longer read at runtime (they are deleted in 0117).

## Context

- Next 16 with `cacheComponents: true` (`apps/web/next.config.ts`). Read the local docs before coding:
  `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`, `use-cache-remote.md`,
  `04-functions/cacheTag.md`, `cacheLife.md`, `updateTag.md`, `revalidateTag.md`.
  - `updateTag(tag)` works **only in server actions** and expires immediately (read-your-own-writes).
  - In route handlers use `revalidateTag(tag, { expire: 0 })`.
  - `'use cache'` keeps entries **in memory per server instance**. On Vercel each function instance has its own memory,
    so the hit rate is low; `'use cache: remote'` uses the platform's shared cache ("hosting providers should typically
    provide this automatically"). The desktop app is one long-lived process, where in-memory is ideal.
- Request-time data (user progress) stays in async components that call `await connection()` inside `<Suspense>`, as
  today. Cached content functions must not read cookies, headers or `getDb()`.
- Content is used in many places through synchronous imports from `@habit/shared` (`JUDGE_PROBLEMS`, `ALL_CONCEPTS`,
  learn exports, `SOLUTIONS`/`BRUTE` via `@habit/shared/solutions`, `INTERVIEW` walkthroughs, `reading.ts`, `revise.ts`,
  …). About 50 files in `apps/web` import them. Pure helpers in `packages/shared` that loop over content (for example
  DSA filters, stats badges that count problems, the revise deck shuffle) must take content as a parameter instead of
  importing it.
- The judge (`apps/web/lib/judge/`, `app/api/judge/run/route.ts`) needs a `ProblemSpec`. Stress generators stay in code
  (`packages/shared/src/judge/stress*.ts`), keyed by problem id: `specFromContent(content, stressFor(id))` (0112).
- Content DB location: hosted = shared Turso `zen-dojo-content` (read-only token); desktop = local `content.db`
  (filled by 0115; until then by `pnpm content:seed-db`); dev = `data/content.db`.

### Cache tags (the contract every later plan uses)

| Tag | Covers |
|---|---|
| `content` | everything (used by a full import or snapshot apply) |
| `problems` | problem lists, counts, filters, search index |
| `problem:<id>` | one problem page: statement, cases, hints, solution blocks, judge spec |
| `courses` | course list and course outlines |
| `course:<id>` | one course and its lesson list |
| `lesson:<id>` | one lesson |
| `docs:<kind>` | list of one doc kind |
| `doc:<kind>:<id>` | one doc |
| `content-version` | the version number and snapshot manifest |

`tagsFor(entity, id, extra?)` returns the tags to expire for a change: a problem change → `problem:<id>`, `problems`,
`content-version`; a lesson change → `lesson:<id>`, `course:<courseId>`, `courses`, `content-version`; and so on.

## Out of scope

- Admin editing UI (0116), offline download and update endpoints (0115), deleting files (0117).
- Caching user data. Changing what pages look like.
- User-installed packs (`lib/packs.ts`): they keep working and are merged with DB content where they are today.

## Steps

- [ ] **1. Inventory the readers.** List in *Implementation notes* every file in `apps/web` and `packages/shared` that
  imports a content constant (use the step 1 inventory of plan 0112 as the list of names). For each, write the new
  repository call it will use. Group them: A) DSA problems, judge and Solution tab; B) study areas, courses, lessons;
  C) everything else (design, LLD, reading, revise, thinking map, cp-algorithms, FAQ if it is content).
  - Done when: the table covers every import (grep finds none missing).
- [ ] **2. Content repository.** New folder `apps/web/lib/content-repo/` (`import "server-only"`):
  - `problems.ts`: `listProblemSummaries()` (id, title, source, difficulty, pattern, tags: no bodies),
    `getProblem(id)` → `ContentProblem | null`, `getProblemSpec(id)` → `ProblemSpec | null` (adds stress from code),
    `getSolutionPage(id)` → ordered blocks with code per language.
  - `courses.ts`: `listCourses()`, `getCourse(id)` (with lesson summaries), `getLesson(id)`.
  - `docs.ts`: `listDocs(kind)`, `getDoc(kind, id)`.
  - `version.ts`: `getContentVersionCached()`.
  - Every function: `'use cache: remote'`, `cacheLife('max')`, and `cacheTag(...)` with the tags from the table
    above. If the local docs show that `'use cache: remote'` without a configured handler is not the in-memory default
    for `next start` and the desktop standalone server, use plain `'use cache'` and write down why in the notes.
  - `tags.ts` (pure, no `server-only`): `TAG`, `tagsFor(entity, id, extra)`.
  - Done when: repo tests pass against a `:memory:` content DB filled from the fixture (step 7).
- [ ] **3. Invalidation helper.** `apps/web/lib/content-repo/invalidate.ts`: `expireContentTagsInAction(changes)`
  calls `updateTag` for each tag (server actions only); `expireContentTagsInRoute(changes)` calls
  `revalidateTag(tag, { expire: 0 })` (route handlers and background jobs). `changes` is the list returned by the
  0112 write helpers (`{ entity, id, courseId? }`). Later plans call these after every write; nothing else invalidates.
  - Done when: a unit test with mocked `next/cache` shows a problem save expires exactly `problem:<id>`, `problems`,
    `content-version`.
- [ ] **4. Switch group A: problems, judge, Solution tab.** Convert the files listed under A:
  - Pages under `app/dsa/**` and the problem workspace read with `getProblem`/`listProblemSummaries`; content parts
    are cached server components, progress parts stay in `connection()` + `Suspense`.
  - One page renderer for all content: `apps/web/app/content-page.tsx` (server component) walks a template's slots
    (`packages/shared/src/content-model/templates.ts`), prints each slot's heading, and renders each section's blocks
    in order: Markdown with `app/markdown.tsx`, code with `SolutionTabs` (one tab per language; label from the block,
    for example "Brute force", "Optimal" or a custom label), diagrams with `app/diagram.tsx` (Mermaid, already
    themed), images from `GET /api/content/assets/<id>` (immutable, `Cache-Control: public, max-age=31536000,
    immutable`, served with the stored `mime` and `X-Content-Type-Options: nosniff`). Templates may
    pass a slot to a special component (for example the checklist points of a concept lesson keep their current
    look). The problem statement and `app/solution-walkthrough.tsx` use it. Seeded pages must look the same as before.
  - `lib/judge/*` and `app/api/judge/run/route.ts` get the spec from `getProblemSpec(id)`.
  - Shared pure helpers that read `JUDGE_PROBLEMS` take a `problems` argument; their tests pass a fixture.
  - The DSA list keeps showing all problems on one page, with no pagination (the repo's UI rule: one scroll area,
    `content-visibility: auto` on rows). It reads `listProblemSummaries()`, which selects only the list columns (id,
    title, source, difficulty, pattern, languages present, has-brute flag), never statements, cases or code. For
    about 500 problems that is roughly 100 KB of data, served from the cache. Filters and search stay as they are
    today (URL query, work without JS). Write the page's HTML size before and after in the notes; it must not grow.
  - Done when: the DSA list, a problem page, Run and Submit (desktop) and the Solution tab work with
    `CONTENT_DATABASE_URL` pointing at a seeded DB and the files renamed away temporarily (do this as a manual check,
    then rename back).
- [ ] **5. Switch groups B and C.** Same approach for study areas, courses, lessons and docs. Keep each page's
  layout. Where a page shows content and progress together, split as in step 4.
  - Done when: every page in the step 1 table renders from the DB (same manual rename check).
- [ ] **6. Public read API with HTTP caching.** Route handlers (no auth: content is public, guests can read it):
  - `GET /api/content/version` → `{ version, schema }`, `Cache-Control: public, max-age=30, s-maxage=30`.
  - `GET /api/content/problems?v=<version>` (summaries), `GET /api/content/problems/<id>?v=<version>`,
    `GET /api/content/courses?v=…`, `/api/content/courses/<id>?v=…`, `/api/content/lessons/<id>?v=…`,
    `/api/content/docs/<kind>/<id>?v=…`.
  - With `v` equal to the current version: `Cache-Control: public, max-age=31536000, immutable` (a new version means a
    new URL, so nothing stale is ever served). Without `v` or with an old `v`: `302` to the current `?v=` URL
    (`Cache-Control: no-store` on the redirect).
  - Every JSON response has `ETag: "<entity rev>"` and answers `304` to a matching `If-None-Match`.
  - Responses never include admin-only data (audit rows, `actor`).
  - Done when: route tests (step 7) pass and `curl -I` shows the headers locally.
- [ ] **6b. Builds need a content DB.** With `cacheComponents`, cached content functions can run during `next build`
  (prerendering the static shell), so every build must reach a content DB:
  - Vercel: `CONTENT_DATABASE_URL` + read token are set for the build too (say so in `docs/hosting.md`).
  - Local and CI (`pnpm build`, `pnpm check`, `.github/workflows/ci.yml`): add `scripts/ensure-content-db.mjs`, run
    from the web app's `prebuild`. If `CONTENT_DATABASE_URL` is unset and `data/content.db` is missing, it creates it
    from the committed fixture (step 7) and prints `content: using the test fixture (12 problems)`. It never
    overwrites an existing file.
  - Desktop build (`apps/desktop/scripts/prepare-server.mjs`): same, but plan 0115 replaces the fixture with the real
    snapshot.
  - Done when: `pnpm build` works on a fresh clone with no env and no `data/content.db`.
- [ ] **7. Fixture and tests.**
  - `scripts/content-fixture.mjs` (`pnpm content:fixture`): writes `packages/shared/test/fixtures/content-mini.json`,
    a small snapshot (12 problems covering function/design/brute-same/all languages, 3 courses with 2 lessons each,
    one doc of each kind) taken from the seeded DB. Commit the fixture. Add `seedFixture(db)` test helper in
    `apps/web/lib/content-db/test-helpers.ts`.
  - `apps/web/lib/content-repo/content-repo.test.ts`: each repo function returns the fixture data; unknown id → null;
    soft-deleted rows are hidden.
  - `apps/web/lib/content-repo/tags.test.ts`: `tagsFor` table.
  - `apps/web/app/api/content/content-routes.test.ts`: version route; `?v=` current → immutable + ETag; old `v` → 302;
    `If-None-Match` → 304; unknown id → 404.
  - Update tests that imported content constants directly to use the fixture (list them in the notes).
  - Done when: targeted runs pass, then `pnpm check` once.
- [ ] **8. Docs.** `docs/development-performance.md`: a short "Content caching" section with the tag table and the rule
  "after a content write, call the invalidation helper; nothing else".
  - Done when: the section exists.

## Acceptance criteria

- [ ] With the content files moved away (temporary rename), every page, Run/Submit on desktop and the Solution tab
      work from the content DB, and look as before.
- [ ] A second load of a problem page does not query the content DB (check with a query log or a counter in dev).
- [ ] `/api/content/problems/<id>?v=<current>` returns `immutable` caching and an ETag; an old `v` redirects.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
