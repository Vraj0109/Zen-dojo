# Account Data Management & Deletion Guide

This document describes how user data is stored, synced, and deleted in Zen Dojo across local offline SQLite databases and optional Cloudflare D1 cloud sync.

---

## 1. Local-First Architecture Overview

Zen Dojo is architected as a **local-first, offline-capable application**:

- **Primary Source of Truth**: Your local SQLite database (`data/habit.db` in production, or `:memory:` in tests) is always the primary store. All roadmap navigation, problem solving, code execution, note taking, and task updates execute against local tables immediately with zero network latency.
- **Optional Cloud Sync**: Users can sign in with GitHub to synchronize progress across multiple devices. The sync backend is hosted on Cloudflare Workers backed by a multi-tenant Cloudflare D1 database (`packages/sync-worker`).
- **Trigger-Based Mutation Tracking**: Local changes to synchronized tables (`problem_solves`, `problem_notes`, `tasks`, `solution_runs`, `pack_progress`, `practice_sessions`, `focus_sessions`, `settings`) are captured by SQLite triggers into side tables (`sync_dirty`, `sync_stamps`, `sync_ids`). When online, the sync engine batches dirty mutations and pushes them to D1, while pulling remote changes using a high-water mark timestamp (`sync_heads`).

Because local data and cloud data serve distinct purposes, **data deletion is split into two completely separate operations**, each with its own typed confirmation (`DELETE`).

---

## 2. The Two Independent Delete Operations

```
+---------------------------------------------------------------------------------+
|                               Zen Dojo Deletion Flows                           |
|                                                                                 |
|   +------------------------------------+   +--------------------------------+   |
|   |       Delete Cloud Data            |   |     Delete Local Data          |   |
|   |    (Cloudflare D1 / Worker)        |   |   (This Device's SQLite DB)    |   |
|   +------------------------------------+   +--------------------------------+   |
|     |                                        |                                  |
|     | Removes cloud rows in D1:              | Silences triggers:               |
|     | - problem_solves, notes, tasks         | - sync_flags.applying = '1'      |
|     | - runs, pack_progress, timer_rows      |                                  |
|     | - sync_heads, user_quota               | Deletes local rows:              |
|     | - (optional) sessions & users          | - solves, notes, runs, tasks     |
|     |                                        | - sync_dirty, sync_stamps        |
|     | Leaves local device databases          |                                  |
|     | untouched!                             | Restores sync_flags:             |
|     |                                        | - applying = '0', account = NULL |
|     | Device unlinks to prevent              |                                  |
|     | accidental re-upload.                  | Leaves Cloud D1 untouched!       |
|     v                                        v                                  |
|   Cloud copy erased;                       Local copy erased;                   |
|   Local devices retain history.            Cloud backup survives for restore.   |
+---------------------------------------------------------------------------------+
```

### Operation 1: Deleting Cloud Data

Cloud deletion removes your synchronized records from Cloudflare D1 without modifying the database on your current device or any other device.

#### Endpoint & Calling Convention
- **Route**: Proxied through Next.js `POST /api/account/cloud-delete` to Worker endpoint `POST /api/account/delete-data`.
- **Authentication**: Requires a valid Bearer JWT access token.
- **Payload**:
  ```json
  {
    "scope": "data" | "account",
    "confirm": "DELETE"
  }
  ```
- **Rate Limit**: Maximum 3 successful deletions per hour per user (enforced via `abuse_log` rate limiting).

#### Scopes
1. **`scope: "data"`**:
   - Removes all rows belonging to the authenticated `user_id` across the 8 synced tables:
     - `problem_solves`
     - `notes` (mirrors local `problem_notes`)
     - `tasks`
     - `settings`
     - `solution_runs`
     - `pack_progress`
     - `practice_sessions`
     - `timer_rows` (mirrors local `focus_sessions`)
   - Removes the user's `sync_heads` and `user_quota` records.
   - Preserves user identity and active sessions.
2. **`scope: "account"`**:
   - Performs everything in `scope: "data"`.
   - Additionally deletes the user's sessions from `sessions` and their profile record from `users`.
   - Security audit logs (`abuse_log`) and IP/user bans (`bans`) are retained for system abuse prevention.

#### Unlinking Behavior & Device Safety
- After cloud deletion succeeds, the calling device calls `unlinkAccount()`, which clears the `account`, `head`, and `last_synced_at` entries in `sync_flags`.
- **Local Data Intact**: Local problem solves, notes, and progress remain intact on the device. Because the device is now unlinked, it will not automatically re-upload existing records unless the user explicitly chooses to link and upload again.
- **Other Devices**: Other paired devices will receive an authorization failure or 404 on subsequent sync attempts once the session/head is cleared, preventing destructive cascades.

---

### Operation 2: Deleting Local Device Data

Local erase wipes user progress stored in the SQLite database on the specific machine running Zen Dojo. It is designed so that your cloud backup is **never** harmed.

#### Core Implementation: `eraseLocalData`
`apps/web/lib/erase-data.ts` exposes `eraseLocalData(options)`:

```ts
export interface EraseOptions {
  /** Keep every settings row (default true). When false, deletes non-protected settings. */
  keepSettings?: boolean;
  /** Also delete imported content (content_items, content_packs). Default false. */
  includeImported?: boolean;
  db?: AnyDbClient;
}
```

#### What Is Erased vs. Kept
- **Erased by Default**:
  - All progress tables defined in `BACKUP_TABLES`: `problem_solves`, `problem_notes`, `solution_runs`, `tasks`, `pack_progress`, `practice_sessions`, `focus_sessions`, `review_items`, etc.
  - Side sync tables: `sync_dirty`, `sync_stamps`, `sync_ids`.
  - Sync metadata flags: `account`, `head`, `last_synced_at`, `state`, `last_error`.
- **Kept by Default**:
  - `settings`: Retained so appearance preferences, editor keybindings, and device configs survive (unless `keepSettings: false` is requested).
  - Protected settings (`extension_token`, `content_feed_url`): Always protected even when `keepSettings: false` is passed.
  - Imported content (`content_packs`, `content_items`): Retained unless `includeImported: true` is passed.

#### The Trigger Silencing Mechanism (`applying = '1'`)
In Zen Dojo's local SQLite schema, triggers are installed on user tables (`AFTER DELETE ON problem_solves`, etc.) to log deletions into `sync_dirty`.

If an application were to issue standard `DELETE FROM problem_solves` statements, the SQLite triggers would treat every deleted row as a user action and queue a delete mutation into `sync_dirty`. On the next sync cycle, the engine would push those delete mutations to Cloudflare D1 and **wipe out the user's cloud data**.

To prevent this critical failure mode:
1. The erase transaction begins with:
   ```sql
   INSERT OR REPLACE INTO sync_flags (k, v) VALUES ('applying', '1');
   ```
2. In SQLite triggers, change detection checks `(SELECT v FROM sync_flags WHERE k = 'applying') = '1'`. When `'1'`, the trigger exits immediately without writing to `sync_dirty`.
3. All user tables are emptied in a single atomic transaction.
4. `sync_dirty`, `sync_stamps`, and `sync_ids` are explicitly truncated.
5. The transaction concludes by restoring `applying = '0'` and clearing `account`.
6. A `finally` block ensures that even if the SQL execution fails midway, `applying` is guaranteed to be reset to `'0'`.

As a result:
- Local tables are completely cleared.
- `sync_dirty` has **0** queued operations.
- The cloud copy in D1 remains safe and intact.
- A fresh device link or another device can continue using or restoring the cloud progress.

---

## 3. Recommended Backup Procedures

Before executing either a Cloud Data deletion or a Local Device erase:

1. **Export a Local JSON Backup**:
   - Navigate to `/settings` or `/profile/account`.
   - Click **Download backup** (or call `/api/backup/export`).
   - Zen Dojo generates a standalone JSON file containing every table in `BACKUP_TABLES`.
2. **Direct SQLite Backup (Self-Hosted / Desktop)**:
   - Make a copy of the database file on disk:
     ```bash
     cp data/habit.db backups/habit_backup_$(date +%Y%m%d).db
     ```
   - Automated backups are also created in `backups/` prior to schema migrations during app updates.
3. **Restore**:
   - A previously downloaded backup JSON file can be restored at any time via `/settings` -> **Restore backup** (`POST /api/backup/import`).
