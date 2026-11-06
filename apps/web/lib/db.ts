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

function databaseUrl(): string {
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
