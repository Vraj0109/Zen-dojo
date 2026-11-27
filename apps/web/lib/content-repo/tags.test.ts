import { describe, expect, it } from "vitest";
import { tagsFor } from "./tags";

describe("tagsFor (plan 0114 cache tags)", () => {
  it.each([
    ["problem", "lc-1", {}, ["problem:lc-1", "problems", "content-version"]],
    ["course", "sd", {}, ["course:sd", "courses", "content-version"]],
    ["lesson", "sd-caching", { courseId: "sd" }, ["lesson:sd-caching", "course:sd", "courses", "content-version"]],
    ["doc", "main", { kind: "reading" }, ["doc:reading:main", "docs:reading", "content-version"]],
  ] as const)("%s %s", (entity, id, extra, expected) => {
    expect(tagsFor(entity, id, { ...extra })).toEqual(expected);
  });

  it("a lesson without courseId and a doc without kind throw", () => {
    expect(() => tagsFor("lesson", "x")).toThrow();
    expect(() => tagsFor("doc", "x")).toThrow();
  });
});
