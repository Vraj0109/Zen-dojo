import { beforeEach, describe, expect, it } from "vitest";
import type { ContentDb } from "../content-db/client";
import { getContentEpoch } from "../content-db/meta";
import { adminAudit } from "../content-db/schema";
import { bumpContentEpoch } from "./resync";
import { makeDb } from "./test-helpers";

let db: ContentDb;

beforeEach(async () => {
  db = await makeDb();
});

describe("bumpContentEpoch (content:resync)", () => {
  it("starts at epoch 1 and raises it by one each time", async () => {
    expect(await getContentEpoch(db)).toBe(1);
    expect(await bumpContentEpoch(db, 100)).toEqual({ from: 1, to: 2 });
    expect(await getContentEpoch(db)).toBe(2);
    expect(await bumpContentEpoch(db, 200)).toEqual({ from: 2, to: 3 });
    expect(await getContentEpoch(db)).toBe(3);
  });

  it("writes one resync audit row as the owner, with the old and new epoch", async () => {
    await bumpContentEpoch(db, 1234);
    const rows = await db.select().from(adminAudit);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      at: 1234,
      action: "resync",
      actorId: "owner",
      actorName: "owner",
      entity: "content",
      entityId: "content_epoch",
      beforeJson: '{"epoch":1}',
      afterJson: '{"epoch":2}',
    });
  });
});
