import { describe, expect, it } from "vitest";
import { TAG, tagsFor } from "./tags";

describe("tagsFor", () => {
  it("a problem change expires its page, the lists and the version", () => {
    expect(tagsFor("problem", "lc-1")).toEqual(["problem:lc-1", "problems", "content-version"]);
  });

  it("a lesson change expires the lesson, its course, the course list and the version", () => {
    expect(tagsFor("lesson", "sd-cache", { courseId: "sd" })).toEqual([
      "lesson:sd-cache",
      "course:sd",
      "courses",
      "content-version",
    ]);
  });

  it("a course change expires the course, the course list and the version", () => {
    expect(tagsFor("course", "sd")).toEqual(["course:sd", "courses", "content-version"]);
  });

  it("a doc change expires the doc, its kind list and the version", () => {
    expect(tagsFor("doc", "r1", { kind: "reading" })).toEqual(["doc:reading:r1", "docs:reading", "content-version"]);
  });

  it("throws when a lesson has no course or a doc has no kind, instead of skipping a tag", () => {
    expect(() => tagsFor("lesson", "sd-cache")).toThrow();
    expect(() => tagsFor("doc", "r1")).toThrow();
  });

  it("TAG builds the same strings the table uses", () => {
    expect(TAG.problem("lc-1")).toBe("problem:lc-1");
    expect(TAG.doc("reading", "r1")).toBe("doc:reading:r1");
    expect(TAG.docs("reading")).toBe("docs:reading");
    expect(TAG.contentVersion).toBe("content-version");
  });
});
