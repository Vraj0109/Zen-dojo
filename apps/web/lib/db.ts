import "server-only";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/** Walk up from cwd to the repo root (the folder with pnpm-workspace.yaml). */
function repoRoot(): string {
  let dir = process.cwd();
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
  return dir;
}

export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const dataDir = path.join(repoRoot(), "data");
  mkdirSync(dataDir, { recursive: true });
  return "file:" + path.join(dataDir, "habit.db").replaceAll("\\", "/");
}

/**
 * Schema migrations, applied in order. The database's `PRAGMA user_version` records how many
 * have run, so each runs once. Never edit a shipped migration; append a new one instead.
 * Migration 1 uses IF NOT EXISTS because databases created before versioning already have it.
 */
export const MIGRATIONS: string[] = [
  `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  scope TEXT NOT NULL,
  template_key TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  xp INTEGER NOT NULL,
  minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'todo',
  done_on TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_generated_unique ON tasks (date, scope, template_key);
CREATE INDEX IF NOT EXISTS tasks_done_on ON tasks (done_on);
CREATE TABLE IF NOT EXISTS problem_solves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  solved_on TEXT NOT NULL,
  xp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS problem_solves_problem ON problem_solves (problem_id);
CREATE INDEX IF NOT EXISTS problem_solves_solved_on ON problem_solves (solved_on);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`,
  // 2: LeetCode sync
  `
ALTER TABLE problem_solves ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
CREATE TABLE leetcode_submissions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  solved_on TEXT NOT NULL,
  synced_at TEXT NOT NULL
);
CREATE TABLE leetcode_problems (
  slug TEXT PRIMARY KEY,
  number INTEGER,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL
);
`,
  // 3: per-problem notes and saved solution code
  `
CREATE TABLE problem_notes (
  problem_id TEXT PRIMARY KEY,
  notes TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
`,
  // 4: your own LeetCode submissions (code, runtime, notes) captured by the browser extension
  `
CREATE TABLE leetcode_user_submissions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  lang TEXT NOT NULL,
  runtime TEXT,
  runtime_pct REAL,
  memory TEXT,
  memory_pct REAL,
  code TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  submitted_at INTEGER NOT NULL,
  imported_at TEXT NOT NULL
);
CREATE INDEX leetcode_user_submissions_slug ON leetcode_user_submissions (slug, submitted_at);
`,
  // 5: LeetCode topic tags per problem (sent by the extension)
  `
CREATE TABLE leetcode_topics (
  slug TEXT PRIMARY KEY,
  tags TEXT NOT NULL
);
`,
  // 6: study areas (system design, LLD, core CS): concept confidence and practice sessions
  `
CREATE TABLE concept_progress (
  concept_id TEXT PRIMARY KEY,
  confidence INTEGER NOT NULL DEFAULT 0,
  checked TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  covered_on TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  updated_on TEXT NOT NULL
);
CREATE TABLE practice_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  practiced_on TEXT NOT NULL,
  minutes INTEGER,
  scores TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  link TEXT,
  xp INTEGER NOT NULL
);
CREATE INDEX practice_sessions_item ON practice_sessions (item_id, practiced_on);
CREATE INDEX practice_sessions_on ON practice_sessions (practiced_on);
`,
  // 7: focus timer, stuck list, boss fights, reading list, diagrams, pattern cheat sheets
  `
CREATE TABLE focus_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  focused_on TEXT NOT NULL,
  minutes INTEGER NOT NULL
);
CREATE INDEX focus_sessions_item ON focus_sessions (item_id);
CREATE INDEX focus_sessions_on ON focus_sessions (focused_on);
CREATE TABLE problem_struggles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  logged_on TEXT NOT NULL,
  cleared_on TEXT
);
CREATE INDEX problem_struggles_problem ON problem_struggles (problem_id);
CREATE TABLE boss_fights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fought_on TEXT NOT NULL,
  results TEXT NOT NULL,
  minutes INTEGER,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE reading_progress (
  reading_id TEXT PRIMARY KEY,
  done_on TEXT,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE reading_custom (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  added_on TEXT NOT NULL
);
CREATE TABLE diagrams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  url TEXT,
  mime TEXT,
  image TEXT,
  created_on TEXT NOT NULL
);
CREATE INDEX diagrams_item ON diagrams (item_id);
CREATE TABLE pattern_notes (
  pattern_id TEXT PRIMARY KEY,
  template TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  recognize TEXT NOT NULL DEFAULT '',
  updated_on TEXT NOT NULL
);
`,
  // Streak freezes, weekly review reflections, time spent on LeetCode problems (browser extension).
  `
CREATE TABLE streak_freezes (
  day TEXT PRIMARY KEY,
  created_on TEXT NOT NULL
);
CREATE TABLE weekly_reviews (
  week TEXT PRIMARY KEY,
  wins TEXT NOT NULL DEFAULT '',
  struggles TEXT NOT NULL DEFAULT '',
  next_focus TEXT NOT NULL DEFAULT '',
  updated_on TEXT NOT NULL
);
CREATE TABLE site_time (
  day TEXT NOT NULL,
  slug TEXT NOT NULL,
  seconds INTEGER NOT NULL,
  PRIMARY KEY (day, slug)
);
`,
// Content packs: problems and lessons imported as JSON (see docs/content-packs.md), and what you finished in them.
`
CREATE TABLE content_packs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  json TEXT NOT NULL,
  installed_on TEXT NOT NULL
);
CREATE TABLE pack_progress (
  pack_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  done_on TEXT NOT NULL,
  PRIMARY KEY (pack_id, item_id)
);
`,
];

async function migrate(client: Client) {
  const { rows } = await client.execute("PRAGMA user_version");
  const current = Number(rows[0]?.[0] ?? 0);
  for (let v = current; v < MIGRATIONS.length; v++) {
    // Run each migration and its version bump atomically.
    await client.executeMultiple(`BEGIN;\n${MIGRATIONS[v]}\nPRAGMA user_version = ${v + 1};\nCOMMIT;`);
  }
}

const globalForDb = globalThis as unknown as { habitDb?: ReturnType<typeof create> };

function create() {
  const client = createClient({ url: databaseUrl() });
  const db = drizzle(client, { schema });
  const ready = migrate(client).then(() => db);
  return { db, ready };
}

/**
 * Await this before querying; it ensures tables exist. The connection opens on first use
 * (not at import), so `next build` doesn't create a database file. Reused across dev hot reloads.
 */
export function getDb() {
  return (globalForDb.habitDb ??= create()).ready;
}
