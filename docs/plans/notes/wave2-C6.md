# Wave 2, row C6: parts and units on writes, prune, unit and changes endpoints, apply, local sync route

Plan 0115 steps 1 (write wiring), 2, 3, 4, 5 (local route only), 8 (tests for these).

## Files

Edited:
- `apps/web/lib/content-db/write.ts`: `upsert*` take optional `parts` and compute `diffParts(before, after)` and `unitsForChange(before, after)` when not passed. Explicit `parts` still win. Units keep the stored row's units too, so a soft-deleted row keeps its unit. New exports (existing ones unchanged): `checkEntityShape`, `storeEntity`, `storeProblemRows`, `storeLessonRows`, `storeCourseRows`, `storeDocRows` (rows only, no change or audit row), `markDeletedRows`, `purgeEntity`, `pruneChanges(db, now)`, `CHANGE_KEEP_ROWS` (5000), `CHANGE_KEEP_MS` (90 days).
- `apps/web/lib/content-db/write.test.ts`: 8 new tests (parts and units when not passed, pruneChanges).

Created:
- `apps/web/lib/content-sync/serve.ts`: server side, takes a db. `unitKind`, `loadCurrent`, `unitEntities`, `loadAssets`, `listUnits`, `unitPages` (3 MB pages), `oldestKeptVersion`, `buildChanges` (per-entity merge, 200-entity cut with `next`), `redirectToVersion`.
- `apps/web/lib/content-sync/apply.ts`: `applyUnits(db, pages, { version })`, `applyChanges(db, page, { setVersion })`. Types `UnitPage`, `ChangePage`, `Mismatch`, `ApplyChangesResult`.
- `apps/web/lib/content-sync/sync.ts`: `syncContent({ db, fetch, origin, units, now })`, `SYNC_META` keys (`sync_last_checked_at`, `sync_status`, `sync_last_error` in `content_meta`).
- `apps/web/lib/content-sync/origin.ts`: `contentOrigin(env)`. Order: `CONTENT_ORIGIN`, `HUB_URL` minus `/hub`, `PUBLIC_SITE_URL`, default site.
- `apps/web/lib/content-sync/local.ts`: `isLocalRequest(request)`.
- `apps/web/lib/content-sync/test-helpers.ts`: `makeDb` (own `:memory:` client), `seedSite`, `problemIn`, `lessonWithImage`, `fakeSite` (a fetch that answers with the real serve functions and logs requests).
- `apps/web/lib/content-sync/serve.test.ts`, `apply.test.ts`, `sync.test.ts`.
- `apps/web/app/api/content/units/route.ts`, `unit/[unit]/route.ts`, `changes/route.ts`, `sync/route.ts`.
- `apps/web/app/api/content/sync-routes.test.ts`.
- This file.

No migration was needed: the wave 1 migration already has `parts_json`, `units_json`, `rev`, `note`, `notify`.

## Tests

- `pnpm exec vitest run apps/web/lib/content-sync apps/web/lib/content-db/write.test.ts apps/web/app/api/content/sync-routes.test.ts`: 5 files, 66 tests, all pass (about 4 s).
- `cd apps/web && npx tsc --noEmit`: exit 0, no errors.
- `pnpm lint`: exit 0.
- Not run, as instructed: `pnpm test`, `pnpm check`, `pnpm build`. No git state changed. `data/habit.db` not opened.

Covered: one hint edited (only `hints` sent and applied); section edit (only that section); unit filter; applying a page twice is a no-op; delete; wrong rev (mismatch, version not moved, then a unit download repairs it); 410 (unit download); network error during a unit download and during the changes request (old copy untouched, status `offline`); server schema newer (`app-too-old`, nothing written); malformed data (`error`, nothing written); images travel with whole entities and with new image blocks; 200-entity page with a cursor; unit pages under 3 MB with every entity once; route headers, 302s, 410, 400/404; sync route 404 when hosted, 403 when not desktop or not local, and a real sync from the desktop with the tags expired.

## Deviations and why

1. **rev is `revOf(entity.value)`**, the same as the write helpers store it. `revOf(entity)` (the wrapper) would never match. The guarantee in `parts.ts` tests uses the value too.
2. **410 rule**: `since + 1 < oldest kept version`. A client at `oldest - 1` is still complete, so it does not get 410. The brief's literal "older than" would have forced a needless download.
3. **Asset parts in change entries.** An entity sent whole (`all`) also sends `asset:<id>` parts with the image (base64, inline in `data`). Without them a fresh copy has sections that point at missing images. `mergeChanges` drops asset parts on its "all" path (see question 1), so `buildChanges` re-attaches them after merging.
4. **`pruneChanges` is not called anywhere yet.** AG4 or the lead should call it after admin writes.
5. **Sync route writes through `getContentDb()`.** The desktop has no `AdminProof`, and the local file client is shared by reads and writes (client.ts). The route refuses unless `CONTENT_DATABASE_URL` is a local file or `:memory:`.
6. **Cache tags.** `applyUnits` returns `content` (TAG.content) plus the per-entity tags, as the lead asked. `expireContentTagsInRoute` takes change objects (`{entity, id, ...}`), not tag strings, so it does not fit. The route calls `revalidateTag(tag, { expire: 0 })` for each tag.
7. **No server-side `'use cache'` on the unit or changes endpoints.** They use HTTP `immutable` (unit pages and the units list at the current `v`) and `max-age=30` (changes). Unit pages are rebuilt on each request (they load the unit's entities). The units list loads every unit to compute sizes. C5's `use cache` pattern could be added here later.
8. **Local-request check uses headers.** Next route handlers do not expose the socket address. The check requires a local Host, no forwarding headers and no cross-site `Sec-Fetch-Site`. The desktop server binds 127.0.0.1 (main.js), so a remote peer cannot connect at all.
9. **`upsert*` `parts` is now optional** (was `["all"]` by default). Explicit values still work, and no existing caller breaks.
10. **Apply order.** `applyChanges` moves `content_version` to `page.to` only when nothing mismatched. `syncContent` fetches every changes page before writing anything, and moves the version at the end. A mismatched unit is downloaded again in a single transaction, which then sets the version.

## Questions for the lead

1. `packages/shared/src/content-model/parts.ts` `mergeChanges`: the "all" path returns `parts: ["all"]` and drops any asset parts from the group. Fix it there (keep `asset:` parts and their data), then the workaround in `serve.ts` (`merged.map(...)`) can go.
2. Should the unit and changes responses carry a server-side cache (C5's `use cache` with `content-version` and entity tags), or is HTTP caching enough for round A?
3. A changes page is capped at 200 entities, not bytes. With images, a page could pass the 4 MB Vercel limit. Cap it by bytes too?
4. `pruneChanges`: who calls it, and when (after each admin write, or from the sync route)?
5. `tsc` for `apps/web` reports nothing for my files now. The earlier note from the lead on `Pattern.title` was fixed to `Pattern.name` (dsa.ts), and the `applyUnits` tag added.

## Found but not changed

- `content-repo/invalidate.ts` (C5) has `expireContentTagsInRoute(changes)`. A helper that takes tags would fit the sync route better.
- `lib/content-db/load.ts` returns `null` for soft-deleted rows, so the sync reads raw rows directly where the deleted row's unit or course matters.
