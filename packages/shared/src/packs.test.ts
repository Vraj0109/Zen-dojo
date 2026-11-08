import { describe, expect, it } from "vitest";
import { inlineParts, matchesTy, packItems, packProblemSpec, parseMarkdown, validatePack } from "./packs";

// A small pack written inline (the full example in docs/examples is checked in apps/web/lib/packs.test.ts).
const sample = () => ({
  format: "prepwise-pack",
  version: 1,
  id: "sample-binary-search",
  title: "Binary search warm-up",
  description: "d",
  sections: [
    {
      title: "Start here",
      items: [
        { type: "lesson", id: "what-is-binary-search", title: "Lesson", markdown: "Binary search needs a yes/no question that flips once." },
        {
          type: "problem",
          id: "first-true",
          title: "First number at least target",
          statement: ["Return the first index with nums[i] >= target."],
          constraints: ["0 <= nums.length <= 100000"],
          fn: { name: "lowerBound", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int" },
          examples: [{ input: [[1, 3, 5, 7], 4], output: 2 }],
          tests: [
            { input: [[], 5], output: 0 },
            { input: [[5], 5], output: 0 },
            { input: [[5], 6], output: 1 },
            { input: [[1, 1, 1], 1], output: 0 },
            { input: [[1, 2, 2, 3], 2], output: 1 },
            { input: [[-5, -3, 0], -4], output: 1 },
          ],
          hints: ["h"],
          solution: { idea: ["i"], complexity: "O(log n)" },
        },
        {
          type: "problem",
          id: "integer-sqrt",
          title: "Integer square root",
          statement: ["Return the integer square root."],
          constraints: ["0 <= x"],
          fn: { name: "isqrt", params: [{ name: "x", type: "int" }], returns: "int" },
          examples: [{ input: [8], output: 2 }],
          tests: [{ input: [0], output: 0 }, { input: [1], output: 1 }, { input: [99], output: 9 }],
          hints: ["h"],
        },
      ],
    },
  ],
});
type Loose = any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("validatePack", () => {
  it("accepts the sample pack from the docs", () => {
    const r = validatePack(sample());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(packItems(r.pack).map((i) => i.id)).toEqual(["what-is-binary-search", "first-true", "integer-sqrt"]);
      expect(r.warnings.some((w) => w.includes("no solution given"))).toBe(true); // no solution given there
    }
  });

  it("says what is wrong, in words, with a path", () => {
    const p: Loose = sample();
    p.sections[0].items[1].tests[0].input = [[], "five"]; // wrong type for target
    p.sections[0].items[1].examples[0].input = [[1, 2]]; // wrong number of values
    p.sections[0].items[2].id = "first-true"; // duplicate id
    const r = validatePack(p);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join("\n")).toContain("tests[0].input[1] is not a valid int");
      expect(r.errors.join("\n")).toContain("examples[0].input has 1 values but the function takes 2");
      expect(r.errors.join("\n")).toContain("used twice");
    }
  });

  it("rejects bad ids, wrong format and unknown item types", () => {
    expect(validatePack(null).ok).toBe(false);
    expect(validatePack({ ...sample(), format: "other" }).ok).toBe(false);
    expect(validatePack({ ...sample(), id: "Bad Id" }).ok).toBe(false);
    const p: Loose = sample();
    p.sections[0].items[0].type = "video";
    expect(validatePack(p).ok).toBe(false);
  });

  it("checks values against the declared types", () => {
    expect(matchesTy([1, 2], "int[]")).toBe(true);
    expect(matchesTy([1.5], "int[]")).toBe(false);
    expect(matchesTy(3000000000, "int")).toBe(false);
    expect(matchesTy(3000000000, "long")).toBe(true);
    expect(matchesTy([1, null, 2], "tree")).toBe(true);
    expect(matchesTy([[1], [2, 3]], "int[][]")).toBe(true);
    expect(matchesTy(["a"], "string[][]")).toBe(false);
  });

  it("turns a pack problem into a runnable spec with a namespaced id", () => {
    const r = validatePack(sample());
    if (!r.ok) throw new Error("sample invalid");
    const item = packItems(r.pack).find((i) => i.id === "first-true");
    if (item?.type !== "problem") throw new Error("missing");
    const spec = packProblemSpec(item, r.pack.id);
    expect(spec.id).toBe("pack:sample-binary-search:first-true");
    expect(spec.fn.name).toBe("lowerBound");
    expect(spec.tests.length).toBe(6);
  });
});

describe("lesson markdown", () => {
  it("reads headings, lists, code fences and paragraphs", () => {
    const blocks = parseMarkdown("Intro line one\nline two\n\n## Title\n\n- a\n- b\n\n1. x\n2. y\n\n```cpp\nint x = 1;\n```\n");
    expect(blocks).toEqual([
      { type: "p", text: "Intro line one line two" },
      { type: "h", level: 2, text: "Title" },
      { type: "ul", items: ["a", "b"] },
      { type: "ol", items: ["x", "y"] },
      { type: "code", lang: "cpp", text: "int x = 1;" },
    ]);
  });

  it("keeps HTML as plain text and splits inline bold and code", () => {
    expect(parseMarkdown("<script>alert(1)</script>")).toEqual([{ type: "p", text: "<script>alert(1)</script>" }]);
    expect(inlineParts("a **b** and `c`")).toEqual([
      { kind: "text", text: "a " },
      { kind: "bold", text: "b" },
      { kind: "text", text: " and " },
      { kind: "code", text: "c" },
    ]);
  });
});
