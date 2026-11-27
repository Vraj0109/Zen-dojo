import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mintAdminProof } from "../auth/admin-proof";
import { getContentDb, getContentWriteDb, resetContentDbForTests } from "./client";
import { loadProblem } from "./load";
import { upsertProblem } from "./write";
import { sampleProblem } from "./fixtures";

beforeEach(() => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("getContentWriteDb", () => {
  it("throws without an AdminProof", async () => {
    await expect(getContentWriteDb(undefined as never)).rejects.toThrow(/AdminProof/);
    await expect(getContentWriteDb({ userId: "x", name: "y" } as never)).rejects.toThrow(/AdminProof/);
  });

  it("accepts a proof, and its writes are seen by the read client", async () => {
    const proof = mintAdminProof("gh:1", "Admin");
    const writer = await getContentWriteDb(proof);
    const p = sampleProblem();
    await writer.transaction((tx) => upsertProblem(tx, p, "admin:gh:1"));

    const reader = await getContentDb();
    expect(await loadProblem(reader, p.row.id)).toEqual(p);
  });
});
