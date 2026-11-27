import { describe, expect, it } from "vitest";
import {
  addBlock,
  addLanguage,
  addSection,
  duplicateBlock,
  moveBlock,
  moveSection,
  removeBlock,
  removeLanguage,
  removeSection,
  validatePageAgainstTemplate,
  validateProblemDraft,
  type ProblemDraft,
} from "./draft";
import type { ContentPage, TemplateDef } from "./types";

function validDraft(): ProblemDraft {
  return {
    row: {
      id: "two-sum",
      source: "leetcode",
      title: "Two Sum",
      difficulty: "easy",
      pattern: "two-pointers",
      url: "https://leetcode.com/problems/two-sum",
      kind: "function",
      constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
      inputFormatMd: "Array of integers and a target integer",
      outputFormatMd: "Indices of the two numbers",
      fn: {
        name: "twoSum",
        params: [
          { name: "nums", type: "int[]" },
          { name: "target", type: "int" },
        ],
        returns: "int[]",
      },
      design: null,
      unordered: false,
      complexity: "O(n) time, O(n) space",
      extra: {},
    },
    cases: [
      {
        ord: 0,
        role: "example",
        input: [[2, 7, 11, 15], 9],
        output: [0, 1],
        explanationMd: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        ord: 1,
        role: "test",
        input: [[3, 2, 4], 6],
        output: [1, 2],
        explanationMd: null,
      },
    ],
    hints: [
      { ord: 0, bodyMd: "A brute force approach would search all pairs." },
      { ord: 1, bodyMd: "Can you use a hash map to find the complement?" },
    ],
    statement: {
      template: "problem",
      sections: [
        {
          id: "sec-stmt",
          slot: "statement",
          ord: 0,
          title: null,
          blocks: [
            {
              id: "b-stmt-1",
              ord: 0,
              type: "markdown",
              body: "Given an array of integers nums and an integer target...",
              caption: null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: {},
            },
          ],
        },
      ],
    },
    solution: {
      template: "problem",
      sections: [
        {
          id: "sec-sol",
          slot: "solution",
          ord: 0,
          title: null,
          blocks: [
            {
              id: "b-sol-1",
              ord: 0,
              type: "code",
              body: "",
              caption: null,
              variant: "optimal",
              label: "Optimal Hash Map",
              timeComplexity: "O(n)",
              spaceComplexity: "O(n)",
              assetId: null,
              code: {
                cpp: "#include <vector>\nusing namespace std;\nvector<int> twoSum(...) {}",
              },
            },
          ],
        },
      ],
    },
  };
}

describe("validateProblemDraft", () => {
  it("passes for a valid draft", () => {
    const draft = validDraft();
    const result = validateProblemDraft(draft);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // 1. Slug (id)
  it("fails when id slug is invalid or empty", () => {
    const draft = validDraft();
    draft.row.id = "Two_Sum!";
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row.id = "-starts-with-hyphen";
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row.id = "a".repeat(41);
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row.id = "";
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("passes with valid slugs", () => {
    const draft = validDraft();
    draft.row.id = "lc-1";
    expect(validateProblemDraft(draft).ok).toBe(true);
  });

  // 2. Title
  it("fails when title is missing or exceeds 120 chars", () => {
    const draft = validDraft();
    draft.row.title = "";
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row.title = "   ";
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row.title = "A".repeat(121);
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("passes when title is valid (1 to 120 chars)", () => {
    const draft = validDraft();
    draft.row.title = "A".repeat(120);
    expect(validateProblemDraft(draft).ok).toBe(true);
  });

  // 3. Difficulty
  it("fails when difficulty is invalid or null", () => {
    const draft = validDraft();
    draft.row.difficulty = null;
    expect(validateProblemDraft(draft).ok).toBe(false);

    // @ts-expect-error test invalid string
    draft.row.difficulty = "extreme";
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("passes with easy, medium, or hard difficulty", () => {
    const draft = validDraft();
    draft.row.difficulty = "medium";
    expect(validateProblemDraft(draft).ok).toBe(true);
    draft.row.difficulty = "hard";
    expect(validateProblemDraft(draft).ok).toBe(true);
  });

  // 4. Source & Pattern
  it("fails when source or pattern exceeds limit", () => {
    const draft = validDraft();
    draft.row.source = "S".repeat(81);
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row = { ...validDraft().row, pattern: "P".repeat(61) };
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  // 5. Constraints
  it("fails when total constraints exceed 4000 characters", () => {
    const draft = validDraft();
    draft.row.constraints = ["C".repeat(4001)];
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  // 6. Function signature
  it("fails when function name is not an identifier or exceeds 60 chars", () => {
    const draft = validDraft();
    draft.row.fn.name = "123bad";
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row.fn.name = "a".repeat(61);
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("fails when return type is not in signature types", () => {
    const draft = validDraft();
    draft.row.fn.returns = "unknownType";
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("fails when parameter name or type is invalid", () => {
    const draft = validDraft();
    draft.row.fn.params = [{ name: "bad-name", type: "int" }];
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.row.fn.params = [{ name: "validName", type: "customStruct" }];
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  // 7. Test cases
  it("fails when test cases array is empty or lacks examples", () => {
    const draft = validDraft();
    draft.cases = [];
    expect(validateProblemDraft(draft).ok).toBe(false);

    // Only test cases, no example
    draft.cases = [
      { ord: 0, role: "test", input: [[1, 2], 3], output: [0, 1], explanationMd: null },
    ];
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("fails when test case input length does not match param count", () => {
    const draft = validDraft();
    // fn has 2 params, provide 1
    draft.cases[0].input = [[2, 7, 11, 15]];
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("fails when test case input or output has non-JSON values", () => {
    const draft = validDraft();
    draft.cases[0].input = [[2, NaN], 9];
    expect(validateProblemDraft(draft).ok).toBe(false);

    draft.cases[0].output = undefined;
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  // 8. Hints
  it("fails when hints exceed 20 or an individual hint exceeds 1000 chars", () => {
    const draft = validDraft();
    draft.hints = Array.from({ length: 21 }, (_, i) => ({ ord: i, bodyMd: "hint" }));
    expect(validateProblemDraft(draft).ok).toBe(false);

    const draft2 = validDraft();
    draft2.hints = [{ ord: 0, bodyMd: "H".repeat(1001) }];
    expect(validateProblemDraft(draft2).ok).toBe(false);
  });

  // 9. Blocks validation
  it("fails when solution lacks an optimal C++ code block", () => {
    const draft = validDraft();
    // Change variant from optimal to brute
    draft.solution.sections[0].blocks[0].variant = "brute";
    expect(validateProblemDraft(draft).ok).toBe(false);

    // Optimal variant with only java, no cpp
    const draft2 = validDraft();
    draft2.solution.sections[0].blocks[0].code = { java: "class Sol {}" };
    expect(validateProblemDraft(draft2).ok).toBe(false);
  });

  it("fails when a code block has no languages", () => {
    const draft = validDraft();
    draft.solution.sections[0].blocks.push({
      id: "b2",
      ord: 1,
      type: "code",
      body: "",
      caption: null,
      variant: "brute",
      label: "Brute Force",
      timeComplexity: "O(n^2)",
      spaceComplexity: "O(1)",
      assetId: null,
      code: {},
    });
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  it("fails when custom variant code block has no label", () => {
    const draft = validDraft();
    draft.solution.sections[0].blocks.push({
      id: "b-custom",
      ord: 1,
      type: "code",
      body: "",
      caption: null,
      variant: "custom",
      label: null,
      timeComplexity: null,
      spaceComplexity: null,
      assetId: null,
      code: { cpp: "void foo() {}" },
    });
    const result = validateProblemDraft(draft);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("requires a label"))).toBe(true);
  });

  it("passes when custom variant has a label", () => {
    const draft = validDraft();
    draft.solution.sections[0].blocks.push({
      id: "b-custom",
      ord: 1,
      type: "code",
      body: "",
      caption: null,
      variant: "custom",
      label: "Bit Manipulation",
      timeComplexity: null,
      spaceComplexity: null,
      assetId: null,
      code: { cpp: "void foo() {}" },
    });
    expect(validateProblemDraft(draft).ok).toBe(true);
  });

  it("fails when block label exceeds 60 characters", () => {
    const draft = validDraft();
    draft.solution.sections[0].blocks[0].label = "L".repeat(61);
    expect(validateProblemDraft(draft).ok).toBe(false);
  });

  // 10. Total size
  it("fails when problem draft exceeds 2 MB", () => {
    const draft = validDraft();
    // Attach 2.1 MB into explanation
    draft.cases[0].explanationMd = "X".repeat(2.2 * 1024 * 1024);
    const result = validateProblemDraft(draft);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("under 2 MB"))).toBe(true);
  });
});

describe("validatePageAgainstTemplate", () => {
  const testTemplate: TemplateDef = {
    id: "concept",
    title: "Concept Lesson",
    slots: [
      {
        key: "overview",
        heading: "Overview",
        purpose: "High-level summary",
        required: true,
        sections: "one",
        allowedBlocks: ["markdown"],
        rules: [],
      },
      {
        key: "deeper",
        heading: "Go deeper",
        purpose: "Detailed sections",
        required: false,
        sections: "many",
        allowedBlocks: ["markdown", "code", "diagram", "image"],
        rules: [],
      },
    ],
  };

  it("passes when all slots and block types conform to template", () => {
    const page: ContentPage = {
      template: "concept",
      sections: [
        {
          id: "sec-1",
          slot: "overview",
          ord: 0,
          title: null,
          blocks: [
            {
              id: "b1",
              ord: 0,
              type: "markdown",
              body: "Introduction text",
              caption: null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: {},
            },
          ],
        },
        {
          id: "sec-2",
          slot: "deeper",
          ord: 1,
          title: "Deep Dive 1",
          blocks: [
            {
              id: "b2",
              ord: 0,
              type: "code",
              body: "",
              caption: null,
              variant: "optimal",
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: { cpp: "int x = 1;" },
            },
          ],
        },
      ],
    };

    const result = validatePageAgainstTemplate(testTemplate, page);
    expect(result.ok).toBe(true);
  });

  it("fails when a required slot is missing", () => {
    const page: ContentPage = {
      template: "concept",
      sections: [],
    };

    const result = validatePageAgainstTemplate(testTemplate, page);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('Required slot "Overview"'))).toBe(true);
  });

  it("fails when a block type not allowed in a slot is present", () => {
    const page: ContentPage = {
      template: "concept",
      sections: [
        {
          id: "sec-1",
          slot: "overview",
          ord: 0,
          title: null,
          blocks: [
            {
              id: "b-code",
              ord: 0,
              type: "code", // overview only allows markdown
              body: "",
              caption: null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: { cpp: "int main() {}" },
            },
          ],
        },
      ],
    };

    const result = validatePageAgainstTemplate(testTemplate, page);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('Block type "code" is not allowed in slot "Overview"'))).toBe(true);
  });

  it("fails when a repeating slot section lacks a title", () => {
    const page: ContentPage = {
      template: "concept",
      sections: [
        {
          id: "sec-1",
          slot: "overview",
          ord: 0,
          title: null,
          blocks: [],
        },
        {
          id: "sec-2",
          slot: "deeper",
          ord: 1,
          title: null, // repeating slot requires title
          blocks: [],
        },
      ],
    };

    const result = validatePageAgainstTemplate(testTemplate, page);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("requires a title"))).toBe(true);
  });

  it("fails when a 'one' section slot has multiple sections", () => {
    const page: ContentPage = {
      template: "concept",
      sections: [
        { id: "sec-1", slot: "overview", ord: 0, title: null, blocks: [] },
        { id: "sec-2", slot: "overview", ord: 1, title: null, blocks: [] },
      ],
    };

    const result = validatePageAgainstTemplate(testTemplate, page);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("allows only one section"))).toBe(true);
  });
});

describe("Block and section operations", () => {
  function samplePage(): ContentPage {
    return {
      template: "concept",
      sections: [
        {
          id: "sec-1",
          slot: "deeper",
          ord: 0,
          title: "Section 1",
          blocks: [
            {
              id: "b1",
              ord: 0,
              type: "markdown",
              body: "First",
              caption: null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: {},
            },
            {
              id: "b2",
              ord: 1,
              type: "markdown",
              body: "Second",
              caption: null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: {},
            },
          ],
        },
        {
          id: "sec-2",
          slot: "deeper",
          ord: 1,
          title: "Section 2",
          blocks: [
            {
              id: "b3",
              ord: 0,
              type: "markdown",
              body: "Third",
              caption: null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: {},
            },
          ],
        },
      ],
    };
  }

  it("adds a block at start, middle, and end", () => {
    let page = samplePage();
    // Add at end
    page = addBlock(page, "sec-1", "code");
    expect(page.sections[0].blocks).toHaveLength(3);
    expect(page.sections[0].blocks[2].type).toBe("code");
    expect(page.sections[0].blocks[2].ord).toBe(2);

    // Add at index 0 (start)
    page = addBlock(page, "sec-1", "diagram", 0);
    expect(page.sections[0].blocks).toHaveLength(4);
    expect(page.sections[0].blocks[0].type).toBe("diagram");
    expect(page.sections[0].blocks[0].ord).toBe(0);

    // Add at index 2 (middle)
    page = addBlock(page, "sec-1", "image", 2);
    expect(page.sections[0].blocks).toHaveLength(5);
    expect(page.sections[0].blocks[2].type).toBe("image");
  });

  it("removes a block by id", () => {
    let page = samplePage();
    page = removeBlock(page, "b2");
    expect(page.sections[0].blocks.map((b) => b.id)).toEqual(["b1"]);
    expect(page.sections[0].blocks[0].ord).toBe(0);
  });

  it("duplicates a block with a new id right after the original", () => {
    const page = samplePage();
    const next = duplicateBlock(page, "b1");
    expect(next.sections[0].blocks).toHaveLength(3);
    expect(next.sections[0].blocks[0].id).toBe("b1");
    expect(next.sections[0].blocks[1].body).toBe("First");
    expect(next.sections[0].blocks[1].id).toMatch(/^new-\d+$/);
    expect(next.sections[0].blocks[2].id).toBe("b2");
  });

  describe("moveBlock", () => {
    it("moves a block within the same section", () => {
      let page = samplePage();
      // Move b2 up
      page = moveBlock(page, "b2", -1);
      expect(page.sections[0].blocks.map((b) => b.id)).toEqual(["b2", "b1"]);

      // Move b2 down
      page = moveBlock(page, "b2", 1);
      expect(page.sections[0].blocks.map((b) => b.id)).toEqual(["b1", "b2"]);
    });

    it("respects first and last edge limits within slot", () => {
      let page = samplePage();
      // b1 is the very first block in the slot; moving up does nothing
      page = moveBlock(page, "b1", -1);
      expect(page.sections[0].blocks.map((b) => b.id)).toEqual(["b1", "b2"]);

      // b3 is the very last block in the slot; moving down does nothing
      page = moveBlock(page, "b3", 1);
      expect(page.sections[1].blocks.map((b) => b.id)).toEqual(["b3"]);
    });

    it("moves across section boundaries inside one slot", () => {
      let page = samplePage();
      // Sec-1 has [b1, b2]. Sec-2 has [b3].
      // Move b2 down by 1 -> should cross into sec-2 as its first block!
      page = moveBlock(page, "b2", 1);
      expect(page.sections[0].blocks.map((b) => b.id)).toEqual(["b1"]);
      expect(page.sections[1].blocks.map((b) => b.id)).toEqual(["b2", "b3"]);

      // Move b2 up by 1 -> should cross back into sec-1 as its last block!
      page = moveBlock(page, "b2", -1);
      expect(page.sections[0].blocks.map((b) => b.id)).toEqual(["b1", "b2"]);
      expect(page.sections[1].blocks.map((b) => b.id)).toEqual(["b3"]);
    });
  });

  describe("section operations", () => {
    it("adds a section and removes a section", () => {
      let page = samplePage();
      page = addSection(page, "deeper", undefined, "Section 3");
      expect(page.sections).toHaveLength(3);
      expect(page.sections[2].title).toBe("Section 3");

      page = removeSection(page, page.sections[2].id);
      expect(page.sections).toHaveLength(2);
    });

    it("moves a section up and down within its slot", () => {
      let page = samplePage();
      page = moveSection(page, "sec-1", 1);
      expect(page.sections.map((s) => s.id)).toEqual(["sec-2", "sec-1"]);

      page = moveSection(page, "sec-1", -1);
      expect(page.sections.map((s) => s.id)).toEqual(["sec-1", "sec-2"]);
    });
  });

  describe("addLanguage and removeLanguage", () => {
    it("adds and removes languages from a code block", () => {
      const block = {
        id: "code-1",
        ord: 0,
        type: "code" as const,
        body: "",
        caption: null,
        variant: "optimal" as const,
        label: null,
        timeComplexity: null,
        spaceComplexity: null,
        assetId: null,
        code: { cpp: "int main() {}" },
      };

      const withJava = addLanguage(block, "java", "class Main {}");
      expect(withJava.code).toEqual({
        cpp: "int main() {}",
        java: "class Main {}",
      });

      const withoutCpp = removeLanguage(withJava, "cpp");
      expect(withoutCpp.code).toEqual({
        java: "class Main {}",
      });
    });
  });
});
