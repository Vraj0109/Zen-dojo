import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revOf } from "@habit/shared";
import { getContentDb, resetContentDbForTests } from "@/lib/content-db/client";
import { getContentVersion } from "@/lib/content-db/meta";
import { sampleCourse, sampleDoc, sampleLesson, sampleProblem } from "@/lib/content-db/fixtures";
import { putAsset, upsertCourse, upsertDoc, upsertLesson, upsertProblem } from "@/lib/content-db/write";
import { GET as versionGET } from "./version/route";
import { GET as problemsGET } from "./problems/route";
import { GET as problemGET } from "./problems/[id]/route";
import { GET as coursesGET } from "./courses/route";
import { GET as courseGET } from "./courses/[id]/route";
import { GET as lessonGET } from "./lessons/[id]/route";
import { GET as docsGET } from "./docs/[kind]/route";
import { GET as docGET } from "./docs/[kind]/[id]/route";
import { GET as assetGET } from "./assets/[id]/route";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

// connection() only works inside a real request; the routes call it first to stay dynamic. Tests have no request.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

const IMMUTABLE = "public, max-age=31536000, immutable";
const BASE = "http://localhost";
const PROBLEM = "/api/content/problems/lc-test-two-sum";

let assetId: string;
let version: number;

/** Route context for dynamic segments (Next passes params as a promise). */
const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) }) as never;
const get = (path: string, headers: Record<string, string> = {}) => new Request(BASE + path, { headers });

beforeEach(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  const db = await getContentDb();
  await db.transaction(async (tx) => {
    await upsertProblem(tx, sampleProblem(), "test");
    await upsertCourse(tx, sampleCourse(), "test");
    await upsertLesson(tx, sampleLesson(), "test");
    await upsertDoc(tx, sampleDoc(), "test");
    assetId = (await putAsset(tx, new Uint8Array([137, 80, 78, 71]), "image/png", "test")).id;
  });
  version = await getContentVersion(db);
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("GET /api/content/version", () => {
  it("returns the version with a 30 second public cache", async () => {
    const res = await versionGET(get("/api/content/version"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=30, s-maxage=30");
    expect(await res.json()).toEqual({ version, schema: 1, epoch: 1 });
  });

  it("answers 304 to a matching If-None-Match", async () => {
    const first = await versionGET(get("/api/content/version"));
    const etag = first.headers.get("ETag") ?? "";
    const res = await versionGET(get("/api/content/version", { "If-None-Match": etag }));
    expect(res.status).toBe(304);
  });
});

describe("versioned entity URLs", () => {
  it("a current ?v= is immutable, with the entity rev as ETag", async () => {
    const res = await problemGET(get(`${PROBLEM}?v=${version}`), params({ id: "lc-test-two-sum" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(IMMUTABLE);
    expect(res.headers.get("ETag")).toBe(`"${revOf(sampleProblem())}"`);
    expect(await res.json()).toEqual(JSON.parse(JSON.stringify(sampleProblem())));
  });

  it("an old ?v= redirects to the current version with no-store", async () => {
    const res = await problemGET(get(`${PROBLEM}?v=0`), params({ id: "lc-test-two-sum" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(`${PROBLEM}?v=${version}`);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("a missing ?v= redirects to the current version", async () => {
    const res = await courseGET(get("/api/content/courses/sd"), params({ id: "sd" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(`/api/content/courses/sd?v=${version}`);
  });

  it("If-None-Match with the same ETag answers 304 with no body", async () => {
    const etag = `"${revOf(sampleProblem())}"`;
    const res = await problemGET(get(`${PROBLEM}?v=${version}`, { "If-None-Match": etag }), params({ id: "lc-test-two-sum" }));
    expect(res.status).toBe(304);
    expect(res.headers.get("Cache-Control")).toBe(IMMUTABLE);
    expect(await res.text()).toBe("");
  });

  it("an unknown id answers 404 with no-store, even with a current v", async () => {
    const res = await problemGET(get(`/api/content/problems/nope?v=${version}`), params({ id: "nope" }));
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("an unknown lesson answers 404", async () => {
    const res = await lessonGET(get(`/api/content/lessons/nope?v=${version}`), params({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("lesson and course routes serve their entity", async () => {
    const lesson = await lessonGET(get(`/api/content/lessons/sd-caching?v=${version}`), params({ id: "sd-caching" }));
    expect(lesson.status).toBe(200);
    expect(await lesson.json()).toEqual(JSON.parse(JSON.stringify(sampleLesson())));
    const course = await courseGET(get(`/api/content/courses/sd?v=${version}`), params({ id: "sd" }));
    expect(course.status).toBe(200);
    expect((await course.json()).lessons).toHaveLength(1);
  });
});

describe("list routes", () => {
  it("the problem list is summaries only, with a version ETag", async () => {
    const res = await problemsGET(get(`/api/content/problems?v=${version}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toBe(`"list-${version}"`);
    const text = await res.text();
    expect(text).not.toContain("Given an array");
    expect(JSON.parse(text)).toHaveLength(1);
  });

  it("the course and doc lists redirect when v is missing", async () => {
    const courses = await coursesGET(get("/api/content/courses"));
    expect(courses.status).toBe(302);
    expect(courses.headers.get("Location")).toBe(`/api/content/courses?v=${version}`);
    const docs = await docsGET(get("/api/content/docs/reading", {}), params({ kind: "reading" }));
    expect(docs.status).toBe(302);
  });

  it("an unknown doc kind is 404", async () => {
    const res = await docsGET(get(`/api/content/docs/not-a-kind?v=${version}`), params({ kind: "not-a-kind" }));
    expect(res.status).toBe(404);
    const one = await docGET(get(`/api/content/docs/not-a-kind/x?v=${version}`), params({ kind: "not-a-kind", id: "x" }));
    expect(one.status).toBe(404);
  });

  it("a doc serves its body", async () => {
    const res = await docGET(get(`/api/content/docs/reading/main?v=${version}`), params({ kind: "reading", id: "main" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(IMMUTABLE);
    expect(await res.json()).toEqual(JSON.parse(JSON.stringify(sampleDoc())));
  });
});

describe("GET /api/content/assets/<id>", () => {
  it("serves the stored mime with nosniff and an immutable cache", async () => {
    const res = await assetGET(get(`/api/content/assets/${assetId}`), params({ id: assetId }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toBe(IMMUTABLE);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it("answers 304 to If-None-Match and 404 for a bad or unknown id", async () => {
    const hit = await assetGET(get(`/api/content/assets/${assetId}`, { "If-None-Match": `"${assetId}"` }), params({ id: assetId }));
    expect(hit.status).toBe(304);
    expect((await assetGET(get("/api/content/assets/nope"), params({ id: "nope" }))).status).toBe(404);
    expect((await assetGET(get(`/api/content/assets/${"0".repeat(64)}`), params({ id: "0".repeat(64) }))).status).toBe(404);
  });
});
