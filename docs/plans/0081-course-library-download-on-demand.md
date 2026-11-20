# 0081: Course library: extra courses in a separate repo, downloaded with one click

- **Status:** done
- **Planned by:** Claude Code, 2026-11-14
- **Implemented by:** Claude Code (subagent), 2026-11-15
- **Spec:** none

## Goal

DSA, System design and LLD stay built into the app. Every other course lives in a separate public GitHub repo,
`Vraj0109/zen-dojo-courses`. The Learn page shows a **Course library** with the courses you can add; one click on
**Download** installs a course, and it then stays on your device (and in your account, if you sign in) like any built-in
course, including offline. Nothing extra is bundled into the app or the site, so they stay light.

## Context

Most of the machinery exists already as **content packs** (`docs/content-packs.md`):

- Format and validation: `packages/shared/src/packs.ts` (`validatePack`, `validateFeed`, `ContentFeed`,
  `FeedPackEntry`; limits 2 MB and 500 items per pack; Markdown rendered without raw HTML; Mermaid validated).
- Storage: tables `content_packs` and `pack_progress` (`apps/web/lib/packs.ts`: `installPack`, `removePack`,
  `listPacks`, `fetchFeed`, `checkFeedUpdates`, `installFeedPack` with SHA-256 check). Both tables are in
  `BACKUP_TABLES` and in the sync tables (`lib/sync-schema.ts`, `sync-engine.ts`), so an installed course is in backups
  and reaches the user's other devices through sync.
- A standalone pack (no `target`) already shows as a course card on Learn (`apps/web/lib/courses.ts` → `listPacks`),
  with pages `/study/packs/[id]` and `/study/packs/[id]/[item]`, progress, and "Remove".
- A content feed (`format: "zendojo-feed"`) can be set by hand in Profile, Settings, Content
  (`settings.content_feed_url`, `apps/web/app/profile/settings/feed-updater.tsx`).
- Tooling: `pnpm pack:check <file>`, `pnpm pack:build`.

What is missing: a built-in default catalog, a place on Learn to browse it, a one-click download, update notices, the
courses repo itself, and a check that every course in it is valid.

Desktop: the local server fetches from the internet only when the user opens the Learn library or clicks Download;
installed courses are rows in the local SQLite file and need no network. Hosted site: the Vercel server fetches the
course and writes it into that user's own database.

## Out of scope

- Moving Core CS (or anything else built in) out of the app. It stays built in.
- Writing the real new courses. This plan ships the pipeline with one small pilot course; each later course is its own
  content task.
- Courses larger than one pack (2 MB). If a course ever needs more, split it into parts in a later plan.
- New lesson or problem types beyond what packs support today.
- Paid or private courses, ratings, comments, or third-party catalogs inside the library (custom feeds in Settings keep
  working as today).

## Steps

- [x] **1. Create the courses repo (user or lead, with the user's OK).** Public repo `Vraj0109/zen-dojo-courses`:
  ```
  README.md            what the repo is, how to add a course, licence of the content
  catalog.json         the feed the app reads (generated, step 3)
  courses/<id>.json    one pack per course (format zendojo-pack, version 2, no "target")
  .github/workflows/check.yml
  ```
  The lead can run `gh repo create Vraj0109/zen-dojo-courses --public` only when the user asks. Content licence: the
  same one the user chooses for the app's own lessons (ask the user if unsure).
  - Done when: the repo exists with the README and an empty `courses/`.

- [x] **2. Catalog format: extend the feed, stay backwards compatible.** In `packages/shared/src/packs.ts` add optional
  fields to `FeedPackEntry` and accept them in `validateFeed`: `category` (short string, e.g. "Languages",
  "Data", "Tools"), `bytes` (number), `items` (number of lessons + problems), `minAppVersion` (semver string). Old feeds
  without them stay valid. Unknown fields are ignored, as today. Add `DEFAULT_COURSE_CATALOG_URL =
  "https://raw.githubusercontent.com/Vraj0109/zen-dojo-courses/main/catalog.json"` in the same file.
  - Done when: `validateFeed` accepts both the old sample and a catalog with the new fields, and rejects wrong types.

- [x] **3. Catalog builder.** Add `scripts/courses-catalog.mjs` and the script `pnpm courses:catalog <repo-dir>` in the
  root `package.json` (same `node --import ./scripts/lib/register-ts.mjs` pattern as `pack:check`). It reads every
  `courses/*.json`, runs the same `validatePack` as the app (fails with the pack's errors if any is invalid, or if any
  pack has a `target`), and writes `catalog.json` with, per course: `id`, `title`, `description`, `version` (the pack's
  `revision`, required for library courses), `url` (raw URL of that file on `main`), `sha256` of the exact file bytes,
  `bytes`, `items`, `category` (from a new optional pack field `category`, else "Other"). Sorted by title. The script
  prints a one-line summary per course.
  - Done when: running it on a folder with the sample pack writes a valid catalog whose hash matches the file.

- [x] **4. Courses repo CI.** `.github/workflows/check.yml` in the courses repo, on push and pull request: check out
  this app repo (`Vraj0109/Zen-dojo`, `main`), install with pnpm, run `pnpm courses:catalog <courses checkout>` and fail
  if `catalog.json` differs from the committed one (so the catalog is never stale and every pack is valid). Document
  in the courses README: "edit or add `courses/<id>.json`, bump its `revision`, run `pnpm courses:catalog`, commit both".
  - Done when: a push with an invalid pack or a stale catalog fails the workflow.

- [x] **5. Server: read the library.** In `apps/web/lib/packs.ts` add `getCourseLibrary()`: fetch
  `DEFAULT_COURSE_CATALOG_URL` with the existing safe `fetchText` (http(s) only, 3 redirects, 2 MB, 15 s), validate it,
  keep the last good catalog in memory for 1 hour and in `settings` under `course_catalog_cache` (JSON, so a failed
  fetch still shows the last list). Return each entry with `state`: `"available"`, `"installed"` or
  `"update"` (installed pack's `revision` older than the entry's `version`, using `compareRevisions`), plus
  `tooNew: true` when `minAppVersion` is above the app version. On failure return the cached list with
  `offline: true`, or an empty list with an error message. Add `installLibraryCourse(id)`: find the entry in the current
  catalog **by id only** (never take a URL from the client), refuse if `tooNew`, then call `installFeedPack(entry)`
  (SHA-256 is required for library entries: refuse an entry without one). Updating keeps progress, as `installPack`
  already does.
  - Done when: unit tests (step 8) cover available / installed / update / tooNew / offline-with-cache / no-cache, and a
    tampered pack (hash mismatch) is refused.

- [x] **6. Server actions.** In `apps/web/app/actions.ts` add `installLibraryCourseAction(formData)` (reads `id`,
  calls `installLibraryCourse`, then `refresh()`); removing reuses the existing remove-pack action. Errors come back as
  plain text the page shows next to the card. Forms must work without JS.
  - Done when: posting the form installs the pilot course and Learn shows it as a course card.

- [x] **7. Learn page: the Course library section.** In `apps/web/app/study/page.tsx`, below the existing course
  cards, add a section "Course library" in its own `<Suspense>` (fallback: a short skeleton) so the rest of Learn never
  waits for GitHub. Intro line: "More courses you can add. Each one downloads once and then works offline." Group cards
  by `category`; each card shows title, description, item count, size ("1.2 MB"), and a button:
  - `available`: **Download** (submit button with pending text "Downloading...")
  - `update`: **Update** plus "New version available"
  - `installed`: "Downloaded" and a link **Open** to `/study/packs/<id>`
  - `tooNew`: disabled, "Needs a newer Zen Dojo"
  When `offline`, show "Showing the last list we saw. Connect to the internet to download." When there is no list at
  all, show "Couldn't reach the course library right now." and hide the section's cards. Wide layout (grid, 2 to 3
  columns on desktop, 1 on phones). No emoji. Use the theme tokens and the existing card style from the course grid.
  Installed library courses keep appearing among the normal course cards (that already works through `listPacks`).
  - Done when: the section renders in all four states and on a phone width without horizontal scroll.

- [x] **8. Pilot course.** Put one small, real course in the courses repo as `courses/<id>.json` (suggested: the
  existing `docs/examples/sample-pack.json` rewritten as a short real course the user picks; see Open questions), with
  `revision: "1.0.0"` and a `category`. Run `pnpm pack:check` and `pnpm courses:catalog`, commit both files there.
  - Done when: the live catalog URL returns the catalog and the app can download the course from it.

- [x] **9. Tests.**
  - `packages/shared/src/packs.test.ts`: new feed fields valid and invalid; old feeds still valid.
  - `apps/web/lib/packs.test.ts` (`DATABASE_URL=":memory:"`, stub `fetch`): `getCourseLibrary` states, memory and
    settings cache, offline fallback; `installLibraryCourse` by id, unknown id refused, missing or wrong sha256 refused,
    `tooNew` refused, update keeps `pack_progress` rows for items that still exist.
  - A test for `scripts/courses-catalog.mjs` on a temp folder (valid pack, invalid pack, pack with `target`).
  - Done when: these pass with `pnpm exec vitest run <file>`.

- [x] **10. Docs.** `docs/content-packs.md`: a "Course library" section (repo, catalog fields, how to publish a course,
  `pnpm courses:catalog`). `apps/web/lib/faq.ts`: "Where do extra courses come from and do they need internet?"
  - Done when: both explain the flow in plain words.

## Acceptance criteria

- [ ] Learn shows a Course library section listing the courses from `Vraj0109/zen-dojo-courses`, without slowing the
      rest of the Learn page.
- [ ] One click on Download installs a course; it appears as a normal course card, works offline afterwards, and
      survives an app restart and a backup restore.
- [ ] Signed in, a course downloaded on one device appears on the user's other devices after sync.
- [ ] A new `revision` in the repo shows **Update** on the card; updating keeps progress.
- [ ] A pack whose bytes do not match the catalog hash is refused with a clear message.
- [ ] Nothing from the courses repo is bundled into the app or the site build.
- [ ] DSA, System design, LLD and Core CS are unchanged.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

1. Which course should the pilot be, and which courses come next? (The user decides; each real course after the pilot
   is its own content task, written for this app, not copied from books.)
2. Content licence for the courses repo (for example CC BY 4.0 for text, MIT for code).

## Implementation notes

Steps 2, 3, 5, 6, 7, 9 and 10 are done. Steps 1, 4 and 8 wait for the repo `Vraj0109/zen-dojo-courses`, which does not
exist yet (its catalog URL answers 404). A ready-to-copy starter is in `docs/examples/courses-repo/`: `README.md`,
`.github/workflows/check.yml` (step 4), `catalog.json` (empty, exactly what `pnpm courses:catalog` writes for an empty
folder, so CI passes on the first push) and `courses/.gitkeep`. The licence line in that README is a placeholder (open
question 2).

Files changed:
- `packages/shared/src/packs.ts`: `FeedPackEntry` gets optional `category`, `bytes`, `items`, `minAppVersion`
  (validated by `validateFeed`); `Pack` gets optional `category` (validated by `validatePack`);
  `DEFAULT_COURSE_CATALOG_URL`.
- `scripts/courses-catalog.mjs`, root `package.json` (`courses:catalog`).
- `apps/web/lib/packs.ts`: `getCourseLibrary`, `installLibraryCourse`, `APP_VERSION`, `resetCourseLibraryMemo`,
  types `LibraryCourse`, `CourseLibrary`. `installFeedPack` now also refuses a pack whose id differs from the entry's
  `id` when the entry has one (the Settings feed updater passes no id, so it is unchanged).
- `apps/web/app/actions.ts`: appended `installLibraryCourseAction`.
- `apps/web/app/study/library-download.tsx` (new client form), `apps/web/app/study/page.tsx` (Course library section
  in its own `<Suspense>` with a skeleton).
- `docs/content-packs.md` (Course library section), `apps/web/lib/faq.ts` (`content-library`), `docs/faq.md`
  (regenerated with `pnpm faq:build`).
- Tests: `packages/shared/src/packs.test.ts` (3 new), `apps/web/lib/course-library.test.ts` (new, 6),
  `apps/web/lib/courses-catalog-script.test.ts` (new, 3).

Deviations:
- `installLibraryCourseAction` takes `(prev, formData)` instead of `(formData)` so it works with `useActionState` and
  can show the error next to the card. The form still posts without JS.
- The app version comes from `apps/desktop/package.json` (imported as JSON in `lib/packs.ts`); there was no other
  version source in the web app. `tooNew` compares with `compareRevisions`.
- A catalog entry for an installed pack with no `revision` counts the installed one as "0", so any library version
  shows Update.
- The script also requires the file name to equal the pack id, so the URL in the catalog always matches the id.
- The script test lives in `apps/web/lib/` because `packages/shared` has no Node types.
- Error text for a hash mismatch is reworded to "does not match the library's checksum".

Tests run (all pass): `pnpm exec vitest run packages/shared/src/packs.test.ts` (17),
`apps/web/lib/course-library.test.ts apps/web/lib/packs-v2.test.ts apps/web/lib/packs.test.ts` (26),
`apps/web/lib/courses-catalog-script.test.ts` (3), `apps/web/lib/faq.test.ts` (5); `pnpm -r typecheck` clean.
Not run: `pnpm check` (left for the reviewer). The Learn page was not opened in a browser; the four states are covered
by unit tests of `getCourseLibrary`, not by a UI check.

Found but not changed: `checkFeedUpdates` marks any version that differs from the installed one as an update, even an
older one (`compareRevisions(...) > 0 || p.version !== installedRevision`).

### Courses repo (2026-11-20, Claude Code)
- Created public repo `Vraj0109/zen-dojo-courses` (README, CC BY-SA 4.0 `LICENSE`, `.github/workflows/check.yml` from
  `docs/examples/courses-repo/`), first course `courses/behavioural-interviews.json` (14 lessons, revision 1.0.0,
  category "Interview skills"), `catalog.json` built with `pnpm courses:catalog`. CI run passed.
- Live check: the catalog URL returns 200, the deployed site lists the course under Course library, and Download as a
  guest reports "Downloaded. It is now one of your courses."
- Note: the lesson renderer has no Markdown tables or blockquotes, so the course draws its tables as plain text in code
  blocks. Adding table support to `parseMarkdown` would let future courses use real tables.

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
