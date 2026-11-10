# Cloud Sync Architecture & Design

This document details the multi-tenant offline synchronization architecture for Zen Dojo (`apps/web` and `packages/sync-worker`).

---

## 1. Overview of Cloud Sync Architecture

Zen Dojo uses a local-first offline synchronization engine. All user actions read and write to a local libSQL (SQLite) database immediately without blocking on network requests. SQLite triggers track local modifications into side tables. When online, the sync engine synchronizes mutations with the Cloudflare Worker backend backed by Cloudflare D1.

```
+-------------------------------------------------------------------------+
| Local Device (Browser / Desktop Client)                                 |
|                                                                         |
|   +---------------------+        Triggers (AI / AU / AD)                |
|   |   User Data Tables  | ------------------------------------+         |
|   | (tasks, solves,...) |                                     |         |
|   +---------------------+                                     v         |
|              ^                                         +---------------+|
|              | apply deltas (applying=1)               |  sync_dirty   ||
|              |                                         |  sync_stamps  ||
|              |                                         |  sync_ids     ||
|   +---------------------+                              +---------------+|
|   |  Next.js Sync Engine| <-----------------------------------+         |
|   | (apps/web/lib/sync) |   reads queued mutations                      |
+---|---------------------|-----------------------------------------------+
    |                     ^
    | HTTPS               |
    v                     |
+-------------------------------------------------------------------------+
| Cloudflare Worker (packages/sync-worker)                                |
|                                                                         |
|   1. Verify JWT & Rate Limits / Abuse Guard                             |
|   2. HEAD check: /api/sync/head (sync_heads)                            |
|   3. PUSH mutations: execute batch with synced_at = Worker now()        |
|   4. PULL deltas: query user tables WHERE synced_at > cursor            |
|                                                                         |
|              +-------------------------------------------+              |
|              | Cloudflare D1 Multi-Tenant Database       |              |
|              | (user_id, id, ..., updated_at, synced_at)  |              |
|              +-------------------------------------------+              |
+-------------------------------------------------------------------------+
```

### Sync Run Sequence

Each synchronization cycle (`runSync`) executes in strict order:
1. **Head Check (`GET /api/sync/head`)**: Queries the user's latest `head` timestamp in `sync_heads`. If the local device's stored head matches the cloud head, no remote deltas exist, avoiding redundant table queries.
2. **Pull Deltas (`POST /api/sync` with empty mutations)**: If the cloud head is newer than the local head, pulls changes with `last_synced_at = cursor - 2000 ms` (with overlap window). Deltas are written locally in a single transaction with the `applying` flag set to `1` so local triggers remain silent.
3. **Push Mutations (`POST /api/sync` with dirty mutations)**: Reads pending mutations from `sync_dirty`, builds batches, and pushes them to the Worker. Upon receipt, the Worker applies them with Last-Write-Wins (LWW) and updates the user's `sync_heads.head`. Only rows whose `changed_at` has not changed during transit are pruned from `sync_dirty`.

---

## 2. Triggers and the Dirty Set

User tables remain clean of sync-specific column bloat. Change tracking is completely decoupled into four side tables created by `syncMigrationSql()`:

### Side Tables

- **`sync_dirty`**: The queue of modified rows waiting to be sent to the cloud.
  ```sql
  CREATE TABLE IF NOT EXISTS sync_dirty (
    tbl TEXT NOT NULL,
    row_key TEXT NOT NULL,
    changed_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tbl, row_key)
  );
  ```
- **`sync_stamps`**: The record of the most recent local or remote modification timestamp for each entity. Used for client-side Last-Write-Wins (LWW) filtering during pulls.
  ```sql
  CREATE TABLE IF NOT EXISTS sync_stamps (
    tbl TEXT NOT NULL,
    row_key TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    PRIMARY KEY (tbl, row_key)
  );
  ```
- **`sync_ids`**: Maps local auto-increment integer IDs to globally stable 128-bit hex UUIDs (`sync_id`).
  ```sql
  CREATE TABLE IF NOT EXISTS sync_ids (
    tbl TEXT NOT NULL,
    local_id INTEGER NOT NULL,
    sync_id TEXT NOT NULL UNIQUE,
    PRIMARY KEY (tbl, local_id)
  );
  ```
- **`sync_flags`**: Key-value metadata store for synchronization state.
  ```sql
  CREATE TABLE IF NOT EXISTS sync_flags (
    k TEXT PRIMARY KEY,
    v TEXT
  );
  ```
  Recognized keys:
  - `account`: The authenticated GitHub user id (`gh:<id>`) linked to this database.
  - `state`: Current state (`"idle"`, `"synced"`, `"signed-out"`, `"account-mismatch"`, `"throttled"`, `"error"`).
  - `head`: The newest cloud head timestamp seen.
  - `last_synced_at`: The epoch timestamp cursor up to which deltas have been applied.
  - `last_error`: Diagnostic error message from the previous sync run, or `NULL`.
  - `applying`: Set to `'1'` during pull delta ingestion to suppress triggers.

### The `applying` Flag (Loop Prevention)

When the local sync engine writes pulled changes from the cloud into the local database, those writes must not fire SQLite triggers and re-queue the rows into `sync_dirty`.

Every trigger is defined with a `WHEN` clause:
```sql
WHEN COALESCE((SELECT v FROM sync_flags WHERE k = 'applying'), '0') <> '1'
```
During delta ingestion, the transaction wraps writes with:
```sql
INSERT OR REPLACE INTO sync_flags (k, v) VALUES ('applying', '1');
-- ... apply pulled inserts, updates, deletes ...
INSERT OR REPLACE INTO sync_flags (k, v) VALUES ('applying', '0');
```
This guarantees zero infinite reflection loops.

---

## 3. Sync Cursor & Time Semantics

The architecture cleanly separates **conflict resolution time** from **pull cursor time**:

```
Client Edit (Device A) ------------> Worker Cloudflare D1
   client_timestamp: 1000               updated_at: 1000 (LWW conflict resolution)
                                        synced_at:  8000 (Pull cursor)
```

| Field | Set By | Purpose |
|---|---|---|
| `updated_at` | Originating Device | **Last-Write-Wins (LWW) conflict resolution**. Indicates when the user actually made the edit. |
| `synced_at` | Cloudflare Worker | **Pagination & Pull Cursor**. Monotonically increasing clock on Cloudflare when the mutation was committed. |

### The Late Offline Upload Problem (and Solution)

Consider a distributed scenario:
1. Device B syncs at $T_{\text{cursor}} = 50000$.
2. Device A goes offline on an airplane and solves a problem at $T_{\text{old}} = 10000$ ($T_{\text{old}} < T_{\text{cursor}}$).
3. Hours later, Device A reconnects at $T_{\text{now}} = 80000$ and uploads its solve.

**If the pull cursor were based on `updated_at`:**
Device B would ask the server for rows where `updated_at > 50000`. Device A's solve has `updated_at = 10000`, so Device B would **never** receive Device A's solve!

**With `synced_at`:**
When Device A uploads at $T_{\text{now}} = 80000$, the Worker sets `synced_at = 80000` (while retaining `updated_at = 10000` for LWW).
When Device B next syncs with cursor $T_{\text{cursor}} = 50000$, the Worker queries:
```sql
SELECT * FROM problem_solves WHERE user_id = ? AND synced_at > 50000;
```
Because $80000 > 50000$, Device B receives the solve cleanly.

---

## 4. ID Mapping: Natural Keys vs `sync_ids`

Cloud rows are identified by `(user_id, id)`. Local rows are mapped depending on their key strategy:

### 1. Natural Keys
Tables with unique business keys combine their key columns:
- `problem_solves`: `problem_id:kind` (e.g. `"two-sum:editorial"`)
- `solution_runs`: `problem_id:lang` (e.g. `"two-sum:python"`)
- `pack_progress`: `pack_id:item_id` (e.g. `"blind75:two-sum"`)
- `problem_notes`: `problem_id` (mirrored in cloud table `notes`)
- `settings`: `key`

### 2. Auto-Increment Primary Keys (`sync_id`)
Tables using local integer auto-increment primary keys (`tasks`, `practice_sessions`, `focus_sessions` [cloud `timer_rows`]) cannot share raw integer IDs across devices, as Device A and Device B would both create `id = 1` offline.

- When a local row is created, the trigger assigns:
  ```sql
  INSERT OR IGNORE INTO sync_ids (tbl, local_id, sync_id)
  VALUES ('tasks', NEW.id, lower(hex(randomblob(16))));
  ```
- The mutation uploaded to D1 uses `sync_id` as `row_id`.
- When pulled on another device, the remote row is inserted with its own local auto-increment `id`, and its mapping `(tbl, local_id, sync_id)` is saved in `sync_ids`.

### Generated Task Collision Merge
Recurring daily tasks generated locally on multiple devices can share identical `(date, scope, template_key)`.
A unique index `tasks_generated_unique` exists locally:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS tasks_generated_unique ON tasks (date, scope, template_key);
```
When pulling a task from the cloud:
If a local task already exists for `(date, scope, template_key)`:
1. The engine retains the existing local row.
2. It deletes any unmerged dirty queue entries for the old temporary local key.
3. It updates `sync_ids` to point the local task to the incoming remote `sync_id`.
4. It bypasses duplicate insertion, cleanly preventing unique constraint violations.

---

## 5. Inspecting Local Sync State

Developers and operators can inspect sync status and tables directly via SQL:

### Check Pending Outbound Changes
```sql
SELECT tbl, row_key, datetime(changed_at/1000, 'unixepoch') AS changed, deleted
FROM sync_dirty
ORDER BY changed_at ASC;
```

### Check Local Timestamps (LWW Stamps)
```sql
SELECT tbl, row_key, datetime(updated_at/1000, 'unixepoch') AS updated, deleted_at
FROM sync_stamps
ORDER BY updated_at DESC
LIMIT 50;
```

### Check Sync Flags and Diagnostics
```sql
SELECT k, v FROM sync_flags;
```
Expected output:
| k | v |
|---|---|
| `account` | `gh:123456` |
| `state` | `synced` |
| `head` | `1731234567890` |
| `last_synced_at` | `1731234567890` |
| `last_error` | `NULL` |
| `applying` | `0` |

### Check ID Mapping
```sql
SELECT tbl, local_id, sync_id FROM sync_ids LIMIT 50;
```

---

## 6. Linking and Unlinking Accounts

Account association is managed via Next.js server route handlers:

### `POST /api/sync/link`
- **Security**: Verifies same-origin request headers and user session (`getSession()`).
- **Conflict Prevention**: If the database is already linked to another user ID, rejects with HTTP 409 `account-mismatch`.
- **First Link Queueing**: Iterates through all synced tables (`SYNC_TABLE_MAP`), assigns `sync_ids` for unmapped auto-increment rows, and enqueues all pre-existing rows into `sync_dirty` and `sync_stamps`.
- **Settings Denylist**: Omits sensitive keys (`extension_token`, `content_feed_url`, and any keys containing `token`, `secret`, `key`, or `password`).
- **Response**: `{ ok: true, queued: <number> }`.

### `POST /api/sync/unlink`
- **Security**: Verifies same-origin request headers and user session.
- **Cleanup**: Clears `sync_dirty`, `sync_stamps`, and connection flags (`account`, `last_synced_at`, `head`, `state`, `last_error`).
- **Data Retention**: Preserves all local user records (`tasks`, `problem_solves`, etc.) and `sync_ids` intact.
- **Response**: `{ ok: true }`.

---

## 7. Adding a New Table to Sync

To add a new table to the cloud sync system, follow this five-step checklist:

### 1. Define Local-to-Cloud Mapping (`apps/web/lib/sync-triggers.ts`)
Add a new entry to `SYNC_TABLE_MAP`:
```ts
{
  local: "my_new_table",
  cloud: "my_new_table",
  key: "sync_id", // "sync_id" for autoincrement PK, "composite" or "single" for natural keys
  keyCols: ["id"],
  cols: ["title", "content", "created_at"]
}
```

### 2. Add Side Table Triggers (`apps/web/lib/db.ts`)
Because `syncMigrationSql()` automatically reads `SYNC_TABLE_MAP`, updating `SYNC_TABLE_MAP` will generate the `AFTER INSERT`, `AFTER UPDATE`, and `AFTER DELETE` triggers for the table. For existing databases, append a migration to `MIGRATIONS` in `apps/web/lib/db.ts` that creates the triggers.

### 3. Add Cloud Table Schema (`packages/sync-worker/schema.sql` and migrations)
Add the D1 table definition in `schema.sql` and a corresponding migration script:
```sql
CREATE TABLE IF NOT EXISTS my_new_table (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS my_new_table_user_synced ON my_new_table (user_id, synced_at);
```

### 4. Register Columns in Worker (`packages/sync-worker/src/index.ts`)
Register the table's primary key and writable data columns:
```ts
const PK: Record<string, string> = {
  // ...
  my_new_table: "id",
};

const COLUMNS: Record<string, readonly string[]> = {
  // ...
  my_new_table: ["title", "content", "created_at"],
};
```

### 5. Define Column Fallbacks (`apps/web/lib/sync-engine.ts`)
Add local default fallbacks for `NOT NULL` columns when a remote row contains nulls:
```ts
const DEFAULTS: Record<string, Record<string, InValue>> = {
  // ...
  my_new_table: { title: "", content: "", created_at: "" },
};
```
