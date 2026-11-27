// Hand-built content values for the content-db tests. Not imported by app code.
import type { BlockRow, ContentCourse, ContentDoc, ContentLesson, ContentProblem, SectionRow } from "@habit/shared";

function block(id: string, ord: number, type: BlockRow["type"], body: string, extra: Partial<BlockRow> = {}): BlockRow {
  return {
    id,
    ord,
    type,
    body,
    caption: null,
    variant: null,
    label: null,
    timeComplexity: null,
    spaceComplexity: null,
    assetId: null,
    code: {},
    ...extra,
  };
}

function section(id: string, slot: string, ord: number, title: string | null, blocks: BlockRow[]): SectionRow {
  return { id, slot, ord, title, blocks };
}

export function sampleProblem(): ContentProblem {
  return {
    row: {
      id: "lc-test-two-sum",
      source: "leetcode",
      title: "Two Sum",
      difficulty: "easy",
      pattern: "hash-map",
      url: "https://leetcode.com/problems/two-sum/",
      kind: "function",
      constraints: ["2 <= nums.length <= 10^4"],
      inputFormatMd: "An array and a target.",
      outputFormatMd: "Two indices.",
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
      extra: { description: "Find two numbers that add up to the target." },
    },
    cases: [
      { ord: 0, role: "example", input: [[2, 7, 11, 15], 9], output: [0, 1], explanationMd: "2 + 7 = 9." },
      { ord: 1, role: "test", input: [[3, 2, 4], 6], output: [1, 2], explanationMd: null },
    ],
    hints: [
      { ord: 0, bodyMd: "Store what you have seen." },
      { ord: 1, bodyMd: "Look up the complement." },
    ],
    statement: {
      template: "problem",
      sections: [section("stmt-two-sum-0", "statement", 0, null, [block("stmt-two-sum-b0", 0, "markdown", "Given an array of integers.")])],
    },
    solution: {
      template: "problem",
      sections: [
        section("sol-two-sum-0", "solution", 0, null, [block("sol-two-sum-b0", 0, "markdown", "Use a hash map.")]),
        section("sol-two-sum-1", "solution", 1, "Code", [
          block("sol-two-sum-b1", 0, "code", "", {
            variant: "optimal",
            label: "Optimal",
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
            code: { cpp: "vector<int> twoSum(vector<int>& nums, int target) { return {}; }", python: "class Solution:\n    def twoSum(self, nums, target):\n        return []" },
          }),
        ]),
      ],
    },
  };
}

export function sampleCourse(): ContentCourse {
  return { row: { id: "sd", area: "system-design", title: "System design", summaryMd: "Study notes.", ord: 2, data: { frameworks: ["CAP"] } } };
}

export function sampleLesson(): ContentLesson {
  return {
    row: {
      id: "sd-caching",
      courseId: "sd",
      ord: 3,
      title: "Caching",
      template: "concept",
      meta: { conceptId: "caching", difficulty: "medium", tags: ["cache"] },
    },
    page: {
      template: "concept",
      sections: [
        section("sd-caching-overview", "overview", 0, null, [
          block("sd-caching-b0", 0, "markdown", "A cache keeps hot data close."),
          block("sd-caching-b1", 1, "markdown", "Reads hit the cache first; misses go to the database."),
        ]),
        section("sd-caching-point-0", "point:0", 0, "Eviction", [block("sd-caching-b2", 0, "markdown", "LRU keeps recent items.")]),
        // A valid concept page (verify.ts): the Overview allows text only, and "Interview questions" is required.
        section("sd-caching-questions", "questions", 0, null, [block("sd-caching-b3", 0, "markdown", "When would you not cache?")]),
      ],
    },
  };
}

export function sampleDoc(): ContentDoc {
  return { row: { kind: "reading", id: "main", body: [{ title: "Example reading", url: "https://example.com/read" }] } };
}
