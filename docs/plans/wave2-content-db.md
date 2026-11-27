# Wave 2 of "content in the database": round A, six agents in parallel

Lead: Claude Code. Plans 0112 to 0119, overview `docs/architecture/content-in-db.md`, wave 1 log
`docs/plans/wave1-content-db.md` (read its "Lead review log" for decisions already made). Started 2026-11-23.

Wave 2 connects the wave 1 pieces. It runs in two rounds because later work needs earlier work:

- **Round A (this file):** fill the database, the read and sync back end, audit wiring and the admin write API, desktop
  content setup, the shared page renderer and AI answer parsers.
- **Round B (after the lead reviews round A):** switch every page to the database (three agents, one per area: DSA and
  judge; study and courses; everything else), the admin editor screens (0116 steps 3–8), the web offline copy and reader
  (0115 steps 6–7), What's new UI (0119 steps 1, 3–6) and the AI button UI (0118 steps 3–4).
- **Wave 3:** cutover (0117).

## What already exists (do not rewrite, build on it)

- `packages/shared/src/content-model/`: `types.ts` (contract, lead only), `rev.ts`, `templates.ts` (`TEMPLATES`,
  `pageTemplate`, `validatePageAgainstTemplate`), `from-files.ts` (`problemFromSpec`), `to-spec.ts`
  (`specFromContent`), `lesson-map.ts` (`lessonFromFile`, `lessonToShape`, `docFromFile`, `DOC_KINDS`,
  `PATTERN_COURSE_ID`), `units.ts`, `parts.ts` (`diffParts`, `extractParts`, `patchEntity`, `mergeChanges`),
  `snapshot.ts`, `notices.ts`, `tags.ts` (`TAG`, `tagsFor`), `draft.ts`, `page-markdown.ts`, `verify.ts`,
  `admin-ai.ts`, `house-rules.ts`. The barrel `index.ts` exports the main API (lead only).
- `apps/web/lib/content-db/`: `client.ts` (`getContentDb`, `getContentWriteDb(proof)`, `resetContentDbForTests`),
  `migrations.ts`, `schema.ts`, `meta.ts`, `write.ts` (`upsertProblem/Lesson/Course/Doc`, `softDelete`, `putAsset`),
  `load.ts` (`loadProblem/Lesson/Course/Doc`), `audit.ts` (`writeAudit`, `listAudit`), `fixtures.ts`
  (`sampleProblem`, …).
- `apps/web/lib/auth/admin.ts` (`requireAdminPage`, `requireAdminAction`, `requireAdminRequest`,
  `AdminDeniedError`) and `admin-proof.ts`. `app/admin/guard.test.ts` checks every admin action, route and page.

## Who does what (round A)

| Agent | Tool | Task | Plan steps | Owns (only these files may be created or edited) |
|---|---|---|---|---|
| C4 | Claude (Haiku) | Seed the content DB from the repo files; parity test; test fixture | 0112 steps 5–7, 0114 step 7 (fixture part) | `apps/web/lib/content-db/seed.ts`, `seed.test.ts`, `test-helpers.ts`, `scripts/content-seed-db.mjs`, `scripts/content-fixture.mjs`, `packages/shared/test/fixtures/content-mini.json` |
| C5 | Claude (Haiku) | Content repository with cache tags, invalidation helper, public read API, build-time content DB | 0114 steps 2, 3, 6, 6b, 8 | `apps/web/lib/content-repo/**`, `apps/web/app/api/content/version/**`, `api/content/problems/**`, `api/content/courses/**`, `api/content/lessons/**`, `api/content/docs/**`, `api/content/assets/**`, `scripts/ensure-content-db.mjs`, `apps/web/package.json` (prebuild only), `docs/development-performance.md` |
| C6 | Claude (Haiku) | Parts and units on every write, prune, unit and changes endpoints, apply logic, local sync route | 0115 steps 1 (wiring), 2, 3, 4, 5 (local route only), 8 (tests for these) | `apps/web/lib/content-db/write.ts`, `write.test.ts`, `apps/web/lib/content-sync/**`, `apps/web/app/api/content/units/**`, `api/content/unit/**`, `api/content/changes/**`, `api/content/sync/**` |
| AG4 | Antigravity | Audit wiring and the hosted admin write API with conflict checks; desktop forwarding | 0113 steps 2–3 wiring, 0116 step 2, 0116 "Writes" context | `apps/web/app/admin/actions.ts`, `apps/web/app/admin/study-actions.ts`, `apps/web/app/admin/admin.test.ts`, `apps/web/app/admin/study.test.ts`, `apps/web/app/api/admin/**`, `apps/web/lib/admin-content/**` (new), `apps/web/lib/auth/session.ts` |
| AG5 | Antigravity | Desktop: ship a content DB, copy it on first start, run updates on a timer; snapshot script | 0115 step 5 (except the local route), step 9 (`content:pull`) | `scripts/content-snapshot.mjs`, `apps/desktop/lib/content-setup.js`, `apps/desktop/lib/content-setup.test.ts`, `apps/desktop/main.js`, `apps/desktop/scripts/prepare-server.mjs`, `apps/desktop/scripts/after-pack.cjs`, `apps/desktop/package.json` (build config only), `.github/workflows/desktop.yml`, `docs/troubleshooting.md` |
| AG6 | Antigravity | Shared page renderer and AI answer parsers | 0114 step 4 (renderer component only), 0118 step 2 | `apps/web/app/content-page.tsx`, `apps/web/app/content-page.test.tsx`, `packages/shared/src/content-model/admin-ai.ts`, `admin-ai.test.ts` |

Notes per task:

- **C4**: the seed reads the current files through the shared exports and the wave 1 mappers, and writes through the
  0112 write helpers (actor `"seed"`, 50 entities per transaction). It also seeds the roadmap list `PROBLEMS` from
  `dsa.ts` as doc kind `dsa-problems`, fills `problems.pattern` from it where ids match, and creates the
  `dsa-patterns` course row (wave 1 decisions). Keep empty optional sections. Flags `--url`, `--dry-run`. The parity
  test seeds `:memory:` and compares every problem, lesson and doc with the files (0112 step 6). The fixture script
  writes a small snapshot (12 problems covering function/design/brute-same/all languages, 3 courses with 2 lessons each,
  one doc of each kind) in the `ContentSnapshot` shape; `test-helpers.ts` exports `seedFixture(db)`. Do not edit
  `write.ts` (C6 owns it; its signatures stay compatible). Run the scripts with `node --import ./scripts/lib/register-ts.mjs
  scripts/<file>.mjs`; the lead adds the `package.json` script entries.
- **C5**: every repo function uses `'use cache'` (or `'use cache: remote'` if the local Next docs confirm it falls back
  to memory without a handler; write down which and why), `cacheLife('max')` and `cacheTag(...)` with names from
  `content-model/tags.ts`. Read through `load.ts`. The invalidation helper (`expireContentTagsInAction`,
  `expireContentTagsInRoute`) lives in `lib/content-repo/invalidate.ts`. Public JSON routes follow 0114 step 6 (versioned
  `?v=`, `immutable`, `ETag`, 302 for old `v`). `ensure-content-db.mjs` creates `data/content.db` from
  `packages/shared/test/fixtures/content-mini.json` when the DB is missing and `CONTENT_DATABASE_URL` is unset; if the
  fixture file is not there yet (C4 writes it in parallel), it creates an empty migrated DB and prints a warning. Tests
  use `fixtures.ts` samples, not C4's fixture. Read `apps/web/node_modules/next/dist/docs/` for `use cache`, `cacheTag`,
  `cacheLife`, `updateTag`, `revalidateTag` before coding.
- **C6**: in `write.ts`, compute `parts = diffParts(before, after)` and `units = unitsForChange(before, after)` when the
  caller does not pass them, keep every existing export and signature working (C4 and AG4 call them now). Add
  `pruneChanges(db, now)`. Endpoints and `apply.ts` / `syncContent` follow 0115 steps 2–4 exactly, with I/O injected.
  The local route `POST /api/content/sync` refuses anything but 127.0.0.1 with `HABIT_DESKTOP=1` and answers 404 on hosted.
- **AG4**: create `apps/web/lib/admin-content/write.ts` (not `lib/content-admin/`, which would clash with the existing
  `lib/content-admin.ts` file): `saveProblem(proof, draft, baseRev)`, `deleteProblem`, `saveLesson`,
  `restoreFromAudit`. On hosted (write token present) they write with `getContentWriteDb(proof)` and `writeAudit` in one
  transaction, then return the tags to expire. On desktop they POST to the hosted admin API with the user's access token
  (factor `fetchWithAccessToken(url, init)` out of `workerFetch` in `session.ts`). Conflicts on `baseRev` return the
  current entity. Routes: 0116 step 2. Wire `writeAudit` at every `TODO(wave2): writeAudit` (wave 1 AG1 notes list six
  places). Validate with `validateProblemDraft` from `draft.ts` and `validatePageAgainstTemplate` from `templates.ts`.
  Use `expireContentTagsInAction` / `InRoute` from `lib/content-repo/invalidate.ts` (C5 writes it in parallel; if it is
  not there yet, call `updateTag`/`revalidateTag` with `tagsFor` directly and note it). Every new route and action
  must pass `app/admin/guard.test.ts`.
- **AG5**: `content:snapshot --out <file.db> [--origin <url>]` downloads `/api/content/units` and each
  `/api/content/unit/<unit>?v=` page from the hosted site (C6 builds these endpoints now; code against the 0115 step 2
  contract) and writes a migrated content DB. Desktop first-start copy and the 20-second / 6-hour timer calling the local
  `POST /api/content/sync` (C6) follow 0115 step 5. `content-setup.js` is plain JS with `// @ts-check`, pure, tested
  like `lib/setup.js`. Do not run `pnpm desktop:build`; describe the manual check in your notes.
- **AG6**: `content-page.tsx` is a server component `ContentPage({ template, page, assetUrl })` that walks the
  template's slots, prints headings, and renders blocks: Markdown with `app/markdown.tsx`, code with `SolutionTabs`
  (`app/solution-tabs.tsx`), diagrams with `app/diagram.tsx`, images through `assetUrl(id)`. Each section gets
  `id="s-<sectionId>"`. It takes data as props (no DB access), so it works before the pages are switched. Do not edit
  any existing page yet (round B). `parseAiAnswer(target, mode, text, context)` follows 0118 step 2, using
  `validateProblemDraft` (draft.ts) and `markdownToPage` (page-markdown.ts).

## Rules for every agent (same as wave 1)

1. Edit only the files you own (table above). Need a change elsewhere? Write it in your notes file.
2. Do not edit `content-model/types.ts`, `rev.ts`, `index.ts`, `packages/shared/src/index.ts`,
   `apps/web/lib/auth/admin-proof.ts`, the root `package.json`, any plan file, or `data/habit.db`.
3. Fast checks only: `pnpm exec vitest run <your test files>` and `npx tsc --noEmit` in the package you changed. Type
   errors in files someone else owns are not yours; note them. Never run `pnpm test`, `pnpm check` or `pnpm build`.
   Run `pnpm lint` only if you changed files under `apps/web` (it is fast), and fix lint in your own files.
4. No `git commit`, `push`, `stash`, `checkout`, `reset` or branch changes.
5. Next 16 with `cacheComponents`: request-time data (cookies, `connection()`, the DB) is read only inside an async
   component under `<Suspense>`; never at the top of a page or layout default export (this broke the wave 1 build).
6. Write `docs/plans/notes/wave2-<agent>.md` when done: files, test command and result, deviations and why, questions,
   found but not changed.

## Lead review log (round A)

- **C5 done (checked):** 41/41 tests pass; lint clean per agent. Accepted: `'use cache: remote'` on repo functions
  (in-memory LRU when no handler; hosted must stay on Vercel or configure `cacheHandlers`); `getProblemSpec` not cached
  (stress cases are functions) and reads stress from `JUDGE_PROBLEMS[id].stress`, which is what the judge uses, so no new
  `stressFor` export; ETag = `revOf(body)`; prebuild runs `scripts/ensure-content-db.mjs`.
  Answers: (2) public problem JSON keeps all test cases: they are public in the repo today and the desktop judge needs
  them offline. A "hidden tests" feature would be a separate plan. (3) the `content` tag is expired by `applyUnits`
  (C6, told) and by `content:import` (0117).
  To check at the end of round A: run `ensure-content-db.mjs` once on a clean tree (only `node --check` so far).
- **C4 done (checked):** parity test passes (486 problems, 287 lessons, 39 docs; second run 0 changed); 37/37 tests
  in `lib/content-db`. Seed on a temp DB: 816 entities, version 816, re-run 0 changed. Answers: (1) keep
  `problems.pattern` from the roadmap list; the judge does not read it and the DSA pages want it. (2) lead added
  `dsa-problems` to `DOC_KINDS`. (3) lead exported `courseFromStudyArea` and `DocKind` from the barrel and removed
  the relative import in `seed.ts`. (4) confirmed: the seed is an owner-only CLI run with the DB token, not an admin
  action, so it writes with an open DB. (5) lead added `content:seed-db` and `content:fixture` to the root
  `package.json`. C4 saw its files change on disk mid-run; tests re-run after the lead's edits still pass (7/7).
- **C6 done (checked):** 99/99 tests across `lib/content-db`, `lib/content-sync`, `app/api/content`; web type check
  clean. Accepted: `rev = revOf(entity.value)`; 410 rule; asset parts re-attached in `serve.ts` because
  `mergeChanges` drops them on its "all" path (round B: fix in `parts.ts` and remove the workaround); no server cache on
  units/changes (HTTP caching is enough for now); the sync route writes with `getContentDb` and only to a local file;
  local check by Host/forwarding headers (the desktop server listens on 127.0.0.1 only, hosted answers 404).
  Round B items: (a) a byte cap (3 MB) on changes pages, next to the 200-entity cap; (b) call `pruneChanges` after
  each admin write in `lib/admin-content/write.ts` (AG4's file).
- **Lead fix, `scripts/ensure-content-db.mjs` (C5):** running it for real on Windows failed with `EBUSY` on the rename
  (the temp DB stayed locked after the client closed), so every fresh Windows build would have failed. Now SQLite writes
  a clean copy with `VACUUM INTO` to a `.part` file that nobody has open, and that file is renamed; the locked temp file
  is removed when possible. Checked: creates `data/content.db` with the 12 fixture problems; a second run leaves it.
- **Lead fix, build hook:** pnpm does not reliably run `prebuild` scripts, so `apps/web/package.json` now runs the
  check inside `build` itself: `node ../../scripts/ensure-content-db.mjs && next build` (also used by the desktop
  build through `pnpm --filter web build`).
- **AG4, AG5, AG6 done (checked).** 185 tests across their areas pass; web, shared and desktop type checks and lint
  clean; no edits outside their files. AG4: admin write API, conflict checks, audit at all six places, desktop forwarding
  (the access token only goes to `contentOrigin()`, which comes from server env, default the hosted site). AG5: shipped
  content DB, first-start copy, 20 s / 6 h update timer. AG6: `ContentPage` renderer and `parseAiAnswer`.
- **Lead fix, desktop build (AG5):** `prepare-server.mjs` and the release workflow downloaded content from the hosted
  site, which does not serve `/api/content/*` until it is deployed and seeded, so `pnpm desktop:build` and the next
  release would fail. Now `prepare-server.mjs` builds a fresh `resources/content.db` by seeding from the repo files
  (`content-seed-db.mjs`), or downloads with `content-snapshot.mjs` only when `CONTENT_SNAPSHOT_ORIGIN` is set (the only
  way after the 0117 cutover). The separate workflow step was removed (`desktop:build` runs `prepare-server`).
  `apps/desktop/resources/content.db*` added to `.gitignore`. Checked: the seed command builds a 14 MB content.db.
- **Must fix before any release that ships content sync (round B, first item): content DB identity.** `content_version`
  is a counter per database; a desktop copy seeded locally and the hosted DB seeded separately can share a number with
  different content, and `syncContent` only compares numbers (a client "ahead" of the server never corrects itself). Add
  `content_meta.source_id` (random id set when a source DB is created or seeded), return it from
  `/api/content/version`, store it on the client when units are applied, and do a full unit download when it differs or
  when the server's version is lower than the client's. Files: `content-db/seed.ts`, `content-repo/version.ts` + version
  route, `content-sync/sync.ts` + `apply.ts`, `scripts/content-snapshot.mjs`.
- **`pnpm check`, end of round A (2026-11-23): passed.** Lint clean, typecheck clean, tests 2,743 passed / 20 skipped
  (211 files), build passed with no fixes needed this time.
- **Decision from the user (2026-11-23): content comes only from the hosted database.** Reverted the lead's "seed
  from repo files" fallback in `apps/desktop/scripts/prepare-server.mjs`: the installer's `content.db` is always
  downloaded with `content-snapshot.mjs` (default origin the hosted site, override `CONTENT_SNAPSHOT_ORIGIN`), and the
  build fails if the download fails. So `pnpm desktop:build` and releases need the hosted site to serve `/api/content/*`
  first. Order: deploy the web app with the content DB env vars, run `pnpm content:seed-db --url <hosted>` once (the only
  time repo files are read), then build the desktop app.
- **Replaces the "content DB identity" item above: full resync by epoch** (plan 0115 versioning rule 6).
  `content_meta.content_epoch`, returned by `/api/content/version`; a different epoch makes every client re-download
  everything it follows; `pnpm content:resync` (owner only, audited) and `content:import` bump it; and a server version
  lower than the client's also forces a full download. Round B, first task. Files: `content-db/meta.ts` (+ default
  epoch in a new migration), `content-repo/version.ts` + version route, `content-sync/sync.ts` + `apply.ts`,
  `scripts/content-snapshot.mjs`, new `scripts/content-resync.mjs`, root `package.json`, `content-model/notices.ts`
  (the "Content was refreshed" notice).
