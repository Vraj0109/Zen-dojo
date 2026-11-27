import { describe, expect, it } from "vitest";
import { canonicalJson } from "./rev";
import { chunkPlan, validateSnapshotChunk } from "./snapshot";
import type { ContentEntity, ContentLesson, ContentProblem } from "./types";

function problem(id: string, hintText = "hint"): ContentEntity {
  const value: ContentProblem = {
    row: {
      id,
      source: "leetcode",
      title: id,
      difficulty: "easy",
      pattern: "hash-map",
      url: null,
      kind: "function",
      constraints: ["n"],
      inputFormatMd: null,
      outputFormatMd: null,
      fn: { name: "f", params: [{ name: "x", type: "int" }], returns: "int" },
      design: null,
      unordered: false,
      complexity: null,
      extra: {},
    },
    cases: [{ ord: 0, role: "example", input: [1], output: 2, explanationMd: null }],
    hints: [{ ord: 0, bodyMd: hintText }],
    statement: {
      template: "problem",
      sections: [
        {
          id: `${id}-st`,
          slot: "statement",
          ord: 0,
          title: null,
          blocks: [{ id: `${id}-b`, ord: 0, type: "markdown", body: "Text", caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
      ],
    },
    solution: {
      template: "problem",
      sections: [
        {
          id: `${id}-so`,
          slot: "solution",
          ord: 0,
          title: null,
          blocks: [
            { id: `${id}-c`, ord: 0, type: "code", body: "", caption: null, variant: "brute", label: "Brute", timeComplexity: null, spaceComplexity: null, assetId: null, code: { cpp: "int main(){}" } },
          ],
        },
      ],
    },
  };
  return { kind: "problem", value };
}

function lesson(id: string): ContentEntity {
  const value: ContentLesson = {
    row: { id, courseId: "sd", ord: 1, title: id, template: "concept", meta: {} },
    page: { template: "concept", sections: [] },
  };
  return { kind: "lesson", value };
}

const PNG = "iVBORw0KGgo=";

describe("validateSnapshotChunk", () => {
  it("accepts a valid chunk and returns it typed", () => {
    const chunk = { entities: [problem("lc-1"), lesson("sd-a"), { kind: "course", value: { row: { id: "sd", area: "study", title: "SD", summaryMd: "", ord: 1, data: {} } } }, { kind: "doc", value: { row: { kind: "reading", id: "r1", body: [] } } }], assets: [{ id: "a1", mime: "image/png", base64: PNG, width: 1, height: null }] };
    const res = validateSnapshotChunk(JSON.parse(JSON.stringify(chunk)));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.entities).toHaveLength(4);
  });

  it("rejects a non-object and missing arrays", () => {
    const a = validateSnapshotChunk(null);
    expect(a.ok).toBe(false);
    const b = validateSnapshotChunk({});
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.errors).toEqual(["$.entities: expected an array", "$.assets: expected an array"]);
  });

  it("reports the JSON path of a bad field", () => {
    const bad = JSON.parse(JSON.stringify({ entities: [problem("lc-1")], assets: [] }));
    bad.entities[0].value.statement.sections[0].blocks[0].type = "video";
    bad.entities[0].value.hints[0].bodyMd = 5;
    const res = validateSnapshotChunk(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toContain("$.entities[0].value.statement.sections[0].blocks[0].type: expected one of markdown, code, diagram, image");
      expect(res.errors).toContain("$.entities[0].value.hints[0].bodyMd: expected a string");
    }
  });

  it("rejects an unknown entity kind, template, code language and asset mime", () => {
    const bad = JSON.parse(
      JSON.stringify({
        entities: [{ kind: "video", value: {} }, { kind: "lesson", value: { row: { id: "x", courseId: "c", ord: 1, title: "t", template: "poster", meta: {} }, page: { template: "concept", sections: [] } } }],
        assets: [{ id: "a", mime: "image/gif", base64: "", width: null, height: null }],
      }),
    );
    const res = validateSnapshotChunk(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.startsWith("$.entities[0].kind:"))).toBe(true);
      expect(res.errors.some((e) => e.startsWith("$.entities[1].value.row.template:"))).toBe(true);
      expect(res.errors.some((e) => e.startsWith("$.assets[0].mime:"))).toBe(true);
    }
  });

  it("rejects a code language the app does not know", () => {
    const bad = JSON.parse(JSON.stringify({ entities: [problem("lc-1")], assets: [] }));
    bad.entities[0].value.solution.sections[0].blocks[0].code = { cobol: "x" };
    const res = validateSnapshotChunk(bad);
    expect(res.ok).toBe(false);
  });
});

describe("chunkPlan", () => {
  const entities = Array.from({ length: 10 }, (_, i) => problem(`lc-${i}`, "h".repeat(200 + i)));

  it("keeps order, loses nothing, and keeps each group under the limit", () => {
    const maxBytes = 3000;
    const groups = chunkPlan(entities, maxBytes);
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.flat()).toEqual(entities);
    for (const g of groups) {
      expect(new TextEncoder().encode(canonicalJson(g)).length).toBeLessThanOrEqual(maxBytes);
    }
  });

  it("returns no groups for no entities", () => {
    expect(chunkPlan([], 100)).toEqual([]);
  });

  it("puts an entity larger than the limit in a group of its own", () => {
    const big = problem("big", "x".repeat(5000));
    const groups = chunkPlan([problem("a"), big, problem("b")], 1000);
    expect(groups.map((g) => g.length)).toEqual([1, 1, 1]);
    expect(groups[1][0]).toBe(big);
  });

  it("a group of one entity is the canonical JSON of that array", () => {
    const e = problem("only");
    const groups = chunkPlan([e], 1_000_000);
    expect(groups).toEqual([[e]]);
  });
});
