# Wave 3 (round C) of "content in the database": AI buttons, Follow/Mute, cutover preparation

Lead: Claude Code. Plans 0112 to 0119, overview `docs/architecture/content-in-db.md`. Read the review logs in
`docs/plans/wave1-content-db.md`, `wave2-content-db.md` and `wave2b-content-db.md` first. Started 2026-11-24.

Round C has two parts:

- **C-1 (this file, six agents):** everything that does not delete anything: the AI buttons in the editor, Follow/Mute
  per course, and all cutover preparation (stress lookup, quality checks on save, the new content scripts, backups, a
  hosted-site checker, the deploy runbook).
- **C-2 (later, lead only, after the user has deployed the site and filled the hosted content database once):** delete
  the content files (0117 steps 1, 3, 5 and 7), switch the test setup to the committed fixture, update `AGENTS.md`.
  Deleting earlier would leave no source to fill a content database from.

## Who does what

| Agent | Tool | Task | Plan steps | Owns |
|---|---|---|---|---|
| C10 | Claude (Haiku) | Stress lookup without the problem files; content checks on every admin save | 0117 Context (stress) and step 2 (wiring) | new `packages/shared/src/judge/stress-registry.ts` (+ test), the 5 `problems-*.ts` files that hold inline `stress:` (move those 14 entries out only), `packages/shared/src/judge/index.ts` (only to use the registry), `apps/web/lib/content-repo/stress.ts`, `apps/web/lib/admin-content/write.ts` (only: call `verifyEntity`), its tests |
| C11 | Claude (Haiku) | New content scripts and weekly backup | 0117 steps 3 (new scripts only), 6 | new `scripts/content-verify.mjs`, `scripts/content-verify-solutions.mjs`, `scripts/content-import.mjs`, testable logic in new `apps/web/lib/content-db/import.ts` and `apps/web/lib/content-db/verify-db.ts` (+ tests), new `.github/workflows/content-backup.yml` |
| C12 | Claude (Haiku) | Follow/Mute per course and pattern | 0119 step 6 (Follow/Mute) | `apps/web/app/profile/settings/offline-content.tsx`, new `apps/web/lib/content-follow.ts` (+ test), `apps/web/lib/content-sync/desktop-notices.ts`, `apps/web/app/api/content/sync/route.ts`, `apps/web/app/profile/settings/actions.ts` if it exists (else a new `follow-actions.ts` beside it) |
| AG10 | Antigravity | "Write with AI" buttons in the editor | 0118 steps 3, 4, 4b, 6 | new `apps/web/app/admin/ai-actions.ts` (+ test), new `apps/web/app/admin/ai-assist.tsx`, the editor components under `apps/web/app/admin/problems/[id]/` (not test files), `apps/web/app/admin/page-editor/page-editor.tsx` (not the block editors, AG12 owns those), `apps/web/app/admin/study/[area]/[id]/`, `apps/web/app/admin/docs/` (only to place the button), `docs/content-editing.md` ("Writing with AI") |
| AG11 | Antigravity | Hosted-site checker and deploy runbook | 0117 step 1 preparation | new `scripts/content-check-hosted.mjs` (+ pure logic in new `apps/web/lib/content-sync/check-hosted.ts` and its test), new `docs/content-deploy.md`, `docs/hosting.md` (link + env table) |
| AG12 | Antigravity | Admin editor component tests and fixes found by them | 0116 acceptance criteria | new test files next to `apps/web/app/admin/page-editor/*.tsx` and `apps/web/app/admin/problems/[id]/*.tsx`; fixes only in `page-editor/block-toolbar.tsx`, `text-block-editor.tsx`, `code-block-editor.tsx`, `diagram-block-editor.tsx`, `image-block-editor.tsx` (AG10 owns the other editor files) |

Notes per task:

- **C10**: `stressFor(id): StressCase[] | undefined` reads only `stress*.ts` files (move the 14 inline `stress:` arrays
  from the 5 problem files into a new `stress-inline.ts`, keyed by id, and delete them from the specs). `JUDGE_PROBLEMS`
  keeps attaching stress through the registry, so the judge behaves the same. `lib/content-repo/stress.ts` uses
  `stressFor` and no longer imports `JUDGE_PROBLEMS`. Test: for every id, `stressFor(id)` equals what
  `JUDGE_PROBLEMS[id].stress` gave before (compare lengths and labels; `make` is a function). In
  `lib/admin-content/write.ts`, run `verifyEntity` (AG3's `content-model/verify.ts`) on the draft in `saveProblem`,
  `saveLesson`, `saveDoc`: `error` issues block the save with their messages; `warning` issues are returned in a new
  optional `warnings` field. Do not change anything else there.
- **C11**: `content:verify [--db <file>|--origin <url>]` runs `verifyContent` and exits 1 on errors (print each issue
  on one line). `content:verify-solutions [--ids …] [--lang …] [--brute]` runs every code block of every problem against
  its tests with the local judge (`apps/web/lib/judge/run.ts`), brute blocks without stress and time × 5; port the logic
  of `scripts/solutions-verify.mjs` but read code from the content DB (local `data/content.db` by default). `content:import
  <snapshot.db|pack.json> --url <libsql>`: owner only (needs `CONTENT_DATABASE_AUTH_TOKEN` for remote), writes through
  the write helpers with actor `import`, one `admin_audit` row per entity with action `import`, and bumps the content
  epoch (`content-sync/resync.ts` `bumpContentEpoch`). The weekly workflow runs `pnpm content:snapshot --out
  content-backup.db` from the hosted site and uploads it as an artifact (90 days). The lead adds the `package.json`
  entries.
- **C12**: store Follow/Mute per unit in the user DB settings table (key `content.follow` and `content.mute`, JSON lists
  of unit ids; look at how `apps/web/lib/synced-prefs.ts` / settings rows are read and written and reuse that). On
  desktop, the Settings card shows each unit with Follow / Mute (default: neither); started units are followed
  automatically unless muted. `desktop-notices.ts` and the sync route pass `follow` and `mute` into
  `followedUnitsDesktop`. Tests for the store and for a muted started unit giving no notice.
- **AG10**: follow 0118 steps 3, 4 and 4b exactly. The builders and parsers exist: `buildAdminPrompt`, `modesFor`,
  `parseAiAnswer` in `packages/shared/src/content-model/admin-ai.ts`. `buildAiPromptAction` and any "Ask my AI" action
  start with `requireAdminAction()` (guard test). The panel never saves: "Use this" changes the draft only.
- **AG11**: `content:check-hosted --origin <url>` calls `/api/content/version`, `/units`, one unit page and one problem,
  and prints counts, version, epoch and schema, with a clear pass/fail per step; optional `--expect-problems N`.
  `docs/content-deploy.md` is the owner's checklist, in plain steps: create the Turso content DB and its read-only and
  full tokens, set the Vercel env vars (`CONTENT_DATABASE_URL`, `CONTENT_DATABASE_AUTH_TOKEN`,
  `CONTENT_DATABASE_READ_TOKEN`, `ADMIN_USER_IDS`), deploy, run `pnpm content:seed-db --url <hosted>` once, run
  `pnpm content:check-hosted`, then build the desktop app (which downloads content from the site). Include what to do
  if a step fails.
- **AG12**: render-level tests for the page editor and problem editor (add/move/remove/duplicate a block, switch to the
  Markdown view and back without changes, code block language tabs, a diagram block showing a Mermaid error), using the
  component test style in `apps/web/app/content-page.test.tsx`. Fix bugs you find only in the files listed for you;
  list other bugs in your notes.

## Rules for every agent

1. Edit only the files you own (table above). Need a change elsewhere? Write it in your notes.
2. Do not edit `content-model/types.ts`, `rev.ts`, `index.ts`, `packages/shared/src/index.ts`, `lib/auth/admin*.ts`,
   `lib/content-repo/lookups.ts`, `vitest.config.mts`, `apps/web/test/*`, the root `package.json`, any plan or wave
   file, or `data/habit.db`. Do not delete any content file (that is C-2).
3. Fast checks only: `pnpm exec vitest run <your test files>`, `npx tsc --noEmit` in `apps/web` (and `packages/shared`
   if you changed it), `pnpm lint`; fix lint in your own files. Never run `pnpm test`, `pnpm check`, `pnpm build` or
   `pnpm desktop:build`.
4. Next 16 `cacheComponents`: cookies, `connection()`, `usePathname`/`useSearchParams` and user-DB reads only inside
   `<Suspense>`, never at the top of a page or layout. Client components never import server-only modules (for example
   `app/content-page.tsx`, `lib/highlight.ts`); use a server action instead.
5. No emoji or symbol characters in UI text (`apps/web/app/no-emoji.test.ts`): use the SVG icons in `app/ui.tsx`.
6. No `git commit`, `push`, `stash`, `checkout`, `reset` or branch changes.
7. When done, write `docs/plans/notes/wave3-<agent>.md`: files, test commands and results, deviations and why, callers
   outside your files that need wiring, questions.

## Lead review log

- **C12 done (checked):** Follow/Mute store `lib/content-follow.ts` (keys `content.follow`, `content.mute`), per-unit
  Default/Follow/Mute forms in the desktop Settings card (work without JS), used by the desktop sync notices. Lead
  wiring: `getDesktopContentSettings` (`app/profile/settings/offline-actions.ts`) now reads `getFollowMute` and
  `listUnits`, so the card gets `units`, `follow`, `mute`; removed AG9's second store (`content_follow_units` /
  `content_mute_units` and `setUnitFollowPreferenceAction`, no callers). Decision: Follow/Mute keep syncing between a
  person's devices like other settings (they are preferences, not device state).
- **C11 done (checked):** 21/21 tests; `content:verify`, `content:verify-solutions`, `content:import`, weekly backup
  workflow. Found that `verify.ts` (AG3, wave 1) reports 2,672 errors on content that passes the old tests: the port is
  wrong, not the content. Lead decisions: (1) told C10 to return verify issues as warnings only for now (no blocking);
  (2) new agent V1 fixes `verify.ts`: errors only for what breaks a page or the judge, completeness goals become
  warnings, rules checked on `lessonToShape` like the old tests, a test that the seeded content has zero errors, and the
  seed's duplicate lesson `ord` (51 courses) fixed. Pack problems then import without errors (their gaps are warnings);
  `--allow-errors` stays for old backups. A pack-lesson mapper is not in this round.
- **C10 done (checked):** 48/48 tests. Stress generators now come only from `stress*.ts` files (14 inline sets moved to
  `judge/stress-inline.ts`; 3 of them were already shadowed and never used); `content-repo/stress.ts` uses
  `stressFor`, no `JUDGE_PROBLEMS`. Lead: added the `@habit/shared/stress-registry` package export and switched the
  import. Admin saves run `verifyEntity` and return every issue as `warnings` (non-blocking until V1's fix). C10's note
  about the reading-doc rule (reads `body.url` on an array) was passed to V1.
- **AG11 done (checked):** 10/10 tests; `content:check-hosted` and `docs/content-deploy.md` (8 numbered steps with
  "If it fails"), `docs/hosting.md` env table and link. Answer: yes, `prepare-server.mjs` exits the desktop build when
  the content download fails. Turso CLI flags in the runbook are marked "check" (not confirmed from the repo).
- **AG12 done (checked):** 53 render-level tests for the page editor, block editors and test cases editor (no new
  dependencies: `react-dom/client` + `act`). Fixes in its files: removing a language tab that is not showing no longer
  jumps tabs; "Start from" in a diagram block asks before replacing a non-empty source (accepted). Lead fixed the two
  Markdown-view bugs it found in `page-markdown.ts`: two text blocks in a row merged, and an empty text block vanished.
  The format now has a `<!-- block -->` line (`BLOCK_BREAK`) before a text block that follows another, and for an empty
  one; both tests are normal tests now (80/80 with the page-markdown and admin-ai tests). Open (from AG12's notes, not
  fixed): quotes in captions/labels do not round-trip; test case JSON typed invalid is dropped on blur; the code
  block variant select shows "Optimized" when the variant is unset. `docs/content-editing.md` needs a line about
  `<!-- block -->` (after AG10 finishes with that file).
- **V1 done (checked):** `verify.ts` now reports 0 errors and 40 warnings (all "placeholder text") on the seeded
  content, down from 2,672 errors; errors only for page or judge breakers, completeness goals are warnings; old-test
  rules run on `lessonToShape`; reading-doc rule checks each array entry; seed gives each course's lessons distinct
  `ord`. New `verify-seed.test.ts` proves zero errors. 87/87 tests.
- **Lead after V1:** admin saves now BLOCK on verify errors (`checkDraft` in `lib/admin-content/write.ts`), warnings are
  returned. That exposed invalid shared test samples (`lib/content-db/fixtures.ts`): the Python sample lacked
  `twoSum`, the sample lesson had a diagram in the text-only Overview and no Interview questions part. Samples fixed;
  437/437 tests across content-db, content-sync, content-repo, admin-content, the content and admin routes.
- **AG10 done (checked):** "Write with AI" on the problem tabs, page editor (page, section, block), lesson and doc
  editors; `buildAiPromptAction` and `checkAiAnswerAction` start with `requireAdminAction`; 106/106 admin tests incl.
  the guard test. Lead: exported `parseAiAnswer` and `BLOCK_BREAK` from the barrel and switched AG10's relative import;
  documented `<!-- block -->` in `docs/content-editing.md`. Not built: "Ask my AI" (0118 step 4b); no button for course
  summaries (there is no course summary editor); a statement-page prompt is labelled "solution-page"; the "Changed by
  AI answer" label is not cleared on save; without JS the AI button does nothing.
- **`pnpm check` (2026-11-26): passed** after all of round C part 1: lint, typecheck, 2,899 tests passed / 20 skipped
  (230 files), build 313 pages. (An earlier run was cut off mid-test when the session paused; the Java compile tests it
  showed as failing pass on their own.) Part 2 (deleting the content files) waits on the owner's deploy and one-time
  fill of the hosted content database (`docs/content-deploy.md`).

## Hosted content database live (2026-11-27)

- Lead, with the owner's sign-in: installed the Vercel CLI and the Turso CLI (in WSL), created Turso
  `zen-dojo-content` (group `zen-dojo`, aws-ap-south-1), set Vercel Production `CONTENT_DATABASE_URL`,
  `CONTENT_DATABASE_AUTH_TOKEN` (full) and `CONTENT_DATABASE_READ_TOKEN` (read-only); tokens were piped, never printed.
  Filled once with `pnpm content:seed-db --url …` (a 1-day token): 817 entities, version 817, 266 s. The setup's
  remote migrations worked on first real use.
- Commits on main: `2d18136` (all of this work), `4f6846e` (`.vercelignore`: upload the desktop and extension
  `package.json`, pnpm on Vercel now refuses a lockfile listing workspaces it cannot see), `1bd89c0` (units list in a
  few summing queries instead of ~800 entity loads, which timed out after 2 minutes; functions moved to `bom1` Mumbai,
  next to every Turso database, via `apps/web/vercel.json`).
- Live checks: `pnpm content:check-hosted --origin https://zen-dojo-lovat.vercel.app --expect-problems 486`: 5/5 pass.
  `/admin` signed out redirects to `/login?next=/admin`; admin APIs 401; `/api/content/sync` 404 on hosted.
  Timings after the region move (second request): DSA list 1.1 s, a lesson 0.7 s, units list 0.3 s.
- Follow-ups: a problem page still takes 5 to 7 s (not investigated; check whether the signed-out guest database is
  rebuilt per request); unit pages load entities one by one (33 s for `course:dsa-patterns`, cached by the CDN per
  version afterwards) and want a bulk loader before many desktop installs pull at once.
- Part 2 of round C (delete the content files) is now unblocked.

## Round C part 2: content files deleted (2026-11-27)

- Lead, after the owner said "Yes, start part 2". Plan 0117 steps 1, 3, 5, 7 (details in the plan's notes).
- Parity, hosted snapshot (version 817) vs the repo files: 817 = 817 entities, 0 differences. Frozen copy
  `data/content-snapshot-817.db` (owner's machine, git-ignored).
- Fixed on the way: `content-snapshot.mjs` could not load `@libsql/client` from the repo root (the desktop build's
  content download would have failed) and hit Windows EBUSY on rename.
- `packages/shared` 21 MB to 2.7 MB; about 2,600 files deleted. Tests read the committed fixture (41 problems,
  13 lessons, 1.6 MB).
- **`pnpm check` passed:** lint, typecheck, 2,039 tests passed / 10 skipped (211 files), build 312 pages; 4 min 8 s in
  all. Vitest alone took 172 s (it was about 3.5 to 4 min before; the judge tests still compile C++ and Java).
  `pnpm content:verify --db data/content-snapshot-817.db`: 0 errors, 40 warnings. `content:verify-solutions` was not
  run in this round.
- Follow-ups: cp-algorithms article files still in `apps/web/content/`; no replacement for the lesson code compile
  checks; plan 0117 step 4 (admin pack import screen) not built; snapshot not yet attached to a release; problem page
  latency and the bulk unit loader from the previous section.
