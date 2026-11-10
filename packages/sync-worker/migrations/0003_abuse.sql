-- Plan 0049 (Agent B): abuse protection tables. Safe to apply twice.
CREATE TABLE IF NOT EXISTS bans (
  key TEXT PRIMARY KEY,            -- 'ip:<ip>' or 'user:<id>'
  reason TEXT,
  banned_until INTEGER NOT NULL,   -- epoch milliseconds
  strikes INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_quota (
  user_id TEXT PRIMARY KEY,
  rows_live INTEGER NOT NULL DEFAULT 0,
  bytes_live INTEGER NOT NULL DEFAULT 0,
  day INTEGER NOT NULL DEFAULT 0,          -- UTC day number (epoch ms / 86400000)
  writes_today INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS abuse_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER,
  key TEXT,
  kind TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_abuse_log_at ON abuse_log (at);
CREATE INDEX IF NOT EXISTS idx_abuse_log_key_kind ON abuse_log (key, kind, at);
-- Rows older than 14 days are deleted by guard.ts (cleanup runs when a ban is written, at most hourly per isolate).
