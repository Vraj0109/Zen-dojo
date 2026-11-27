# Wave 2 round B, C7: full resync by epoch, round A leftovers

Plan 0115 versioning rule 6 (full resync), the round A review items (mergeChanges asset parts, 3 MB changes cap, prune after
hosted writes), and the wave 2 items for `content_epoch`, `synced_epoch`, `refreshNotice`, `scripts/content-resync.mjs`.

## Files

Edited (own row):
- `apps/web/lib/content-db/migrations.ts`: appended migration 2, `INSERT OR IGNORE INTO content_meta ... 'content_epoch', '1'`.
  The first migration is unchanged.
- `apps/web/lib/content-db/meta.ts`: `getContentEpoch`, `setContentEpoch(tx, n)` (source DB); `getSyncedEpoch` (returns
  null when unset), `setSyncedEpoch(tx, n)` (client copy, key `synced_epoch`).
- `apps/web/lib/content-repo/version.ts`: `ContentVersion` now `{ version, schema, epoch }`.
- `apps/web/app/api/content/version/route.ts`: body `{ version, schema, epoch }`, ETag `"v<v>-s<s>-e<e>"`.
- `apps/web/lib/content-sync/sync.ts`: rewritten around the epoch. `SyncOutcome.refreshed: boolean` (always set).
- `apps/web/lib/content-sync/apply.ts`: `applyUnits(db, pages, { version?, epoch?, purgeAll? })`; new `purgeEverything`.
- `apps/web/lib/content-sync/serve.ts`: `CHANGE_PAGE_BYTES` (3 MB) and the byte cut in `buildChanges`; the asset
  re-attach workaround is removed; pattern titles now come from the database (see deviation 4).
- `apps/web/lib/content-sync/test-helpers.ts`: fake site answers `epoch` and accepts `version` / `epoch` overrides.
- `apps/web/lib/content-sync/sync.test.ts`: new describe "full resync by epoch" (6 tests).
- `apps/web/lib/content-sync/serve.test.ts`: byte cap test (6 heavy problems, several pages, every entity once, cursor exact).
- `packages/shared/src/content-model/parts.ts`: `mergeGroup` "all" path keeps the group's asset parts (latest data wins).
- `packages/shared/src/content-model/parts.test.ts`: test "an all entry keeps the asset parts of the group".
- `packages/shared/src/content-model/notices.ts`: `refreshNotice(at = 0)`.
- `packages/shared/src/content-model/notices.test.ts`: test for `refreshNotice`.
- `scripts/content-snapshot.mjs`: requires `epoch` from `/api/content/version`, passes it to `applyUnits`, prints it.
- `apps/web/lib/admin-content/write.ts`: one import change and one `pruneChanges(db, Date.now()).catch(() => 0)` after the
  commit in each hosted write: `saveProblem`, `deleteProblem`, `saveLesson`, `deleteLesson`, `restoreFromAudit` (one call,
  after the if/else). No other change. Early returns (conflict, validation, unchanged) do not prune.

Created:
- `apps/web/lib/content-sync/resync.ts`: `bumpContentEpoch(db, now)`: epoch +1 and one `admin_audit` row (action
  `resync`, actor `owner`, entity `content`, entity_id `content_epoch`, before/after `{epoch}`), in one transaction.
- `apps/web/lib/content-sync/resync.test.ts`: 2 tests.
- `scripts/content-resync.mjs`: `pnpm content:resync [--url <libsql url>]`. Without `--url` it changes `data/content.db`.
  A remote `--url` needs `CONTENT_DATABASE_AUTH_TOKEN`, otherwise exit 1. Prints `content epoch <from> -> <to>`.
- `apps/web/app/api/content/version/route.test.ts`: 2 tests (body and ETag carry the epoch; a bumped epoch is not answered 304).
- `apps/web/lib/admin-content/write.test.ts`: 4 tests with a spy on `pruneChanges`: committed save, conflict (no prune),
  unchanged save (no prune), committed delete. The hosted path runs against `:memory:`.
- This file.

Outside my row (one-line expectation updates, forced by the new `epoch` field and the new migration; revert them if you
want to own these yourself):
- `apps/web/lib/content-db/migrations.test.ts`: meta rows now include `content_epoch = 1`.
- `apps/web/lib/content-repo/content-repo.test.ts`: `getContentVersionCached` returns `epoch: 1`.
- `apps/web/app/api/content/content-routes.test.ts`: version body includes `epoch: 1`.

## Test and check results

- `pnpm exec vitest run apps/web/lib/content-sync apps/web/lib/content-db apps/web/lib/content-repo apps/web/app/api/content packages/shared/src/content-model/parts.test.ts packages/shared/src/content-model/notices.test.ts apps/web/lib/admin-content`
  -> 19 files, 188 tests, all pass (run after the last code change, about 17 s).
- `cd apps/web && npx tsc --noEmit`: 4 errors, none in my files. They are in other agents' files:
  `app/admin/study/page.tsx(26)`, `app/revise/pattern-map/pattern-map.tsx(65)`, `lib/ai/context.ts(98)`, `lib/review.ts(63)`.
- `cd packages/shared && npx tsc --noEmit`: clean.
- `pnpm lint`: exit 0 (run twice, the second after the last edit).
- `node --check scripts/content-snapshot.mjs` and `scripts/content-resync.mjs`: ok. Neither script was run against a real DB.
- Not run, as instructed: `pnpm test`, `pnpm check`, `pnpm build`. No git state changed. `data/habit.db` not opened.

## Behaviour

- Baseline for the epoch check: `synced_epoch`, or, when it is missing and the copy is empty (version 0), the server's
  epoch. So a fresh copy fills through the changes feed as before, and then stores the epoch.
- Full download (`refreshed: true`) when the baseline differs from the server's epoch, or the server's version is lower than
  the copy's, or the copy has content but no `synced_epoch`. Full download (`refreshed: false`) on 410, as before.
- Same epoch and version: one request (`/api/content/version`), nothing written, `refreshed: false`.
- The copy's `synced_epoch` is set in the same transaction as the units (full download) and after a changes run.

## Deviations and why

1. **Desktop full resync empties the whole copy first** (`applyUnits` with `purgeAll` when units are `all`). Without it a
   unit that disappeared on the server stayed behind. The 410 path with `all` uses the same purge (before, it only replaced
   the listed units).
2. **Changes cap counts per row.** `buildChanges` keeps rows in version order while the sum of their entry sizes stays at or
   under 3 MB (the first row is always kept). The sum over-counts a merged entity, so merged pages stay under the cap. The
   cursor is a row version, so every row up to `next` is in the page. Side effect to know: when the cut splits one entity's
   partial rows across two pages, the first page's patch does not match the entity's current rev and the unit is
   downloaded again (the existing repair path). Correct, but costly. "all" rows carry the whole entity, so they are not
   affected.
3. **`refreshNotice` uses entity `course` and entity id `""`.** `EntityKind` has no "all" kind, and `types.ts` is off limits.
   `id` is 0 (no change version). The device gives the stored notice its own id.
4. **Pattern titles in `serve.ts` come from the database.** `listUnits` read `ALL_PATTERNS` from `@habit/shared`, which the
   round B rule forbids in API code. It now reads doc `dsa-groups` / `main` (`loadDoc`) and falls back to the pattern id
   when the doc is missing (as in the unit tests).
5. **`syncContent` does not write the notice.** It returns `refreshed`; whoever owns the user database stores
   `refreshNotice(now)`. See question 2.
6. **`content:resync` writes its audit row directly** (table insert), not through `writeAudit`, because `writeAudit` needs an
   `AdminProof` and the owner's CLI has none. `AuditAction` in `content-db/audit.ts` has no `"resync"`; see question 3.

## Callers outside my files to wire

- `scripts/content-snapshot.mjs` is mine (done).
- Root `package.json`: add `"content:resync": "node --import ./scripts/lib/register-ts.mjs scripts/content-resync.mjs"`
  (same form as `content:seed-db`).
- `apps/web/app/api/content/sync/route.ts` (C6) and `apps/web/lib/admin-content/write.ts` (desktop branch, mine) call
  `syncContent`. Neither stores the "Content was refreshed" notice yet: when `result.refreshed` is true, store
  `refreshNotice(Date.now())` in the user DB (AG9's `content_notices`).
- `apps/desktop` (AG5): the first-start copy is the snapshot, so it gets `synced_epoch` from the snapshot's `applyUnits`.

## Questions for the lead

1. **Hosted resync will not reach clients until the version cache expires.** `getContentVersionCached` is `'use cache: remote'`
   with `cacheLife("max")`, tagged `content` and `content-version`. `pnpm content:resync` runs outside Next and cannot expire
   those tags, so `/api/content/version` keeps the old epoch until the entry expires or a content write expires the tag.
   Options: a short `cacheLife` for the version read, make the version route uncached (it is two small queries), or have
   the resync run through a route that calls `revalidateTag`. I did not change the caching; please decide. This matters for
   the first hosted resync.
2. Who stores the "Content was refreshed" notice: the sync route (C6) or the desktop app (AG9)? I suggest the desktop
   timer, which has the user DB.
3. Add `"resync"` to `AuditAction` in `content-db/audit.ts` (not my file), so the CLI and `writeAudit` agree?
4. `refreshNotice`: is entity `course` with an empty id acceptable, or should `Notice` get an entity kind `"all"` in `types.ts`?
5. Okay to keep the three one-line expectation edits in `migrations.test.ts`, `content-repo.test.ts` and `content-routes.test.ts`?

## Found but not changed (outside my row)

- `apps/web/lib/content-repo/stress.ts` (C5) still imports `JUDGE_PROBLEMS` from `@habit/shared`. That is a forbidden content
  constant under the round B rule. It is for the judge page work, or the lead.
- `apps/web/lib/content-db/seed.ts` (C4) imports content constants. That is intended: it is the one-time seed that reads
  the repo files.
- `apps/web/lib/content-repo/lookups.ts` (lead) mentions constant names in comments only.
