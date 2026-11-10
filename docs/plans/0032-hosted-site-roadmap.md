# 0032: Roadmap: a hosted Zen Dojo with accounts, Notion-style offline-first sync, and admin portal

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-10 (incorporating user architecture & database selection)
- **Implemented by:** (not started)
- **Spec:** none (builds on 0024 and 0030)

## Goal

Turn Zen Dojo from a single-user local installation into an offline-first multi-device platform with user accounts and cloud synchronization, mirroring how Notion functions:
1. **Offline-First:** All user progress, notes, code solutions, and study state exist in a full local database on the client (desktop / browser storage) for instantaneous local reads and offline work.
2. **Notion-Style Delta Sync:** Only records and fields that changed are transmitted over the wire (incremental delta sync via mutation logs and timestamps), never transferring the entire database.
3. **Free Cloud Database:** Zero-cost hosted backend utilizing free-tier managed cloud databases with generous quotas.
4. **Admin Portal:** A web-based content management portal to view, edit, add, and publish problems, test cases, hints, C++/Java solutions, and study lessons/sections on the fly without requiring software releases.

---

## Free Cloud Database Evaluation

| Database Provider | Dialect | Free Tier Quota | Offline-First Sync Fit | Verdict |
|---|---|---|---|---|
| **Turso (libSQL)** | SQLite / libSQL | **9 GB storage**<br>500 databases<br>1B row reads/month<br>25M row writes/month | **Native Embedded Replicas:** Local SQLite files replicate bidirectionally to/from cloud primary out of the box with zero SQL changes. | **Top Recommendation (Best Fit):** 100% compatible with Zen Dojo's existing libSQL engine (`@libsql/client`). Zero dialect changes required. |
| **Supabase** | PostgreSQL | **500 MB storage**<br>50,000 MAU<br>2 active projects | Requires custom sync adapter (mapping local SQLite to cloud Postgres) or PowerSync / ElectricSQL bridge. | **Strong Alternative for Auth:** Excellent built-in OAuth/magic-link auth and row-level security, but 500MB storage limit is lower than Turso's 9GB and requires dual-dialect maintenance. |
| **Cloudflare D1** | SQLite | **5 GB storage**<br>5M reads/day<br>100k writes/day | Global edge SQLite, but lacks automatic desktop file replication. | Good backup option, but lacks Turso's embedded replica ergonomics. |
| **Neon** | PostgreSQL | **0.5 GB storage**<br>Serverless compute | Standard Postgres; requires full local SQLite to remote Postgres translation layer. | Less suitable for SQLite offline clients. |

**Selected Database:** **Turso (libSQL)** as the primary cloud database, because Zen Dojo's existing schema, migrations, and queries are already written in SQLite/libSQL. A single connection string switch (`DATABASE_URL=libsql://...` and `DATABASE_AUTH_TOKEN=...`) works immediately.

---

## Architecture: Notion-Style Offline-First Delta Sync

Notion operates by maintaining an offline cache of records locally and recording every modification as an operation in a local mutation queue:

```
[Local User Action]
       │
       ▼
[Local SQLite DB] ───(write)───► [local_sync_queue (mutations)]
       ▲                                      │
       │                                      │ (when online: POST /api/sync)
       │                                      ▼
[Apply Downstream Updates] ◄───── [Cloud Server Reconciler]
  (where updated_at > client_cursor)          │
                                              ▼
                                    [Turso Cloud Primary DB]
```

### 1. Data Model Changes for Multi-Tenant Sync
Every synced table (`tasks`, `problem_solves`, `settings`, `notes`, `solution_runs`, `pack_progress`, `practice_sessions`, `timer_rows`) receives:
- `user_id TEXT NOT NULL`
- `updated_at INTEGER NOT NULL` (Unix epoch milliseconds)
- `version INTEGER NOT NULL DEFAULT 1`
- `deleted_at INTEGER` (Nullable timestamp for soft deletes / tombstones, so deletions sync to other devices)

### 2. Local Mutation Queue (`local_sync_queue`)
When any write occurs locally:
```sql
CREATE TABLE IF NOT EXISTS local_sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'upsert' | 'delete'
  payload TEXT NOT NULL, -- JSON serialized row
  client_timestamp INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);
```

### 3. Incremental Delta Protocol (`POST /api/sync`)
1. **Push Phase:** Client sends array of pending items from `local_sync_queue`.
   - Server applies mutations using **Last-Write-Wins (LWW)** based on `updated_at`.
   - If server's `updated_at > client_timestamp`, server version wins (conflict resolution).
2. **Pull Phase:** Client includes its `last_sync_timestamp`.
   - Server queries: `SELECT * FROM table WHERE user_id = :userId AND updated_at > :last_sync_timestamp`.
   - Returns only changed rows across all tables.
3. **Reconcile:** Client updates local SQLite tables with received delta rows, deletes rows where `deleted_at IS NOT NULL`, updates `last_sync_timestamp`, and clears processed `local_sync_queue` records.

---

## Dynamic Admin Portal (Content Management)

A dedicated, authenticated management interface at `/admin` to update questions, test cases, and study content live:

```
/admin
├── /admin/problems          (List, search, filter by source/pattern/difficulty)
│   ├── /admin/problems/new  (Create question: markdown statement, constraints, examples)
│   └── /admin/problems/[id] (Edit statement, test cases, hints, C++/Java reference code)
│       └── [Test with Judge] (Run reference solution against tests in the browser)
├── /admin/study             (Manage System Design, LLD, and Core CS courses)
│   ├── /admin/study/sections (Create/reorder sections and topic hierarchies)
│   └── /admin/study/[id]     (Edit markdown lessons, architecture cards, scorecards, diagrams)
└── /admin/publish           (Review staged changes, bump revision, publish delta to cloud)
```

- **Storage:** Stored in `content_items` table in the cloud database (Plan 0030).
- **Zero App Redeploys:** Clients automatically download new/edited content items when checking for content updates via `rev` counters.
- **Judge Integration:** The admin editor embeds the judge runner so admins can verify that C++ and Java reference solutions pass all test cases before publishing.

---

## Concrete Plans Breakdown

This roadmap is executed through dedicated implementation plans:
1. **Plan 0044:** Notion-Style Offline-First Cloud Sync (Schema multi-tenancy, local mutation queue, `/api/sync` delta protocol, Turso cloud database integration).
2. **Plan 0045:** Dynamic Admin Portal (Web UI for authoring problems, test cases, hints, solutions, study materials, and instant live publishing).

---

## Open Decisions & Next Steps

1. **Authentication Provider:** Recommended: **Auth.js (NextAuth v5)** supporting GitHub and Google OAuth, plus passwordless Magic Links via Resend (free tier: 3,000 emails/month).
2. **Desktop Sign-In:** Desktop app defaults to offline local guest account (`user_id = 'local'`), with a "Sign in to sync" button in Settings that opens the browser OAuth flow and returns an auth session token.
