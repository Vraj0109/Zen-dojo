# 0117: Cutover: delete the content files, retire the content scripts, new checks and backups

- **Status:** implemented (round C part 2, 2026-11-27; step 4 not built, see notes)
- **Planned by:** Claude Code, 2026-11-23
- **Implemented by:** Claude Code (lead), rounds A to C; see docs/plans/wave1-, wave2-, wave2b-, wave3-content-db.md
- **Series:** content in the database (0112 to 0119), overview `docs/architecture/content-in-db.md`.
- **Needs:** 0112 to 0116 all `done`, the hosted content DB seeded and live, and at least one desktop release with
  0115 (so installed apps already update content on their own).

## Goal

The content database is the only copy of the content. The content files, the generated bundles and the scripts that
built them leave the repo, so a content fix never needs a commit, push or release again. The checks that today live in
`learn/learn.test.ts` and the `solutions:*` scripts keep protecting content quality, but they now run against the
database (on every admin save and on demand). `pnpm test` gets much faster because it no longer compiles every
reference solution.

## Context

- Decision with the user (2026-11-23): delete the files after cutover. The repo keeps only a small test fixture and
  the release build downloads the real snapshot.
- What goes (verify each path exists first; the 0112 step 1 inventory is the full list):
  - `packages/shared/content/` (`core/`, `interview/`, `lld/`, `sd/`, `solutions/`).
  - `packages/shared/src/judge/problems-*.ts`, `judge/generated/` (`solutions.ts`, `interview.ts`),
    `judge/solution-groups.ts` and its test, the parts of `judge/index.ts` and `judge/solutions.ts` that export content.
  - Content files in `packages/shared/src/learn/` (`dsa-*`, `design-*`, `designs-*`, `lld-*`, `diagram-sources.ts`,
    `generated/`, …), and the content constants in `study.ts`, `reading.ts`, `revise.ts`, `cp-algorithms.ts`,
    `thinking-map.ts`.
- What stays: types (`judge/types.ts`, `learn/types.ts`, `content-model/`), the Markdown parser, judge templates,
  **stress generators** (`judge/stress*.ts`, still keyed by problem id), app logic (`plan.ts`, `plan-weeks.ts`,
  `focus.ts`, `game.ts`, `stats.ts`, …). Where app logic names content ids (for example `focus.ts` week focus lists,
  `plan.ts` task links), those ids are checked against the DB by `content:verify` (step 3).
- `pnpm test` today takes about 4 minutes because it compiles all C++ demos and Java LLD systems (`CLAUDE.md`). Those
  tests move to `content:verify-solutions`, which reads code from the DB.
- User-installed content packs (`docs/content-packs.md`, `lib/packs.ts`, user DB tables) stay: they are a user's own
  extra content. The admin can also import a pack into the shared content DB (step 4).

## Out of scope

- New features. Changing the content itself. Removing user-installed packs.

## Steps

- [x] **1. Final parity and a frozen backup.** Before deleting anything: run the 0112 parity test against the
  **hosted** content DB (`CONTENT_DATABASE_URL` set) and record the result; any difference must be an admin edit made
  since the seed (list them in the notes). Then `pnpm content:snapshot --out content-snapshot-final.db` and attach it
  to the GitHub release of the next version as `content-snapshot-<content_version>.db` (desktop workflow, step 5).
  - Done when: parity result and the snapshot location are in the notes.
- [x] **2. Pure content checks.** Move the coverage rules from `packages/shared/src/learn/learn.test.ts`,
  `learn/order-audit.test.ts`, `learn/pattern-articles.test.ts`, `learn/design-depth.test.ts`,
  `judge/solutions.test.ts`, `judge/interview.test.ts` (and any other test that checks "every item has its content")
  into `packages/shared/src/content-model/verify.ts`: `verifyContent(snapshot) → Issue[]` (`{ level: "error" |
  "warning", entity, id, message }`) and `verifyEntity(entity, context) → Issue[]` for one entity. Examples of rules:
  every problem has an optimal block with C++, a brute block or an "already optimal" note, 3+ hints, examples;
  every lesson in a course exists and is in order; every concept and pattern id referenced by `focus.ts`/`plan.ts`
  exists. Write the list of moved rules in the notes so nothing is lost.
  - Unit tests in `verify.test.ts` run each rule on the fixture plus a broken copy.
  - Admin saves (0116 `lib/content-admin/write.ts`) run `verifyEntity`: errors block the save, warnings are shown.
  - Done when: every rule from the old tests is in the list, and `pnpm exec vitest run packages/shared/src/content-model`
    passes.
- [x] **3. New scripts, old scripts removed.** In the root `package.json`:
  - Add `content:pull` (0115), `content:snapshot` (0115), `content:fixture` (0114),
    `content:verify` (runs `verifyContent` on a snapshot: `--db <file>` or the hosted origin; exit 1 on errors),
    `content:verify-solutions` (desktop/dev only: runs every code block of every problem against its tests with the
    local judge, brute blocks without stress and with time × 5; `--ids`, `--lang`, `--brute`; replaces
    `solutions:verify`, port `scripts/solutions-verify.mjs`), and `content:import <snapshot.db|pack.json>` (owner only:
    needs `CONTENT_DATABASE_AUTH_TOKEN`; writes through the 0112 write helpers with actor `import` and an audit row).
  - Remove `content:build`, `content:check`, `content:add`, `content:sync`, `content:list`, `content:remove`,
    `content:export`, `content:seed`, `content:seed-db`, `solutions:*`, `interview:*`, `pack:build`, `faq:build` and
    `courses:catalog` **only if** they build content (check each; keep any that build app code) and their script files
    in `scripts/`. Keep `pack:check` (user packs) and `import:cp-algorithms` only if still needed (decide and note).
  - Remove the per-user `content_items` path: `lib/content.ts`, `lib/content-admin.ts`, `app/api/admin/content/route.ts`
    (0116 replaced it). Do **not** drop the `content_items` table: add a new migration in `lib/db.ts` that leaves it
    in place (never edit shipped migrations); note it as unused. If a user has rows there with `source != "builtin"`,
    `content:import` can take an exported JSON (document how) and nothing is lost.
  - Done when: `pnpm run` lists only the new content scripts, and `grep -rn "content:build\|solutions:build\|interview:build"`
    finds nothing outside `docs/plans/` and `docs/releases/`.
- [ ] **4. Pack import for admins.** On `/admin` add **Import pack into shared content** (upload a pack JSON, validate
  with `packages/shared/src/packs.ts`, preview the list of entities, then save each through the 0116 write path with
  action `import`). Admin checks as in 0113. `docs/content-packs.md` gets a section for it.
  - Done when: importing the example pack in `docs/examples/` adds its problems and lessons for everyone.
- [x] **5. Delete the content files and fix the build.** Delete the paths from *Context*. Remove now-dead exports from
  `packages/shared/src/index.ts`, `judge/index.ts`, `learn/index.ts`. Fix every compile error by reading through the
  0114 repository (there should be none left if 0114 was complete; list any you find). Update tests that still imported
  content to use the fixture (`seedFixture`). Run `pnpm -r typecheck` until clean.
  - CI (`.github/workflows/ci.yml`): builds use the fixture through `ensure-content-db.mjs` (0114).
  - Desktop release (`.github/workflows/desktop.yml`): `content:snapshot` from the hosted site, then
    `content:verify --db apps/desktop/resources/content.db` (fails the release on errors), and attach the snapshot to
    the GitHub release.
  - Done when: `pnpm -r typecheck` and a targeted test run pass, and `du -sh packages/shared` is several MB smaller.
- [x] **6. Backups.** `.github/workflows/content-backup.yml`: weekly (and on manual dispatch) runs
  `content:snapshot` from the hosted site and uploads it as a workflow artifact (90-day retention). Document restore:
  `content:import <snapshot.db>` (owner, write token) and that every import is in the audit log.
  - Done when: a manual dispatch produces an artifact.
- [x] **7. Docs and agent rules.** Update `AGENTS.md` ("Layout": content now lives in the content DB; remove the
  `learn/`, `dsa.ts` content descriptions that no longer apply; "Commands": `pnpm test` no longer compiles all demos,
  new `content:*` commands; `docs/solutions.md` replaced), `CLAUDE.md` speed rules (update the "71 C++ programs"
  numbers), `GEMINI.md` if it repeats them, `docs/content-editing.md`, `docs/solutions.md` (rewrite as "Checking
  solutions": `content:verify-solutions`), `docs/content-packs.md`, `docs/HANDOFF.md`, and release notes for the
  version (`docs/releases/vX.Y.Z.md`: "Content updates now arrive without an app update").
  - Done when: `grep -rn "packages/shared/content" AGENTS.md CLAUDE.md GEMINI.md docs/*.md` finds nothing stale.
- [ ] **8. Tests and timing.** Run `pnpm check` once. Record in the notes how long `pnpm test` takes before and after.
  Run `pnpm content:verify` against the hosted origin and `pnpm content:verify-solutions --ids <10 ids>` on desktop and
  record both.
  - Done when: `pnpm check` passes and the numbers are in the notes.

## Acceptance criteria

- [ ] No content files or generated content bundles remain in the repo; the app, the desktop build and CI still work.
- [ ] A fresh desktop install from the new release has full content offline and receives later admin edits.
- [ ] `pnpm content:verify` reports no errors on the hosted content; admin saves that break a rule are refused with a
      clear message.
- [ ] `pnpm test` is clearly faster (numbers in the notes).
- [ ] A weekly content backup exists and the restore path is documented.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

Round C part 2 (lead, 2026-11-27):

- **Step 1.** `pnpm content:snapshot` from https://zen-dojo-lovat.vercel.app: 79 units, 817 entities, version 817,
  epoch 1. Parity against a seed of the repo files (scratch script, every course, lesson, problem and doc compared by
  rev): 817 vs 817, 0 only-in-files, 0 only-in-snapshot, 0 different. No admin edits had been made since the seed. The
  frozen copy is `data/content-snapshot-817.db` (git-ignored, owner's machine). Not yet attached to a GitHub release
  (no release in this round). Two bugs fixed in `scripts/content-snapshot.mjs` on the way: it imported `@libsql/client`
  from the repo root, where it is not installed (so the desktop build's content download could not have worked), and
  the final rename failed on Windows with EBUSY (now built in memory and written with `VACUUM INTO`).
- **Step 2** was done in round C part 1 (V1, C10). Rules that lived in deleted tests and are now only in `verify.ts`
  or nowhere: see "Found but not changed".
- **Step 3.** Removed from `package.json` and `scripts/`: `content:build|check|add|sync|list|remove|export|seed|seed-db`,
  `solutions:*`, `interview:*`, `import:cp-algorithms`. Kept `pack:check`, `pack:build`, `courses:catalog` (user packs)
  and `faq:build` (app code). Removed the `content_items` path: `lib/content.ts`, `lib/content-admin.ts`,
  `app/api/admin/content/route.ts` (+ tests), `packages/shared/src/content-items.ts`, the old unused admin actions
  (`saveProblemAction` and friends, `app/admin/study-actions.ts`) and the DSA page's "added problems" list. The
  `content_items` table stays (no migration needed: nothing drops it) and stays in `BACKUP_TABLES`; past "items" pack
  solves still count in the roadmap week totals (`lib/roadmap.ts`).
- **Step 4 not built:** no "Import pack into shared content" screen in `/admin`. `pnpm content:import <pack.json>`
  (owner, write token) covers it from the command line.
- **Step 5.** Deleted `packages/shared/content/`, `judge/problems-*.ts`, `judge/generated/`, `judge/solutions.ts`,
  `solution-groups.ts`, the content in `learn/` (types kept), and the data in `dsa.ts`, `study.ts`, `reading.ts`,
  `revise.ts`, `cp-algorithms.ts`, `thinking-map.ts` (types and helpers kept; `currentPhase` now takes the plan). Also
  `apps/web/lib/content-db/seed.ts` (+ tests). `packages/shared` went from about 21 MB to 2.7 MB. `validatePack` takes
  the known pattern and concept ids as an argument (`PackKnown`); the app passes them from the content database
  (`packKnown()` in `lib/packs.ts`). Tests: the vitest global setup now loads the committed fixture; the fixture script
  reads a content database (`pnpm content:fixture --db <file>`) with a fixed id list (41 problems, 4 courses, 13
  lessons, 17 docs; roadmap, pattern groups and reading list whole; 1.6 MB). New helpers `fixtureSpec`,
  `fixtureLesson`, `fixtureDoc` (`lib/content-db/test-helpers.ts`) and `content-model/fixture-for-tests.ts`. Content
  repo mocks built from the old constants were removed from about 20 test files. Deleted as pure content checks:
  `learn/*.test.ts`, `judge/solutions.test.ts`, `interview.test.ts`, `thinking-map.test.ts`, `diagrams-parse`,
  `core-code`, `design-code`, `pattern-article-code`, `lld-projects`, `solutions-files`, `solutions-verify` tests.
  Desktop workflow: `pnpm content:verify --db apps/desktop/resources/content.db` after the build (0 errors, 40 warnings
  on the hosted content today).
- **Step 6** was done in round C part 1 (C11, `content-backup.yml`); a manual dispatch has not been run yet.
- **Step 7.** `AGENTS.md`, `CLAUDE.md`, `docs/solutions.md` (rewritten as "Checking solutions"), `content-packs.md`,
  `hosting.md`, `HANDOFF.md`, `development-performance.md`, the in-app FAQ (`lib/faq.ts`, `docs/faq.md`), release notes
  `docs/releases/v0.9.6.md` (version not bumped).
- **Step 8:** see the wave 3 log for the `pnpm check` result and timing.

### Found but not changed

- `apps/web/content/cp-algorithms/` (61 imported cp-algorithms.com articles, 5.8 MB) are still files read at run time;
  only the pattern-to-article map is in the database. The importer was removed with the map. Moving the articles into
  the content database is a follow-up.
- The deleted compile tests (Java demos in lessons, design Java, pattern article C++, LLD projects, diagram parsing)
  have no replacement: `content:verify-solutions` runs problem code only. A follow-up could run lesson code blocks and
  diagrams too.
- Root `package.json` still lists `katex` and `marked` (only the removed importer used them at the root); left to
  avoid a lockfile change.

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
