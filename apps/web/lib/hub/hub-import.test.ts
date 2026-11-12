import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importDump, parseDump, splitStatements } from "../../../../scripts/hub-import.mjs";
import { HUB_TABLES, migrateHub } from "./migrations";

let client: Client;

// In memory: a file database was very slow on the Windows CI runner.
beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  await migrateHub(client);
});

afterEach(() => {
  client.close();
});

// Shaped like `wrangler d1 export`: schema statements, then INSERTs (with and without column lists), a skipped table.
const DUMP = `PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
INSERT INTO "d1_migrations" VALUES(1,'0002_auth.sql');
CREATE TABLE users (id TEXT PRIMARY KEY);
INSERT INTO "users" VALUES('gh:1',1,'Ana; the "first"','https://a/x.png',1000,2000);
INSERT INTO "users" VALUES('gh:2',2,'O''Neil',NULL,1001,NULL);
INSERT INTO "settings" ("user_id","key","value","updated_at","deleted_at","synced_at") VALUES('gh:1','theme','dark',5,NULL,6);
INSERT INTO "notes" VALUES('gh:1','two-sum','two-sum','line1'||char(10)||'line2; still text','','',7,NULL,8);
INSERT INTO "abuse_log" VALUES(1,100,'ip:1.2.3.4','ban','x');
-- a comment; with a semicolon
INSERT INTO "sync_heads" VALUES('gh:1',6);
`;

async function counts() {
  const out: Record<string, number> = {};
  for (const t of HUB_TABLES) out[t] = Number((await client.execute(`SELECT count(*) FROM "${t}"`)).rows[0][0]);
  return out;
}

describe("hub-import", () => {
  it("splits statements outside quotes and comments", () => {
    expect(splitStatements("A 'x;y'; B \"c;d\"; -- no; here\nC;")).toEqual(["A 'x;y'", 'B "c;d"', "C"]);
  });

  it("parses values, escapes, char() joins and skips unknown tables", () => {
    const { byTable, skipped } = parseDump(DUMP);
    expect(skipped).toEqual(["d1_migrations"]);
    expect(byTable.get("users")?.rows).toEqual([
      ["gh:1", 1, 'Ana; the "first"', "https://a/x.png", 1000, 2000],
      ["gh:2", 2, "O'Neil", null, 1001, null],
    ]);
    expect(byTable.get("notes")?.rows[0][3]).toBe("line1\nline2; still text");
    expect(byTable.get("settings")?.columns).toHaveLength(6);
  });

  it("reads replace(...) text with line breaks, as SQLite dumps it, including nested replace", async () => {
    const dump = `INSERT INTO "notes" ("user_id","id","problem_id","notes","code","language","updated_at","deleted_at","synced_at") VALUES('gh:1','a','a','n',replace(replace('int main() {\\n\\r\\n  return 0;\\n}','\\n',char(10)),'\\r',char(13)),'cpp',1,NULL,2);`;
    const r = await importDump(client, dump);
    expect(r.imported).toEqual({ notes: 1 });
    const row = (await client.execute("SELECT code FROM notes WHERE id = 'a'")).rows[0];
    expect(String(row[0])).toBe("int main() {\n\r\n  return 0;\n}");
  });

  it("imports twice with identical counts and data", async () => {
    const first = await importDump(client, DUMP);
    expect(first.imported.users).toBe(2);
    expect(first.counts.users).toBe(2);
    expect(first.counts.settings).toBe(1);
    expect(first.counts.notes).toBe(1);
    expect(first.counts.abuse_log).toBe(1);
    expect(first.counts.sync_heads).toBe(1);
    const before = await counts();
    const snapshot = (await client.execute("SELECT * FROM users ORDER BY id")).rows.map((r) => Array.from(r as unknown as unknown[]));

    const second = await importDump(client, DUMP);
    expect(second.counts).toEqual(first.counts);
    expect(await counts()).toEqual(before);
    expect((await client.execute("SELECT * FROM users ORDER BY id")).rows.map((r) => Array.from(r as unknown as unknown[]))).toEqual(snapshot);
    const note = (await client.execute("SELECT notes FROM notes")).rows[0][0];
    expect(note).toBe("line1\nline2; still text");
  });

  it("imports more rows than one batch holds", async () => {
    let big = "";
    for (let i = 0; i < 130; i++) big += `INSERT INTO "sync_heads" VALUES('u${i}',${i});\n`;
    const r = await importDump(client, big);
    expect(r.counts.sync_heads).toBe(130);
  });

  it("rejects a column the hub does not have, without printing values", async () => {
    await expect(importDump(client, `INSERT INTO "sync_heads" ("user_id","secret_col") VALUES('SECRET-VALUE',1);`)).rejects.toThrow(
      /column the hub does not/,
    );
    await expect(importDump(client, `INSERT INTO "sync_heads" VALUES('SECRET-VALUE');`)).rejects.toThrow(/expected 2/);
  });
});
