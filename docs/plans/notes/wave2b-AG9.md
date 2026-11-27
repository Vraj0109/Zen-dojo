# Wave 2 Round B Implementation Notes: Agent AG9

**Role:** AG9 (Antigravity)
**Tasks:** Web offline copy, offline reader, Settings card, What's new, system notifications (0115 steps 6–7, 0119 steps 3–6 and 8).

---

## Files Created or Changed

### Database & User Storage
- `apps/web/lib/db.ts`: Appended migration creating `content_notices` table (`id` PK, `unit`, `unit_title`, `entity`, `entity_id`, `section_id`, `title`, `note`, `at`, `read_at`) and index on `read_at`.
- `apps/web/lib/schema.ts`: Added Drizzle schema definition `contentNotices` and type `ContentNoticeRow`.
- `apps/web/lib/backup.ts`: Added `"content_notices"` to `BACKUP_TABLES`.
- `apps/web/lib/content-notices.ts`: Implementation of notice recording (capped at newest 200), listing, unread counting, mark single/all read, entity/section read, and recent notice retrieval.
- `apps/web/lib/content-notices.test.ts`: Vitest test suite covering record, pruning at 200, unread count, single and all read marking, refreshNotice allocation, and section matching.

### IndexedDB Store & Offline Reader
- `apps/web/app/offline/content-store.ts`: IndexedDB `zd-content` store implementation with stores `meta`, `entities`, `assets`, and `notices`. Provides `downloadUnits()`, `removeUnit()`, `updateIfNeeded()`, offline notices management, and storage estimate helpers.
- `apps/web/app/offline/read/page.tsx`: Client-rendered offline reader supporting hash routes (`#problem-<id>`, `#lesson-<id>`, `#whats-new`, and library index). Renders Markdown with `MarkdownPreview`, code blocks, Mermaid diagrams with `Diagram`, and base64 images from the local `assets` store.
- `apps/web/app/offline/page.tsx`: Added link to "Open your offline copy" (`/offline/read`).

### Service Worker
- `apps/web/public/sw.js`: Added message handler for `cache-reader` to precache `/offline` and `/offline/read` once a unit is saved, added navigation fallback to redirect to `/offline/read#...` or serve offline reader, and added `notificationclick` handler focusing/opening `/whats-new`. Never caches per-user HTML or API responses.
- `apps/web/app/register-sw.tsx`: Exported `notifyCacheReader()` to message the service worker when units are saved.

### Settings ("Offline content" card)
- `apps/web/app/profile/settings/offline-actions.ts`: Server actions for reading desktop content status, triggering manual update checks (`checkForUpdatesDesktopAction`), updating auto-update and system notification preferences, and setting per-unit follow/mute states.
- `apps/web/app/profile/settings/offline-content.tsx`: Dual-mode component:
  - Desktop: Displays status ("All content is on this computer · version X · updated ... · Up to date"), "Check for updates" button, auto-update toggle, and system notifications toggle.
  - Web: Storage estimate, grouping of units (Courses, Problems by pattern, Docs) from `/api/content/units`, checkboxes, Select all, "Download selected" with progress, "Remove" button for saved units, and browser notification permission request button.
- `apps/web/app/profile/settings/page.tsx`: Registered `offline` entry in `ENTRIES` under `content` category and added `OfflineContentSection` inside `<Suspense>`.

### Navigation & What's new UI
- `apps/web/app/nav.tsx`: Added `WhatsNewBell` linking to `/whats-new` with an unread badge that displays unread notices count (hidden when 0).
- `apps/web/app/whats-new/actions.ts`: Server actions for `getUnreadNoticeCountAction`, `markAllReadAction`, and `markOneReadAction`.
- `apps/web/app/whats-new/page.tsx`: Server component (Suspense-wrapped) listing notices newest first grouped by date and unit, with direct links to updated problems/lessons (`#s-<sectionId>`), mark-read actions (working without JS), and empty state.

### Desktop System Notification
- `apps/desktop/lib/notify.js`: Pure helper `maybeShowNotification({ enabled, summary, count, NotificationClass, onClick })` using dependency injection for testing.
- `apps/desktop/lib/notify.test.ts`: Vitest test suite checking disabled setting, zero notices, summary formatting, and click callback.
- `apps/desktop/main.js`: Imported `Notification` from Electron and `maybeShowNotification` from `./lib/notify.js`. In `setupContentSync`, triggers a notification when background sync applies new notices, focusing window and navigating to `${origin}/whats-new` on click.

### Documentation
- `docs/mobile.md`: Documented offline reading by course and problem set via Settings and `/offline/read`, service worker caching, and content update notices ("Tell learners").

---

## Test Commands and Results

1. `pnpm exec vitest run apps/web/lib/content-notices.test.ts apps/desktop/lib/notify.test.ts apps/web/lib/db.test.ts`
   - Output: 3 test files passed, 12 tests passed (4 in notify.test.ts, 5 in content-notices.test.ts, 3 in db.test.ts).
2. `pnpm exec vitest run apps/web/app/profile/settings/settings-search.test.ts`
   - Output: 1 test file passed, 5 tests passed.
3. ESLint check on all changed/created web files:
   - Command: `pnpm --filter web exec eslint app/offline app/profile/settings/offline-content.tsx app/profile/settings/offline-actions.ts app/whats-new lib/content-notices.ts app/nav.tsx`
   - Output: Exited with code 0 (0 errors, 0 warnings).

---

## Deviations from the Plan

None. Everything was implemented in alignment with plans 0115 and 0119.

---

## Callers Outside Your Files that Need Wiring

1. `POST /api/content/sync` (`apps/web/app/api/content/sync/route.ts`):
   When C6 / Lead updates the route to compute and store `content_notices` from sync entries, it can call `recordNotices(notices)` in `apps/web/lib/content-notices.ts` and return `{ status, applied, notices: summaryLine(notices) }` in the response JSON so desktop `main.js` receives the summary.
2. Problem / Lesson pages (`apps/web/app/dsa/[id]/page.tsx`, `apps/web/app/study/[area]/[id]/page.tsx`):
   Can call `getRecentNoticesForSection("problem" | "lesson", id, 7)` from `apps/web/lib/content-notices.ts` to display an "Updated" pill next to section headings changed within the past 7 days, and call `markNoticesForEntityRead()` on visit.

---

## Content Constants

Zero content constants imported or left in AG9 files.

---

## Questions for the Lead

None.
