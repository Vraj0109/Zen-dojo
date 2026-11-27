// Vitest global setup (plans 0114, 0117): content comes only from the content database, so tests read it from one
// too. This fills a temporary content database ONCE per test run from the committed fixture
// (packages/shared/test/fixtures/content-mini.json, see seedFixture) and hands its URL to every test file through
// ZD_TEST_CONTENT_DB (test/content-setup.ts uses it when a test has not chosen its own CONTENT_DATABASE_URL).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let dir = "";

export async function setup(): Promise<void> {
  dir = mkdtempSync(path.join(tmpdir(), "zd-vitest-content-"));
  const url = `file:${path.join(dir, "content.db").replaceAll("\\", "/")}`;
  const { getContentDb, resetContentDbForTests } = await import("../lib/content-db/client");
  const { seedFixture } = await import("../lib/content-db/test-helpers");
  const db = await getContentDb({ CONTENT_DATABASE_URL: url });
  await seedFixture(db);
  await resetContentDbForTests();
  process.env.ZD_TEST_CONTENT_DB = url;
}

export async function teardown(): Promise<void> {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Windows may still hold the file for a moment; the OS temp folder is cleaned up later anyway.
  }
}
