// One-time import of the Cloudflare D1 data into the hub database (plan 0073 A4).
//
//   npx wrangler d1 export zen-dojo-db --remote --output dump.sql        (the user runs this; it only reads D1)
//   HUB_DATABASE_URL=... HUB_DATABASE_AUTH_TOKEN=... \
//     node --disable-warning=DEP0205 --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/lib/register-ts.mjs \
//     scripts/hub-import.mjs dump.sql
//
// Reads the INSERT statements of the dump, binds their values (no string pasting), and writes them with INSERT OR REPLACE,
// table by table, through the D1 shim in batches (every statement binds fewer than 100 values). Running it twice gives the same
// rows. Prints row counts per table, never the URL, the token or any row. Tables the Worker does not use are skipped by name.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createD1FromLibsql } from "../apps/web/lib/hub/d1";
import { HUB_TABLES, migrateHub } from "../apps/web/lib/hub/migrations";

const BATCH = 50;
const MAX_PARAMS = 99;

/** Splits SQL text into statements on ';' outside quotes and comments. */
export function splitStatements(text) {
  const out = [];
  let cur = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === c) {
          if (text[j + 1] === c) j += 2;
          else break;
        } else j++;
      }
      cur += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === "-" && text[i + 1] === "-") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (c === ";") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      i++;
    } else {
      cur += c;
      i++;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Parses one SQL literal expression (strings, numbers, NULL, X'..', char(n), joined by ||) starting at s[pos]. */
function parseValue(s, pos) {
  const parts = [];
  let i = pos;
  for (;;) {
    while (/\s/.test(s[i] ?? "")) i++;
    let term;
    if (s[i] === "'") {
      let j = i + 1;
      let str = "";
      for (;;) {
        if (j >= s.length) throw new Error("unterminated string");
        if (s[j] === "'") {
          if (s[j + 1] === "'") {
            str += "'";
            j += 2;
          } else break;
        } else str += s[j++];
      }
      term = str;
      i = j + 1;
    } else if (/^replace\s*\(/i.test(s.slice(i))) {
      // SQLite dumps text with line breaks as replace('...\n...','\n',char(10)); arguments can nest.
      let k = i + /^replace\s*\(/i.exec(s.slice(i))[0].length;
      const args = [];
      for (let n = 0; n < 3; n++) {
        const r = parseValue(s, k);
        args.push(r.value);
        k = r.end;
        while (/\s/.test(s[k] ?? "")) k++;
        if (n < 2) {
          if (s[k] !== ",") throw new Error("unsupported value");
          k++;
        }
      }
      if (s[k] !== ")") throw new Error("unsupported value");
      const [text, from, to] = args.map((a) => (a === null ? "" : String(a)));
      term = from === "" ? text : text.split(from).join(to);
      i = k + 1;
    } else {
      const m = /^(NULL|TRUE|FALSE|[xX]'([0-9a-fA-F]*)'|char\(\s*(\d+(?:\s*,\s*\d+)*)\s*\)|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/i.exec(s.slice(i));
      if (!m) throw new Error("unsupported value");
      const t = m[1];
      if (/^null$/i.test(t)) term = null;
      else if (/^true$/i.test(t)) term = 1;
      else if (/^false$/i.test(t)) term = 0;
      else if (m[2] !== undefined) term = Uint8Array.from(Buffer.from(m[2], "hex"));
      else if (m[3] !== undefined) term = String.fromCodePoint(...m[3].split(",").map((n) => Number(n.trim())));
      else term = /^[-+]?\d+$/.test(t) && !Number.isSafeInteger(Number(t)) ? BigInt(t) : Number(t);
      i += t.length;
    }
    parts.push(term);
    while (/\s/.test(s[i] ?? "")) i++;
    if (s[i] === "|" && s[i + 1] === "|") {
      i += 2;
      continue;
    }
    break;
  }
  if (parts.length === 1) return { value: parts[0], end: i };
  return { value: parts.map((p) => (p === null ? "" : String(p))).join(""), end: i };
}

/** Parses "(v1, v2, ...)[, (..)]" starting right after VALUES. Returns the rows. */
function parseTuples(s, pos) {
  const rows = [];
  let i = pos;
  for (;;) {
    while (/\s/.test(s[i] ?? "")) i++;
    if (s[i] !== "(") throw new Error("expected (");
    i++;
    const row = [];
    for (;;) {
      const { value, end } = parseValue(s, i);
      row.push(value);
      i = end;
      while (/\s/.test(s[i] ?? "")) i++;
      if (s[i] === ",") {
        i++;
        continue;
      }
      if (s[i] === ")") {
        i++;
        break;
      }
      throw new Error("expected , or )");
    }
    rows.push(row);
    while (/\s/.test(s[i] ?? "")) i++;
    if (s[i] === ",") {
      i++;
      continue;
    }
    break;
  }
  return rows;
}

/** Reads a dump and returns { byTable: Map<table, {columns|null, rows[][]}>, skipped: string[] }. Throws with a statement number, never a value. */
export function parseDump(text) {
  const known = new Set(HUB_TABLES);
  const byTable = new Map();
  const skipped = new Set();
  splitStatements(text).forEach((st, n) => {
    const m = /^INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(?:"([^"]+)"|`([^`]+)`|(\w+))\s*(?:\(([^)]*)\))?\s*VALUES\s*/i.exec(st);
    if (!m) return;
    const table = m[1] ?? m[2] ?? m[3];
    if (!known.has(table)) {
      skipped.add(table);
      return;
    }
    const columns = m[4] ? m[4].split(",").map((c) => c.trim().replace(/^["`]|["`]$/g, "")) : null;
    let rows;
    try {
      rows = parseTuples(st, m[0].length);
    } catch (e) {
      throw new Error(`dump statement ${n + 1} (${table}): ${e instanceof Error ? e.message : "cannot parse"}`);
    }
    const entry = byTable.get(table) ?? { columns, rows: [] };
    if (columns && entry.columns && columns.join() !== entry.columns.join()) {
      // Different column order in a later statement: store it as its own group.
      const k = `${table}#${columns.join()}`;
      const alt = byTable.get(k) ?? { columns, rows: [], table };
      alt.rows.push(...rows);
      byTable.set(k, alt);
      return;
    }
    entry.rows.push(...rows);
    byTable.set(table, entry);
  });
  return { byTable, skipped: [...skipped].sort() };
}

async function columnsOf(client, table) {
  const rs = await client.execute({ sql: "SELECT name FROM pragma_table_info(?) ORDER BY cid", args: [table] });
  return rs.rows.map((r) => String(r[0]));
}

/**
 * Imports a dump text into a migrated hub client. Idempotent. Returns { counts, imported, skipped } where counts is the hub's
 * row count per table after the import and imported is how many rows the dump held per table.
 */
export async function importDump(client, text) {
  const db = createD1FromLibsql(client);
  const { byTable, skipped } = parseDump(text);
  const imported = {};
  for (const [key, entry] of byTable) {
    const table = entry.table ?? key;
    const hubCols = await columnsOf(client, table);
    const columns = entry.columns ?? hubCols;
    for (const c of columns) {
      if (!/^\w+$/.test(c) || !hubCols.includes(c)) throw new Error(`table ${table}: the dump has a column the hub does not (${c})`);
    }
    if (columns.length > MAX_PARAMS) throw new Error(`table ${table}: too many columns`);
    const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
    for (let i = 0; i < entry.rows.length; i += BATCH) {
      const group = entry.rows.slice(i, i + BATCH).map((row) => {
        if (row.length !== columns.length) throw new Error(`table ${table}: a row has ${row.length} values, expected ${columns.length}`);
        return db.prepare(sql).bind(...row);
      });
      await db.batch(group);
    }
    imported[table] = (imported[table] ?? 0) + entry.rows.length;
  }
  const counts = {};
  for (const table of HUB_TABLES) {
    const rs = await client.execute(`SELECT count(*) FROM "${table}"`);
    counts[table] = Number(rs.rows[0]?.[0] ?? 0);
  }
  return { counts, imported, skipped };
}

async function main() {
  const file = process.argv[2];
  const url = process.env.HUB_DATABASE_URL;
  if (!file || !url) {
    console.error("Usage: HUB_DATABASE_URL=... HUB_DATABASE_AUTH_TOKEN=... node ... scripts/hub-import.mjs <dump.sql>");
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { createClient } = createRequire(path.join(root, "apps", "web", "package.json"))("@libsql/client");
  const client = createClient({
    url: url.startsWith("libsql://") ? "https://" + url.slice("libsql://".length) : url,
    authToken: process.env.HUB_DATABASE_AUTH_TOKEN || undefined,
  });
  try {
    await migrateHub(client);
    const { counts, imported, skipped } = await importDump(client, fs.readFileSync(file, "utf8"));
    console.log("table                 in dump    in hub");
    for (const t of HUB_TABLES) console.log(`${t.padEnd(20)} ${String(imported[t] ?? 0).padStart(8)} ${String(counts[t]).padStart(9)}`);
    if (skipped.length) console.log(`Skipped tables the Worker does not use: ${skipped.join(", ")}`);
    console.log("Done. Compare the 'in hub' column with the D1 counts before switching.");
  } finally {
    client.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error("Import failed:", e instanceof Error ? e.message : "unknown error");
    process.exit(1);
  });
}
