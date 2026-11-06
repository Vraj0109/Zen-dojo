import "server-only";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
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

// Bare-bones migration: create tables if missing. Replace with drizzle-kit migrations later.
const INIT_SQL = `
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
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const globalForDb = globalThis as unknown as { habitDb?: ReturnType<typeof create> };

function create() {
  const client = createClient({ url: databaseUrl() });
  const db = drizzle(client, { schema });
  const ready = client.executeMultiple(INIT_SQL).then(() => db);
  return { db, ready };
}

/**
 * Await this before querying; it ensures tables exist. The connection opens on first use
 * (not at import), so `next build` doesn't create a database file. Reused across dev hot reloads.
 */
export function getDb() {
  return (globalForDb.habitDb ??= create()).ready;
}
