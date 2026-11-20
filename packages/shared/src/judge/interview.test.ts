import { describe, expect, it } from "vitest";
// @ts-expect-error script helper has no types
import * as interviewScript from "../../../../scripts/interview.mjs";
import { INTERVIEW } from "./generated/interview";
import { JUDGE_PROBLEMS } from "./index";

const {
  parseFrontmatter,
  validateInterviewFile,
  renderGenerated,
  interviewGroupStatus,
  generateContext,
} = interviewScript;

function makeValidInterviewMd(id = "lc-1"): string {
  const sections = [
    "---",
    `id: ${id}`,
    "pattern: hash-map",
    "difficulty: easy",
    'optimal: "O(n) time, O(n) space"',
    "reviewed: false",
    "---",
    "## Clarify first",
    "When asked this question in an interview, clarify the core input and output requirements. " +
      "Ask whether the input array is sorted, whether multiple pairs can sum to the target, and what to return if no such pair exists. " +
      "Confirm that each input element may only be used once, and verify if negative numbers or zero are allowed in the array.",
    "## Examples to say out loud",
    "Walk through a simple example such as nums = [2, 7, 11, 15] with target = 9. " +
      "Say aloud that scanning 2 requires partner 7, which has not been seen yet, then scanning 7 finds 2 in the table. " +
      "Also state an edge case such as duplicate elements [3, 3] with target = 6 to show why indices matter.",
    "## Brute force",
    "Describe the brute force approach first: two nested loops that compare every pair of distinct elements (i, j). " +
      "Explain why it is correct: it exhaustively checks all n*(n-1)/2 pairs. " +
      "Its time complexity is O(n^2) and auxiliary space is O(1). " +
      "State clearly why you will not code it: the array can contain up to 10,000 numbers, making n^2 around 10^8 operations which times out.",
    "## The key observation",
    "For any element x at index i, the required complement is uniquely determined as target - x. " +
      "Instead of searching the rest of the array with an inner loop, store previously seen numbers in a hash map mapping each value to its index. " +
      "This reduces the complement lookup time from O(n) to expected O(1).",
    "## Optimal approach",
    "1. Initialize an empty hash map from number to its index in the array.\n" +
      "2. Iterate through the array index by index.\n" +
      "3. At index i, compute complement = target - nums[i].\n" +
      "4. Check if complement exists in the hash map. If found, return [map[complement], i].\n" +
      "5. If not found, insert nums[i] with index i into the map.\n" +
      "6. If the loop finishes without a pair, return an empty array.\n\n" +
      "Complexity: O(n) time because each hash map operation runs in average O(1) time over n elements, and O(n) space to store up to n elements.",
    "## Code walkthrough",
    "The core logic relies on querying the hash map before inserting the current element. " +
      "Looking up first guarantees that an element is never matched with itself. " +
      "When duplicate values appear, the lookup succeeds before the second value overwrites the first index in the map.",
    "## Test it out loud",
    "1. Standard case: nums = [2, 7, 11, 15], target = 9 -> returns indices [0, 1].\n" +
      "2. Pair at the end: nums = [3, 2, 4], target = 6 -> returns indices [1, 2].\n" +
      "3. Duplicate values: nums = [3, 3], target = 6 -> returns indices [0, 1].\n" +
      "4. Negative numbers: nums = [-1, -2, -3, -4], target = -5 -> returns indices [1, 2].",
    "## Common mistakes",
    "- Trying to use two pointers on an unsorted array without remembering that sorting destroys the original indices.\n" +
      "- Inserting all elements into the hash map before checking complements, which can accidentally pair an element with itself if target = 2 * nums[i].\n" +
      "- Forgetting that numbers can be negative or zero.",
    "## Further reading",
    "- [cp-algorithms hash table](https://cp-algorithms.com/data_structures/unordered_map.html)",
  ];
  return sections.join("\n\n");
}

describe("interview parser and checker", () => {
  const knownIds = new Set(Object.keys(JUDGE_PROBLEMS));

  it("parses valid frontmatter", () => {
    const md = makeValidInterviewMd("lc-1");
    const { frontmatter, body, error } = parseFrontmatter(md);
    expect(error).toBeNull();
    expect(frontmatter).toEqual({
      id: "lc-1",
      pattern: "hash-map",
      difficulty: "easy",
      optimal: "O(n) time, O(n) space",
      reviewed: "false",
    });
    expect(body).toContain("## Clarify first");
  });

  it("accepts a valid interview markdown file", () => {
    const md = makeValidInterviewMd("lc-1");
    const errors = validateInterviewFile({ id: "lc-1", name: "lc-1.md", content: md }, knownIds);
    expect(errors).toEqual([]);
  });

  it("rejects unknown problem id", () => {
    const md = makeValidInterviewMd("lc-999999");
    const errors: string[] = validateInterviewFile({ id: "lc-999999", name: "lc-999999.md", content: md }, knownIds);
    expect(errors.some((e: string) => e.includes("not a known problem id"))).toBe(true);
  });

  it("rejects missing frontmatter fields", () => {
    const md = `---
id: lc-1
pattern: hash-map
---
## Clarify first
Short`;
    const errors: string[] = validateInterviewFile({ id: "lc-1", name: "lc-1.md", content: md }, knownIds);
    expect(errors.some((e: string) => e.includes('frontmatter missing "difficulty"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('frontmatter missing "optimal"'))).toBe(true);
  });

  it("rejects missing required headings", () => {
    const md = makeValidInterviewMd("lc-1").replace("## Brute force", "## Not brute force");
    const errors: string[] = validateInterviewFile({ id: "lc-1", name: "lc-1.md", content: md }, knownIds);
    expect(errors.some((e: string) => e.includes('missing required heading "## Brute force"'))).toBe(true);
  });

  it("rejects headings out of order", () => {
    const md = makeValidInterviewMd("lc-1")
      .replace("## Clarify first", "TEMP_HEADING")
      .replace("## Brute force", "## Clarify first")
      .replace("TEMP_HEADING", "## Brute force");
    const errors: string[] = validateInterviewFile({ id: "lc-1", name: "lc-1.md", content: md }, knownIds);
    expect(errors.some((e: string) => e.includes("is out of order"))).toBe(true);
  });

  it("rejects forbidden phrases", () => {
    const md = makeValidInterviewMd("lc-1") + "\nAs an AI, I suggest this approach.";
    const errors: string[] = validateInterviewFile({ id: "lc-1", name: "lc-1.md", content: md }, knownIds);
    expect(errors.some((e: string) => e.includes('forbidden phrase "As an AI"'))).toBe(true);
  });

  it("rejects links outside Further reading", () => {
    const md = makeValidInterviewMd("lc-1").replace("Describe the brute force", "See https://example.com for brute force");
    const errors: string[] = validateInterviewFile({ id: "lc-1", name: "lc-1.md", content: md }, knownIds);
    expect(errors.some((e: string) => e.includes('links are only allowed under "## Further reading"'))).toBe(true);
  });

  it("rejects word counts outside 350-1100 words", () => {
    const md = `---
id: lc-1
pattern: hash-map
difficulty: easy
optimal: O(n)
reviewed: false
---
## Clarify first
Too short.`;
    const errors: string[] = validateInterviewFile({ id: "lc-1", name: "lc-1.md", content: md }, knownIds);
    expect(errors.some((e: string) => e.includes("word count"))).toBe(true);
  });

  it("renders generated interview bundle", () => {
    const md = makeValidInterviewMd("lc-1");
    const files = [{ id: "lc-1", name: "lc-1.md", content: md }];
    const code = renderGenerated(files);
    expect(code).toContain('export const INTERVIEW: Record<string, { md: string; optimal: string; reviewed: boolean }> =');
    expect(code).toContain('"lc-1": {');
    expect(code).toContain('optimal: "O(n) time, O(n) space"');
    expect(code).toContain("reviewed: false");
  });

  it("calculates group status correctly", () => {
    const md = makeValidInterviewMd("lc-1");
    const files = [{ id: "lc-1", name: "lc-1.md", content: md }];
    const status = interviewGroupStatus(["lc-1", "lc-2"], files);
    expect(status.total).toBe(2);
    expect(status.written).toBe(1);
    expect(status.reviewed).toBe(0);
    expect(status.missing).toEqual(["lc-2"]);
  });

  it("generates context text with all required problem elements", () => {
    const spec = JUDGE_PROBLEMS["lc-1"];
    const context = generateContext("lc-1", spec, { number: 1, slug: "two-sum", difficulty: "easy" }, { name: "Hash map", recognize: "Pairs" }, { java: "// Java code", python: "# Python code" });
    expect(context).toContain("# Two Sum (lc-1)");
    expect(context).toContain("LeetCode: #1 (two-sum)");
    expect(context).toContain("Difficulty: easy");
    expect(context).toContain("Pattern: Hash map");
    expect(context).toContain("Recognize: Pairs");
    expect(context).toContain("## Statement");
    expect(context).toContain("## Constraints");
    expect(context).toContain("## Examples");
    expect(context).toContain("## Tests (first 5)");
    expect(context).toContain("## Hints");
    expect(context).toContain("## Solution Idea");
    expect(context).toContain("## Solution Complexity");
    expect(context).toContain("## Reference C++ Code");
    expect(context).toContain("## Reference Java Code");
    expect(context).toContain("## Reference Python Code");
  });
});
