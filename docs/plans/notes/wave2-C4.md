# Wave 2, row C4: seed, parity test, test fixture

Plan 0112 steps 5 to 7 (seed command, parity test) and 0114 step 7 (fixture part). Owner files only.

## Files created

- `apps/web/lib/content-db/seed.ts`: `seedContent(db, { actor, batch, dryRun, seededFrom })` → report (counts per table,
  `changed`, `unchanged`, `changedByKind`, `version`). Also the pure builders the script and tests use: `buildSeedEntities`,
  `problemEntities`, `lessonSources` (287 lesson values with their course and order), `lessonEntities`, `docSources` /
  `docEntities` (39 docs), `courseEntities` (3 study areas + `dsa-patterns`), `problemExtraOf`, `roadmapPatternOf`,
  `countTables`. Not `server-only` (the script imports it; the other content-db files keep the marker).
- `apps/web/lib/content-db/seed.test.ts`: parity (6 tests) and the fixture round trip (1 test).
- `apps/web/lib/content-db/test-helpers.ts`: `loadFixtureSnapshot()`, `seedFixture(db, actor = "fixture")`.
- `scripts/content-seed-db.mjs`: `--url <libsql url>` (token from `CONTENT_DATABASE_AUTH_TOKEN`), else `data/content.db`;
  `--dry-run`. Sets `content_meta.seeded_from` to `git rev-parse HEAD`.
- `scripts/content-fixture.mjs`: writes the fixture from an in-memory seeded DB (reads back through `loadProblem`,
  `loadLesson`, `loadCourse`, `loadDoc`).
- `packages/shared/test/fixtures/content-mini.json`: 12 problems, 3 courses, 6 lessons, 16 docs, 1 asset. 505 KB.

No other file was changed. `write.ts`, `types.ts`, the barrels, root `package.json` and plan files are untouched.
`data/habit.db` was never opened. No git state changed.

## Test and check results

- `pnpm exec vitest run apps/web/lib/content-db/seed.test.ts`: `Test Files 1 passed (1)`, `Tests 7 passed (7)`, about 10 to 13 s.
  The parity test seeds `:memory:` once (about 3 s), then checks: 486 judge specs (`specFromContent` equals the file spec,
  stress excluded), every solution block's cpp/java/python optimal and brute code equals `solutionCode`/`bruteCode`, all
  287 lessons through `lessonToShape`, all 39 docs, and a second run that reports `0 changed`. Mismatches print the first 5.
  It runs no code and compiles nothing.
- `cd apps/web && npx tsc --noEmit`: no errors in C4 files. One error in another agent's file at the time of the run:
  `lib/content-sync/serve.ts(189,127)`: `Property 'title' does not exist on type 'Pattern'` (C6). Earlier in the run, errors
  appeared in `app/api/content/*/route.ts` (C5 routes); they were gone on the rerun.
- `pnpm lint`: clean (after fixing one unused variable in my test).
- Not run: `pnpm test`, `pnpm check`, `pnpm build`.

## Seed script runs (temp file DB, `file:C:/Users/bhavn/AppData/Local/Temp/zd-seed-test.db`)

The file was deleted first. Dry run, then two real runs. Output is the script's own output.

Dry run (`--dry-run`):
```
content:seed-db  target file:C:/Users/bhavn/AppData/Local/Temp/zd-seed-test.db  (dry run: nothing written)
rows from the files:
  courses             4
  lessons           287
  page_sections    8915
  blocks          14150
  block_code       2759
  problems          486
  test_cases       4363
  hints            1884
  docs               39
  assets              0
816 changed, 0 unchanged
  by kind: course 4, lesson 287, problem 486, doc 39
final content version: 816
done in 2.6 s
```

Run 1 (real):
```
content:seed-db  target file:C:/Users/bhavn/AppData/Local/Temp/zd-seed-test.db
rows from the files:
  courses             4
  lessons           287
  page_sections    8915
  blocks          14150
  block_code       2759
  problems          486
  test_cases       4363
  hints            1884
  docs               39
  assets              0
816 changed, 0 unchanged
  by kind: course 4, lesson 287, problem 486, doc 39
final content version: 816
done in 4.0 s
```

Run 2 (real, same file):
```
content:seed-db  target file:C:/Users/bhavn/AppData/Local/Temp/zd-seed-test.db
rows from the files:
  (same counts as above)
0 changed, 816 unchanged
  by kind: course 0, lesson 0, problem 0, doc 0
final content version: 816
done in 0.7 s
```

Checked afterwards with a read of the temp file: `content_meta` has `content_version=816`, `schema_version=1`,
`seeded_from=c69bfc1375169073f49f692bea9e31351cfbe3df` (the HEAD at the time), `changes` has 816 rows, `user_version` is 1.

The dry run first showed `final content version: 50`. That was a bug (the highest rolled-back version of one batch).
Fixed: a dry run now reports the current version plus the number of changes.

## Deviations from the plan, and why

1. **Pattern filled into `problems.pattern` where the spec has none (445 problems).** Plan says fill it from the roadmap
   list where ids match. Consequence: `specFromContent` reports a `pattern` key for those 445 problems, which the spec
   does not have. The judge never reads `pattern` (grep of `packages/shared/src/judge` and `apps/web/lib/judge`: no uses),
   so behaviour is unchanged. The parity test checks `pattern` on its own: when the spec has one it must match; when not,
   it must equal the roadmap pattern. The judge fields are compared without it. Lead to decide (see question 1).
2. **`courseFromStudyArea` imported by relative path** from `packages/shared/src/content-model/lesson-map`. It is not in
   the barrel. Same for `BRUTE` and `SOLUTIONS`: they come from `@habit/shared/solutions`, the entry point the app uses.
   Both work in the script (through the register hook) and in vitest. Lead may export the first from the barrel.
3. **`dsa-problems` is a doc kind that `DOC_KINDS` (lesson-map.ts) does not list.** The seed builds that doc directly as
   `{ row: { kind: "dsa-problems", id: "main", body: PROBLEMS } }`. Lead to add it to `DOC_KINDS` (question 2).
4. **Doc ids.** Each single constant is doc `(kind, "main")`. LLD projects use the lesson id (24 docs). So 14 + 24 + 1 = 39.
5. **Dry run** runs each batch in a transaction that is rolled back (the write helpers return what they would change).
   No write reaches the database. `version` on a dry run is `current + changed`.
6. **Writes go through `getContentDb(env)`, not `getContentWriteDb(proof)`.** The seed is a command run by the lead with
   the write token, not an admin action, and there is no `AdminProof` for a script. `seedContent` takes the open DB and
   the write helpers only. Lead to confirm this is what the hosted seed should do (question 3).
7. **Lesson titles and order.** Concepts: title from the study area, order = index across the area's sections. Design and
   LLD: exercise title and index in the area's exercises. Pattern guides: pattern name, order = index in `ALL_PATTERNS`.
   Articles: `"<name> (article)"`, order 1000 + that index. Concept checklist texts are the point section titles.
8. **Course `dsa-patterns`**: title "DSA patterns", summary a fixed sentence in `seed.ts`, area `dsa`, last in order.
9. **Fixture contents** (`scripts/content-fixture.mjs`):
   - Problems: 2 design (`lc-146`, `lc-1146`, the first two by id), 1 brute-same function problem, 3 function problems with
     Java, Python and brute in all languages, then 6 more function problems (one per source first). Picked from the DB.
   - Lessons: the first 2 by order in each of `sd`, `lld`, `dsa-patterns`.
   - Docs: one per kind, lists and objects cut to their first 3 entries (`trim`), so bodies are not full copies. One LLD
     project (the first one in the list). This is a test fixture, so a trimmed body is intentional; `expectedOutput` of
     that project therefore does not match its code. Tests must not run the project.
   - Asset: one 1x1 PNG (67 bytes), attached as an image block (`fixture-image-block`) to the first section of the first
     lesson. The repo files have no images, so this is the only asset. Its id is the SHA-256 of the bytes.
   - `snapshot.version` = number of entities (matches the seed convention). `schema` = `CONTENT_SCHEMA_VERSION`.
   - Size: 505 KB. Largest entries: lesson `lldp-parking-lot` (54 KB), problem `lc-146` (21 KB), the LLD project doc (18 KB).
10. **Test helper** `seedFixture(db)` writes assets first (checks each id matches its bytes), then courses, lessons,
    problems and docs, in one transaction. The fixture round-trip test checks every entity reads back equal.

## Setup the lead needs to do

- Root `package.json` (not mine): add
  - `"content:seed-db": "node --disable-warning=DEP0205 --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/lib/register-ts.mjs scripts/content-seed-db.mjs"`
  - `"content:fixture": "node --disable-warning=DEP0205 --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/lib/register-ts.mjs scripts/content-fixture.mjs"`
- `packages/shared/src/content-model/index.ts` (lead): nothing needed for C4's files, except the optional export in deviation 2.
- Hosted seed (plan 0112 step 7 docs): `CONTENT_DATABASE_AUTH_TOKEN` is the write token; `--url` takes the `libsql://` URL,
  which `contentDatabaseUrl` converts to `https://`.

## Questions for the lead

1. **Roadmap pattern in `specFromContent`.** 445 problems get a `pattern` back that their spec does not have. Options:
   (a) keep it (judge ignores it, parity test allows it), (b) keep the roadmap pattern in a row column but have
   `to-spec.ts` drop it when `row.extra` says the spec had none (needs a `to-spec.ts` change, a wave 1 file), or
   (c) do not fill `problems.pattern` at all and derive units from the roadmap in code. I suggest (a) for now.
2. **`dsa-problems` in `DOC_KINDS`.** The roadmap list is written as doc `dsa-problems` (id `main`). Add it to `DOC_KINDS`
   in `lesson-map.ts` (wave 1 file) so the kind list is complete.
3. **Seed auth.** Should the seed stay without an `AdminProof` (CLI with the write token), as built? Or should the hosted
   seed go through an admin check later?
4. **Export `courseFromStudyArea`** (and optionally `BRUTE`, `SOLUTIONS`) from the barrel, so seed.ts can import them
   without relative paths.
5. **The 10 extra roadmap entries.** `PROBLEMS` in `dsa.ts` is written whole as doc `dsa-problems`, including entries that
   have no spec. Expected, per wave 1 question 1; confirm.

## Found but not changed

- `scripts/content-seed-db.mjs` and `seed.ts` were changed on disk by someone else during my run (just formatting-level
  differences as far as I could see). I kept the current content and re-ran the tests after each change. Lead to check
  that nothing was lost.
- Pattern guides have no title field; the seed takes the title from `ALL_PATTERNS` (dsa.ts). When DSA_GROUPS changes, the
  DB keeps the old title until the seed runs again (the rev changes, so the next seed updates it). Fine for now.
- The legacy `content:seed` command in `scripts/content.mjs` (copies built-in problems into the per-user DB) is unrelated
  and was not touched.
