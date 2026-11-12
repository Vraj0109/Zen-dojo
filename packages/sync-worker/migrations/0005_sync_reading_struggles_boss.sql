-- Migration 0005: cloud sync for the reading list, the stuck list and boss fights.
-- Additive only (CREATE ... IF NOT EXISTS); safe to apply twice. Same shape as 0004: TEXT ids,
-- updated_at / deleted_at / synced_at. Keep the column lists in step with COLUMNS in src/index.ts
-- and SYNC_TABLE_MAP_V2 in apps/web/lib/sync-triggers.ts.

CREATE TABLE IF NOT EXISTS reading_progress (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL, -- the reading item id
  reading_id TEXT NOT NULL,
  done_on TEXT,
  notes TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS reading_progress_user_updated ON reading_progress (user_id, updated_at);
CREATE INDEX IF NOT EXISTS reading_progress_user_synced ON reading_progress (user_id, synced_at);

CREATE TABLE IF NOT EXISTS reading_custom (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  added_on TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS reading_custom_user_updated ON reading_custom (user_id, updated_at);
CREATE INDEX IF NOT EXISTS reading_custom_user_synced ON reading_custom (user_id, synced_at);

CREATE TABLE IF NOT EXISTS problem_struggles (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  logged_on TEXT NOT NULL,
  cleared_on TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS problem_struggles_user_updated ON problem_struggles (user_id, updated_at);
CREATE INDEX IF NOT EXISTS problem_struggles_user_synced ON problem_struggles (user_id, synced_at);

CREATE TABLE IF NOT EXISTS boss_fights (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  fought_on TEXT NOT NULL,
  results TEXT NOT NULL,
  minutes INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS boss_fights_user_updated ON boss_fights (user_id, updated_at);
CREATE INDEX IF NOT EXISTS boss_fights_user_synced ON boss_fights (user_id, synced_at);
