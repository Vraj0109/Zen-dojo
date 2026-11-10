# 0050: Connect the app's data to cloud sync (triggers, server-side sync engine, first-link upload)

- **Status:** implemented (released in 0.7.0; sign-in and two-device sync confirmed by the user)
- **Planned by:** Claude Code, 2026-11-10
- **Implemented by:** (implementer fills in) 3 Claude Code agents (A, B, C) + 3 Antigravity agents (D, E, F)
- **Spec:** finishes plan 0044 (offline-first sync); builds on 0049 (accounts)

## Goal

Your solved problems, tasks, settings, notes, saved runs, practice and focus history upload to your account in the
Cloudflare D1 database when you sign in, and a second device that signs in gets them. After that, changes on either
device reach the other within about a minute. Nothing in your existing database is rewritten, and secrets never leave
the machine.

## Context (what exists and what is wrong, verified 2026-11-10)

- Sign-in works (plan 0049). The Worker `POST /api/sync` accepts `{ mutations, last_synced_at }` from a signed-in user and
  returns `{ ok, deltas, server_timestamp, has_more, next_since }`. It is deployed and tested.
- **Nothing feeds it.** `recordMutation` (`apps/web/lib/sync-queue.ts`) is never called by the app's write code, and
  `applySyncSchema` (`apps/web/lib/sync-schema.ts`) is never called, so the local database has no sync columns. The
  existing `SyncManager` (`lib/sync-manager.ts`) runs in a browser component with no database, so it cannot read data
  that lives in the server-side SQLite file (`data/habit.db`, libSQL via `lib/db.ts`).
- Design problems found while planning (the plan fixes all of them; implementers must not reintroduce them):
  1. `getAddSyncColumnsSql` uses `ADD COLUMN ... DEFAULT (strftime(...))`. SQLite rejects a non-constant default in
     `ALTER TABLE ADD COLUMN`. Do not alter the user's tables at all (see Design).
  2. `USER_SYNC_TABLES` lists `notes` and `timer_rows`, which do not exist locally. The local tables are
     `problem_notes` and `focus_sessions`. `problem_notes` already has an `updated_at TEXT` column that would clash
     with a sync `updated_at INTEGER`.
  3. `tasks`, `problem_solves`, `practice_sessions` and `focus_sessions` use `INTEGER AUTOINCREMENT` ids. Two devices
     would both create id 5 for different rows, and the cloud row `(user_id, 5)` would be overwritten by the wrong
     device. Cloud ids must be device-independent.
  4. The `settings` table holds machine-private values (`extension_token` pairing key, `content_feed_url`). These
     must never be uploaded.
  5. `undoSolve` and similar code **delete** rows, so deletes must propagate as tombstones.
- Conventions (AGENTS.md): schema changes append a string to `MIGRATIONS` in `apps/web/lib/db.ts`, never edit a shipped
  one; new tables are not user data to back up unless listed in `BACKUP_TABLES` (the `sync_*` tables are **not** added);
  never touch `data/habit.db` (tests use `:memory:` or a temp copy); no emoji in UI; Next 16 `cacheComponents`.

## Design (decided; do not redesign)

- **Do not alter the user's tables.** Add side tables and SQLite triggers. A trigger fires on every insert, update and
  delete of a synced table, so every write path (server actions, the extension API, backup restore, scripts) is
  captured without touching the app's write code, and the user's existing rows are never modified.
- **Side tables (created by one appended migration):**
  - `sync_dirty(tbl TEXT NOT NULL, row_key TEXT NOT NULL, changed_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tbl, row_key))`: rows waiting to upload.
  - `sync_stamps(tbl TEXT NOT NULL, row_key TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, PRIMARY KEY (tbl, row_key))`: last change time per row, for last-write-wins when pulling.
  - `sync_ids(tbl TEXT NOT NULL, local_id INTEGER NOT NULL, sync_id TEXT NOT NULL UNIQUE, PRIMARY KEY (tbl, local_id))`: a stable id for rows whose local id is an autoincrement (`tasks`, `practice_sessions`, `focus_sessions`). Filled by an insert trigger with `lower(hex(randomblob(16)))`.
  - `sync_flags(k TEXT PRIMARY KEY, v TEXT)`: keys `applying` ('1' while pulled rows are being written, so triggers stay quiet), `account` (the account id this database is linked to), `last_synced_at` (ms), `state`, `last_error`.
- **Cloud table and row key per local table** (`row_key` is the cloud `id`, a TEXT):

| Local table | Cloud table | row_key | Columns uploaded |
|---|---|---|---|
| `tasks` | `tasks` | `sync_id` | date, scope, template_key, title, category, xp, minutes, status, done_on |
| `problem_solves` | `problem_solves` | `<problem_id>:<kind>` | problem_id, kind, solved_on, xp, source |
| `settings` | `settings` | `key` | value (**denylist: `extension_token`, `content_feed_url`, anything whose key contains `token`, `secret`, `key` or `password`**) |
| `problem_notes` | `notes` | `problem_id` | problem_id, notes, code, language |
| `solution_runs` | `solution_runs` | `<problem_id>:<lang>` | problem_id, lang, code, ran_on, status, passed, total, failed_cases |
| `pack_progress` | `pack_progress` | `<pack_id>:<item_id>` | pack_id, item_id, done_on |
| `practice_sessions` | `practice_sessions` | `sync_id` | item_id, practiced_on, minutes, scores, score, notes, link, xp |
| `focus_sessions` | `timer_rows` | `sync_id` | item_id, focused_on, minutes |

- **Cloud ids:** every cloud table keys on `PRIMARY KEY (user_id, id)` with `id TEXT`. D1 holds no user data yet, so
  migration `0004` drops and recreates `tasks`, `problem_solves`, `practice_sessions`, `timer_rows` with TEXT ids
  (it first checks nothing would be lost: see step C1).
- **Where sync runs (run order: head check, pull, then push):** on the server, next to the database. A module `lib/sync-engine.ts` reads `sync_dirty`, builds
  mutations from the current rows, calls the Worker through `workerFetch("/api/sync")` (which attaches the session's
  token), writes the returned deltas into the local tables (with `applying=1`), and clears what was acknowledged. The
  browser only asks the server to run it and shows the status. One run at a time (single-flight lock).
- **Sync cursor (fixes a flaw in the current Worker):** the Worker currently pulls rows with `updated_at > last_synced_at`,
  but `updated_at` is the *device's* clock. A Mac that solved a problem offline at 10:00 and uploads at 12:00 writes
  `updated_at = 10:00`; a Windows PC that last synced at 11:00 would never pull it. So every cloud row gets a second
  column, `synced_at`, set by the **Worker's** clock when the row is written, and pulls use `synced_at > cursor`.
  `updated_at` (device time) is used only to decide which write wins when two devices edit the same row.
  The client stores the `server_timestamp` of its last pull as the cursor and asks for `cursor - 2000 ms` next time
  (a small overlap so a write that lands in the same millisecond is never missed; re-applying a row is harmless).
- **Efficiency:** only changed rows move. Push sends just the `sync_dirty` rows. Pull returns just rows with
  `synced_at` past the cursor. A no-change check costs one tiny read: the Worker keeps one row per user,
  `sync_heads(user_id, head)`, raised in the same batch as every push, and `GET /api/sync/head` returns it. A new
  device with cursor 0 does a paged snapshot (2,000 rows per table per page), newest data first is not required.
- **Offline use:** while offline, writes only add rows to `sync_dirty`. When the connection returns, a run pulls first
  (so the screen shows the latest state fast), then pushes only the dirty rows. Edits to different rows on two devices
  both survive (a union); only the same row edited on two devices is a conflict, and the later `updated_at` wins.
- **Automatic sync (Notion-style, client-driven):** the browser tab drives it, because only the browser holds the
  session cookies (the server never stores a refresh token). On sign-in and on every page load: run once. Every 5 s
  while the tab is visible: a local, free check of `GET /api/sync/status` (`pending`); if there is anything pending,
  run (so a change uploads about 5 s after you make it). Every 30 s while visible: one `GET /api/sync/head` compare;
  pull only if the head moved. Immediately on tab focus and on the browser `online` event. Hidden tab: no timers.
  Backs off on errors and on 429. Real-time push (WebSocket / Durable Object) is a possible later upgrade.
- **Conflicts:** last write wins on `updated_at` (ms). A pulled row older than the local `sync_stamps` entry is ignored.
  A pulled generated task that collides with the local unique index `(date, scope, template_key)` is merged: keep the
  local row and record the pulled `sync_id` as its id. Clock skew between devices is accepted.
- **First link:** "link" means: set `sync_flags.account` to the account id and insert **every existing row** of the
  synced tables into `sync_dirty` (and `sync_stamps` with `updated_at = now`). The next sync uploads it all. Nothing
  is deleted. If `account` is already set to a **different** account id, sync stops with state `account-mismatch` and
  a plain message; there is no automatic replace.
- **Scope v1:** only the eight tables above. Other user tables (`concept_progress`, `problem_struggles`,
  `boss_fights`, `reading_progress`, `reading_custom`, `pattern_notes`, `streak_freezes`, `weekly_reviews`, `site_time`,
  `diagrams`) are a follow-up plan once this works.
- The old queue code (`local_sync_queue`, `recordMutation`, `getPendingMutations`, `applyIncomingDeltas`,
  `SyncManager`) stays for its tests but the app stops using it. Do not delete it in this plan.

### Fixed contracts

```ts
// apps/web/lib/sync-triggers.ts   (Agent A)
export const SYNC_TABLE_MAP: readonly { local: string; cloud: string; key: "sync_id" | "composite" | "single"; keyCols: string[]; cols: string[] }[];
export const SYNC_SETTINGS_DENYLIST: readonly string[]; export function isSyncableSettingKey(key: string): boolean;
export function syncMigrationSql(): string;           // side tables + all triggers, idempotent text for one MIGRATIONS entry
// apps/web/lib/sync-engine.ts     (Agent B)
export type SyncRunResult = { state: "synced" | "signed-out" | "account-mismatch" | "throttled" | "error"; pushed: number; pulled: number; message?: string };
export async function runSync(opts?: { db?: AnyDbClient; fetch?: (path: string, init: RequestInit) => Promise<Response>; now?: () => number }): Promise<SyncRunResult>;
export async function linkAccount(userId: string, db?: AnyDbClient): Promise<{ queued: number }>;
export async function getSyncStatus(db?: AnyDbClient): Promise<{ account: string | null; state: string; lastSyncedAt: number | null; pending: number; message?: string }>;
export async function unlinkAccount(db?: AnyDbClient): Promise<void>;   // clears account + dirty + stamps; keeps user rows
```

Routes (Agent D): `POST /api/sync/run` (same-origin, session required) returns `SyncRunResult`; `GET /api/sync/status`;
`POST /api/sync/link` and `POST /api/sync/unlink` (same-origin, session required). Default DB: `getDb()` from `lib/db.ts`.

## Out of scope

- The other user tables (see Scope v1); sharing; conflict UI; encryption of data at rest in D1.
- Removing the old queue code; changing sign-in or admin; the Worker's rate limits.
- Real-time push (a WebSocket or Durable Object channel); the 5 s and 30 s checks are the v1 "automatic".

## Agents and file ownership (zero overlap)

Tests: only your own targeted command; never full `pnpm test`/`pnpm check` (the lead runs one at the end). Read a file
once in full, make all its edits, verify once. Commit locally in plain English with explicit `git add <paths>`; no
push, tag, `Co-Authored-By` or AI attribution. Never touch `data/habit.db`: tests use `:memory:` or temp files.

| Agent | Who | Owns | Fast check |
|---|---|---|---|
| **A** DB triggers | Claude | `apps/web/lib/sync-triggers.ts`, `apps/web/lib/sync-triggers.test.ts`, the one appended entry in `MIGRATIONS` of `apps/web/lib/db.ts` | `pnpm exec vitest run apps/web/lib/sync-triggers.test.ts apps/web/lib/db.test.ts` |
| **B** Sync engine | Claude | `apps/web/lib/sync-engine.ts`, `apps/web/lib/sync-engine.test.ts` | `pnpm exec vitest run apps/web/lib/sync-engine.test.ts` |
| **C** Worker and D1 | Claude | `packages/sync-worker/migrations/0004_sync_ids.sql`, `packages/sync-worker/schema.sql`, `COLUMNS`/`PK` in `packages/sync-worker/src/index.ts` and its tests | `pnpm exec vitest run packages/sync-worker` |
| **D** Routes | Antigravity | `apps/web/app/api/sync/run/**`, `status/**`, `link/**`, `unlink/**` | `pnpm exec vitest run apps/web/app/api/sync` + typecheck |
| **E** UI | Antigravity | `apps/web/lib/sync-manager.ts` (thin poller), `apps/web/app/components/sync-status.tsx`, `apps/web/app/components/account-menu.tsx` | `pnpm --filter web typecheck` + eslint on those files |
| **F** End-to-end tests and docs | Antigravity | `apps/web/lib/sync-e2e.test.ts`, `docs/sync-design.md` | `pnpm exec vitest run apps/web/lib/sync-e2e.test.ts` |

## Steps

### Agent A: triggers

- [ ] **A1. `sync-triggers.ts`.** Export `SYNC_TABLE_MAP`, the settings denylist and `syncMigrationSql()` exactly per the
  table above. The SQL creates the four side tables and, for each local table, AFTER INSERT / AFTER UPDATE / AFTER
  DELETE triggers with `WHEN COALESCE((SELECT v FROM sync_flags WHERE k='applying'),'0') <> '1'`. Each trigger
  upserts `sync_dirty` and `sync_stamps` with `changed_at/updated_at = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`.
  Insert triggers on `tasks`, `practice_sessions`, `focus_sessions` first create the `sync_ids` row. Update triggers that
  change a natural key (`problem_solves`, `solution_runs`, `pack_progress`) mark the old key deleted and the new key
  dirty. `settings` triggers skip denylisted keys (`WHEN` includes the key test). Delete triggers write `deleted = 1`.
  - Done when: unit tests (in-memory libSQL with the real migrations) show: insert/update/delete of each table produces the right `sync_dirty`/`sync_stamps` rows; a denylisted setting produces none; `applying=1` silences every trigger; the migration is idempotent.
- [ ] **A2. Append the migration** to `MIGRATIONS` in `apps/web/lib/db.ts` (`syncMigrationSql()` result as one new string, last in the array). Existing rows are not modified.
  - Done when: `db.test.ts` passes, a database at the previous `user_version` upgrades, and `SELECT count(*)` of every user table is unchanged after migration.

### Agent B: engine

- [ ] **B1. Mutation building.** For each `sync_dirty` row: live rows become `{ table: cloud, row_id: row_key, action: "upsert", payload: <columns from the table above, read from the current row>, client_timestamp: changed_at }`; deleted rows become `action: "delete"`. Apply `isSyncableSettingKey`. Batches of at most 200 (Worker limit 500).
  - Done when: tests cover each table's payload, settings denylist, delete, and batching.
- [ ] **B2. Push, pull, apply.** `runSync`: single-flight lock; need a signed-in account (`sync_flags.account` equal to the session user, else `account-mismatch`; no session gives `signed-out`); first `GET /api/sync/head` and stop with no pull when it equals the stored head; otherwise pull (`POST /api/sync` with an empty `mutations` list and `last_synced_at` = stored cursor minus 2000 ms) until `has_more` is false, apply, then push the dirty rows; clear a `sync_dirty` row only if its `changed_at` is unchanged since it was sent. Apply pulled rows inside one transaction with `applying=1`: upsert by the table's natural key, resolve `sync_id` through `sync_ids` (insert a new local row and map it when unknown), skip rows older than `sync_stamps`, apply tombstones as deletes, merge the unique-index collision for tasks as designed. Store `last_synced_at` = the `server_timestamp` of the last response and the `head` value, in `sync_flags`.
  - Done when: tests with an in-memory DB and a fake `fetch` cover: head unchanged means no pull and no push call when nothing is dirty, the 2 s overlap re-applies harmlessly, push then clear, edit during flight stays dirty, pull inserts and maps ids, older pull ignored, tombstone deletes, task collision merge, 401 gives `signed-out`, 429 gives `throttled` with the message, and no re-upload of pulled rows.
- [ ] **B3. `linkAccount`, `unlinkAccount`, `getSyncStatus`.** Link marks every existing row of the eight tables dirty (single `INSERT ... SELECT` per table, with `sync_ids` rows created for the three autoincrement tables that lack one) and sets `account`; refuses with `account-mismatch` if linked to another account.
  - Done when: tests: link queues the right counts, is idempotent, refuses a different account; unlink keeps user rows.

### Agent C: Worker and D1

- [ ] **C1. `migrations/0004_sync_ids.sql` and `schema.sql`.** Recreate `tasks`, `problem_solves`, `practice_sessions`, `timer_rows` with `id TEXT NOT NULL` and `PRIMARY KEY (user_id, id)` (keep every other column from the table above, plus `source` on `problem_solves`). Start the file with a comment that it is only safe while those four tables are empty and add the check command to run first: `SELECT (SELECT count(*) FROM tasks)+(SELECT count(*) FROM problem_solves)+(SELECT count(*) FROM practice_sessions)+(SELECT count(*) FROM timer_rows)` must be 0.
  - Done when: applies to an empty local D1 twice (use `DROP TABLE IF EXISTS` first); `schema.sql` matches.
- [ ] **C1b. `synced_at` and heads.** In the same `0004` migration and `schema.sql`: add `synced_at INTEGER NOT NULL` to all eight cloud tables with an index on `(user_id, synced_at)`, and create `sync_heads(user_id TEXT PRIMARY KEY, head INTEGER NOT NULL)`.
  - Done when: applies twice to an empty local D1.
- [ ] **C2. Worker column lists.** In `src/index.ts` set `COLUMNS` to exactly the "Columns uploaded" column of the table above (cloud names) and keep `PK` as `id` for all except `settings` (`key`). Add tests: an upsert and delete for each of the eight tables round-trips; a payload column outside the list is dropped.
  - Done when: `pnpm exec vitest run packages/sync-worker` passes.
- [ ] **C3. Cursor and head in the Worker.** On every pushed mutation set `synced_at` to the request's server time (the same value as `server_timestamp` for that request) and, in the same D1 batch, upsert `sync_heads` with that value. Change the pull query from `updated_at > ?` to `synced_at > ?` (ordered by `synced_at`, paged as today). The LWW rule for a write stays on `updated_at`. Add `GET /api/sync/head` (same auth and guard as sync, `route "sync"`) returning `{ ok: true, head: <number> }` (0 when none); it must read only `sync_heads`. Return `server_timestamp` taken **after** the push has been applied.
  - Done when: tests prove the offline case: device A writes a row with an old `updated_at` and uploads it later, device B (cursor already past that old time) still receives it; and a head request costs one read and no writes.

### Agent D: routes

- [ ] **D1. The four routes** per "Fixed contracts". `run` and `status` call `runSync`/`getSyncStatus`; `link` calls `linkAccount(session.userId)`; `unlink` calls `unlinkAccount`. Same-origin check (`checkSameOrigin` from `lib/auth/util`), session required (`getSession`), JSON responses, no stack traces, never log tokens or row data.
  - Done when: tests with mocked session and mocked engine cover 401, 403 cross-origin, and success shapes.

### Agent E: UI

- [ ] **E1. `sync-manager.ts` becomes a thin poller:** no database access; follow the "Automatic sync" rules in Design exactly: a run at page load and sign-in; every 5 s while visible `GET /api/sync/status` and `POST /api/sync/run` only if `pending > 0`; every 30 s while visible `POST /api/sync/run` (the engine does the one-read head check and pulls only if it moved); immediately on focus, on `online` and on "Sync now"; no timers while the tab is hidden; maps `SyncRunResult.state` to the existing status values; backs off on `throttled`/`error` (max 15 min, jitter); stops on `signed-out`. Keep exported names that other files use (`getSyncStatus`, `subscribeSyncStatus`, `flushSyncQueue`) so nothing else breaks.
  - Done when: typecheck passes and the existing `sync-client.test.ts` is updated or still passes.
- [ ] **E2. First-link prompt** in `sync-status.tsx`: when signed in, `GET /api/sync/status` says `account` is null and the database has rows, show "Upload this device's progress to your account?" with Upload / Not now; Upload calls `POST /api/sync/link` then runs a sync. `account-mismatch` shows "This device is linked to another account." No emoji.
  - Done when: lint and typecheck pass.
- [ ] **E3. Account page status** in `account-menu.tsx` (`SyncPanel`): last synced time, pending count, "Sync now", "Stop syncing this device" (calls unlink after a confirm).
  - Done when: lint and typecheck pass.

### Agent F: end-to-end tests and docs

- [ ] **F1. `sync-e2e.test.ts`.** Two in-memory local databases (A and B, both with the real migrations) and the real Worker code (`packages/sync-worker/src/index.ts` handler) over a fake D1 backed by `node:sqlite`, with a fake auth step (a test signing key and `verifyAccessToken`). Cases: A solves a problem, syncs, B pulls it; A undoes it, B loses it; settings sync but `extension_token` does not; two devices create tasks at once with different local ids; the same generated task on both devices merges; A edits a note while B edits it later, later wins; first link uploads all existing rows; a second account's data stays separate (two users, same table).
  - Done when: the file passes with the Worker running unmodified.
- [ ] **F2. `docs/sync-design.md`:** one page: how triggers, the dirty set and the engine fit together, how to inspect state (`SELECT * FROM sync_dirty`), how to unlink, how to add a table to sync.
  - Done when: it matches the code as built.

### Final (lead)

- [ ] **Z1.** Pull everyone's commits, `pnpm install` if the lockfile changed, `pnpm -r typecheck`, one `pnpm check`.
- [ ] **Z2. Go-live on a copy first (user).** Copy `data/habit.db` to a temp folder and run the app against it with `DATABASE_URL` pointing at the copy; sign in; accept "Upload"; check D1 has your rows with `npx wrangler d1 execute zen-dojo-db --remote --command "SELECT count(*) FROM problem_solves"`; then repeat with the real database. Apply `0004` to the remote D1 **before** the first upload.

## Acceptance criteria

- [ ] Signed in, the app offers to upload this device's progress; after "Upload", the Account page shows a recent sync time and zero pending.
- [ ] The remote D1 contains your solved problems, tasks and settings under your account id, and no `extension_token`.
- [ ] A fresh browser profile or fresh database signed in to the same account shows the same solved problems and settings after one sync.
- [ ] Marking a problem solved or changing a setting on one device appears on the other within about 30 seconds while both are open; undoing a solve removes it there too.
- [ ] Offline test: with the network off, solve two problems on device B; solve two others on device A and let it sync; turn B's network on. Both devices end with all four problems, and only B's two rows were uploaded.
- [ ] A device with nothing new makes only one small request per 30 seconds (the head check), visible in the network panel.
- [ ] Another GitHub account signing in sees none of this data, and a database linked to account X refuses to sync as account Y.
- [ ] Your existing database rows are unchanged by the migration (row counts equal before and after).
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Pitfalls

- Never run tests or experiments on `data/habit.db`; copy it first. The migration only adds tables and triggers, but a copy is the safe way to try the upload.
- The pull cursor must be the Worker's `synced_at`, never a device `updated_at`; otherwise rows uploaded late from an offline device are never seen by others.
- Background sync from the server process is not possible: it has no session cookies. The tab drives sync.
- Triggers must stay quiet while pulled rows are written (`applying`), or every pull would be pushed straight back.
- Autoincrement ids must never be used as cloud ids. Use `sync_ids` or a natural key.
- A pulled row may violate a local unique index; handle it, do not crash the run.
- Do not log row contents, tokens or the account id's secrets; errors shown to the user are plain sentences.
- Refresh tokens rotate; only route handlers may refresh (see plan 0049 and `lib/auth/session.ts`). The engine runs inside a route, so `workerFetch` may renew safely.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Each agent adds its own subsection: files changed, deviations and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
