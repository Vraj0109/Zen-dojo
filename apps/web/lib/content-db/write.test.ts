import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { revOf } from "@habit/shared";
import { getContentDb, resetContentDbForTests, type ContentDb } from "./client";
import { loadCourse, loadDoc, loadLesson, loadProblem } from "./load";
import { getContentVersion } from "./meta";
import { putAsset, pruneChanges, softDelete, upsertCourse, upsertDoc, upsertLesson, upsertProblem } from "./write";
import { sql } from "drizzle-orm";
import { changes } from "./schema";
import { sampleCourse, sampleDoc, sampleLesson, sampleProblem } from "./fixtures";

let db: ContentDb;

beforeEach(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

async function allChanges() {
  return db.select().from(changes).orderBy(changes.version);
}

describe("upsertProblem", () => {
  it("writing the same problem twice adds one change", async () => {
    const p = sampleProblem();
    const first = await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    const second = await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    expect(first.changed).toBe(true);
    expect(second).toEqual({ changed: false });
    expect(await allChanges()).toHaveLength(1);
    expect(await getContentVersion(db)).toBe(1);
  });

  it("round-trips through loadProblem", async () => {
    const p = sampleProblem();
    await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    expect(await loadProblem(db, p.row.id)).toEqual(p);
  });

  it("changing one hint adds a second change with the given parts and note", async () => {
    const p = sampleProblem();
    await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    const edited = { ...p, hints: [p.hints[0], { ord: 1, bodyMd: "Check the complement first." }] };
    const result = await db.transaction((tx) => upsertProblem(tx, edited, "admin:1", ["hints"], { note: "Clearer hint", notify: true }));

    expect(result.changed).toBe(true);
    const rows = await allChanges();
    expect(rows).toHaveLength(2);
    expect(rows[1].partsJson).toBe('["hints"]');
    expect(rows[1].note).toBe("Clearer hint");
    expect(rows[1].notify).toBe(1);
    expect(rows[1].rev).toBe(revOf(edited));
    expect(rows[1].entity).toBe("problem");
    expect(rows[1].entityId).toBe(p.row.id);
    expect(JSON.parse(rows[1].unitsJson)).toEqual(["problems:hash-map"]);
    expect(await getContentVersion(db)).toBe(2);
    expect(await loadProblem(db, p.row.id)).toEqual(edited);
  });

  it("rejects a page whose sections are in the wrong slot", async () => {
    const p = sampleProblem();
    p.solution.sections[0].slot = "statement";
    await expect(db.transaction((tx) => upsertProblem(tx, p, "seed"))).rejects.toThrow(/slot/);
    expect(await allChanges()).toHaveLength(0);
  });
});

describe("softDelete", () => {
  it("adds an op delete change and hides the problem", async () => {
    const p = sampleProblem();
    await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    const result = await db.transaction((tx) => softDelete(tx, "problem", p.row.id, "admin:1"));
    expect(result.changed).toBe(true);

    const rows = await allChanges();
    expect(rows).toHaveLength(2);
    expect(rows[1].op).toBe("delete");
    expect(rows[1].partsJson).toBe('["all"]');
    expect(await loadProblem(db, p.row.id)).toBeNull();
  });

  it("does nothing for a missing or already deleted entity", async () => {
    expect(await db.transaction((tx) => softDelete(tx, "problem", "nope", "admin:1"))).toEqual({ changed: false });
    const p = sampleProblem();
    await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    await db.transaction((tx) => softDelete(tx, "problem", p.row.id, "admin:1"));
    expect(await db.transaction((tx) => softDelete(tx, "problem", p.row.id, "admin:1"))).toEqual({ changed: false });
    expect(await allChanges()).toHaveLength(2);
  });

  it("restoring by upsert writes a new change", async () => {
    const p = sampleProblem();
    await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    await db.transaction((tx) => softDelete(tx, "problem", p.row.id, "admin:1"));
    const restored = await db.transaction((tx) => upsertProblem(tx, p, "admin:1", ["all"], {}));
    expect(restored.changed).toBe(true);
    expect(await loadProblem(db, p.row.id)).toEqual(p);
  });
});

describe("lessons, courses and docs", () => {
  it("a lesson round-trips through loadLesson and a repeat is skipped", async () => {
    const course = sampleCourse();
    const lesson = sampleLesson();
    await db.transaction((tx) => upsertCourse(tx, course, "seed"));
    const first = await db.transaction((tx) => upsertLesson(tx, lesson, "seed"));
    const again = await db.transaction((tx) => upsertLesson(tx, lesson, "seed"));
    expect(first.changed).toBe(true);
    expect(again.changed).toBe(false);
    expect(await loadLesson(db, lesson.row.id)).toEqual(lesson);
    expect(await loadCourse(db, course.row.id)).toEqual(course);
  });

  it("a lesson moved to another course lists both units", async () => {
    const lesson = sampleLesson();
    await db.transaction((tx) => upsertLesson(tx, lesson, "seed"));
    const moved = { ...lesson, row: { ...lesson.row, courseId: "lld" } };
    await db.transaction((tx) => upsertLesson(tx, moved, "admin:1", ["meta"]));
    const last = (await allChanges()).at(-1)!;
    expect(JSON.parse(last.unitsJson).sort()).toEqual(["course:lld", "course:sd"]);
  });

  it("a doc round-trips exactly and its change id is kind:id", async () => {
    const doc = sampleDoc();
    await db.transaction((tx) => upsertDoc(tx, doc, "seed"));
    expect(await loadDoc(db, "reading", "main")).toEqual(doc);
    const [row] = await allChanges();
    expect(row.entityId).toBe("reading:main");
    expect(row.entity).toBe("doc");
  });
});

describe("putAsset", () => {
  it("stores the same bytes once and rejects SVG", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    const first = await db.transaction((tx) => putAsset(tx, bytes, "image/png", "admin:1"));
    const second = await db.transaction((tx) => putAsset(tx, bytes, "image/png", "admin:1"));
    expect(first.created).toBe(true);
    expect(second).toEqual({ id: first.id, created: false });
    expect(first.id).toHaveLength(64);
    await expect(db.transaction((tx) => putAsset(tx, bytes, "image/svg+xml" as never, "admin:1"))).rejects.toThrow(/not allowed/);
  });
});

describe("parts and units when the caller does not pass them", () => {
  it("a new problem is stored as all, in its unit", async () => {
    await db.transaction((tx) => upsertProblem(tx, sampleProblem(), "seed"));
    const [row] = await allChanges();
    expect(row.partsJson).toBe('["all"]');
    expect(JSON.parse(row.unitsJson)).toEqual(["problems:hash-map"]);
  });

  it("changing one hint without parts stores hints only", async () => {
    const p = sampleProblem();
    await db.transaction((tx) => upsertProblem(tx, p, "seed"));
    const edited = { ...p, hints: [p.hints[0], { ord: 1, bodyMd: "Check the complement first." }] };
    await db.transaction((tx) => upsertProblem(tx, edited, "admin:1"));
    const rows = await allChanges();
    expect(rows[1].partsJson).toBe('["hints"]');
    expect(await loadProblem(db, p.row.id)).toEqual(edited);
  });

  it("editing one section's block stores that section only", async () => {
    const l = sampleLesson();
    await db.transaction((tx) => upsertLesson(tx, l, "seed"));
    const edited = structuredClone(l);
    edited.page.sections[0].blocks[0].body = "A cache keeps hot data close to the reader.";
    await db.transaction((tx) => upsertLesson(tx, edited, "admin:1"));
    const rows = await allChanges();
    expect(rows[1].partsJson).toBe('["section:sd-caching-overview"]');
  });

  it("a lesson moved to another course, without parts, lists both units", async () => {
    const l = sampleLesson();
    await db.transaction((tx) => upsertLesson(tx, l, "seed"));
    const moved = { ...l, row: { ...l.row, courseId: "dsa" } };
    await db.transaction((tx) => upsertLesson(tx, moved, "admin:1"));
    const rows = await allChanges();
    expect(JSON.parse(rows[1].unitsJson).sort()).toEqual(["course:dsa", "course:sd"]);
  });

  it("a delete keeps the unit of the deleted row", async () => {
    await db.transaction((tx) => upsertDoc(tx, sampleDoc(), "seed"));
    await db.transaction((tx) => softDelete(tx, "doc", "reading:main", "admin:1"));
    const rows = await allChanges();
    expect(rows[1].op).toBe("delete");
    expect(JSON.parse(rows[1].unitsJson)).toEqual(["docs"]);
  });
});

describe("pruneChanges", () => {
  async function insertChanges(count: number, at: number) {
    await db.run(
      sql`INSERT INTO changes (entity, entity_id, op, at, actor, parts_json, units_json, rev, note, notify)
          WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${count})
          SELECT 'problem', 'x', 'upsert', ${at}, 'test', '["all"]', '[]', 'r', NULL, 0 FROM n`,
    );
  }

  it("keeps everything young, whatever the count", async () => {
    const now = Date.now();
    await insertChanges(6000, now);
    expect(await pruneChanges(db, now)).toBe(0);
    expect(await allChanges()).toHaveLength(6000);
  });

  it("removes old rows beyond the newest 5,000 and keeps the newest 5,000", async () => {
    const now = Date.now();
    const ninety = 90 * 24 * 60 * 60 * 1000;
    await insertChanges(6000, now - ninety - 1000);
    expect(await pruneChanges(db, now)).toBe(1000);
    const left = await allChanges();
    expect(left).toHaveLength(5000);
    expect(left[0].version).toBe(1001);
  });

  it("keeps old rows when there are 5,000 or fewer", async () => {
    const now = Date.now();
    await insertChanges(10, now - 365 * 24 * 60 * 60 * 1000);
    expect(await pruneChanges(db, now)).toBe(0);
    expect(await allChanges()).toHaveLength(10);
  });
});
