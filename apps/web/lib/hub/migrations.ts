// Hub database schema (plan 0073 A1): ports of packages/sync-worker/migrations/0002 to 0006, in order, plus the rate-limit table.
// Never edit a shipped entry; append a new one. Every statement is idempotent (IF NOT EXISTS), so a cold-start race is harmless.
// 0004 drops and recreates the sync tables in D1; the hub starts empty, so the DROP lines are omitted here.
// This file has no imports so scripts/hub-import.mjs can load it directly.

export const HUB_MIGRATIONS: string[] = [
  // 0002 accounts and sessions
  `CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  redirect_uri TEXT,
  code_challenge TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS auth_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT,
  redirect_uri TEXT,
  code_challenge TEXT,
  expires_at INTEGER,
  used_at INTEGER
);`,
  // 0003 abuse protection
  `CREATE TABLE IF NOT EXISTS bans (
  key TEXT PRIMARY KEY,
  reason TEXT,
  banned_until INTEGER NOT NULL,
  strikes INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS user_quota (
  user_id TEXT PRIMARY KEY,
  rows_live INTEGER NOT NULL DEFAULT 0,
  bytes_live INTEGER NOT NULL DEFAULT 0,
  day INTEGER NOT NULL DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_abuse_log_key_kind ON abuse_log (key, kind, at);`,
  // 0004 sync tables
  `CREATE TABLE tasks (
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
CREATE TABLE problem_solves (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
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
CREATE TABLE notes (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
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
CREATE TABLE solution_runs (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
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
CREATE TABLE pack_progress (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
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
CREATE TABLE IF NOT EXISTS sync_heads (
  user_id TEXT PRIMARY KEY,
  head INTEGER NOT NULL
);`,
  // 0005 reading, stuck list, boss fights
  `CREATE TABLE IF NOT EXISTS reading_progress (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS boss_fights_user_synced ON boss_fights (user_id, synced_at);`,
  // 0006 public profile
  `CREATE TABLE IF NOT EXISTS public_profiles (
  user_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);`,
  // 0007 rate limit counters (replaces the Cloudflare Rate Limiting bindings)
  `CREATE TABLE IF NOT EXISTS rate_counters (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);`,
];

/** Tables the Worker reads or writes (used by tests and the import script). */
export const HUB_TABLES = [
  "users", "sessions", "oauth_states", "auth_codes", "bans", "user_quota", "abuse_log", "public_profiles", "sync_heads",
  "tasks", "problem_solves", "settings", "notes", "solution_runs", "pack_progress", "practice_sessions", "timer_rows",
  "reading_progress", "reading_custom", "problem_struggles", "boss_fights",
] as const;

/** The subset of a libSQL client that migrateHub needs (keeps this file import-free). */
interface MigrateClient {
  execute(stmt: string | { sql: string; args: unknown[] }): Promise<{ rows: ArrayLike<unknown>[] }>;
  executeMultiple(sql: string): Promise<void>;
}

async function named<T>(step: string, f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    throw new Error(`[hub ${step}] ${e instanceof Error ? e.message : "failed"}`);
  }
}

/**
 * Applies pending HUB_MIGRATIONS. The version lives in the table zd_schema_version (Turso refuses PRAGMA user_version = N and
 * BEGIN scripts over HTTPS). Each migration and its version bump are separate calls; the version only moves after the
 * migration succeeded. Safe to run again and from two processes at once because every statement is IF NOT EXISTS.
 */
export async function migrateHub(client: MigrateClient): Promise<void> {
  await named("version-table", () =>
    client.execute("CREATE TABLE IF NOT EXISTS zd_schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)"),
  );
  const row = (await named("version-read", () => client.execute("SELECT version FROM zd_schema_version WHERE id = 1"))).rows[0];
  const current = row ? Number(row[0]) : 0;
  for (let v = current; v < HUB_MIGRATIONS.length; v++) {
    await named(`migration-${v}`, () => client.executeMultiple(HUB_MIGRATIONS[v]));
    await named(`version-${v + 1}`, () =>
      client.execute({
        sql: "INSERT INTO zd_schema_version (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = excluded.version",
        args: [v + 1],
      }),
    );
  }
}
