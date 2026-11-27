// Vitest global setup (plan 0114, round B): content comes only from the content database, so tests read it from one
// too. This fills a temporary content database ONCE per test run from the repo content (the same seed as
// `pnpm content:seed-db`) and hands its URL to every test file through ZD_TEST_CONTENT_DB (test/content-setup.ts uses
// it when a test has not chosen its own CONTENT_DATABASE_URL). After the cutover (plan 0117) the seed source becomes the
// committed fixture snapshot.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let dir = "";

export async function setup(): Promise<void> {
  dir = mkdtempSync(path.join(tmpdir(), "zd-vitest-content-"));
  const url = `file:${path.join(dir, "content.db").replaceAll("\\", "/")}`;
  const { getContentDb, resetContentDbForTests } = await import("../lib/content-db/client");
  const { seedContent } = await import("../lib/content-db/seed");
  const db = await getContentDb({ CONTENT_DATABASE_URL: url });
  await seedContent(db, { actor: "seed", batch: 100 });
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
