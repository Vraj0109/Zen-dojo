import "server-only";
import type { InStatement } from "@libsql/client";
import { BACKUP_TABLES } from "./backup";
import { getDb } from "./db";
import { extractClient, type AnyDbClient } from "./sync-schema";

// Plan 0054: erase the progress stored on this device. The sync triggers queue every delete as a cloud deletion,
// so the whole erase runs with sync_flags.applying = '1' (triggers silent) and ends with it back at '0'.

/** Imported content, kept unless the caller asks for it. */
const IMPORTED_TABLES = ["content_items", "content_packs"] as const;
/** Settings rows that always stay: they belong to this install, not to your progress. */
const PROTECTED_SETTINGS = ["extension_token", "content_feed_url"] as const;
const LOCAL_SYNC_TABLES = ["sync_dirty", "sync_stamps", "sync_ids"] as const;
const SYNC_FLAGS_TO_CLEAR = ["account", "head", "last_synced_at", "state", "last_error"] as const;

type RawClient = {
  execute: (stmt: InStatement) => Promise<{ rows: Record<string, unknown>[]; rowsAffected: number }>;
  batch: (stmts: InStatement[], mode?: "write") => Promise<{ rowsAffected: number }[]>;
};

export interface EraseOptions {
  /** Keep every settings row (default true). When false, settings are deleted except the protected ones. */
  keepSettings?: boolean;
  /** Also delete imported content (content_items, content_packs). Default false. */
  includeImported?: boolean;
  db?: AnyDbClient;
}

async function rawClient(db?: AnyDbClient): Promise<RawClient> {
  const c = extractClient(db ?? ((await getDb()) as unknown as AnyDbClient)) as unknown as RawClient;
  if (typeof c.batch !== "function") throw new Error("Erasing data needs a libSQL client.");
  return c;
}

const progressTables = () =>
  BACKUP_TABLES.filter((t) => t !== "settings" && !(IMPORTED_TABLES as readonly string[]).includes(t));

const setApplying = (v: "0" | "1"): InStatement => ({
  sql: "INSERT OR REPLACE INTO sync_flags (k, v) VALUES ('applying', ?)",
  args: [v],
});

export async function eraseLocalData(opts: EraseOptions = {}): Promise<{ removed: Record<string, number> }> {
  const keepSettings = opts.keepSettings ?? true;
  const c = await rawClient(opts.db);

  const names: string[] = [];
  const stmts: InStatement[] = [setApplying("1")];
  const add = (name: string | null, stmt: InStatement) => {
    stmts.push(stmt);
    names[stmts.length - 1] = name ?? "";
  };

  for (const t of progressTables()) add(t, `DELETE FROM ${t}`);
  if (!keepSettings) {
    const marks = PROTECTED_SETTINGS.map(() => "?").join(", ");
    add("settings", { sql: `DELETE FROM settings WHERE key NOT IN (${marks})`, args: [...PROTECTED_SETTINGS] });
  }
  if (opts.includeImported) for (const t of IMPORTED_TABLES) add(t, `DELETE FROM ${t}`);
  for (const t of LOCAL_SYNC_TABLES) add(null, `DELETE FROM ${t}`);
  const marks = SYNC_FLAGS_TO_CLEAR.map(() => "?").join(", ");
  add(null, { sql: `DELETE FROM sync_flags WHERE k IN (${marks})`, args: [...SYNC_FLAGS_TO_CLEAR] });
  stmts.push(setApplying("0")); // last statement of the same transaction

  try {
    const results = await c.batch(stmts, "write"); // one transaction: all or nothing
    const removed: Record<string, number> = {};
    results.forEach((r, i) => {
      if (names[i]) removed[names[i]] = r.rowsAffected ?? 0;
    });
    return { removed };
  } finally {
    // A failure must never leave the triggers silenced.
    try {
      await c.execute(setApplying("0"));
    } catch {
      /* the database is unreachable; nothing more to do */
    }
  }
}

async function count(c: RawClient, table: string): Promise<number> {
  const r = await c.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(r.rows[0]?.n ?? 0);
}

/** What "Delete data on this device" would remove, grouped for the confirmation text. */
export async function getLocalSummary(
  db?: AnyDbClient,
): Promise<{ solves: number; notes: number; runs: number; tasks: number; other: number }> {
  const c = await rawClient(db);
  const [solves, notes, runs, tasks] = await Promise.all(
    ["problem_solves", "problem_notes", "solution_runs", "tasks"].map((t) => count(c, t)),
  );
  const rest = progressTables().filter((t) => !["problem_solves", "problem_notes", "solution_runs", "tasks"].includes(t));
  const other = (await Promise.all(rest.map((t) => count(c, t)))).reduce((a, b) => a + b, 0);
  return { solves, notes, runs, tasks, other };
}
