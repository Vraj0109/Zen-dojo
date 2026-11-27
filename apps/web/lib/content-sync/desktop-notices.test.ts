import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ChangeEntry } from "@habit/shared";
import { getContentDb, resetContentDbForTests, type ContentDb } from "../content-db/client";
import { sampleCourse, sampleLesson, sampleProblem } from "../content-db/fixtures";
import { upsertCourse, upsertLesson, upsertProblem } from "../content-db/write";
import { desktopNotices, startedUnits } from "./desktop-notices";

let db: ContentDb;

beforeEach(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
  await db.transaction(async (tx) => {
    await upsertProblem(tx, sampleProblem(), "test");
    await upsertCourse(tx, sampleCourse(), "test");
    await upsertLesson(tx, sampleLesson(), "test");
  });
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

const entry = (over: Partial<ChangeEntry>): ChangeEntry => ({
  version: 10,
  entity: "problem",
  id: "lc-test-two-sum",
  op: "upsert",
  rev: "r",
  parts: ["hints"],
  units: ["problems:hash-map"],
  note: "Clearer hint 2",
  notify: true,
  ...over,
});

describe("desktop notices", () => {
  it("started units come from solved problems (pattern) and concepts with progress (course)", async () => {
    const units = await startedUnits(db, { solvedProblemIds: ["lc-test-two-sum", "lc-test-two-sum", "missing"], conceptIds: ["sd-caching"] });
    expect([...units].sort()).toEqual(["course:sd", "problems:hash-map"]);
  });

  it("only 'Tell learners' changes in started units become notices, with titles", async () => {
    const started = new Set(["problems:hash-map"]);
    const list = await desktopNotices(db, { refreshed: false, entries: [entry({}), entry({ version: 11, notify: false, note: null })] }, started, 5);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 10, unit: "problems:hash-map", title: sampleProblem().row.title, note: "Clearer hint 2", at: 5 });
  });

  it("a change in a unit the person never started gives no notice", async () => {
    expect(await desktopNotices(db, { refreshed: false, entries: [entry({})] }, new Set(["course:sd"]), 5)).toEqual([]);
  });

  it("a muted started unit gives no notice (mute wins over started)", async () => {
    const list = await desktopNotices(
      db,
      { refreshed: false, entries: [entry({})] },
      new Set(["problems:hash-map"]),
      5,
      { follow: [], mute: ["problems:hash-map"] },
    );
    expect(list).toEqual([]);
  });

  it("a followed unit that was never started gives a notice", async () => {
    const list = await desktopNotices(
      db,
      { refreshed: false, entries: [entry({})] },
      new Set<string>(),
      5,
      { follow: ["problems:hash-map"], mute: [] },
    );
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ unit: "problems:hash-map", note: "Clearer hint 2" });
  });

  it("a full resync gives one 'Content was refreshed' notice and nothing else", async () => {
    const list = await desktopNotices(db, { refreshed: true, entries: [entry({})] }, new Set(["problems:hash-map"]), 7);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Content was refreshed");
  });
});
