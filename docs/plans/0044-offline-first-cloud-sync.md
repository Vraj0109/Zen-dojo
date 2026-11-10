# 0044: Notion-style offline-first cloud sync with Turso libSQL

- **Status:** in-progress (worker, queue, proxy and status pill built; live two-device sync not yet confirmed)
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** (implementer fills in)
- **Spec:** builds on plans 0030 and 0032

## Goal

Enable seamless, bi-directional cloud synchronization across multiple logged-in devices using an offline-first architecture identical to Notion. Users can work 100% offline with zero latency; all mutations are queued locally and only incremental changes (deltas) are synced to the cloud when connected. The cloud database runs on a 5 GB free-tier SQLite engine (Cloudflare D1 with $0 egress fees or Turso libSQL).

## Context

- The app uses `@libsql/client` with a local SQLite file (`data/habit.db`).
- All user tables (`tasks`, `problem_solves`, `settings`, `notes`, `solution_runs`, `pack_progress`, `practice_sessions`, `timer_rows`) are currently single-tenant with no `user_id`.
- **Security Rule (Zero Database Secrets on Client):** Desktop and web clients must **never** hold direct database credentials or master connection strings. Clients authenticate via scoped JWT session tokens and communicate exclusively through a backend sync API (`POST /api/sync`).
- **Cloud Infrastructure:** A Cloudflare Worker edge backend backed by Cloudflare D1 (serverless SQLite at 330+ global edge locations with $0 egress bandwidth fees).
- Syncing entire database snapshots over HTTP is inefficient and destroys bandwidth. A Notion-style delta sync transmits only mutated rows and fields since the last synchronization timestamp.

## Out of scope

- Real-time collaborative document editing (operational transformation / CRDTs for keystroke-by-keystroke text). Notes sync on blur/save using Last-Write-Wins (LWW).
- Self-hosted database clusters (managed Turso free tier is used).

## Steps

- [ ] **1. Schema migration for multi-tenancy and delta tracking.**
  - Add migration in `apps/web/lib/db.ts`:
    - Add `user_id TEXT NOT NULL DEFAULT 'local'` to: `tasks`, `problem_solves`, `settings`, `notes`, `solution_runs`, `pack_progress`, `practice_sessions`, `timer_rows`.
    - Add `updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)` to all user tables.
    - Add `deleted_at INTEGER` (tombstone for deleted rows so deletes propagate).
    - Update unique constraints to be compound with `user_id` (e.g. `UNIQUE(user_id, date, title)` for tasks, `UNIQUE(user_id, problem_id)` for solves).
  - Create table `local_sync_queue`:
    ```sql
    CREATE TABLE IF NOT EXISTS local_sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      action TEXT NOT NULL, -- 'upsert' | 'delete'
      payload TEXT NOT NULL,
      client_timestamp INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    ```
  - Create table `sync_state`:
    ```sql
    CREATE TABLE IF NOT EXISTS sync_state (
      user_id TEXT PRIMARY KEY,
      last_synced_at INTEGER NOT NULL DEFAULT 0
    );
    ```
  - Done when: A fresh or migrated database contains the columns and tables, with existing rows cleanly marked as `user_id = 'local'`.

- [ ] **2. Multi-tenant database helper and mutation interceptor.**
  - In `apps/web/lib/db.ts`:
    - Export `currentUser(): { id: string, email?: string, isGuest: boolean }`.
    - Returns active authenticated session user ID, or fallback `'local'` for guest/offline desktop mode.
  - In all write operations across `apps/web/lib/*.ts` (`tasks.ts`, `dsa.ts`, `notes.ts`, `settings.ts`, etc.):
    - Scope queries to `WHERE user_id = :userId AND deleted_at IS NULL`.
    - Record local mutations to `local_sync_queue` whenever rows are inserted, updated, or soft-deleted (`deleted_at = now`).
  - Done when: Modifying tasks or solves creates entries in `local_sync_queue`.

- [ ] **3. Bi-directional delta sync endpoint (`POST /api/sync`).**
  - Create `apps/web/app/api/sync/route.ts`:
    - Requires authenticated user session.
    - **Step A (Push):** Accepts `mutations: Array<{ table, row_id, action, payload, client_timestamp }>`.
      - Applies each mutation to the primary database with Last-Write-Wins (LWW) comparison against existing `updated_at`.
    - **Step B (Pull):** Accepts `last_synced_at: number`.
      - Queries all user tables for rows where `user_id = :userId AND updated_at > :last_synced_at`.
      - Returns `{ deltas: Record<string, any[]>, server_timestamp: number }`.
  - Done when: Calling `/api/sync` applies client mutations and returns only rows modified on the server since `last_synced_at`.

- [ ] **4. Client sync manager & offline background synchronization.**
  - Create `apps/web/lib/sync-manager.ts`:
    - Watches network status (`navigator.onLine` and `window.addEventListener('online')`).
    - Periodic background sync (e.g. every 60s when active, or on tab focus / page unload).
    - Sends pending mutations from `local_sync_queue`.
    - Ingests incoming deltas into the local SQLite database.
    - Purges synced queue records once acknowledged by the server.
    - Emits sync status events (`"syncing"`, `"synced"`, `"offline"`, `"error"`).
  - Done when: Offline changes made on Device A sync automatically to Device B within seconds of going online.

- [ ] **5. Sync status UI indicator.**
  - Add a subtle status pill to the navigation bar or profile menu:
    - Green checkmark: "Synced"
    - Pulsing amber: "Syncing..."
    - Cloud with slash: "Offline (changes saved locally)"
  - Add "Sync Now" button in Settings (`apps/web/app/profile/settings/page.tsx`).
  - Done when: Disconnecting the network displays "Offline" and reconnecting triggers automatic synchronization.

- [ ] **6. Tests.**
  - In `apps/web/lib/sync.test.ts`:
    - Test mutation recording into `local_sync_queue`.
    - Test conflict resolution with Last-Write-Wins.
    - Test soft deletes and tombstone propagation.
    - Test multi-user isolation (User A cannot pull User B's rows).
  - Done when: `pnpm exec vitest run apps/web/lib/sync.test.ts` passes.

- [ ] **7. Cloudflare Worker backend & GitHub Actions CI/CD.**
  - Create `packages/sync-worker`:
    - TypeScript Cloudflare Worker receiving `POST /api/sync`.
    - Native D1 binding (`env.DB.prepare(...)`).
    - Validates client JWT token; enforces `WHERE user_id = :userId` on all queries.
  - Setup `.github/workflows/deploy-sync.yml`:
    - Uses `cloudflare/wrangler-action@v3` with repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
    - Runs D1 database migrations: `wrangler d1 migrations apply DB --remote`.
    - Deploys worker to production on push to `main`.
  - Done when: Pushing to `main` deploys the sync backend and runs D1 migrations automatically.

## Acceptance criteria

- [ ] All user data remains 100% accessible and editable when offline.
- [ ] Only changed rows are synced over the network (delta sync); no full database dumps.
- [ ] Offline mutations sync automatically when the connection is restored.
- [ ] Conflicting edits on different devices resolve gracefully via Last-Write-Wins without data corruption.
- [ ] Soft deletes propagate cleanly between devices.
- [ ] `pnpm check` passes.

## Open questions

(none)

## Implementation notes

(Implementer fills in)

## Review

(Reviewer fills in)
