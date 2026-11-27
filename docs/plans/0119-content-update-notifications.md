# 0119: Tell learners what changed in the content they follow

- **Status:** in-progress (wave 1 done, see docs/plans/wave1-content-db.md)
- **Planned by:** Claude Code, 2026-11-23
- **Implemented by:** (implementer fills in)
- **Series:** content in the database (0112 to 0119), overview `docs/architecture/content-in-db.md`.
- **Needs:** 0115 (units, part-level changes with `note`/`notify`, `syncContent` returning applied entries),
  0116 (admin save form).

## Goal

When an admin adds or updates content and chooses to tell learners, people who keep that content offline get a short
notice: "Caching course: new diagram in Write-through vs write-back". It appears in a **What's new** list in the app
with a badge, and as a system notification on the desktop app and (when allowed) in the browser. Only people who
downloaded that course or problem set are told (on desktop: the parts they have started or chose to follow). The
notice arrives when the device next syncs, so someone offline sees it when they come back online.

## Context

- 0115 adds `note` and `notify` to each `changes` row and returns them in `GET /api/content/changes`; `applyChanges`
  returns the applied entries; units are `course:<id>`, `problems:<pattern>`, `docs`.
- Web offline copy: IndexedDB `zd-content` (0115 step 7), with the followed units in `meta`.
- Desktop: the local route `POST /api/content/sync` runs updates; `apps/desktop/main.js` calls it at start and every
  6 hours. Electron's `Notification` class runs in the main process.
- Per-user data lives in the user DB (`apps/web/lib/db.ts`). New user tables need a migration appended to `MIGRATIONS`,
  a Drizzle table in `schema.ts`, and an entry in `BACKUP_TABLES` (`lib/backup.ts`) (AGENTS.md).
- Shell and nav: `apps/web/app/shell.tsx`, `apps/web/app/nav.tsx`. Pages that show a lesson or problem render sections
  with ids from 0114 (`app/content-page.tsx`); give each section an anchor `id="s-<sectionId>"` if it has none.

Decisions:

- **Who is told:** web = units the user downloaded (0115). Desktop (has everything) = units the user has started
  (any progress row for a lesson of that course or a problem of that pattern) plus units set to **Follow** in Settings,
  minus units set to **Mute**. Online hosted users with nothing downloaded are not told.
- **Which changes:** only those the admin marked "Tell learners". Typo fixes stay silent.
- **No server push.** Notices are made on the device after a sync. Push to closed browsers (Web Push with a push
  service and stored subscriptions) is out of scope; see *Out of scope*.

## Out of scope

- Web Push to closed browsers, email, or mobile push. Notifications for user data (sync, streaks).
- Notices to hosted users who did not download anything.

## Steps

- [ ] **1. Admin: note and "Tell learners" on save.** In the 0116 save footer (problem editor, lesson editor, doc
  editor): a **What changed** field (one line, up to 140 characters) and a **Tell learners** checkbox. Default: checked
  when the save creates an entity or adds a section or code block (from `diffParts`), unchecked otherwise. When checked,
  the note is required ("Say in one line what changed, for example: Added a Java solution"). The save writes `note` and
  `notify` on the `changes` row (0115 step 1) and into the audit row's `after_json` metadata. Restores and imports
  never notify.
  - Done when: a save with the box checked stores `notify = 1` and the note; the 0116 tests still pass.
- [ ] **2. Notice building (pure).** `packages/shared/src/content-model/notices.ts`:
  - `noticesFrom(entries, followedUnits)` → `Notice[]` with `{ id (change version), unit, unitTitle, entity, entityId,
    title (lesson or problem title), sectionId?, note, at }` for entries with `notify` and at least one unit in
    `followedUnits`. Several entries for one entity in one sync become one notice with the notes joined.
  - `summaryLine(notices)` → "3 updates in courses you follow" / "Caching: new diagram in Write-through vs write-back".
  - `followedUnitsDesktop({ startedUnits, follow, mute })` → set.
  - Done when: `notices.test.ts` passes (step 7).
- [ ] **3. Where notices are kept.**
  - Desktop and local web: new user-DB table `content_notices` (`id` PK = change version, `unit`, `entity`,
    `entity_id`, `section_id`, `title`, `note`, `at`, `read_at`) via a new migration in `lib/db.ts`, `schema.ts`,
    and `BACKUP_TABLES`. Not synced (notices are per device). Keep the newest 200.
  - Web offline copy: IndexedDB store `notices` in `zd-content` with the same fields.
  - Done when: migration test runs on `:memory:`; IndexedDB store created on upgrade.
- [ ] **4. Desktop flow.** `POST /api/content/sync` (0115) computes `startedUnits` from the user DB (progress rows for
  lessons and problem solves mapped with `unitsFor`), reads Follow/Mute from user settings, builds notices with step 2,
  stores them, and returns `{ status, notices: summary }`. `apps/desktop/main.js`: when the response has notices and
  the setting **System notifications** is on (default on), shows one Electron `Notification` with `summaryLine`;
  clicking it focuses the window and opens `/whats-new`. At most one system notification per sync.
  - Done when: after an admin "Tell learners" save in a course the user has started, the desktop shows one system
    notification after Check for updates; a change in an untouched course shows nothing.
- [ ] **5. Web flow.** In `content-store.ts` (0115), `updateIfNeeded()` builds notices for the downloaded units and
  stores them. If the user turned on **Browser notifications** in Settings (a button that calls
  `Notification.requestPermission()`, never asked automatically) and permission is granted, show one notification
  through the service worker (`registration.showNotification(summaryLine, { tag: "zd-content", data: { url:
  "/whats-new" } })`); `sw.js` handles `notificationclick` by focusing or opening that URL. This works while the
  browser is running; it does not reach a closed browser.
  - Done when: in Chrome with the site open and permission granted, an update to a downloaded course shows a browser
  notification; with permission denied only the badge appears.
- [ ] **6. In-app UI.**
  - A bell button in the shell (`shell.tsx` / `nav.tsx`) with the unread count (hidden at 0), linking to
    `/whats-new`.
  - Page `apps/web/app/whats-new/page.tsx`: notices newest first, grouped by day and unit: title, note, time, link to
    the page and section (`/study/<area>/<id>#s-<sectionId>` or `/dsa/<id>#s-<sectionId>`). **Mark all read**. Works
    without JS (form posts to a server action). For the web offline copy without a server, the reader shows the same
    list from IndexedDB at `/offline/read#whats-new`.
  - On a lesson or problem page, sections changed by an unread or recent (7 days) notice show a small "Updated" pill
    next to their heading; opening the page marks those notices read.
  - Settings ("Offline content" card from 0115): per unit **Follow** / **Mute** on desktop; **System notifications**
    on/off (desktop); **Browser notifications** button (web).
  - Done when: the bell count, the list, the pill and Mark all read work on desktop and in the web reader.
- [ ] **7. Tests.**
  - `packages/shared/src/content-model/notices.test.ts`: only `notify` entries; only followed units; a lesson moved
    between courses notifies followers of the new course; merged notes for one entity; `summaryLine` singular and
    plural; desktop follow/mute rules (mute wins over started).
  - `apps/web/lib/content-sync/notices-store.test.ts` (`:memory:`): store, cap at 200, mark read, unread count.
  - `apps/web/app/api/content/sync-routes.test.ts` (extend): the local sync returns notices only for started or
    followed units.
  - `apps/desktop/lib/notify.test.js` (pure helper deciding whether to show a system notification): setting off → no;
    zero notices → no; else one call with the summary.
  - Done when: targeted runs pass, then `pnpm check` once.
- [ ] **8. Docs.** `docs/mobile.md` and `docs/content-editing.md`: what "Tell learners" does, who gets told, and that a
  device offline is told when it next comes online.
  - Done when: docs updated.

## Acceptance criteria

- [ ] An admin can save with a one-line note and "Tell learners".
- [ ] A desktop user who started that course gets one system notification and a bell badge after the next sync; a user
      who never touched it gets nothing; Mute silences a unit.
- [ ] A web user who downloaded that course sees the badge (and a browser notification if they allowed it); a user who
      did not download it gets nothing.
- [ ] A user who was offline sees the notice after coming back online.
- [ ] The notice links to the changed section, which shows an "Updated" pill.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
