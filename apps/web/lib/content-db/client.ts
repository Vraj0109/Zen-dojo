import "server-only";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { isAdminProof, type AdminProof } from "../auth/admin-proof";
import { CONTENT_MIGRATIONS } from "./migrations";
import * as schema from "./schema";

export type ContentDb = ReturnType<typeof drizzle<typeof schema>>;
/** The transaction handed to write helpers (`db.transaction(async (tx) => …)`). */
export type ContentTx = Parameters<Parameters<ContentDb["transaction"]>[0]>[0];

type Env = Record<string, string | undefined>;
type Connected = { db: ContentDb; client: Client };

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

/** The content database address. Desktop sets CONTENT_DATABASE_URL (apps/desktop/main.js); dev uses data/content.db. */
export function contentDatabaseUrl(env: Env = process.env): string {
  if (env.CONTENT_DATABASE_URL) return toHttpUrl(env.CONTENT_DATABASE_URL);
  const dataDir = path.join(repoRoot(), "data");
  mkdirSync(dataDir, { recursive: true });
  return "file:" + path.join(dataDir, "content.db").replaceAll("\\", "/");
}

/** HTTPS, not WebSocket: a serverless function cannot reuse a socket across requests (same as lib/hosted/control.ts). */
function toHttpUrl(url: string): string {
  return url.startsWith("libsql://") ? "https://" + url.slice("libsql://".length) : url;
}

function isLocal(url: string): boolean {
  return url === ":memory:" || url.startsWith("file:");
}

/**
 * Pending migrations are applied once per process. A local file records the count in `PRAGMA user_version`. A remote
 * (Turso) database refuses that pragma and BEGIN/COMMIT scripts over HTTPS, so it keeps the count in a one-row table
 * instead (the same approach as lib/db.ts). A database already at the latest version is only read, never written, so
 * a read-only token works for it.
 */
export async function migrateContent(client: Client, remote: boolean): Promise<void> {
  const current = remote ? await remoteVersion(client) : await localVersion(client);
  if (current >= CONTENT_MIGRATIONS.length) return;
  if (remote) {
    await client.execute("CREATE TABLE IF NOT EXISTS zd_schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)");
    for (let v = current; v < CONTENT_MIGRATIONS.length; v++) {
      await client.executeMultiple(CONTENT_MIGRATIONS[v]);
      await client.execute({
        sql: "INSERT INTO zd_schema_version (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = excluded.version",
        args: [v + 1],
      });
    }
    return;
  }
  for (let v = current; v < CONTENT_MIGRATIONS.length; v++) {
    try {
      await client.executeMultiple(`BEGIN;\n${CONTENT_MIGRATIONS[v]}\nPRAGMA user_version = ${v + 1};\nCOMMIT;`);
    } catch (err) {
      await client.execute("ROLLBACK").catch(() => {});
      throw err;
    }
  }
}

async function localVersion(client: Client): Promise<number> {
  const { rows } = await client.execute("PRAGMA user_version");
  return Number(rows[0]?.[0] ?? 0);
}

async function remoteVersion(client: Client): Promise<number> {
  try {
    const { rows } = await client.execute("SELECT version FROM zd_schema_version WHERE id = 1");
    return Number(rows[0]?.[0] ?? 0);
  } catch {
    return 0; // the version table does not exist yet
  }
}

const globalForContent = globalThis as unknown as { habitContentDb?: Map<string, Promise<Connected>> };

function cache(): Map<string, Promise<Connected>> {
  return (globalForContent.habitContentDb ??= new Map());
}

function open(url: string, token: string | undefined): Promise<Connected> {
  const remote = !isLocal(url);
  const client = createClient(token ? { url, authToken: token } : { url });
  return migrateContent(client, remote).then(
    () => ({ db: drizzle(client, { schema }), client }),
    (err) => {
      client.close();
      throw err;
    },
  );
}

/**
 * Local files and :memory: share one client, so a write and a later read see the same data. A remote database uses one
 * client for reads and writes unless a separate read-only token is set; then reads get their own client.
 */
function connect(kind: "read" | "write", env: Env): Promise<ContentDb> {
  const url = contentDatabaseUrl(env);
  const writeToken = env.CONTENT_DATABASE_AUTH_TOKEN || undefined;
  const readToken = env.CONTENT_DATABASE_READ_TOKEN || undefined;
  const useReadToken = kind === "read" && !isLocal(url) && !!readToken;
  const key = isLocal(url) ? "local" : useReadToken ? "read" : "write";
  const map = cache();
  let entry = map.get(key);
  if (!entry) {
    entry = open(url, useReadToken ? readToken : writeToken);
    map.set(key, entry);
    // A failed open is not cached, so the next call can retry (for example after the token is fixed).
    entry.catch(() => {
      if (map.get(key) === entry) map.delete(key);
    });
  }
  return entry.then((c) => c.db);
}

/** Read client. Uses CONTENT_DATABASE_READ_TOKEN when set, else CONTENT_DATABASE_AUTH_TOKEN. */
export function getContentDb(env: Env = process.env): Promise<ContentDb> {
  return connect("read", env);
}

/**
 * Write client. Only code that holds an AdminProof (from an admin check, lib/auth/admin.ts) can get one. Throws otherwise,
 * so a public page cannot write content by accident.
 */
export async function getContentWriteDb(proof: AdminProof, env: Env = process.env): Promise<ContentDb> {
  if (!isAdminProof(proof)) throw new Error("getContentWriteDb needs an AdminProof from a passed admin check");
  return connect("write", env);
}

/** Tests only: closes every cached client and forgets it. */
export async function resetContentDbForTests(): Promise<void> {
  const map = cache();
  const entries = [...map.values()];
  map.clear();
  for (const e of entries) {
    const c = await e.catch(() => null);
    c?.client.close();
  }
}
