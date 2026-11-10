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

## Free Cloud Database Evaluation (Network Speed, Egress & Storage)

| Database Provider | Dialect | Free Tier Storage | Network / Egress Pricing | Latency & Global Distribution | System Design Verdict |
|---|---|---|---|---|---|
| **Cloudflare D1 + Workers** | **SQLite** | **5 GB storage**<br>5M row reads/day<br>100k row writes/day | **$0.00 Egress Fees** (completely free bandwidth worldwide) | **Fastest (< 25ms):** Runs at 330+ global edge locations right next to the user. | **Top Network Pick:** Zero egress bandwidth costs forever, edge-native, perfect complement to local SQLite. |
| **Turso (libSQL)** | **SQLite / libSQL** | **5 GB storage** (Starter free)<br>500M row reads/month<br>10M row writes/month | 3 GB/month embedded sync allowance; ~$0.75/GB overage | **Low (< 50ms):** Distributed primary + multi-region edge replicas. | **Top Code Pick:** 100% drop-in compatible with our existing `@libsql/client` queries. |
| **Supabase** | PostgreSQL | **500 MB storage**<br>50,000 MAU<br>2 active projects | 5 GB/month egress bandwidth | Standard cloud regions (single-region compute). | **Limited Storage:** 500 MB is 10× smaller than D1/Turso; requires local SQLite ↔ remote Postgres translation layer. |
| **Neon** | PostgreSQL | **0.5 GB storage**<br>Serverless compute | Egress charges apply after quota | Single-region serverless Postgres. | Less suitable for offline SQLite clients. |

### Should we change our local database?
**System Design Verdict: Absolutely NOT.**
Notion's own engineering team started with IndexedDB/LocalStorage and explicitly **migrated to SQLite** (native SQLite on desktop and SQLite via WASM + OPFS in browsers) because:
1. **Relational Performance:** Zen Dojo's roadmap, study relations, and practice reviews require joins and index lookups that are 5-10× faster in SQLite than in key-value browser stores.
2. **ACID Transaction Safety:** Local SQLite transactions prevent database corruption during sudden crashes or battery drain.
3. **Zero Translation Overhead:** Both the local client (desktop) and cloud edge (Cloudflare D1 / Turso) speak the exact same SQLite SQL dialect.

### Network Bandwidth & Latency Optimization
By adopting Notion's delta sync protocol, network payload is kept microscopic:
- A typical user action (e.g. marking a problem solved or updating a note) is an incremental delta payload of **~250 bytes to 1.5 KB**.
- Even with 100 sync operations per day across multiple devices, monthly bandwidth is **< 10 MB per user**.
- This means you will use **< 1% of the free bandwidth quota** on Cloudflare D1 or Turso, keeping operation completely free.

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
