import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mintAdminProof } from "../auth/admin-proof";
import { getContentDb, resetContentDbForTests, type ContentDb } from "./client";
import { writeAudit, listAudit } from "./audit";
import { loadProblem } from "./load";
import { adminAudit, changes } from "./schema";
import { upsertProblem } from "./write";
import { sampleProblem } from "./fixtures";

let db: ContentDb;
const proof = mintAdminProof("gh:1", "Admin One");

beforeEach(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("writeAudit", () => {
  it("writes the change and its audit row together", async () => {
    const p = sampleProblem();
    await db.transaction(async (tx) => {
      await upsertProblem(tx, p, "admin:gh:1");
      await writeAudit(tx, proof, { action: "create", entity: "problem", entityId: p.row.id, before: null, after: p, requestId: "req-1" });
    });
    const audit = await db.select().from(adminAudit);
    expect(audit).toHaveLength(1);
    expect(audit[0].actorId).toBe("gh:1");
    expect(audit[0].actorName).toBe("Admin One");
    expect(audit[0].beforeJson).toBeNull();
    expect(audit[0].requestId).toBe("req-1");
    expect(await loadProblem(db, p.row.id)).toEqual(p);
  });

  it("a forced error after the write leaves neither the change nor the audit row", async () => {
    const p = sampleProblem();
    await expect(
      db.transaction(async (tx) => {
        await upsertProblem(tx, p, "admin:gh:1");
        await writeAudit(tx, proof, { action: "create", entity: "problem", entityId: p.row.id, before: null, after: p, requestId: null });
        throw new Error("forced failure");
      }),
    ).rejects.toThrow("forced failure");

    expect(await db.select().from(adminAudit)).toHaveLength(0);
    expect(await db.select().from(changes)).toHaveLength(0);
    expect(await loadProblem(db, p.row.id)).toBeNull();
  });

  it("refuses a value that did not come from an admin check", async () => {
    const p = sampleProblem();
    await expect(
      db.transaction(async (tx) => {
        await writeAudit(tx, { userId: "gh:1", name: "x" } as never, { action: "update", entity: "problem", entityId: p.row.id, before: null, after: null, requestId: null });
      }),
    ).rejects.toThrow(/AdminProof/);
    expect(await db.select().from(adminAudit)).toHaveLength(0);
  });
});

describe("listAudit", () => {
  it("filters by entity and pages newest first with before/after parsed", async () => {
    const p = sampleProblem();
    await db.transaction(async (tx) => {
      await writeAudit(tx, proof, { action: "create", entity: "problem", entityId: p.row.id, before: null, after: { n: 1 }, requestId: null });
      await writeAudit(tx, proof, { action: "update", entity: "problem", entityId: p.row.id, before: { n: 1 }, after: { n: 2 }, requestId: null });
      await writeAudit(tx, proof, { action: "update", entity: "lesson", entityId: "sd-caching", before: null, after: null, requestId: null });
    });
    const problemRows = await listAudit(db, { entity: "problem", limit: 10 });
    expect(problemRows.map((r) => r.action)).toEqual(["update", "create"]);
    expect(problemRows[0].before).toEqual({ n: 1 });
    expect(problemRows[0].after).toEqual({ n: 2 });

    // ids are 1 (create), 2 (update), 3 (lesson update): "before 3" is the cursor past the newest row
    const page = await listAudit(db, { limit: 1, before: 3 });
    expect(page.map((r) => r.id)).toEqual([2]);
  });
});
