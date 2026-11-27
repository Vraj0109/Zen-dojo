# Wave 3, C10: stress lookup without the problem files, content checks on save

## Files

- New `packages/shared/src/judge/stress-registry.ts`: `stressFor(id)` and `STRESS_BY_ID`, built from the 17 `stress*.ts`
  maps plus `stress-inline.ts`. When two maps name the same id, the earlier map wins (same order as the old judge loop).
- New `packages/shared/src/judge/stress-inline.ts`: `STRESS_INLINE`, the 14 inline `stress:` sets moved out of the specs.
- New `packages/shared/src/judge/stress-registry.test.ts`: 6 tests.
- `packages/shared/src/judge/problems-design-a.ts`, `problems-design-b.ts`, `problems-leetcode.ts`, `problems-leetcode-3.ts`,
  `problems-leetcode-8.ts`: removed the 14 `stress:` entries. Removed helpers that only the moved sets used
  (`between`, `letters` in design-a; `between`, `bookings` in design-b) and the imports they no longer need (`callList`, `rng`).
  The moved sets copy their helpers into `stress-inline.ts`.
- `packages/shared/src/judge/index.ts`: the judge loop now calls `stressFor(spec.id)`. The `STRESS_*` imports were removed;
  the `export { STRESS_... } from` lines are unchanged.
- `apps/web/lib/content-repo/stress.ts`: uses `stressFor` from the registry. No `JUDGE_PROBLEMS` import.
- `apps/web/lib/admin-content/write.ts` (CRLF kept): new `checkDraft` helper runs `verifyEntity` on the draft in
  `saveProblem`, `saveLesson` and `saveDoc`. Every issue message is returned in a new optional `warnings` field on the
  success result (all success paths). Nothing blocks yet, per the lead's change. The existing validation still blocks.
- `apps/web/lib/admin-content/write.test.ts`: the four existing tests use a `passingProblem()` helper (the shared sample
  fails the checks). New test: a draft with a verify issue saves and returns it in `warnings`. New test: a warning
  (code fence in a hint) saves and returns exactly that message.

## Tests and checks

- `pnpm exec vitest run packages/shared/src/judge/stress-registry.test.ts apps/web/lib/admin-content apps/web/lib/content-repo`:
  7 files, 48 tests, all pass.
- `cd packages/shared && npx tsc --noEmit`: exit 0.
- `cd apps/web && npx tsc --noEmit`: exit 0.
- `pnpm lint`: exit 0.
- No `pnpm test`, `check` or `build` was run. No stress `make()` was run.

## How the "before" was checked

Before any edit, a temporary vitest file recorded every `JUDGE_PROBLEMS` id with its stress count and labels. 486 ids,
1257 cases, all `make` functions. The test stores a compact fingerprint of that record (id, count, FNV-1a hash of the labels).
The test checks count and label hash for each id, and that `JUDGE_PROBLEMS[id].stress` is the registry's array.
The temporary file was deleted.

## Deviations and findings

1. **Import path.** `apps/web` imports the registry by relative path
   (`../../../../packages/shared/src/judge/stress-registry`), because `packages/shared/package.json` has no export for it
   and I may not edit that file. Lead: add `"./stress-registry": "./src/judge/stress-registry.ts"` to the package exports
   and switch the import to `@habit/shared/stress-registry`. Not yet checked with a Next build.
2. **Three inline sets are shadowed.** `lc-70`, `lc-204` and `lc-875` had inline stress, but the stress*.ts maps already
   had different sets for them. The old loop let the map win, so the inline sets were never used. Behavior is kept
   (the map still wins), and the inline copies are moved as asked. They can be deleted in C-2.
3. **`verifyEntity` needs no context here.** `verifyProblem`, `verifyLesson` and `verifyDoc` never read `ctx`, so
   `checkDraft` passes none.
4. **Sample fixture fails the checks.** `sampleProblem()` in `content-db/fixtures.ts` has 2 hints, a Python block without
   `def twoSum(`, and no brute note. The tests use `passingProblem()` instead of changing the shared fixture.
5. **Likely bug in `content-model/verify.ts` (not my file).** The reading-doc rule reads `body.url`, but the real reading
   body is an array of items. Every reading save gets `Reading link "undefined" must be HTTPS`. Under the current
   warnings-only behavior this is harmless, but it will block reading saves once errors block. Fix belongs to AG3 or the
   lead. Before this change, two `save-doc.test.ts` tests failed for this reason; they pass now.
6. **Formatting.** The moved blocks in `stress-inline.ts` keep their original indentation, which is not uniform.

## Questions for the lead

- Confirm the relative import is acceptable, or add the package export (item 1).
- Confirm item 5 goes to whoever owns `verify.ts`.
