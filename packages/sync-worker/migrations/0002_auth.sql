-- Accounts and sessions (plan 0049). Safe to apply more than once.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id INTEGER UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_hash TEXT NOT NULL UNIQUE,
  prev_refresh_hash TEXT,
  device_name TEXT,
  created_at INTEGER,
  last_seen_at INTEGER,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_prev_refresh ON sessions (prev_refresh_hash);

-- Sign-in state, valid for 10 minutes.
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  redirect_uri TEXT,
  code_challenge TEXT,
  created_at INTEGER
);

-- One-time authorization codes (only the hash is stored), valid for 60 seconds.
CREATE TABLE IF NOT EXISTS auth_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT,
  redirect_uri TEXT,
  code_challenge TEXT,
  expires_at INTEGER,
  used_at INTEGER
);
