# Wave 1, row C2: content database (plans 0112 steps 3-4, 0113 steps 2-3, 0115 step 1 columns)

## Files created

All in `apps/web/lib/content-db/`:

- `migrations.ts`: `CONTENT_MIGRATIONS` (one entry: every table of 0112, indexes from step 3, and the 0115 `changes` columns).
- `schema.ts`: Drizzle tables for all of the above (`contentMeta`, `courses`, `lessons`, `pageSections`, `blocks`,
  `blockCode`, `assets`, `problems`, `testCases`, `hints`, `docs`, `changes`, `adminAudit`).
- `client.ts`: `getContentDb(env?)` (read), `getContentWriteDb(proof, env?)` (write, throws without a valid proof),
  `contentDatabaseUrl(env?)`, `migrateContent(client, remote)`, `resetContentDbForTests()`, types `ContentDb`, `ContentTx`.
- `meta.ts`: `getContentVersion(db)`, `getSchemaVersion(db)`, plus `getMeta` / `setMeta`.
- `write.ts`: `upsertProblem`, `upsertLesson`, `upsertCourse`, `upsertDoc`, `softDelete`, `putAsset`. Each returns
  `{ changed: false }` or `{ changed: true, version, rev }`.
- `load.ts`: `loadProblem`, `loadLesson`, `loadCourse`, `loadDoc` (return `null` when missing or soft-deleted).
- `audit.ts`: `writeAudit(tx, proof, input)`, `listAudit(db, { entity?, entityId?, actorId?, limit, before? })`.
- `fixtures.ts`: hand-built `ContentProblem`, `ContentLesson`, `ContentCourse`, `ContentDoc` values for tests (no import from the file mappers).
- Tests: `migrations.test.ts`, `client.test.ts`, `write.test.ts`, `audit.test.ts`.

Changed: `apps/desktop/main.js`, one line in the `server` env block:
`CONTENT_DATABASE_URL: databaseUrl(path.join(dataDir(), "content.db")),`. `dataDir()` already honours `HABIT_DATA_DIR`
(through `app.setPath("userData")`). `node --check` passes.

Not changed: `.gitignore`. `data/` is already ignored on line 16, so `data/content.db` is covered and no new line was needed.

## Tests

Command: `pnpm exec vitest run apps/web/lib/content-db` (from the repo root)
Result: 4 files, 22 tests, all passed (about 2 s).

Covered: 13 tables exist after migration; `user_version` equals the migration count; a second migration run is a no-op;
content_meta starts at `content_version` 0 and `schema_version` 1; the `changes` columns exist; the URL resolution;
writing the same problem twice adds one change; a problem round-trips through `loadProblem` (deep equal); changing one
hint adds a second change with `parts_json` `["hints"]`, the note and `notify`; a wrong-slot page is refused; soft delete
adds an `op: "delete"` change and hides the row; a repeat delete is a no-op; restore by upsert; lesson, course and doc
round-trips; a lesson moved between courses lists both units; asset dedupe by sha256 and SVG refused; `getContentWriteDb`
rejects a missing or forged proof; a read and a write share the in-memory DB; `writeAudit` in the same transaction as the
change; a forced error after `writeAudit` leaves neither the change nor the audit row; `listAudit` filters and pages.

Type check: `cd apps/web && npx tsc --noEmit` exits 0 with no errors anywhere in `apps/web` (including the other agents' files at the time of the run).

Not run: `pnpm test`, `pnpm check`, `pnpm build` (as instructed). No git state changed. `data/habit.db` was not opened.

## Deviations from the plan, and why

1. **`problems.extra_json` column added.** `ProblemRow.extra` must round-trip (types.ts), and the 0112 table has no column for it.
2. **`block_code.ord` column added.** The contract says a code block's key order is its tab order, but the PK
   `(block_id, lang)` loses that order. `ord` keeps it; the loader orders by it.
3. **`problems_pattern` index added** (lookup by pattern for units and the pattern pages).
4. **Remote migrations.** Local files use `PRAGMA user_version`, as `lib/db.ts` does. Remote (Turso) databases keep the
   count in `zd_schema_version`, because Turso refuses `PRAGMA user_version = N` and BEGIN/COMMIT over HTTPS (see the
   note in `lib/db.ts`). A database already at the latest version is only read (no write), so a read-only token works
   for it. The remote branch is not tested (no server here); it mirrors `lib/db.ts` `migrateRemote`.
5. **Loaders are in `load.ts`**, not `write.ts`. Same functions, separate file.
6. **Units are computed locally** in `write.ts` (`problems:<pattern|other>`, `course:<courseId>`, `course:<id>`, `docs`),
   because `units.ts` from plan 0115 (C3) does not exist yet. The stored units are the union of the old units, the new
   units, and `extra.units`. When C3 lands, `write.ts` should call `unitsFor` and drop its local copy.
7. **`parts` is a parameter, not computed.** Callers pass `parts` (default `["all"]`). `diffParts` is wired in wave 2.
8. **Read and write clients.** Local files and `:memory:` share one client (so writes are visible to reads). Remote uses
   one client, unless `CONTENT_DATABASE_READ_TOKEN` is set, which gives reads their own client. Failed opens are not
   cached, so the next call retries.
9. **Section slots are checked on write.** Statement sections must have slot `statement`, solution sections `solution`.
   A lesson's page template must equal the row template. Otherwise the round trip would silently change the page.
10. **Doc ids.** A doc's primary key is `(kind, id)`, so the change `entity_id` and the `softDelete` id are `kind:id`
    (for example `reading:main`). The first `:` splits them.
11. **`putAsset` takes an optional `dims`** (width and height). No image header parsing here; without `dims` they are NULL.
12. **`writeAudit` is not called by the write helpers.** The caller calls it in the same transaction (plan 0113 says so).
    The helpers do not know the admin context.
13. **`pruneChanges` is not written.** It is plan 0115 step 3 and not in this row.
14. **`listAudit` `before`** is a row id cursor: only rows with `id < before` are returned, newest first.

## Questions for the lead

1. Should `getContentDb()` and `getContentWriteDb()` stay async (they are: they return a Promise of the Drizzle DB)? The
   plan's `getContentDb()` did not say. The tests assume a Promise.
2. Doc change ids: `kind:id` (as implemented), or should `changes` get a separate `kind` column?
3. Should the loaders return `null` for soft-deleted rows (as implemented), or a `deleted` flag? Plan 0114 may want
   the flag for cache invalidation.
4. Wave 2 `diffParts`: the helpers already take `parts`; the caller computes them. Confirm that is what C3 expects.

## Fields types.ts lacks (worked around)

- `ProblemRow.extra` needed a column (`extra_json`). It is in the types; only the 0112 table was missing it. No type change needed.
- `BlockRow.code` key order: the table needed `block_code.ord`. No type change needed.
- No `ContentPage.template` for stored section rows: the template comes from the row (`lessons.template`) or from
  the problem (`"problem"`). Fine as is.

## Found but not changed

- `lib/db.ts` `migrateRemote` uses `zd_schema_version` for the user database. The content DB uses the same table
  name in a separate database. No clash, but it is worth knowing if the two ever share a database.
- `contentDatabaseUrl()` creates `data/` if it is missing (the same as `databaseUrl()` in `lib/db.ts`).
