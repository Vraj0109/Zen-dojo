import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { CONTENT_MIGRATIONS } from "./migrations";
import { contentDatabaseUrl, getContentDb, migrateContent, resetContentDbForTests } from "./client";

const TABLES = [
  "admin_audit",
  "assets",
  "block_code",
  "blocks",
  "changes",
  "content_meta",
  "courses",
  "docs",
  "hints",
  "lessons",
  "page_sections",
  "problems",
  "test_cases",
];

beforeEach(() => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("content database migrations", () => {
  it("creates every table at the latest version", async () => {
    const db = await getContentDb();
    const names = (await db.$client.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((r) => String(r[0]));
    for (const t of TABLES) expect(names).toContain(t);
    const version = await db.$client.execute("PRAGMA user_version");
    expect(Number(version.rows[0][0])).toBe(CONTENT_MIGRATIONS.length);
  });

  it("starts at content version 0, schema version 1 and content epoch 1", async () => {
    const db = await getContentDb();
    const meta = await db.$client.execute("SELECT k, v FROM content_meta ORDER BY k");
    expect(meta.rows.map((r) => [String(r[0]), String(r[1])])).toEqual([
      ["content_epoch", "1"],
      ["content_version", "0"],
      ["schema_version", "1"],
    ]);
  });

  it("running migrations again is a no-op", async () => {
    const client = createClient({ url: ":memory:" });
    await migrateContent(client, false);
    await client.execute("INSERT INTO courses (id, area, title, rev, updated_at) VALUES ('keep', 'a', 't', 'r', 1)");
    await migrateContent(client, false); // would fail with "table already exists" if the first migration ran again
    const kept = await client.execute("SELECT count(*) FROM courses WHERE id = 'keep'");
    expect(Number(kept.rows[0][0])).toBe(1);
    const version = await client.execute("PRAGMA user_version");
    expect(Number(version.rows[0][0])).toBe(CONTENT_MIGRATIONS.length);
    client.close();
  });

  it("the changes table carries the plan 0115 columns with their defaults", async () => {
    const db = await getContentDb();
    const cols = (await db.$client.execute("PRAGMA table_info(changes)")).rows.map((r) => String(r[1]));
    for (const c of ["parts_json", "units_json", "rev", "note", "notify"]) expect(cols).toContain(c);
  });

  it("uses CONTENT_DATABASE_URL when set and data/content.db otherwise", () => {
    expect(contentDatabaseUrl({ CONTENT_DATABASE_URL: "libsql://zen.turso.io" })).toBe("https://zen.turso.io");
    expect(contentDatabaseUrl({})).toMatch(/^file:.*content\.db$/);
  });
});
