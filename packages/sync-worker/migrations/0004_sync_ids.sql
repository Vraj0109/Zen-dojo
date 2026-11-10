-- Migration 0004 (plan 0050): TEXT row ids, synced_at cursor column, sync_heads.
--
-- WARNING: this DROPS and recreates the cloud sync tables. It is only safe while they are empty
-- (tasks, problem_solves, practice_sessions and timer_rows get TEXT ids; the other four gain synced_at).
-- Run this check FIRST. The number must be 0:
--   npx wrangler d1 execute zen-dojo-db --remote --command "SELECT (SELECT count(*) FROM tasks)+(SELECT count(*) FROM problem_solves)+(SELECT count(*) FROM practice_sessions)+(SELECT count(*) FROM timer_rows)+(SELECT count(*) FROM settings)+(SELECT count(*) FROM notes)+(SELECT count(*) FROM solution_runs)+(SELECT count(*) FROM pack_progress) AS total"
-- Every table is dropped with IF EXISTS first, so applying this twice to an empty database works.

DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
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

DROP TABLE IF EXISTS problem_solves;
CREATE TABLE problem_solves (
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

DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
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

DROP TABLE IF EXISTS notes;
CREATE TABLE notes (
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

DROP TABLE IF EXISTS solution_runs;
CREATE TABLE solution_runs (
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

DROP TABLE IF EXISTS pack_progress;
CREATE TABLE pack_progress (
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

DROP TABLE IF EXISTS practice_sessions;
CREATE TABLE practice_sessions (
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

DROP TABLE IF EXISTS timer_rows;
CREATE TABLE timer_rows (
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
