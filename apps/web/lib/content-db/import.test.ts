import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTENT_SCHEMA_VERSION, type ContentSnapshot } from "@habit/shared";
import { getContentDb, resetContentDbForTests, type ContentDb } from "./client";
import { loadProblem } from "./load";
import { getContentEpoch } from "./meta";
import { adminAudit, changes } from "./schema";
import { loadFixtureSnapshot } from "./test-helpers";
import { importPack, importSnapshot, packToSnapshot } from "./import";
import { loadSnapshotFromDb } from "./verify-db";

let db: ContentDb;

beforeEach(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

const importRows = () => db.select().from(adminAudit).where(eq(adminAudit.action, "import"));
const resyncRows = () => db.select().from(adminAudit).where(eq(adminAudit.action, "resync"));

describe("importSnapshot", () => {
  it("writes every entity and image, one import audit row per entity, and raises the epoch once", async () => {
    const snapshot = loadFixtureSnapshot();
    expect(await getContentEpoch(db)).toBe(1);

    const report = await importSnapshot(db, snapshot, { now: 1_000 });

    expect(report.entities).toBe(snapshot.entities.length);
    expect(report.changed).toBe(snapshot.entities.length);
    expect(report.unchanged).toBe(0);
    expect(report.assets).toBe(snapshot.assets.length);
    expect(report.epoch).toEqual({ from: 1, to: 2 });
    expect(await getContentEpoch(db)).toBe(2);

    const stored = await loadSnapshotFromDb(db);
    expect(stored.entities).toHaveLength(snapshot.entities.length);
    expect(stored.assets).toHaveLength(snapshot.assets.length);

    const audit = await importRows();
    expect(audit).toHaveLength(snapshot.entities.length);
    for (const row of audit) {
      expect(row.actorId).toBe("owner");
      expect(row.actorName).toBe("owner");
      expect(row.at).toBe(1_000);
    }
    expect(await resyncRows()).toHaveLength(1);
  });

  it("writes the change log with actor import", async () => {
    await importSnapshot(db, loadFixtureSnapshot());
    const rows = await db.select().from(changes);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.actor === "import")).toBe(true);
  });

  it("importing the same snapshot twice changes no entity, adds no import rows, and still raises the epoch once more", async () => {
    const snapshot = loadFixtureSnapshot();
    await importSnapshot(db, snapshot);
    const auditAfterFirst = (await importRows()).length;
    const changesAfterFirst = (await db.select().from(changes)).length;
    const entitiesAfterFirst = await loadSnapshotFromDb(db);

    const second = await importSnapshot(db, snapshot);

    expect(second.changed).toBe(0);
    expect(second.unchanged).toBe(snapshot.entities.length);
    expect(second.epoch).toEqual({ from: 2, to: 3 });
    expect(await getContentEpoch(db)).toBe(3);
    expect((await importRows()).length).toBe(auditAfterFirst);
    expect((await db.select().from(changes)).length).toBe(changesAfterFirst);
    expect(await loadSnapshotFromDb(db)).toEqual(entitiesAfterFirst);
    expect((await resyncRows()).length).toBe(2);
  });

  it("refuses a snapshot from a newer schema", async () => {
    const snapshot: ContentSnapshot = { ...loadFixtureSnapshot(), schema: CONTENT_SCHEMA_VERSION + 1 };
    await expect(importSnapshot(db, snapshot)).rejects.toThrow(/newer than this app/);
    expect(await getContentEpoch(db)).toBe(1);
  });
});

describe("packToSnapshot and importPack", () => {
  const packPath = path.resolve(__dirname, "../../../../docs/examples/sample-pack.json");
  const pack = () => JSON.parse(readFileSync(packPath, "utf8")) as { id: string; sections: { items: { type: string; id: string }[] }[] };

  it("turns the problems of an example pack into problem entities and warns about the lesson", () => {
    const { snapshot, warnings } = packToSnapshot(pack());
    expect(snapshot.entities.map((e) => e.kind)).toEqual(["problem", "problem"]);
    expect(warnings.some((w) => w.includes("what-is-binary-search"))).toBe(true);
  });

  it("writes the pack's problems and reports the lesson as not imported", async () => {
    const p = pack();
    const report = await importPack(db, p, { now: 5 });
    expect(report.changed).toBe(2);
    expect(report.warnings.length).toBeGreaterThan(0);
    for (const item of p.sections[0].items.filter((i) => i.type === "problem")) {
      const stored = await loadProblem(db, `pack:${p.id}:${item.id}`);
      expect(stored).not.toBeNull();
    }
    expect(await importRows()).toHaveLength(2);
  });

  it("rejects an invalid pack with its errors", () => {
    expect(() => packToSnapshot({ format: "nope" })).toThrow(/invalid pack/);
  });
});
