# Wave 3, agent C11: content scripts, import, verify, weekly backup

Row C11 of `docs/plans/wave3-content-db.md`. Plan steps 0117 step 3 (new scripts only) and step 6.

## Files

Created (no other file edited; the root `package.json` already had the `content:verify`, `content:verify-solutions`,
`content:import` entries from the lead):

- `apps/web/lib/content-db/verify-db.ts`: `loadSnapshotFromDb(db)`, `verifyDb(db)`, `loadLiveProblems(db)`,
  `openContentFile(file)` (read-only open, no migrations), and the pure solution selection `selectSolutionJobs`,
  `missingSolutionIds`, `SKIP_STRESS_LINE`, `BRUTE_TIME_MULTIPLIER`.
- `apps/web/lib/content-db/verify-db.test.ts`: 14 tests (selection rules, load, soft delete, parity with
  `verifyContent` on the fixture, a broken problem is reported).
- `apps/web/lib/content-db/import.ts`: `importSnapshot(db, snapshot, opts)`, `packToSnapshot(json)`, `importPack(db, json, opts)`.
- `apps/web/lib/content-db/import.test.ts`: 7 tests (writes, audit rows, epoch, repeated import, schema refusal, pack).
- `scripts/content-verify.mjs`: `--db <file>` (default `data/content.db`) or `--origin <url>` (downloads with
  `scripts/content-snapshot.mjs` into a temp dir, removed afterwards).
- `scripts/content-verify-solutions.mjs`: `[--ids a,b] [--lang x[,y]] [--brute] [--db <file>]`.
- `scripts/content-import.mjs`: `<snapshot.db|pack.json> [--url <libsql>] [--allow-errors]`.
- `.github/workflows/content-backup.yml`: weekly cron (Mondays 03:17 UTC) and `workflow_dispatch`; same setup steps as
  `ci.yml` (minus Java); runs `node --import ./scripts/lib/register-ts.mjs scripts/content-snapshot.mjs --out content-backup.db`;
  uploads `content-backup.db*` with `retention-days: 90`.

## Test and check results

- `pnpm exec vitest run apps/web/lib/content-db/import.test.ts apps/web/lib/content-db/verify-db.test.ts`: 2 files, 21 tests, all pass.
- `cd apps/web && npx tsc --noEmit`: exit 0.
- `pnpm lint`: first run failed with ENOENT on `apps/web/lib/admin-content/zz-probe.test.ts`, a file another agent was
  creating and deleting. Second run passed. My four TypeScript files also pass `npx eslint` directly.
- `node --check` on the three new `.mjs` scripts: OK.
- The workflow was not run on GitHub (no dispatch from here).

## content:verify on data/content.db (read-only)

Command: `node scripts/content-verify.mjs --db data/content.db` (exit 1).

```
content version 834, schema 1, 1 images
entities: 4 courses, 287 lessons, 486 problems, 40 docs
2672 errors, 0 warnings
```

Error groups (count, message pattern):

- 679 Unexpected section "X" in pattern article
- 608 Pattern article missing required section "X" in order
- 532 Duplicate section title "X" in pattern article
- 338 Design section "X" is too short
- 244 Pattern article section "X" body too short
- 76 Pattern article has N sections with code (expected at least N)
- 76 Pattern article has N prose words (expected at least N)
- 51 Course has duplicate lesson ord N
- 27 Design walkthrough missing required sections
- about 20 "Block <id> has placeholder text" and 1 reading link not HTTPS

This is not a database round-trip bug. Running the same rules on the file-based seed content
(`buildSeedEntities()` from `apps/web/lib/content-db/seed.ts`) gives 2672 issues with the same groups. So the rules
(ported from the old tests) flag the current content. Decision needed before step 5 of 0117 (the desktop release
gate would fail).

## content:verify-solutions smoke test

`node scripts/content-verify-solutions.mjs --ids lc-1 --lang python` gives `ok lc-1 python brute 0.4s`,
`ok lc-1 python optimal 9.2s`, `2 ok, 0 failed of 2 code blocks`. The full run over all problems was not started (long).

## content:import smoke test (scratch database, not data/content.db)

- `content:import docs/examples/sample-pack.json` without `--allow-errors` is refused (exit 1): the pack's problems
  fail the quality rules (hints at least 3, brute solution, optimal C++).
- With `--allow-errors` into a scratch file DB: first run `2 changed`, epoch `1 -> 2`; second run `0 changed, 2 unchanged`,
  epoch `2 -> 3`. `content:verify` on that scratch DB gives 0 errors for its items plus the rule errors above.
- `content:import data/content.db --url <scratch>` is refused (exit 1) because of the 2672 errors; nothing is written.

## Deviations from the brief and why

1. `importSnapshot(db, snapshot, opts)` takes no `AdminProof`. The owner's CLI has no admin check, so the audit actor is
   fixed to `owner` (`actor_id`, `actor_name`). `writeAudit` requires an AdminProof, so audit rows are inserted directly
   into `admin_audit` in the same transaction as the write (the same way `bumpContentEpoch` does).
2. Audit rows are written only for entities that changed. An unchanged entity writes nothing (the write helpers return
   `changed: false`). The brief's "one admin_audit row per entity" is read as "per written entity".
3. The epoch bump uses `bumpContentEpoch`, so each import run also writes one `resync` audit row (actor `owner`).
   A repeated import therefore adds one `resync` row and no `import` rows.
4. `importPack` converts problems only (`packProblemSpec` plus `problemFromSpec`; difficulty and first pattern kept).
   Pack lessons and patches are reported as warnings and not imported: the mapper from pack markdown to a lesson page
   does not exist yet.
5. `content:verify-solutions` runs every code block by default (brute and optimal, every language). `--brute` keeps only
   brute blocks. The old `solutions:verify` ran only optimal blocks unless `--brute` was given. Brute blocks run without
   stress and with the time limit times five. Blocks without a variant are display-only and skipped. The script reads
   `--db` (default `data/content.db`); it has no `--origin` and no `--group`.
6. `content:verify-solutions` prints one line per problem, language and block (not per problem and language), then a summary.
7. `content:import` refuses an input with verify errors unless `--allow-errors` is given. Packs are checked with
   `checkRoadmapFocus: false`, because the roadmap coverage rule would fail any small pack.
8. `content:verify --origin` runs `scripts/content-snapshot.mjs` as a child process (no refactor of that script). Not
   run here (no network access in this session); only `--db` was run.
9. `content:import` accepts a `.db` snapshot or a `.json` pack. A JSON snapshot (entities list) is not supported.

## Questions for the lead

1. The 2672 verify errors above: fix the content, or relax/port the rules? The desktop release gate (0117 step 5) uses
   `content:verify` and will fail until this is decided.
2. Pack problems cannot pass the quality rules as written: a pack has no brute solution and no C++ optimal solution
   field used by the rules, and rules need at least 3 hints. Should pack problems be exempt, or should the pack format
   require those fields? This affects the admin pack import (0117 step 4).
3. Pack lessons: is a pack-markdown-to-lesson mapper wanted in this round (it belongs with step 4), or may it wait?
4. `--allow-errors` on `content:import` exists for backups that predate a rule; say if you want it removed.
5. The lint failure during my run came from another agent's transient `zz-probe.test.ts`; nothing of mine was involved.
