-- Multi-tenant sync tables (Cloudflare D1), state after migration 0004 (plan 0050).
-- Mirrors apps/web/lib/schema.ts, plus user_id / updated_at / deleted_at / synced_at.
-- "notes" mirrors problem_notes; "timer_rows" mirrors focus_sessions.
-- Cloud ids are TEXT and device-independent, so (user_id, id) is the key.
-- updated_at is the device clock and only decides which write wins; synced_at is the Worker clock and drives pulls.

CREATE TABLE IF NOT EXISTS tasks (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  date TEXT NOT NULL,
  scope TEXT NOT NULL,
  template_key TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  xp INTEGER NOT NULL,
  minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'todo',
  done_on TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS tasks_user_updated ON tasks (user_id, updated_at);
CREATE INDEX IF NOT EXISTS tasks_user_synced ON tasks (user_id, synced_at);

CREATE TABLE IF NOT EXISTS problem_solves (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL, -- "<problem_id>:<kind>"
  problem_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  solved_on TEXT NOT NULL,
  xp INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS problem_solves_user_updated ON problem_solves (user_id, updated_at);
CREATE INDEX IF NOT EXISTS problem_solves_user_synced ON problem_solves (user_id, synced_at);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS settings_user_updated ON settings (user_id, updated_at);
CREATE INDEX IF NOT EXISTS settings_user_synced ON settings (user_id, synced_at);

CREATE TABLE IF NOT EXISTS notes (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL, -- the problem id
  problem_id TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS notes_user_updated ON notes (user_id, updated_at);
CREATE INDEX IF NOT EXISTS notes_user_synced ON notes (user_id, synced_at);

CREATE TABLE IF NOT EXISTS solution_runs (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL, -- "<problem_id>:<lang>"
  problem_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  code TEXT NOT NULL,
  ran_on TEXT NOT NULL,
  status TEXT NOT NULL,
  passed INTEGER NOT NULL,
  total INTEGER NOT NULL,
  failed_cases TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS solution_runs_user_updated ON solution_runs (user_id, updated_at);
CREATE INDEX IF NOT EXISTS solution_runs_user_synced ON solution_runs (user_id, synced_at);

CREATE TABLE IF NOT EXISTS pack_progress (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL, -- "<pack_id>:<item_id>"
  pack_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  done_on TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS pack_progress_user_updated ON pack_progress (user_id, updated_at);
CREATE INDEX IF NOT EXISTS pack_progress_user_synced ON pack_progress (user_id, synced_at);

CREATE TABLE IF NOT EXISTS practice_sessions (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  practiced_on TEXT NOT NULL,
  minutes INTEGER,
  scores TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  link TEXT,
  xp INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS practice_sessions_user_updated ON practice_sessions (user_id, updated_at);
CREATE INDEX IF NOT EXISTS practice_sessions_user_synced ON practice_sessions (user_id, synced_at);

CREATE TABLE IF NOT EXISTS timer_rows (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  focused_on TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS timer_rows_user_updated ON timer_rows (user_id, updated_at);
CREATE INDEX IF NOT EXISTS timer_rows_user_synced ON timer_rows (user_id, synced_at);

-- One row per user: the newest synced_at of any push. GET /api/sync/head reads only this.
CREATE TABLE IF NOT EXISTS sync_heads (
  user_id TEXT PRIMARY KEY,
  head INTEGER NOT NULL
);
