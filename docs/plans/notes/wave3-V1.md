# Wave 3, agent V1: verify.ts severity and shapes, seed lesson ord

Lead brief: fix `packages/shared/src/content-model/verify.ts` so today's content passes, using the learn/ shapes
(`lessonToShape`) for the old-test rules. Fix the duplicate lesson ord in the seed. Add a zero-error seed test.

## Result

- `content:verify` on a temp copy seeded with `scripts/content-seed-db.mjs --url file:<temp>`:
  **0 errors, 40 warnings**. Before: 2,672 errors.
- All 40 warnings are "Block <id> has placeholder text" (39 markdown, 1 code block with `text` language). These are real
  placeholder-looking strings in content (the regex matches "…" as well as TODO/FIXME), so they are left for the content
  owner.
- Warnings from every other rule: none fire on the seeded content. The rules are covered by unit tests in
  `verify.test.ts` and `verify-db.test.ts`.
- Seed: the duplicate-ord error (51 courses before) is gone. Exercises now get ords after the area's concepts.

Output saved at `C:\Users\bhavn\AppData\Local\Temp\claude\fe4a917dc693297f\d265297c-05a9-4b5b-88b5-bc862bdd665f\scratchpad\v1-verify.txt`.

## Rule changes (old test → new rule, severity)

Severity policy: error only for what breaks a page or the judge. Everything else is a warning.

| Old test (learn/ or judge/) | New rule in verify.ts | Severity |
|---|---|---|
| judge/solutions.test.ts "solutionCode and solutionLangs" (optimal C++) | Problem without an optimal C++ block in the DB shape | error (unchanged) |
| judge/solutions.test.ts "checks BRUTE coverage" | Brute block or "brute: same" note | was error, now warning |
| judge/solutions.test.ts hints rule | Fewer than 3 hints; empty hint; code fence; placeholder | was error, now warning (duplicate hint ord stays error) |
| judge/solutions.test.ts cases rules | No example or no test case | was error, now warning |
| judge/solutions.test.ts cases rules | Duplicate test case ord; input count != parameter count | error (unchanged) |
| judge/solutions.test.ts "structural rules" | 40 KB, forbidden calls, skip-stress placement, class or method the judge calls | error (unchanged) |
| judge/solutions.test.ts (placeholders in code) | Placeholder text in solution code | was error, now warning |
| (no old test) | Statement and solution pages against the `problem` template (`validatePageAgainstTemplate`) | error (new: slots, block types, required slot) |
| (no old test) | Function problem without name or return type; design problem without className | error (judge needs them) |
| judge/interview.test.ts "interview parser and checker" | Forbidden phrases, headings in order, links only under Further reading, 350-1100 words | was error, now warning |
| learn/learn.test.ts and order-audit.test.ts "every concept has a lesson with an overview" | Overview under 40 chars; "relatively short" at 80 or less | was error, now warning |
| learn/learn.test.ts "one explanation per checklist point" (order-audit: >= points) | Fewer `point:N` explanations than checklist points | was error, now warning |
| order-audit "section points … in checklist order" | `point:N` sections out of order, or out of range | was error, now warning |
| learn/learn.test.ts "recap lines" (>= 3) | Fewer than 3 recap items (read from `lessonToShape` extra.recap) | was error, now warning |
| learn/learn.test.ts "deeper material" (>= 5 deeper, > 200 chars, unique titles) | Same checks on `lessonToShape` extra.deeper | was error, now warning |
| order-audit "sentence case" | Same rule on deeper titles | was error, now warning |
| (no old test) | Concept with no interview questions | warning |
| learn/learn.test.ts "has a walkthrough for every design" | Empty requirements, design, dives or tradeoffs in `lessonToShape` walkthrough (was: title matching) | was error, now warning |
| learn/learn.test.ts recap >= 3 and follow-ups >= 3 | `lessonToShape` extra.recap and extra.followUps (was: title matching, and it counted list lines) | was error, now warning |
| design-depth.test.ts "800+ words" | Words in `deep.sections` only (was: all blocks on the page) | was error, now warning |
| design-depth.test.ts "failure section" | Title matches /failure/i in `deep.sections` | was error, now warning |
| design-depth.test.ts "sections >= 100 words" | Each `deep.sections` entry (was: every page section, which flagged 338 requirement items) | was error, now warning |
| design-depth.test.ts "3+ diagrams, captions > 10" | `deep.diagrams` count and caption length | was error, now warning |
| design-depth.test.ts "Java with a main method" | `deep.code` entries named .java must contain `static void main(` | was error, now warning |
| learn.test.ts LLD "class " and LLD_DEEP walkthrough (>= 6 sections, >= 1000 words, class and sequence diagrams) | `lessonToShape` LLD guide and deep fields | was error, now warning |
| learn.test.ts "every project has a Main, tests, expected output" | `lld-project` doc: Main.java, tests, expectedOutput > 3 lines, duplicate file names, TODO | warning (new doc rule) |
| learn.test.ts "complete guide for every DSA pattern" | `lessonToShape` PatternGuide: idea > 80, signals >= 2, steps >= 2, template >= 8 lines, variations >= 2, recap >= 2 | was error (only the "Pattern article" was checked before), now warning |
| pattern-articles.test.ts "follows the required outline, in order" | `lessonToShape` article sections (intro is not a section): required titles in order, sub-sections after parent, unique titles | was error, now warning |
| pattern-articles.test.ts "is a full article" (900 words, intro 25 words, 2 code sections, code > 40 chars, body > 150 chars) | Same numbers on `lessonToShape` article (was: all blocks incl. intro, and the intro counted as an "Unexpected section" and a duplicate "" title, which caused most of the 679 + 532 errors) | was error, now warning |
| pattern-articles.test.ts "practice order names problems" | Practice order names at least min(3, n) problems of the pattern (problems in the snapshot with `row.pattern` = pattern id) | warning (new: needs a snapshot; skipped with no ctx) |
| learn.test.ts "reading list entries are unique, https, point at real items" | Reading doc body is an array: each entry checked (https, tracking/shortener, unique id, items exist as lesson or problem) | was error on `body.url` (undefined), now warning per entry |
| Snapshot integrity: duplicate entity key | unchanged | error |
| Snapshot integrity: lesson courseId exists | unchanged | error |
| Snapshot integrity: lesson ord unique per course | unchanged (seed fixed) | error |
| Snapshot integrity: asset references | unchanged | error |
| (new) lesson page structure | `validatePageAgainstTemplate` on every lesson: unknown slot, wrong slot key, block type not allowed, required slot missing, one-slot with 2 sections | error |
| (new) course fields | Empty id: error. Empty area/title/summary: warning | mixed |
| WEEK_FOCUS roadmap check | unchanged | warning |

Placeholder text (TODO, FIXME, lorem ipsum, ellipsis) in any block, title, hint or code: was error, now warning.

Not ported (judgment): the design architecture and criteria >= 4 checks in `design-depth.test.ts` apply only to named
designs (BATCH_E and BATCH_AB), not to all. `readingMinutes >= 4` is a derived value, not content shape. Both left out.

Judgment calls to review: duplicate hint ord and duplicate test case ord stay errors (they break the page or judge
ordering). A function problem with no return type stays an error (the judge needs it).

## Seed change (apps/web/lib/content-db/seed.ts)

Only the exercise ord in `lessonSources`. Exercises used to start at 0 in their area, the same as the concepts. Now
each exercise's ord is (number of concepts in the area) + its index in the exercise list, so concepts keep their order
and exercises follow them. Nothing else changed in seed.ts.

## Files

- `packages/shared/src/content-model/verify.ts`: rewritten (severity policy, lessonToShape rules, reading array,
  validatePageAgainstTemplate for lessons and problems, lld-project doc checks).
- `packages/shared/src/content-model/verify.test.ts`: fixtures updated (concept needs a questions section; pattern
  article is now an `article` lesson with an intro and `sections` slot; the outline test splices index 2). New describe
  block "verify severity and shapes (wave 3)" with 5 tests (brute warning, hints warning, unknown slot error, missing
  required slot error, reading array entries).
- `apps/web/lib/content-db/seed.ts`: exercise ord (see above).
- `apps/web/lib/content-db/verify-db.test.ts`: "no test cases" now asserted as a warning; new test that a function
  problem whose input count no longer matches its parameters is an error (uses `inputJson`).
- `apps/web/lib/content-db/verify-seed.test.ts` (new): seeds `:memory:` with `seedContent` and asserts zero verify
  errors; prints the first 10 errors if any.
- `docs/plans/notes/wave3-V1.md` (this file).

## Test and check results

- `pnpm exec vitest run packages/shared/src/content-model/verify.test.ts apps/web/lib/content-db`: 9 files, 87 tests,
  all pass (last run).
- `cd packages/shared && npx tsc --noEmit`: exit 0.
- `cd apps/web && npx tsc --noEmit`: exit 0.
- `pnpm lint`: fails on `apps/web/app/admin/ai-assist.tsx` line 358 (`react/no-unescaped-entities`). That file is not
  mine (AG10 is editing it); my files produce no lint errors.
- `node --import ./scripts/lib/register-ts.mjs scripts/content-verify.mjs --db <temp seeded copy>`: 0 errors, 40 warnings.
  The temp file was seeded with `scripts/content-seed-db.mjs --url file:<temp>`. `data/content.db` was not written.
- Not run: `pnpm test`, `pnpm check`, `pnpm build` (per rules).

## Notes for the lead

- `content:import` now accepts the seeded content without `--allow-errors` (0 errors). The pack problems from
  `docs/examples/sample-pack.json` will report only warnings for hints and brute, so they should import too. Not tested
  here (C11 owns the import path).
- The 40 placeholder warnings are content text the content owner should look at (they may be a literal "…" in prose).
- The reading items check reports warnings for any reading item that is neither a lesson nor a problem id. None fire
  on the seeded content.
