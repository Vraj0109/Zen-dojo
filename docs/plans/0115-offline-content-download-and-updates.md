# 0115: Offline content: download by course, part-level updates, versioning (desktop and web)

- **Status:** in-progress (wave 1 done, see docs/plans/wave1-content-db.md)
- **Planned by:** Claude Code, 2026-11-23 (revised the same day: per-course downloads and part-level updates)
- **Implemented by:** (implementer fills in)
- **Series:** content in the database (0112 to 0119), overview `docs/architecture/content-in-db.md`.
- **Needs:** 0112 (content DB, `changes` table, `content_version`), 0114 (repo, cache tags, invalidation helper,
  public read API). Plan 0119 (update notifications) builds on this.

## Goal

Content edits reach users without a release, and an update downloads only what changed. The desktop app keeps a full
local copy and works fully offline. Web users choose what to keep offline, course by course (or everything), in
Settings; they get updates only for what they downloaded. When an admin fixes one hint or adds one code block, a
client downloads that hint list or that section, not the whole problem and never the whole course again. A content
version number and a schema version keep updates safe.

## Context

- Source of truth: the shared Turso content DB behind the hosted site (`PUBLIC_SITE_URL`, default
  `https://zen-dojo-lovat.vercel.app`; add `contentOrigin()` next to `hubBaseUrl()` in `apps/web/lib/hub/url.ts`).
- Every content write adds one row to `changes` and bumps `content_meta.content_version` (plan 0112). This plan adds
  the part-level detail to that row (step 1). `CONTENT_SCHEMA_VERSION` lives in
  `packages/shared/src/content-model/types.ts` and goes up only when table shapes change.
- Desktop: `apps/desktop/main.js` runs the Next server with `utilityProcess` on 127.0.0.1 and sets `DATABASE_URL` and
  (from 0112) `CONTENT_DATABASE_URL=<app-data>/content.db`. App updates are in `lib/updates.js` (start + every 6 h);
  copy that rhythm.
- Web: `apps/web/public/sw.js` caches only the offline page and hashed static assets, "never API responses or HTML pages
  (they are signed-in, per-user data)". Content is public and the same for everyone, so a content copy is allowed, but
  per-user pages still must not be cached.
- Keep each JSON response under 4 MB (Vercel function payload limit; do not rely on a higher one).
- Hosted users who are online do not need any of this: they read the content DB directly.

### Download units

A **unit** is what a user downloads and follows:

- `course:<id>`: a course with all its lessons (and the images they use).
- `problems:<pattern id>`: the problems of one DSA pattern (the 67 patterns in `packages/shared/src/dsa.ts`), with
  cases, hints, statement and solution pages. A problem with no pattern goes in `problems:other`.
- `docs`: reading list, revise deck, key numbers, thinking map (small, always included with any download).

`unitsFor(entity)` (pure, `packages/shared/src/content-model/units.ts`) maps each entity to its units: lesson →
`course:<course_id>`; problem → `problems:<pattern>`; course row → `course:<id>`; doc → `docs`. If an admin moves a
lesson to another course or a problem to another pattern, the change lists both the old and the new unit.

### Part-level changes

A save records which **parts** of the entity changed, so clients fetch only those:

| Part | Meaning | What a client downloads |
|---|---|---|
| `meta` | row fields (title, difficulty, signature, template, order, course) | the entity row |
| `cases` | test cases | the full case list of that problem |
| `hints` | hints | the full hint list |
| `section:<id>` | a section's title, or any of its blocks added, changed, moved or removed | that section with its blocks and code |
| `section-order:<slot>` | sections added, removed or reordered in a slot | the slot's section id list (plus any new sections as `section:<id>` parts) |
| `asset:<id>` | an image used by a changed block | the image, once |
| `all` | create, delete, restore, import | the whole entity |

`diffParts(before, after)` (pure, `packages/shared/src/content-model/parts.ts`) computes the list from the two
versions of an entity. The write helpers (0112 `lib/content-db/write.ts`) call it and store it on the `changes` row.

### Versioning rules

1. `content_version` (integer) increases with every saved change. A client stores the version it has.
2. `schema` = `CONTENT_SCHEMA_VERSION`. A client applies data only when `server.schema <= client.schema`; otherwise it
   keeps its copy and shows "New content needs a newer app version".
3. Changes are kept 90 days or 5,000 rows, whichever is more. A client further behind gets `410 Gone` from the changes
   endpoint and downloads its units again in full.
4. Every apply is all-or-nothing (one transaction on desktop, one IndexedDB transaction on the web).
5. Integrity: each change carries the entity's new `rev`. After patching parts, the client recomputes the entity's
   `rev` (0112 `revOf`) and, if it differs, fetches the whole entity (`all`) instead. So a missed or misapplied patch
   can never leave a wrong page.
6. **Full resync (rare, owner-triggered).** `content_meta.content_epoch` (integer, starts at 1) is returned by
   `/api/content/version` as `epoch`. A client stores the epoch of its last full download. When the server's epoch
   differs from the client's, the client throws away its copy of every followed unit and downloads them again in full
   (desktop: everything), in one transaction, and adds one notice "Content was refreshed" (plan 0119, not tied to a
   unit). The epoch goes up only in these cases:
   - `pnpm content:resync` (new, owner only: needs `CONTENT_DATABASE_AUTH_TOKEN`; prints the new epoch and writes one
     `admin_audit` row with action `resync`). Use it after a restore, a re-seed, or any repair done directly in the DB.
   - `pnpm content:import` (0117) bumps it automatically, because an import can replace history.
   Safety net without any command: if the server's `version` is lower than the client's, the client treats it as an
   epoch change (full download), so a restored database can never leave a client "ahead".
7. **One source.** Every copy of the content (desktop installer, desktop app-data, web offline copy, developer
   `data/content.db` via `pnpm content:pull`) is downloaded from the hosted content database. The repo files are read
   exactly once, by `pnpm content:seed-db` when the hosted database is first filled; the installer never seeds from
   files. Only tests use the small committed fixture.

## Out of scope

- Offline **writes** on the web (progress while offline in the browser). Running code in the browser.
- Notifications about updates (plan 0119). Offline admin editing. Push messages to closed browsers.

## Steps

- [ ] **1. Record parts and units on every change.** New migration in `apps/web/lib/content-db/migrations.ts`
  (append; never edit the first one): add to `changes` the columns `parts_json` (TEXT, default `'["all"]'`),
  `units_json` (TEXT), `rev` (TEXT, the entity's new rev), `note` (TEXT, nullable) and `notify` (INTEGER, default 0).
  `note` and `notify` are filled by the editor in 0116/0119; this plan only stores them. Update `schema.ts` and the
  write helpers: `upsert*` compute `diffParts(before, after)` and `unitsFor(before) ∪ unitsFor(after)`.
  - Pure `diffParts` and `unitsFor` with tests (step 8).
  - Done when: changing one hint writes `["hints"]`; adding a diagram block to one section writes
    `["section:<id>"]` (plus `asset:<id>` for an image); moving a lesson to another course lists both units.
- [ ] **2. Unit endpoints (full download)**, public, under `apps/web/app/api/content/`:
  - `GET /api/content/units?v=<version>` → `[{ unit, title, kind, count, bytes, rev }]` for the Settings list (sizes
    let the user see "Caching course, 1.2 MB"). `rev` of a unit = hash of its entities' revs.
  - `GET /api/content/unit/<unit>?v=<version>&page=<n>` → `{ entities: [...], assets: [...], next? }`, at most 3 MB of
    JSON per page (images base64). Cached with the 0114 pattern (tags `content-version`, and the unit's entity tags) and
    sent with `Cache-Control: public, max-age=31536000, immutable`. Without `v`: 302 to the current version, `no-store`.
  - Done when: route tests pass; the largest page of the seeded DB is under 3 MB.
- [ ] **3. Changes endpoint (part-level).** `GET /api/content/changes?since=<version>&units=<comma list>` →
  `{ from, to, schema, changes: [{ version, entity, id, op, rev, parts, units, note, notify, data }] }`. `units`
  filters to changes that touch those units (desktop sends `all`). `data` holds only the listed parts: for `meta` the
  row, for `cases`/`hints` the lists, for `section:<id>` the section with blocks and code (or `{ deleted: true }`), for
  `section-order:<slot>` the id list, for `asset:<id>` the image, for `all` the whole entity. When several changes hit
  the same entity in the range, merge them server-side into one entry with the union of parts and the latest data
  (keep every `note` for 0119). At most 200 entities per page; `next` cursor when more. `Cache-Control: public,
  max-age=30`. `since` older than the oldest kept change → `410`.
  - Pure merge in `packages/shared/src/content-model/parts.ts`: `mergeChanges(changes)`.
  - Prune job `pruneChanges(db, now)` in `lib/content-db/write.ts`, called after admin writes.
  - Done when: route tests pass (step 8).
- [ ] **4. Apply logic (shared by desktop and CLI).** `apps/web/lib/content-sync/apply.ts`:
  - `applyUnits(db, unitPages)`: in one transaction replaces every entity of the given units.
  - `applyChanges(db, page)`: in one transaction, per entry: `op: delete` → soft delete; otherwise patch only the
    listed parts (`patchEntity(current, parts, data)`, pure, in `parts.ts`), then compare `revOf(patched)` with the
    entry's `rev`; on mismatch collect the id for a full refetch after the transaction. Writes no `changes` rows (the
    client mirrors the server's numbers). Returns the cache tags to expire (`tagsFor`) and the applied entries (0119
    uses them).
  - `syncContent({ db, fetch, origin, units, now })`: GET `/api/content/version`; equal → done; server schema newer →
    `{ status: "app-too-old" }`; else pages of `changes?since=&units=`; on 410, `applyUnits` for every followed unit;
    then refetch mismatched entities. I/O injected (like `lib/leetcode/sync.ts`). Stores `last_checked_at`,
    `last_error`, `status` in local `content_meta`.
  - Done when: step 8 apply tests pass.
- [ ] **5. Desktop: everything, kept current.**
  - The desktop app keeps every unit (pages, the judge and Today need them). `pnpm content:snapshot --out <file.db>`
    (`scripts/content-snapshot.mjs`, downloads all units from the hosted site and writes a ready `content.db`).
    `apps/desktop/scripts/prepare-server.mjs` runs it into `apps/desktop/resources/content.db`, shipped as an extra
    resource (`apps/desktop/package.json` build config; check `after-pack.cjs`); `.github/workflows/desktop.yml` runs
    it before packaging and fails the build if it fails.
  - First start (`apps/desktop/main.js`): if `<app-data>/content.db` is missing or older than the shipped one, copy the
    shipped file in (temp name, then rename). Pure decision in `apps/desktop/lib/content-setup.js` (`// @ts-check`,
    tested like `lib/setup.js`).
  - Background updates: a local-only route `POST /api/content/sync` (refuses unless from 127.0.0.1 with
    `HABIT_DESKTOP=1`; 404 on hosted) runs `syncContent` with `units: all`, then `expireContentTagsInRoute`. `main.js`
    calls it 20 s after start and every 6 h; the Settings button calls it too.
  - Done when: a fresh install starts offline with full content; after an admin fixes one hint on the hosted site,
    "Check for updates" shows it, and the request log shows only that problem's hints were downloaded.
- [ ] **6. Settings: "Offline content" card** in the settings page under `apps/web/app/profile/settings` (wide layout,
  `app/ui.tsx` pieces):
  - Desktop: "All content is on this computer · version 1,234 · updated 2 hours ago · Up to date" (or "Update
    available", "Offline, will retry", "Needs a newer app version" with a link to the app update), **Check for updates**
    (form → server action → local sync route) and **Update automatically** (default on).
  - Web: a list of units from `/api/content/units`, grouped (Courses; Problems by pattern), each with size and a
    checkbox, plus **Select all**. **Download selected** shows progress per unit. Downloaded units show "Saved ·
    updated <time>" and **Remove**. Total space used (`navigator.storage.estimate()`). Hidden when the browser has no
    service worker or IndexedDB.
  - Done when: both variants render their states (manual check plus component tests for the state text).
- [ ] **7. Web: browser copy and offline reader.**
  - `apps/web/app/offline/content-store.ts` (client): IndexedDB database `zd-content` with stores `meta` (version,
    followed units), `entities` (key `entity:id`, value, units), `assets`. `downloadUnits(units, onProgress)`,
    `updateIfNeeded()` (calls the changes endpoint with the followed units, patches with the same pure `patchEntity`
    and `revOf` check as step 4, refetching an entity on mismatch), `removeUnit(unit)` (deletes entities no other
    followed unit needs). `navigator.storage.persist()` once after the first download.
  - Offline reader `apps/web/app/offline/read/page.tsx`: a client page with no per-user data; lists the saved courses
    and problems and shows a lesson or problem with the client Markdown renderer (move `app/admin/markdown-preview.tsx`
    to `app/markdown-client.tsx` and import it from both places), code tabs, Mermaid via `app/diagram.tsx`, images from
    the `assets` store. Routes inside the reader use the hash (`#problem-<id>`, `#lesson-<id>`).
  - `public/sw.js`: precache `/offline` and `/offline/read` (and their static assets) once the user has saved any unit
    (the page posts `cache-reader` to the worker). On a failed navigation to `/dsa/<id>` or `/study/<area>/<id>`, serve
    the reader at that item when it is saved, else the existing `/offline` page with a link "Open your offline copy".
    Content stays in IndexedDB, not in the worker cache.
  - When online with saved units, call `updateIfNeeded()` at most once per hour (a small client component in the
    shell), if automatic updates are on.
  - Done when: with devtools "Offline", a saved problem opens in the reader; an unsaved one shows the offline page.
- [ ] **8. Tests.**
  - `packages/shared/src/content-model/parts.test.ts`: `diffParts` for each part kind (one hint changed → `hints`;
    block moved inside a section → `section:<id>`; section moved → `section-order:<slot>`; new image →
    `asset:<id>`; title change → `meta`; create → `all`); `patchEntity` of each part gives an entity whose `revOf`
    equals the server's; `mergeChanges` unions parts and keeps the latest data.
  - `units.test.ts`: `unitsFor` for each entity kind, including a move between courses.
  - `apps/web/lib/content-sync/apply.test.ts` (two `:memory:` DBs, server seeded from the fixture): up to date → only
    the version call; one hint edited → only that problem's hints in the response and applied; a section edit →
    only that section; a filter by units excludes changes to other units; applying a page twice → no change; delete;
    a wrong `rev` after patching → whole entity refetched; 410 → unit download; bad data or a network error mid-way →
    old copy untouched; server schema newer → `app-too-old` and nothing written.
  - `apps/web/app/api/content/sync-routes.test.ts`: units, unit pages, changes (headers, 302, 410, unit filter,
    page size); `POST /api/content/sync` refuses non-local and hosted.
  - `apps/desktop/lib/content-setup.test.js`: copy decisions (missing, older, newer, equal).
  - Done when: targeted runs pass, then `pnpm check` once. Also `pnpm desktop:build` with `HABIT_DATA_DIR` set to a
    temp folder starts offline with content (manual; result in the notes).
- [ ] **9. Docs.** `pnpm content:pull` (alias of `content:snapshot --out data/content.db`) for developers. Update
  `docs/mobile.md` (offline reading by course), `docs/hosting.md` (content endpoints and caching),
  `docs/troubleshooting.md` ("content is out of date", "needs a newer app").
  - Done when: docs updated.

## Acceptance criteria

- [ ] A new desktop install opens with all content while the network is off.
- [ ] After an admin fixes one hint, a client downloads that problem's hints only (visible in the network log), not
      the problem, course or snapshot.
- [ ] On the web, a user can save chosen courses and pattern problem sets, read them offline, and receives updates
      only for those.
- [ ] An app whose schema is older than the server's keeps its content and says it needs an update.
- [ ] A broken or interrupted update never leaves partial or wrong content (the `rev` check refetches).
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
