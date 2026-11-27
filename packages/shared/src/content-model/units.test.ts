import { describe, expect, it } from "vitest";
import { unitsFor, unitsForChange } from "./units";
import type { ContentEntity, ContentLesson, ContentProblem } from "./types";

const problem = (pattern: string | null): ContentEntity => {
  const value: ContentProblem = {
    row: {
      id: "lc-1",
      source: "leetcode",
      title: "Two Sum",
      difficulty: "easy",
      pattern,
      url: null,
      kind: "function",
      constraints: [],
      inputFormatMd: null,
      outputFormatMd: null,
      fn: { name: "f", params: [], returns: "int" },
      design: null,
      unordered: false,
      complexity: null,
      extra: {},
    },
    cases: [],
    hints: [],
    statement: { template: "problem", sections: [] },
    solution: { template: "problem", sections: [] },
  };
  return { kind: "problem", value };
};

const lesson = (courseId: string): ContentEntity => {
  const value: ContentLesson = {
    row: { id: "sd-cache", courseId, ord: 1, title: "Caching", template: "concept", meta: {} },
    page: { template: "concept", sections: [] },
  };
  return { kind: "lesson", value };
};

describe("unitsFor", () => {
  it("maps a problem to its pattern, or to problems:other without one", () => {
    expect(unitsFor(problem("hash-map"))).toEqual(["problems:hash-map"]);
    expect(unitsFor(problem(null))).toEqual(["problems:other"]);
  });

  it("maps a lesson to its course", () => {
    expect(unitsFor(lesson("sd"))).toEqual(["course:sd"]);
  });

  it("maps a course row to its course", () => {
    expect(
      unitsFor({ kind: "course", value: { row: { id: "sd", area: "study", title: "SD", summaryMd: "", ord: 1, data: {} } } }),
    ).toEqual(["course:sd"]);
  });

  it("maps every doc to docs", () => {
    expect(unitsFor({ kind: "doc", value: { row: { kind: "reading", id: "r1", body: [] } } })).toEqual(["docs"]);
  });
});

describe("unitsForChange", () => {
  it("lists both units when a lesson moves between courses", () => {
    expect(unitsForChange(lesson("sd"), lesson("sys"))).toEqual(["course:sd", "course:sys"]);
  });

  it("lists both patterns when a problem changes pattern", () => {
    expect(unitsForChange(problem("dp"), problem("graph"))).toEqual(["problems:dp", "problems:graph"]);
  });

  it("is the unit of the one side on create or delete, and deduplicates", () => {
    expect(unitsForChange(null, lesson("sd"))).toEqual(["course:sd"]);
    expect(unitsForChange(lesson("sd"), null)).toEqual(["course:sd"]);
    expect(unitsForChange(lesson("sd"), lesson("sd"))).toEqual(["course:sd"]);
    expect(unitsForChange(null, null)).toEqual([]);
  });
});
