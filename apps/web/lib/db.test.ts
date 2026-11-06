import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { MIGRATIONS, getDb } from "./db";

const dirs: string[] = [];
afterEach(() => {
  delete (globalThis as { habitDb?: unknown }).habitDb;
  for (const d of dirs.splice(0)) {
    // Windows can hold the file handle briefly after close; temp files are best-effort cleanup.
    try {
      rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {}
  }
});

function tempDbUrl() {
  const dir = mkdtempSync(path.join(tmpdir(), "habit-db-"));
  dirs.push(dir);
  return "file:" + path.join(dir, "habit.db").replaceAll("\\", "/");
}

describe("migrations", () => {
  it("creates a new database at the latest version", async () => {
    process.env.DATABASE_URL = ":memory:";
    delete (globalThis as { habitDb?: unknown }).habitDb;
    const db = await getDb();
    const { rows } = await db.$client.execute("PRAGMA user_version");
    expect(Number(rows[0][0])).toBe(MIGRATIONS.length);
  });

  it("upgrades a database created before versioning and keeps its data", async () => {
    const url = tempDbUrl();
    // A database as created by the first release: migration 1's tables, user_version 0.
    const old = createClient({ url });
    await old.executeMultiple(MIGRATIONS[0]);
    await old.execute("INSERT INTO problem_solves (problem_id, kind, solved_on, xp) VALUES ('lc-1', 'solve', '2026-11-01', 5)");
    old.close();

    process.env.DATABASE_URL = url;
    delete (globalThis as { habitDb?: unknown }).habitDb;
    const db = await getDb();
    const version = await db.$client.execute("PRAGMA user_version");
    expect(Number(version.rows[0][0])).toBe(MIGRATIONS.length);
    const rows = await db.$client.execute("SELECT problem_id, source FROM problem_solves");
    expect(rows.rows.map((r) => ({ ...r }))).toEqual([{ problem_id: "lc-1", source: "manual" }]);
    db.$client.close();
  });

  it("is a no-op on an up-to-date database", async () => {
    const url = tempDbUrl();
    process.env.DATABASE_URL = url;
    delete (globalThis as { habitDb?: unknown }).habitDb;
    (await getDb()).$client.close();
    delete (globalThis as { habitDb?: unknown }).habitDb;
    const db = await getDb(); // would fail with "duplicate column" if migration 2 re-ran
    expect(Number((await db.$client.execute("PRAGMA user_version")).rows[0][0])).toBe(MIGRATIONS.length);
    db.$client.close();
  });
});
