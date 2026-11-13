# 0075: Settings and theme sync fix

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-13
- **Implemented by:** (implementer fills in)
- **Spec:** none (follows plans 0044, 0050, 0058, 0073)

## Goal

A theme or setting changed on one device shows up on the person's other devices (desktop app, hosted site, phone)
within about a minute, without a manual reload where possible. A signed-out guest keeps everything on the device.
AI settings, keys and tokens never sync.

## Context

What exists (all paths under `apps/web/` unless noted):

- `lib/sync-triggers.ts`: `SYNC_TABLE_MAP_V1` has `settings` (key `key`, column `value`). `SYNC_SETTINGS_DENYLIST`
  (extension_token, content_feed_url, tools_notice_dismissed, ai_enabled, ai_model, ai_ollama_url, ai_provider,
  ai_cloud_consent) plus `SECRET_WORDS` (token, secret, key, password) decide `isSyncableSettingKey`. The same rule is
  written into the SQL triggers (`syncableCond`) and checked again on pull (`lib/sync-engine.ts` `rowStatements`, and
  on first link around line 528).
- Appearance: `lib/ui-prefs.ts` `getAppearanceSetting` / `setAppearanceSetting` (setting `appearance_prefs`, JSON),
  `app/actions.ts` `getAppearanceAction` / `setAppearanceAction`, client rules in `app/shell.tsx` (`syncAppearance`,
  `onThemeChange`), browser side in `lib/theme.ts` (`readStoredAppearance`, `applyTheme`, `THEME_EVENT`,
  `THEME_INIT_SCRIPT`). The seven fields live in localStorage (`habit-theme`, `-accent`, `-style`, `-font`, `-gamify`,
  `-bionic`, `-motion`).
- Browser-only prefs: `lib/synced-prefs.ts` (allowlist `SYNCED_PREF_KEYS`, setting `ui_prefs_synced`, one JSON blob
  `{updatedAt, values}`), `app/components/synced-prefs.tsx` (pull on mount and when the tab becomes visible, push every
  20 s and on hide), mounted in `app/layout.tsx`.
- Sync: desktop and phone run `lib/sync-manager.ts` (status poll 5 s, run 30 s) which calls `/api/sync/run`
  (`app/api/sync/run/route.ts`) to sync the local database with the hub (`lib/hub/*`, plan 0073). The hosted site is a
  device: `lib/hosted/sync.ts` `syncOnRequest` (throttled to 20 s per user, called from
  `app/components/hosted-sync.tsx` in the root layout inside `<Suspense>`) and `syncAfterMutation` (called from
  `lib/hosted/refresh.ts` after server actions). Hosted users get their own Turso database
  (`lib/hosted/require-user-db.ts`); signed-out visitors get a per-request in-memory database (`createGuestDb`), so
  nothing they save persists.
- Existing tests to reuse: `lib/sync-e2e.test.ts` (`setupWorker`, `createLocalDb`, `linkAccount`, `runSync`; case c is
  the denylist test), `lib/hub/hub-e2e.test.ts` (`newDevice`, `signIn`, `hub()`; push/pull/tombstone cases),
  `lib/hosted/sync.test.ts`, `lib/synced-prefs.test.ts`, `lib/ui-prefs.test.ts`, `lib/sync-triggers.test.ts`.
- AGENTS.md rules that apply: new settings must go through `settings`; never edit a shipped migration; no
  `Math.random()` or `Date.now()` during render; never touch `data/habit.db`.

## Root cause: findings

Each finding is marked **confirmed from code** (read in the source) or **needs browser confirmation** (depends on
timing or on a real second device). Steps to confirm are in the next section.

### (a) Are the keys in the synced list on both sides?

- **F1. Key names are fine. Confirmed from code.** `appearance_prefs`, `ui_prefs_synced`, `simple_mode`, `buddy_mode`,
  `buddy_name`, `adhd_pacing`, `profile_name`, `favourite_courses` contain none of the SECRET_WORDS and are not on the
  denylist. Triggers, push and pull use the same function, and the hub's `settings` table
  (`lib/hub/migrations.ts`, columns user_id, key, value, updated_at, deleted_at, synced_at) does no key filtering of its
  own (the filter is on the client side only). There is no test that names the UI keys, so a future key rename that
  contains "key" (for example `ui_hotkey`) would silently stop syncing. Add the guard test (step 1).
- **F2. Appearance fields outside `appearance_prefs` and `ui_prefs_synced` do not sync. Confirmed from code.** The
  custom colour theme (`habit-custom-theme`) travels in `ui_prefs_synced`, but the appearance `style` value
  (`custom`) travels in `appearance_prefs`. They are two rows with two timestamps and two code paths, so a device can
  get `style=custom` without the palette (or the reverse) for up to a sync cycle.

### (b) Signed-in, linked accounts only

- **F3. Hosted, signed in: reads happen before the sync pulls. Confirmed from code, timing needs browser
  confirmation.** `HostedSyncOnRequest` runs inside `<Suspense>` next to the page, and `syncOnRequest` skips when the
  user synced under 20 s ago. The page, `getAppearanceAction` and `getSyncedPrefsAction` read the user's Turso
  database as it was before the pull. Also, both get-actions are server actions that do not call `syncOnRequest`, so an
  open tab on the hosted site that re-checks (tab becomes visible) reads stale data until the next full page request or
  mutation. A change made on the desktop therefore reaches the hosted site only after one more request, then the
  theme applies on the request after that.
- **F4. Hosted, first link: local theme can overwrite the cloud theme. Confirmed from code, outcome needs browser
  confirmation.** A new user's Turso database is empty. In `syncAppearance`, `local && !server` calls
  `setAppearanceAction(local)`, which writes `appearance_prefs` with a trigger stamp of "now". `link()` plus `runSync`
  then pulls the cloud row, but `rowStatements` skips a pulled row when the local stamp is newer
  (`stamp.updated_at > updatedAt`). So the browser's old localStorage theme beats the real theme from the account.
- **F5. Signed-out guest. Confirmed from code, behaviour as designed.** `requireUserDb` returns a throwaway in-memory
  database, so `getAppearanceAction` returns null and `setAppearanceAction` writes into a database that is thrown away;
  `refresh()` skips the sync for anonymous visitors. The theme stays in localStorage, which is the wanted behaviour,
  but the comment in `setAppearanceAction` ("no database yet", try/catch) is stale and the `local && !server` branch
  fires one pointless server action per page load for every guest.
- **F6. The silent catch hides real failures. Confirmed from code.** `getAppearanceAction` returns null on any error
  (database down, Turso refused). The client then treats "no server value" as "server is empty" and pushes its local
  value (`local && !server`), which can overwrite a good cloud value when the read merely failed. There is no log and no
  visible status.

### (c) Client appearance sync in `shell.tsx`

- **F7. The server value always wins when values differ, with no timestamp. Confirmed from code.** If a device changed
  its theme while offline or before its push finished (the push is a fire-and-forget `setAppearanceAction(...).catch`),
  the next load replaces the local choice with the older server value. Reverse problem: a stale localStorage value does
  not win forever (server wins), so the "stale local wins" fear is not the bug. The bug is that the server value is
  stale because of F3 and F8.
- **F8. `syncAppearance` runs once per full page load. Confirmed from code.** `Shell` lives in the root layout, so
  client navigations never re-run it, and there is no `visibilitychange` or interval. A theme changed on device A is
  not seen on device B's open tab until B is fully reloaded.
- **F9. Echo write. Confirmed from code, effect needs browser confirmation.** `applyTheme(server)` dispatches
  `THEME_EVENT`, `onThemeChange` listens, reads localStorage and calls `setAppearanceAction(cur)`. The upsert fires the
  `AFTER UPDATE` trigger even when the value is unchanged, so the device re-stamps `appearance_prefs` with a newer time
  and pushes it. With two open devices this can overwrite a newer change made on the other device a moment later.
- **F10. Update stamps use each device's own clock. Confirmed from code.** Triggers stamp with SQLite "now" on that
  device; the engine compares stamps as plain numbers (E-line: `stamp.updated_at > updatedAt`). A device whose clock is
  ahead wins every conflict until the other one catches up (see F13).

### (d) Does an open page re-read after a pull?

- **F11. No. Confirmed from code.** `lib/sync-manager.ts` knows `pulled` but nothing calls `router.refresh()` or
  dispatches an event, and `HostedSyncOnRequest` returns null. New settings rows appear only on the next full load or
  navigation that re-reads the database. Appearance and `ui_prefs_synced` read through server actions once (mount, tab
  visible), so they also lag behind.

### (e) First-link merge and clock skew

- **F12. First link is newest-wins per row, using device clocks. Confirmed from code.** `lib/sync-engine.ts` (around
  line 528) queues every syncable settings row with a current timestamp on link, so a device that links later and has
  default or old settings stamps them "now" and can beat the real values from the account (same mechanism as F4, on the
  desktop too). Needs browser confirmation for the desktop variant.
- **F13. `ui_prefs_synced` compares a device clock with another device's clock. Confirmed from code.**
  `shouldPull(server, localAt)` pulls only when `server.updatedAt > localAt`, where both numbers came from
  `Date.now()` on different devices. If device B's clock is behind A's last-seen time, B's pushed prefs are never pulled
  by A. Also the blob is whole-or-nothing: a device with fewer keys set pushes a snapshot that replaces the others'
  keys (the pull merges per key, but the server row does not), and any push from a stale device resets the shared
  `updatedAt` to its own clock.

### (f) Do the two paths fight?

- **F14. They touch different localStorage keys, so they do not overwrite each other directly. Confirmed from code.**
  `SYNCED_PREF_KEYS` does not include the seven appearance keys. The conflicts are indirect: (1) F2 (two rows for one
  visual state); (2) `SyncedPrefs` calls `location.reload()` once per session when a pull changed something, and the
  reload re-runs `syncAppearance` and can trigger F9 and F4 again; (3) both paths use the same `settings` table and the
  same 20 s hosted throttle, so one cycle's pushes delay the other.

### (g) Left in localStorage or cookies

| Item | Where | Today | Recommendation |
|---|---|---|---|
| Reader mode | cookie `zd_reader` (`lib/reader-mode.ts`, `setReaderModeAction` in `actions.ts`) | per device | **Keep per device.** It is a phone comfort mode; a desktop that inherits it would hide Run and Submit. |
| Haptics | `zd_haptics` | synced via `ui_prefs_synced` | **Keep per device** (change). A phone vibration switch has no meaning on desktop, and turning it off on a laptop should not turn it off on the phone. Remove from `SYNCED_PREF_KEYS`. |
| Pet choice | buddy prefs `pet` field | not synced (deliberate) | **Keep per device.** Sprites and imported images are device-heavy; built-in avatar, size and frequency already sync. |
| Buddy mode, name, pacing | settings rows (`buddy_mode`, `buddy_name`, `adhd_pacing`) | synced | Keep synced. |
| Pane layout, editor language, solution language | `habit-pane-layout`, `habit-judge-lang`, `zen-dojo.solution-lang` | synced | Keep synced for language; **pane layout per device** (a phone layout does not fit a desktop). Remove `habit-pane-layout` from the list. |
| Custom colour theme | `habit-custom-theme` | synced | Keep synced and move into the appearance row (step 4). |
| Custom font file | IndexedDB + `habit-custom-font` | per device | Keep per device (file lives in IndexedDB). |
| Zen mode, sidebar state | `lib/zen-mode.ts` | per device | Keep per device. |

The two "per device" removals change shipped behaviour; if the user prefers to keep them synced, say so under
*Open questions* before step 5 and skip those two edits.

## How to confirm the "needs browser confirmation" findings

Never use `data/habit.db`. Use a copy:

1. `Copy-Item data\habit.db C:\Temp\habit-test.db` (or start empty; the file just has to be a throwaway).
2. From the repo root: `$env:DATABASE_URL="file:C:/Temp/habit-test.db"; pnpm.cmd dev` (port 3000). Do not point it at
   the real hub with real credentials; for sync tests use the local hub setup from `lib/hub/hub-e2e.test.ts` (a temp
   libSQL hub) or two throwaway test accounts on the staging site named in the user's request.
3. Open two browser profiles ("Profile A" and "Profile B", each its own localStorage) at `http://localhost:3000`, both
   signed in to the same test account and linked.
4. F3 / F8 / F11: in A set the theme to a different mode in Settings. In B (page open, do not reload) wait 90 s. Expected
   today: no change. Reload B: it changes only after the second load. Record the times. Open DevTools > Network in B and
   check whether `getAppearanceAction` was called again (it should not be).
5. F4 / F12: sign in on B with a brand-new profile after setting a non-default theme on B while signed out. Check which
   theme B shows after sign in and what A shows after its next sync.
6. F9: in B DevTools console run `window.addEventListener("habit-theme-change", () => console.log("echo"))`, then change
   the theme on A, reload B; "echo" printing once on load confirms the echo write, and the settings row's stamp on B
   (`SELECT * FROM sync_stamps WHERE tbl='settings' AND row_key='appearance_prefs'` on the test DB) moves forward.
7. F13: set B's system clock 10 minutes behind A, change a synced pref (for example the editor language) on B, then
   check whether A ever applies it.
8. F6: stop the database (rename the test db file) and reload B; check that it pushes the local value afterwards.
9. F5: open the hosted site signed out; confirm a theme change stays only in that browser and the Network tab shows a
   `getAppearanceAction`/`setAppearanceAction` call per load.

## Out of scope

- Changing the sync engine's conflict rule for other tables, the hub schema, or adding a server-assigned clock for all
  tables (only a small appearance-specific fix is planned).
- Real-time push (WebSocket, SSE). Polling and refresh-on-focus are enough.
- Syncing AI settings, API keys, tokens, the timer, buddy session, dismissals, custom font files or code drafts.
- Any change to the denylist beyond what the new guard test checks.
- Reworking `SyncManager` backoff or `HostedSyncOnRequest` throttle values (other than the shared "sync now" entry
  point in step 3).

## Steps

- [ ] **1. Guard test for key names.** Add `apps/web/lib/sync-setting-keys.test.ts`. It imports `isSyncableSettingKey`
  and lists the exact UI keys that must sync (`appearance_prefs`, `ui_prefs_synced`, `simple_mode`, `buddy_mode`,
  `buddy_name`, `adhd_pacing`, `profile_name`, `favourite_courses`, `interview_date`, `plan_start_date`,
  `plan_week_cursor`, `plan_week_history`, `plan_week_start`, `plan_finished`) and the keys that must not
  (`ai_enabled`, `ai_model`, `ai_ollama_url`, `ai_provider`, `ai_cloud_consent`, `extension_token`, `content_feed_url`,
  `tools_notice_dismissed`, `api_secret_key`, `db_password`). It also checks the generated trigger SQL
  (`syncMigrationSql()` in `lib/sync-triggers.ts`) allows the first group by running it against
  an in-memory libSQL database (same setup as `lib/sync-triggers.test.ts`).
  - Done when: `pnpm exec vitest run apps/web/lib/sync-setting-keys.test.ts` passes, and renaming `appearance_prefs` to
    `appearance_key` makes it fail.
- [ ] **2. Server-side newest-wins for appearance, no echo, no blind overwrite.** In `lib/ui-prefs.ts` store
  `appearance_prefs` as `{"v":1,"at":<ms>,"prefs":{...Appearance}}` (read the old plain format too; `parseAppearance`
  stays the sanitiser). `setAppearanceSetting(prefs, at?)` writes only when `prefs` differs from the stored prefs
  (this stops the echo, F9) and takes an `at` from the caller. Add `getAppearanceRecord()` returning `{prefs, at} | null`.
  In `app/actions.ts` change `getAppearanceAction` to return `{prefs, at} | null | "error"` (distinguish failure,
  F6) and `setAppearanceAction(prefs, at)`.
  - Done when: `ui-prefs.test.ts` cases (step 8) pass; setting the same prefs twice leaves `sync_stamps.updated_at`
    unchanged.
- [ ] **3. Make reads see fresh data (hosted), and give the client a "sync now".** (a) In `lib/hosted/sync.ts` export
  `syncBeforeRead(userId)` = `syncOnRequest` with the same throttle; call it at the top of `getAppearanceAction` and
  `getSyncedPrefsAction` when `isHosted()` and a session exists (use the session helpers already used in
  `lib/hosted/refresh.ts`). Failures are ignored and logged without row contents. (b) For desktop and phone, after
  `SyncManager` finishes a run with `pulled > 0` (`lib/sync-manager.ts`, near where run results are handled), dispatch
  `window.dispatchEvent(new Event("habit-sync-pulled"))`; export the name as `SYNC_PULLED_EVENT` from `lib/sync-manager.ts`.
  - Done when: a unit test shows `getAppearanceAction` on the hosted path triggers one sync and a second call inside
    20 s does not (extend `lib/hosted/sync.test.ts`); `sync-manager` test shows the event fires only when `pulled > 0`.
- [ ] **4. One appearance record, with a version stamp, applied live.** In `app/shell.tsx` rewrite `syncAppearance`:
  keep a localStorage `habit-appearance-at` (ms, device clock) that `applyTheme` callers update when the person changes
  the theme (not when applying from the server). Rules: server `at` > local `at` -> apply server (no echo: pass a flag
  so `onThemeChange` ignores the event it caused); local `at` > server `at` -> push; server "error" -> do nothing (F6);
  both empty -> nothing; local has values but no `at` and server has a record -> server wins (fixes F4/F12 for first
  link). Run it on mount, on `visibilitychange` to visible, on `SYNC_PULLED_EVENT`, and every 60 s while visible. Move
  `habit-custom-theme` into the same record (`prefs.customTheme`, optional) and drop it from `SYNCED_PREF_KEYS`
  in `lib/synced-prefs.ts`, so the style and its palette arrive together (F2). Extend `Appearance` and
  `parseAppearance` in `lib/theme.ts` accordingly, and make `applyTheme` write `habit-custom-theme`.
  - Done when: with two profiles, a theme change on A shows on B (page open) within 60 s without a reload.
- [ ] **5. Fix `ui_prefs_synced` clocks and per-key merge, and trim the list.** In `lib/synced-prefs.ts` change the blob
  to `{updatedAt, values, stamps}` where `stamps[key]` is the time that key last changed on the device that changed it;
  `shouldPull` compares per key against a local per-key record, and the pull never reloads the page if the only change is
  something CSS or React reads on the next render (call `window.dispatchEvent(new Event("habit-prefs-applied"))` and let
  the few readers re-read; keep `reloadDecision` only for keys that truly need a reload). To tolerate clock skew, store
  `serverNow` (the hub response time, see `lib/sync-engine.ts` head check) when available and compare using the
  difference; if that is not available, accept an incoming blob whose per-key stamp differs from the last applied one
  instead of requiring it to be larger. Remove `zd_haptics` and `habit-pane-layout` from `SYNCED_PREF_KEYS` (see the
  table in (g); skip if the user answers otherwise in *Open questions*). Keep old blobs readable.
  - Done when: `synced-prefs.test.ts` skew and partial-snapshot cases (step 8) pass.
- [ ] **6. Stop pointless guest work.** In `app/shell.tsx` skip the server round trips when there is no account. Add a
  small `getSyncAccountStateAction` (or reuse the account info already sent to `SidebarAccount`) returning
  `"signed-in" | "guest"`; guests do not call `getAppearanceAction` or `setAppearanceAction` at all, and
  `setAppearanceAction` / `setSyncedPrefsAction` stop swallowing errors silently (return `{ok:false}`, log a short
  message without values). Update the stale comments.
  - Done when: signed out on the hosted site, DevTools > Network shows no appearance or synced-prefs action calls, and
    the theme still changes and persists in that browser.
- [ ] **7. Show a status when appearance sync fails.** If the read returns "error" or a push fails, show a one-line
  note in `app/profile/settings` (near the existing sync status, `app/components/sync-status.tsx`) such as "Theme sync
  is paused. It will retry." Use plain text, no emoji (`app/no-emoji.test.ts` checks).
  - Done when: simulating a failed action shows the note and it disappears after a successful retry.
- [ ] **8. Tests.** Add or extend these files (all run with targeted `pnpm exec vitest run <file>`):
  - `apps/web/lib/ui-prefs.test.ts`: old plain format still reads; new record round trip; identical write leaves the
    stamp unchanged (use `DATABASE_URL=":memory:"` and `trigger` check as in the existing tests); an invalid value is
    sanitised.
  - `apps/web/lib/synced-prefs.test.ts`: device B clock 10 min behind still receives A's change; partial snapshot from a
    device with few keys does not delete other keys; `zd_haptics` and `habit-pane-layout` are not in `buildSnapshot`.
  - `apps/web/lib/sync-e2e.test.ts` (new case "j) UI settings sync, newest wins"): reuse `setupWorker`,
    `createLocalDb`, `linkAccount`, `makeFetcher`. Device A writes `appearance_prefs` and `ui_prefs_synced`, pushes;
    device B pulls and has both; B then changes `appearance_prefs` later and A receives it; AI keys written on A never
    reach the worker table or B.
  - `apps/web/lib/hub/hub-e2e.test.ts` (new case "settings and theme sync through the hub"): reuse `newDevice`,
    `signIn`, `hub()`; two devices, push `appearance_prefs` from one, pull on the other, then an update from the other
    wins; assert `ai_provider` and `extension_token` rows never appear in the hub's `settings` table.
  - `apps/web/lib/hosted/sync.test.ts`: `syncBeforeRead` throttle (step 3) and "first link does not overwrite a newer
    cloud appearance with an older local one" (F4) using the same fake fetch and in-memory db the file already uses.
  - `apps/web/lib/sync-manager.test.ts` (new file; no sync-manager test exists yet, search `lib/` and `app/` first and extend one if found): `SYNC_PULLED_EVENT` fires only when
    `pulled > 0`.
  - `apps/web/lib/sync-setting-keys.test.ts` from step 1.
  - Done when: each file above passes with `pnpm exec vitest run <file>` and `pnpm -r typecheck` is clean.

## Acceptance criteria

Two-device scenarios (A and B are two browser profiles or one desktop app plus the hosted site, same account, both linked):

- [ ] Change the theme (mode, accent, style, font, motion, bionic, gamify) on A. B, with the page open and not
  reloaded, shows the same theme within one minute.
- [ ] Change the custom colour theme on A. B gets the style and the palette together, never one without the other.
- [ ] Change a setting on B 30 s after A changed a different one. Both end up on both devices (no lost update).
- [ ] B's clock is 10 minutes behind A's. A change on B still reaches A.
- [ ] B is offline, changes the theme, goes online. The newer change reaches A (it does not get overwritten by the
  older server value).
- [ ] First sign-in on a new device or the hosted site: the account's theme wins over the browser's old default; an
  older local theme never replaces a newer cloud one.
- [ ] Signed-out guest on the hosted site: theme and preferences stay in that browser only, nothing is sent to a
  server action, nothing appears on any other device or account.
- [ ] AI settings (`ai_enabled`, `ai_model`, `ai_ollama_url`, `ai_provider`, `ai_cloud_consent`), the extension token,
  the content feed URL and any key containing token, secret, key or password never reach the hub or another device
  (tests prove it on both the old worker path and the hub path).
- [ ] Reader mode, haptics, pet choice and pane layout stay per device (or are synced as the user decided under
  *Open questions*).
- [ ] When theme sync cannot read the server, the device keeps its own theme and shows a short note; it does not push
  its value over the cloud value.
- [ ] `pnpm check` passes (run once at the end).
- [ ] No changes outside the files named above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

- Q1 (for the user, before step 5): keep haptics and the pane layout synced, or per device as recommended?
  Default if no answer: per device.

## Pitfalls

- Do not run full `pnpm test`; run targeted files, then `pnpm check` once at the end.
- `appearance_prefs` is already stored as plain JSON on shipped installs: the reader must keep accepting the old shape
  or existing users lose their theme on update. No new migration is needed (it is a settings value, not a table).
- Never edit a shipped migration. Nothing in this plan needs a schema change.
- The settings triggers fire on UPDATE even when the value is unchanged, so skip no-op writes in code (step 2) or every
  device keeps re-stamping the row.
- `Date.now()` must not be called during render (lint `react-hooks/purity`); use it only inside effects and handlers.
- Do not pass real credentials or the real `data/habit.db` to any test run; use `file:C:/Temp/habit-test.db`,
  `:memory:`, or the temp hub from `hub-e2e.test.ts`.
- `HostedSyncOnRequest` and `syncBeforeRead` share one throttle map; calling both in one request is fine, but do not add
  a second map.
- Keep the buddy sync, reader cookie and AI paths unchanged; do not add keys to `SYNCED_PREF_KEYS` that point at
  IndexedDB files.
- The device clock is still the tie breaker for the same key. This plan makes that safe for the two paths above, not for
  every table.

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
