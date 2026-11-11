// Plan 0050: change tracking for cloud sync. Pure (no I/O): builds the SQL for one migration that adds four side tables
// and AFTER INSERT / UPDATE / DELETE triggers on the synced user tables. The user's own tables are never altered.

export type SyncTableDef = {
  /** Local table name. */
  local: string;
  /** Cloud (D1) table name. */
  cloud: string;
  /** How the cloud row id is built: a generated `sync_id`, several columns joined with ":", or one column. */
  key: "sync_id" | "composite" | "single";
  /** Local columns that make up the key (`["id"]` for sync_id tables, whose local id is an autoincrement). */
  keyCols: string[];
  /** Columns uploaded to the cloud. */
  cols: string[];
};

export const SYNC_TABLE_MAP: readonly SyncTableDef[] = [
  { local: "tasks", cloud: "tasks", key: "sync_id", keyCols: ["id"], cols: ["date", "scope", "template_key", "title", "category", "xp", "minutes", "status", "done_on"] },
  { local: "problem_solves", cloud: "problem_solves", key: "composite", keyCols: ["problem_id", "kind"], cols: ["problem_id", "kind", "solved_on", "xp", "source"] },
  { local: "settings", cloud: "settings", key: "single", keyCols: ["key"], cols: ["value"] },
  { local: "problem_notes", cloud: "notes", key: "single", keyCols: ["problem_id"], cols: ["problem_id", "notes", "code", "language"] },
  {
    local: "solution_runs",
    cloud: "solution_runs",
    key: "composite",
    keyCols: ["problem_id", "lang"],
    cols: ["problem_id", "lang", "code", "ran_on", "status", "passed", "total", "failed_cases"],
  },
  { local: "pack_progress", cloud: "pack_progress", key: "composite", keyCols: ["pack_id", "item_id"], cols: ["pack_id", "item_id", "done_on"] },
  {
    local: "practice_sessions",
    cloud: "practice_sessions",
    key: "sync_id",
    keyCols: ["id"],
    cols: ["item_id", "practiced_on", "minutes", "scores", "score", "notes", "link", "xp"],
  },
  { local: "focus_sessions", cloud: "timer_rows", key: "sync_id", keyCols: ["id"], cols: ["item_id", "focused_on", "minutes"] },
];

/** Settings that never leave this machine (exact keys). Any key containing a word in SECRET_WORDS is also private. */
export const SYNC_SETTINGS_DENYLIST: readonly string[] = ["extension_token", "content_feed_url", "tools_notice_dismissed"];

const SECRET_WORDS = ["token", "secret", "key", "password"] as const;

export function isSyncableSettingKey(key: string): boolean {
  const k = key.toLowerCase();
  if (SYNC_SETTINGS_DENYLIST.includes(key) || SYNC_SETTINGS_DENYLIST.includes(k)) return false;
  return !SECRET_WORDS.some((w) => k.includes(w));
}

const NOW = "CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)";
const NOT_APPLYING = "COALESCE((SELECT v FROM sync_flags WHERE k = 'applying'), '0') <> '1'";

const SIDE_TABLES = `
CREATE TABLE IF NOT EXISTS sync_dirty (
  tbl TEXT NOT NULL,
  row_key TEXT NOT NULL,
  changed_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tbl, row_key)
);
CREATE TABLE IF NOT EXISTS sync_stamps (
  tbl TEXT NOT NULL,
  row_key TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (tbl, row_key)
);
CREATE TABLE IF NOT EXISTS sync_ids (
  tbl TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  sync_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY (tbl, local_id)
);
CREATE TABLE IF NOT EXISTS sync_flags (
  k TEXT PRIMARY KEY,
  v TEXT
);
`;

type Row = "NEW" | "OLD";

function keyExpr(t: SyncTableDef, r: Row): string {
  if (t.key === "sync_id") return `(SELECT sync_id FROM sync_ids WHERE tbl = '${t.local}' AND local_id = ${r}.id)`;
  return t.keyCols.map((c) => `${r}.${c}`).join(" || ':' || ");
}

/** SQL condition that is true when the row's setting key may sync (settings table only); "1" otherwise. */
function syncableCond(t: SyncTableDef, r: Row): string {
  if (t.local !== "settings") return "1";
  const k = `${r}.key`;
  const exact = SYNC_SETTINGS_DENYLIST.map((s) => `'${s}'`).join(", ");
  const like = SECRET_WORDS.map((w) => `${k} NOT LIKE '%${w}%'`).join(" AND ");
  return `(${k} NOT IN (${exact}) AND ${like})`;
}

function ensureId(t: SyncTableDef, r: Row): string {
  if (t.key !== "sync_id") return "";
  return `  INSERT OR IGNORE INTO sync_ids (tbl, local_id, sync_id) VALUES ('${t.local}', ${r}.id, lower(hex(randomblob(16))));\n`;
}

/** Statements that queue one row (live or deleted) and stamp it. `cond` is an extra SQL condition. */
function markRow(t: SyncTableDef, r: Row, deleted: boolean, cond: string): string {
  const key = keyExpr(t, r);
  const d = deleted ? 1 : 0;
  const delAt = deleted ? NOW : "NULL";
  return (
    `  INSERT INTO sync_dirty (tbl, row_key, changed_at, deleted) SELECT '${t.local}', ${key}, ${NOW}, ${d} WHERE ${cond}\n` +
    `    ON CONFLICT (tbl, row_key) DO UPDATE SET changed_at = excluded.changed_at, deleted = excluded.deleted;\n` +
    `  INSERT INTO sync_stamps (tbl, row_key, updated_at, deleted_at) SELECT '${t.local}', ${key}, ${NOW}, ${delAt} WHERE ${cond}\n` +
    `    ON CONFLICT (tbl, row_key) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = excluded.deleted_at;\n`
  );
}

function triggersFor(t: SyncTableDef): string {
  const n = (suffix: string) => `sync_${t.local}_${suffix}`;
  const sameKey = t.keyCols.map((c) => `OLD.${c} IS NEW.${c}`).join(" AND ");
  const insert =
    `CREATE TRIGGER IF NOT EXISTS ${n("ai")} AFTER INSERT ON ${t.local}\nWHEN ${NOT_APPLYING}\nBEGIN\n` +
    ensureId(t, "NEW") +
    markRow(t, "NEW", false, syncableCond(t, "NEW")) +
    `END;\n`;
  // An update that changes the natural key (sync_id tables keep their id) retires the old key and queues the new one.
  const moved = t.key === "sync_id" ? "" : markRow(t, "OLD", true, `NOT (${sameKey}) AND ${syncableCond(t, "OLD")}`);
  const update =
    `CREATE TRIGGER IF NOT EXISTS ${n("au")} AFTER UPDATE ON ${t.local}\nWHEN ${NOT_APPLYING}\nBEGIN\n` +
    ensureId(t, "NEW") +
    moved +
    markRow(t, "NEW", false, syncableCond(t, "NEW")) +
    `END;\n`;
  const del =
    `CREATE TRIGGER IF NOT EXISTS ${n("ad")} AFTER DELETE ON ${t.local}\nWHEN ${NOT_APPLYING}\nBEGIN\n` +
    ensureId(t, "OLD") +
    markRow(t, "OLD", true, syncableCond(t, "OLD")) +
    `END;\n`;
  return insert + update + del;
}

/** The SQL for one `MIGRATIONS` entry: side tables plus all triggers. Safe to run twice. */
export function syncMigrationSql(): string {
  return SIDE_TABLES + SYNC_TABLE_MAP.map(triggersFor).join("");
}
