import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { InStatement } from "@libsql/client";
import { MIGRATIONS, databaseUrl, getDb } from "./db";

// Export / restore all your data as one JSON file.

export const BACKUP_FORMAT = "habitmanager-backup";

/** Every table, in an order that's safe to restore. */
export const BACKUP_TABLES = [
  "settings",
  "tasks",
  "problem_solves",
  "problem_notes",
  "leetcode_submissions",
  "leetcode_problems",
  "leetcode_user_submissions",
  "leetcode_topics",
  "concept_progress",
  "practice_sessions",
] as const;

/** Never exported or overwritten: the extension pairing key stays with this install. */
const PRIVATE_SETTINGS = new Set(["extension_token"]);

type Row = Record<string, unknown>;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  tables: Partial<Record<(typeof BACKUP_TABLES)[number], Row[]>>;
}

async function client() {
  return (await getDb()).$client;
}

export async function exportBackup(): Promise<Backup> {
  const c = await client();
  const tables: Backup["tables"] = {};
  for (const t of BACKUP_TABLES) {
    const rs = await c.execute(`SELECT * FROM ${t}`);
    let rows: Row[] = rs.rows.map((r) => Object.fromEntries(rs.columns.map((col, i) => [col, r[i]])));
    if (t === "settings") rows = rows.filter((r) => !PRIVATE_SETTINGS.has(String(r.key)));
    tables[t] = rows;
  }
  return { format: BACKUP_FORMAT, schemaVersion: MIGRATIONS.length, exportedAt: new Date().toISOString(), tables };
}

export const backupFileName = (d = new Date()) => `habitmanager-backup-${d.toISOString().slice(0, 19).replaceAll(":", "-")}.json`;

/** Write the current data next to the database (data/backups/) before a restore. Returns the path, or null for in-memory DBs. */
async function saveSafetyCopy(): Promise<string | null> {
  const url = databaseUrl();
  if (!url.startsWith("file:")) return null;
  const dbFile = url.startsWith("file:///") ? fileURLToPath(url) : url.slice("file:".length);
  const dir = path.join(path.dirname(dbFile), "backups");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `before-restore-${backupFileName().replace("habitmanager-backup-", "")}`);
  writeFileSync(file, JSON.stringify(await exportBackup()));
  return file;
}

const isScalar = (v: unknown) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";

export type RestoreResult = { ok: true; rows: number; safetyCopy: string | null } | { ok: false; error: string };

/**
 * Replace all data with a backup, in one transaction (all or nothing). Only known tables and columns
 * are written; backups from older app versions work, newer ones are refused.
 */
export async function restoreBackup(raw: unknown): Promise<RestoreResult> {
  const b = raw as Partial<Backup> | null;
  if (!b || typeof b !== "object" || b.format !== BACKUP_FORMAT || !b.tables || typeof b.tables !== "object") {
    return { ok: false, error: "That isn't a HabitManager backup file." };
  }
  if (!Number.isInteger(b.schemaVersion) || b.schemaVersion! > MIGRATIONS.length) {
    return { ok: false, error: "This backup was made by a newer version of HabitManager. Update the app first." };
  }

  const c = await client();
  const statements: InStatement[] = [];
  let rows = 0;
  for (const t of BACKUP_TABLES) {
    const info = await c.execute(`PRAGMA table_info(${t})`);
    const columns = new Set(info.rows.map((r) => String(r[1])));
    statements.push(t === "settings" ? { sql: `DELETE FROM settings WHERE key NOT IN ('extension_token')`, args: [] } : `DELETE FROM ${t}`);
    const list = b.tables[t];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return { ok: false, error: `Table "${t}" in the backup is not a list.` };
    for (const row of list) {
      if (!row || typeof row !== "object") return { ok: false, error: `A row in "${t}" is not an object.` };
      if (t === "settings" && PRIVATE_SETTINGS.has(String((row as Row).key))) continue;
      const entries = Object.entries(row as Row).filter(([k]) => columns.has(k));
      if (entries.length === 0) continue;
      if (!entries.every(([, v]) => isScalar(v))) return { ok: false, error: `A row in "${t}" has an unexpected value.` };
      statements.push({
        sql: `INSERT INTO ${t} (${entries.map(([k]) => `"${k}"`).join(", ")}) VALUES (${entries.map(() => "?").join(", ")})`,
        args: entries.map(([, v]) => (typeof v === "boolean" ? Number(v) : v)) as (string | number | null)[],
      });
      rows++;
    }
  }

  const safetyCopy = await saveSafetyCopy();
  try {
    await c.batch(statements, "write"); // one transaction: rolled back entirely on any error
  } catch (e) {
    return { ok: false, error: `Restore failed and nothing was changed: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { ok: true, rows, safetyCopy };
}
