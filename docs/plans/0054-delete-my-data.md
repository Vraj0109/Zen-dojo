# 0054: Delete my data (cloud copy and this device, separately)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-10
- **Implemented by:** (implementer fills in)
- **Spec:** builds on plans 0049 (accounts) and 0050 (sync)
- **Priority:** 4

## Goal

On the Account page you can delete your data in two independent ways, each with its own button and warning:

1. **Delete my cloud data**: removes everything stored under your account in the sync database (D1), and optionally
   closes the account (no sign-in record, no devices). Your local data on every device stays.
2. **Delete data on this device**: erases the progress stored in this device's database. The cloud copy is **not**
   touched, and the erase is **not** uploaded as deletions.

## Context

- The Worker (`packages/sync-worker/src/index.ts`) stores rows in eight tables plus `sync_heads`, keyed by `user_id`;
  accounts live in `users`, `sessions`, and short-lived `oauth_states` and `auth_codes` (`migrations/0002_auth.sql`);
  limits live in `user_quota`, `bans` (keyed by `ip:` or `user:`) and `abuse_log` (`0003_abuse.sql`).
- The app tracks local changes with triggers into `sync_dirty` (plan 0050). **Any delete on a synced table is queued as a
  deletion and would upload to the cloud**, so a local erase must silence the triggers (`sync_flags.applying = '1'`) or the cloud copy would be erased too. This is the main pitfall.
- `apps/web/lib/backup.ts` lists the user tables (`BACKUP_TABLES`).

## Design (decided)

- **Cloud delete.** Worker route `POST /api/account/delete-data` with body `{ "scope": "data" | "account", "confirm": "DELETE" }`,
  Bearer required, same guard and rate limits as sync (a stricter per-user limit: 3 per hour). `data` deletes the user's rows in the eight tables and
  the `sync_heads` and `user_quota` rows in one D1 batch. `account` also deletes `sessions` and `users` rows for that user (the caller's session ends); the `bans` and `abuse_log` rows are kept (they are security records, about addresses). Response `{ ok: true, deleted: { table: count } }`. After it, a device that is linked keeps its local data and its dirty list; the next sync would re-upload only rows that change later. To avoid a silent half state, the app **unlinks** the device after a cloud delete, so nothing re-uploads unless the user presses Upload again.
- **Local delete.** Server function `eraseLocalData({ keepSettings: boolean })` in a new `apps/web/lib/erase-data.ts`: inside one batch set `sync_flags.applying='1'`, delete rows from the user tables (the eight synced ones plus the other user tables
  listed in `BACKUP_TABLES`, but **not** `content_items`/`content_packs` imported content unless the user ticks "also imported content", and never the `settings` rows `extension_token` and `content_feed_url` unless the user ticks it), clear `sync_dirty`, `sync_stamps`, `sync_ids`, set `applying='0'`, and unlink (`sync_flags.account` removed). Before erasing, the UI offers "Download a backup first" (the existing `exportBackup`).
- **Confirmations.** Both need the user to type `DELETE` and check an "I understand this cannot be undone" box. Local delete shows
  the counts it will remove (solved problems, notes, runs); cloud delete shows the account name. No one-click deletes.
- **Routes.** `POST /api/account/cloud-delete` (same-origin, session, proxies to the Worker via `workerFetch`, then unlinks); `POST /api/account/local-erase` (same-origin; works signed out too).
- **No dark patterns:** wording is plain; the two buttons are visually separate sections.

## Out of scope

- Deleting other people's data; admin-initiated deletion; email notices; automatic expiry; an export-everything UI beyond the existing backup.

## Agents and steps

Targeted tests only; local commits with explicit paths; no push or attribution; never touch `data/habit.db` (tests use `:memory:`).

| Agent | Owns | Fast check |
|---|---|---|
| **A** (Claude) Worker | `packages/sync-worker/src/index.ts` (new route only), `packages/sync-worker/src/index.test.ts` | `pnpm exec vitest run packages/sync-worker` |
| **B** (Claude) Local erase | `apps/web/lib/erase-data.ts`, `apps/web/lib/erase-data.test.ts` | `pnpm exec vitest run apps/web/lib/erase-data.test.ts` |
| **C** (Antigravity) Routes and UI | `apps/web/app/api/account/**`, `apps/web/app/profile/account/delete-data.tsx` (new), `apps/web/app/profile/account/page.tsx` | `pnpm --filter web typecheck` + eslint on those files |

- [ ] **A1. Worker route.** As in Design, with tests: rows of the caller vanish, another user's rows stay, `account` removes sessions and user row, wrong or missing `confirm` is 400, no token is 401, the per-user limit is 429.
- [ ] **B1. `eraseLocalData`.** As in Design. Tests (real migrations and triggers, in memory): after the erase the user tables are empty, **`sync_dirty` is empty** (no deletions queued), `sync_flags.account` is gone, the protected settings survive unless asked, and a later change is tracked again (`applying` is back to 0).
- [ ] **C1. Routes** `cloud-delete` and `local-erase`, same-origin and session rules as the sync routes, plain JSON errors.
- [ ] **C2. UI** two separate sections "Cloud data" and "Data on this device" on the Account page, typed confirmation, counts, backup link, result message.
  - Done when: typecheck and eslint pass and each flow is exercised once on a copy of the database.
- [ ] **Z1. Final (lead):** one `pnpm check`; apply by pushing the Worker (no migration needed).

## Acceptance criteria

- [ ] "Delete my cloud data" removes your rows from D1 (check with `wrangler d1 execute ... "SELECT count(*) FROM problem_solves"` filtered by your id) and leaves this device's data in place; this device shows "not linked".
- [ ] "Delete data on this device" empties the local progress, and **your cloud data is still there** (second device or a fresh sign-in still gets it back).
- [ ] After a local erase, nothing is queued for upload.
- [ ] Neither action works without typing `DELETE`.
- [ ] `pnpm check` passes.

## Pitfalls

- Forgetting `applying='1'` turns "delete on this device" into "delete everywhere".
- Cloud delete does not touch other devices' local data; say so on the page.
- Do not delete `bans` or `abuse_log` rows.

## Open questions

## Implementation notes

## Review
