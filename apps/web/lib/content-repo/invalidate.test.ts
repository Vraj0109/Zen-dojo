import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateTag, updateTag } from "next/cache";
import { contentTagsFor, expireContentTagsInAction, expireContentTagsInRoute } from "./invalidate";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

const updated = () => vi.mocked(updateTag).mock.calls.map((c) => c[0]).sort();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("expireContentTagsInAction", () => {
  it("a problem save expires exactly problem:<id>, problems and content-version", () => {
    const tags = expireContentTagsInAction([{ entity: "problem", id: "lc-1" }]);
    expect(updated()).toEqual(["content-version", "problem:lc-1", "problems"]);
    expect([...tags].sort()).toEqual(["content-version", "problem:lc-1", "problems"]);
  });

  it("a lesson save expires the lesson, its course, courses and the version", () => {
    expireContentTagsInAction([{ entity: "lesson", id: "sd-caching", courseId: "sd" }]);
    expect(updated()).toEqual(["content-version", "course:sd", "courses", "lesson:sd-caching"]);
  });

  it("a lesson that moves expires both its old and new course", () => {
    expireContentTagsInAction([
      { entity: "lesson", id: "sd-caching", courseId: "sd" },
      { entity: "lesson", id: "sd-caching", courseId: "ld" },
    ]);
    expect(updated()).toContain("course:sd");
    expect(updated()).toContain("course:ld");
  });

  it("a doc save expires doc:<kind>:<id>, docs:<kind> and the version", () => {
    expireContentTagsInAction([{ entity: "doc", id: "main", kind: "reading" }]);
    expect(updated()).toEqual(["content-version", "doc:reading:main", "docs:reading"]);
  });

  it("never calls revalidateTag", () => {
    expireContentTagsInAction([{ entity: "course", id: "sd" }]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("expireContentTagsInRoute", () => {
  it("expires each tag with { expire: 0 }", () => {
    expireContentTagsInRoute([{ entity: "problem", id: "lc-1" }]);
    const calls = vi.mocked(revalidateTag).mock.calls;
    expect(calls.map((c) => c[0]).sort()).toEqual(["content-version", "problem:lc-1", "problems"]);
    for (const c of calls) expect(c[1]).toEqual({ expire: 0 });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("contentTagsFor", () => {
  it("throws when a lesson has no courseId, so no tag is silently skipped", () => {
    expect(() => contentTagsFor([{ entity: "lesson", id: "sd-caching" }])).toThrow(/courseId/);
  });

  it("throws when a doc has no kind", () => {
    expect(() => contentTagsFor([{ entity: "doc", id: "main" }])).toThrow(/kind/);
  });
});
