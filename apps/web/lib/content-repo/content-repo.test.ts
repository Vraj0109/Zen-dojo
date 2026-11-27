import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheTag } from "next/cache";
import { getContentDb, resetContentDbForTests, type ContentDb } from "../content-db/client";
import { getContentVersion } from "../content-db/meta";
import { sampleCourse, sampleDoc, sampleLesson, sampleProblem } from "../content-db/fixtures";
import { putAsset, softDelete, upsertCourse, upsertDoc, upsertLesson, upsertProblem } from "../content-db/write";
import { getAssetFile } from "./assets";
import { getCourse, getLesson, listCourses } from "./courses";
import { getDoc, listDocs } from "./docs";
import { getProblem, getProblemSpec, getSolutionPage, listProblemSummaries } from "./problems";
import { getContentVersionCached } from "./version";

// "use cache" is a Next compiler transform and does nothing under Vitest, so the functions run as plain async code.
// next/cache is stubbed so the tags they request can be checked.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

let db: ContentDb;
let assetId: string;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
  await db.transaction(async (tx) => {
    await upsertProblem(tx, sampleProblem(), "test");
    await upsertCourse(tx, sampleCourse(), "test");
    await upsertLesson(tx, sampleLesson(), "test");
    await upsertDoc(tx, sampleDoc(), "test");
    assetId = (await putAsset(tx, new Uint8Array([137, 80, 78, 71]), "image/png", "test")).id;
  });
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("problems", () => {
  it("getProblem returns the stored problem", async () => {
    expect(await getProblem("lc-test-two-sum")).toEqual(sampleProblem());
  });

  it("getProblem tags the problem and the content tag", async () => {
    await getProblem("lc-test-two-sum");
    expect(cacheTag).toHaveBeenCalledWith("content", "problem:lc-test-two-sum");
  });

  it("an unknown id is null", async () => {
    expect(await getProblem("no-such-problem")).toBeNull();
    expect(await getProblemSpec("no-such-problem")).toBeNull();
    expect(await getSolutionPage("no-such-problem")).toBeNull();
  });

  it("summaries hold only the list columns, never bodies", async () => {
    const list = await listProblemSummaries();
    expect(list).toHaveLength(1);
    expect(Object.keys(list[0]).sort()).toEqual(["difficulty", "hasBrute", "id", "kind", "languages", "pattern", "source", "title"]);
    expect(list[0]).toMatchObject({ id: "lc-test-two-sum", title: "Two Sum", kind: "function", languages: ["cpp", "python"], hasBrute: false });
    const text = JSON.stringify(list);
    expect(text).not.toContain("Given an array");
    expect(text).not.toContain("vector<int>");
    expect(text).not.toContain("Use a hash map");
  });

  it("summaries and lookups hide a soft-deleted problem", async () => {
    await db.transaction((tx) => softDelete(tx, "problem", "lc-test-two-sum", "test"));
    expect(await listProblemSummaries()).toEqual([]);
    expect(await getProblem("lc-test-two-sum")).toBeNull();
  });

  it("getProblemSpec gives the judge spec with no stress generators for a sample id", async () => {
    const spec = await getProblemSpec("lc-test-two-sum");
    expect(spec).not.toBeNull();
    expect(spec?.fn.name).toBe("twoSum");
    expect(spec?.examples).toHaveLength(1);
    expect(spec?.tests).toHaveLength(1);
    expect(spec?.stress).toBeUndefined();
  });

  it("getSolutionPage returns the solution sections in order", async () => {
    const page = await getSolutionPage("lc-test-two-sum");
    expect(page?.sections.map((s) => s.slot)).toEqual(["solution", "solution"]);
    expect(page?.sections[1].blocks[0].code.cpp).toContain("twoSum");
  });
});

describe("courses and lessons", () => {
  it("listCourses returns each course with its lesson summaries", async () => {
    const list = await listCourses();
    expect(list).toEqual([{ row: sampleCourse().row, lessons: [sampleLesson().row] }]);
  });

  it("getCourse returns one course with its lessons, unknown is null", async () => {
    expect(await getCourse("sd")).toEqual({ row: sampleCourse().row, lessons: [sampleLesson().row] });
    expect(await getCourse("nope")).toBeNull();
    expect(cacheTag).toHaveBeenCalledWith("content", "course:sd");
  });

  it("getLesson returns the lesson with its page, unknown is null", async () => {
    expect(await getLesson("sd-caching")).toEqual(sampleLesson());
    expect(await getLesson("nope")).toBeNull();
  });
});

describe("docs", () => {
  it("listDocs and getDoc read the stored docs", async () => {
    expect(await listDocs("reading")).toEqual([sampleDoc().row]);
    expect(await getDoc("reading", "main")).toEqual(sampleDoc());
    expect(await getDoc("reading", "nope")).toBeNull();
    expect(cacheTag).toHaveBeenCalledWith("content", "docs:reading");
  });
});

describe("version and assets", () => {
  it("getContentVersionCached reports the change count and the schema version", async () => {
    const v = await getContentVersionCached();
    expect(v).toEqual({ version: await getContentVersion(db), schema: 1, epoch: 1 });
    expect(v.version).toBe(4);
    expect(cacheTag).toHaveBeenCalledWith("content", "content-version");
  });

  it("getAssetFile returns the stored bytes and mime, unknown is null", async () => {
    const asset = await getAssetFile(assetId);
    expect(asset?.mime).toBe("image/png");
    expect(Array.from(asset?.bytes ?? [])).toEqual([137, 80, 78, 71]);
    expect(await getAssetFile("0".repeat(64))).toBeNull();
  });
});
