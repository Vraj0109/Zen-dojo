// The seeded content passes verifyContent with zero errors (wave 3, V1). Warnings are allowed; their count is recorded in
// docs/plans/notes/wave3-V1.md. If this fails, the printout shows the first 10 errors.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyDb } from "./verify-db";
import { getContentDb, resetContentDbForTests, type ContentDb } from "./client";
import { seedContent } from "./seed";

let db: ContentDb;

beforeAll(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
  await seedContent(db, { actor: "seed", batch: 50 });
}, 120_000);

afterAll(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("seeded content verifies", () => {
  it("has zero verify errors (warnings are allowed)", async () => {
    const issues = await verifyDb(db);
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length > 0) {
      console.log(`verifyContent: ${errors.length} errors, first 10:`);
      for (const e of errors.slice(0, 10)) console.log(`  [${e.entity}] ${e.id}: ${e.message}`);
    }
    expect(errors.length).toBe(0);
  }, 120_000);
});
