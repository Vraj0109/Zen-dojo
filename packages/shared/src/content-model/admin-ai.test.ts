import { describe, expect, it } from "vitest";
import {
  buildAdminPrompt,
  MAX_PROMPT_CHARS,
  modesFor,
  parseAiAnswer,
  type AdminPromptContext,
  type AiTarget,
} from "./admin-ai";
import type { ProblemRow, SlotDef } from "./types";

describe("modesFor", () => {
  it("hides improve, fix-format, and shorter for empty fields", () => {
    const emptyTargets: AiTarget[] = [
      "hints",
      "problem-statement",
      "problem-constraints",
      "course-summary",
      "text-block",
    ];
    for (const target of emptyTargets) {
      const modesEmptyStr = modesFor(target, "");
      const modesNull = modesFor(target, null);
      const modesEmptyArr = modesFor(target, []);

      expect(modesEmptyStr).not.toContain("improve");
      expect(modesEmptyStr).not.toContain("fix-format");
      expect(modesEmptyStr).not.toContain("shorter");
      expect(modesEmptyStr).toContain("write");

      expect(modesNull).not.toContain("improve");
      expect(modesEmptyArr).not.toContain("improve");
    }
  });

  it("includes improve, fix-format, shorter for non-empty fields", () => {
    const modes = modesFor("hints", ["1. First hint", "2. Second hint"]);
    expect(modes).toContain("improve");
    expect(modes).toContain("fix-format");
    expect(modes).toContain("shorter");
    expect(modes).not.toContain("write");
  });

  it("offers target-specific modes", () => {
    const testCasesEmpty = modesFor("test-cases", "");
    expect(testCasesEmpty).toContain("more-edge-cases");

    const codeModes = modesFor("code-block", "class Solution {}");
    expect(codeModes).toContain("write-optimal");
    expect(codeModes).toContain("write-brute");
    expect(codeModes).toContain("explain-complexity");
    expect(codeModes).toContain("add-language:python");

    const diagramModes = modesFor("diagram-block", "graph TD");
    expect(diagramModes).toContain("draw-from-text");
  });
});

describe("buildAdminPrompt", () => {
  const dummyProblemRow: ProblemRow = {
    id: "lc-1",
    source: "leetcode",
    title: "Two Sum",
    difficulty: "easy",
    pattern: "hash-map",
    url: null,
    kind: "function",
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
    inputFormatMd: null,
    outputFormatMd: null,
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
    complexity: "O(n)",
    extra: {},
  };

  const dummySlot: SlotDef = {
    key: "hints",
    heading: "Hints",
    purpose: "Progressive conceptual hints leading to the optimal algorithm",
    required: true,
    sections: "one",
    allowedBlocks: ["markdown"],
    rules: ["Never reveal code in hints", "Smallest nudge first"],
  };

  const sampleContext: AdminPromptContext = {
    problem: {
      row: dummyProblemRow,
      cases: [
        { ord: 0, role: "example", input: [[2, 7, 11, 15], 9], output: [0, 1], explanationMd: "2 + 7 = 9" },
        { ord: 1, role: "test", input: [[3, 2, 4], 6], output: [1, 2], explanationMd: null },
      ],
      hints: [{ ord: 0, bodyMd: "Can you use a hash map?" }],
    },
    course: { id: "dsa", title: "Data Structures & Algorithms" },
    lesson: { id: "dsa-hash-map", title: "Hash Map Pattern" },
    slot: dummySlot,
  };

  const allTargets: AiTarget[] = [
    "problem-statement",
    "problem-constraints",
    "test-cases",
    "hints",
    "solution-page",
    "code-block",
    "text-block",
    "diagram-block",
    "section",
    "lesson-page",
    "course-summary",
    "doc",
  ];

  it("contains the six required parts in order for every target", () => {
    for (const target of allTargets) {
      const prompt = buildAdminPrompt({
        target,
        mode: "write",
        context: sampleContext,
        slot: dummySlot,
        current: "Some existing content",
      });

      const parts = [
        "## Task",
        "## Where this goes",
        "## Context",
        "## Current content",
        "## Rules",
        "## Answer format",
      ];

      let lastIndex = -1;
      for (const part of parts) {
        const at = prompt.indexOf(part);
        expect(at, `Target ${target} missing part "${part}"`).toBeGreaterThan(-1);
        expect(at, `Target ${target} part "${part}" out of order`).toBeGreaterThan(lastIndex);
        lastIndex = at;
      }

      // Slot rules included
      expect(prompt).toContain("Never reveal code in hints");
      expect(prompt).toContain("Smallest nudge first");

      // Strict output instruction included
      expect(prompt).toContain("Reply with only one fenced block in this format, nothing before or after it.");
    }
  });

  it("renders 'empty' under current content when field is empty", () => {
    const prompt = buildAdminPrompt({
      target: "hints",
      mode: "write",
      context: sampleContext,
      current: "",
    });
    expect(prompt).toContain("## Current content\nempty");
  });

  it("code prompts include templateFor(spec, lang)", () => {
    const promptCpp = buildAdminPrompt({
      target: "code-block",
      mode: "write-optimal",
      context: {
        ...sampleContext,
        lang: "cpp",
      },
    });

    expect(promptCpp).toContain("Judge Template (cpp):");
    expect(promptCpp).toContain("vector<int> twoSum(vector<int>& nums, int target)");

    const promptJava = buildAdminPrompt({
      target: "code-block",
      mode: "write-optimal",
      context: {
        ...sampleContext,
        lang: "java",
      },
    });

    expect(promptJava).toContain("Judge Template (java):");
    expect(promptJava).toContain("public int[] twoSum(int[] nums, int target)");
  });

  it("add-language includes the other languages' code", () => {
    const prompt = buildAdminPrompt({
      target: "code-block",
      mode: "add-language:python",
      context: {
        ...sampleContext,
        lang: "python",
        otherLanguages: {
          cpp: "class Solution { public: vector<int> twoSum(...) {} };",
          java: "class Solution { public int[] twoSum(...) {} }",
        },
      },
    });

    expect(prompt).toContain("Existing implementations in other languages:");
    expect(prompt).toContain("class Solution { public: vector<int> twoSum(...) {} };");
    expect(prompt).toContain("class Solution { public int[] twoSum(...) {} }");
  });

  it("clipping keeps the whole prompt under 24,000 characters and notes cuts", () => {
    // Generate large text context exceeding 30,000 chars
    const hugeText = "Large context content line ".repeat(1500);
    const prompt = buildAdminPrompt({
      target: "text-block",
      mode: "improve",
      context: {
        ...sampleContext,
        surroundingText: hugeText,
      },
      current: "Some draft text",
    });

    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    expect(prompt).toContain("cut for length under 24,000 characters");
  });
});

describe("parseAiAnswer", () => {
  const dummyProblemRow: ProblemRow = {
    id: "two-sum",
    source: "leetcode",
    title: "Two Sum",
    difficulty: "easy",
    pattern: "hash-map",
    url: null,
    kind: "function",
    constraints: ["2 <= nums.length <= 10^4"],
    inputFormatMd: null,
    outputFormatMd: null,
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
    complexity: "O(n)",
    extra: {},
  };

  const sampleContext: AdminPromptContext = {
    problem: {
      row: dummyProblemRow,
    },
    lesson: {
      id: "hash-map-lesson",
      title: "Hash Map Pattern",
      template: "concept",
    },
  };

  describe("hints target", () => {
    it("accepts clean numbered list", () => {
      const text = "1. First hint\n2. Second hint\n3. Third hint";
      const res = parseAiAnswer("hints", "write", text, sampleContext);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(3);
        expect((res.value as any)[0].bodyMd).toBe("First hint");
        expect((res.value as any)[1].bodyMd).toBe("Second hint");
      }
    });

    it("accepts answer wrapped in chatter with one fence and Windows line endings", () => {
      const text =
        "Here are the hints you asked for:\r\n```markdown\r\n1. First hint\r\n2. Second hint\r\n3. Third hint\r\n```\r\nLet me know if you need more!";
      const res = parseAiAnswer("hints", "write", text, sampleContext);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(3);
      }
    });

    it("rejects a hint list with code in it (fence inside a hint)", () => {
      const text =
        "1. Notice the pair sum.\n2. You can write code like:\n```cpp\nint diff = target - nums[i];\n```\n3. Use hash map.";
      const res = parseAiAnswer("hints", "write", text, sampleContext);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0]).toMatch(/code|fenced/i);
      }
    });

    it("rejects a fenced hint list that contains an inner code fence", () => {
      const text =
        "```markdown\n1. Notice the pair sum.\n2. You can write code like:\n```cpp\nint diff = target - nums[i];\n```\n3. Use hash map.\n```";
      const res = parseAiAnswer("hints", "write", text, sampleContext);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0]).toMatch(/code|fenced/i);
      }
    });
  });

  describe("test-cases target", () => {
    it("accepts clean JSON test cases matching parameter count", () => {
      const text = JSON.stringify([
        { input: [[2, 7, 11, 15], 9], output: [0, 1] },
        { input: [[3, 2, 4], 6], output: [1, 2] },
      ]);
      const res = parseAiAnswer("test-cases", "write", text, sampleContext);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(2);
      }
    });

    it("accepts test cases in chatter with one fence and Windows line endings", () => {
      const text =
        "Sure, here are test cases:\r\n```json\r\n[\r\n  { \"input\": [[2, 7, 11, 15], 9], \"output\": [0, 1] }\r\n]\r\n```\r\nHope this helps!";
      const res = parseAiAnswer("test-cases", "more-edge-cases", text, sampleContext);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(1);
      }
    });

    it("rejects invalid JSON", () => {
      const text = "```json\n[ { input: [[2, 7]], output: [0] } ]\n```";
      const res = parseAiAnswer("test-cases", "write", text, sampleContext);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0]).toContain("Invalid JSON");
      }
    });

    it("rejects wrong test arity against function signature", () => {
      // Function takes 2 params (nums, target), but case has 1 param
      const text = JSON.stringify([
        { input: [[2, 7, 11, 15], 9], output: [0, 1] },
        { input: [[3, 2, 4]], output: [1, 2] },
      ]);
      const res = parseAiAnswer("test-cases", "write", text, sampleContext);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors).toContain("Case 2 has 1 input but the function takes 2");
      }
    });
  });

  describe("diagram-block target", () => {
    it("accepts diagram inside ```mermaid fence", () => {
      const text = "```mermaid\nflowchart TD\n    A[Client] --> B[Server]\n```";
      const res = parseAiAnswer("diagram-block", "write", text);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toContain("flowchart TD");
      }
    });

    it("accepts diagram with chatter and Windows line endings", () => {
      const text =
        "Here is the diagram:\r\n```mermaid\r\nflowchart TD\r\n    A --> B\r\n```\r\nDiagram complete.";
      const res = parseAiAnswer("diagram-block", "draw-from-text", text);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe("flowchart TD\n    A --> B");
      }
    });

    it("rejects Mermaid answer without a ```mermaid fence", () => {
      const textNoFence = "flowchart TD\n    A --> B";
      const res1 = parseAiAnswer("diagram-block", "write", textNoFence);
      expect(res1.ok).toBe(false);
      if (!res1.ok) {
        expect(res1.errors[0]).toContain("```mermaid fence");
      }

      const textGenericFence = "```\nflowchart TD\n    A --> B\n```";
      const res2 = parseAiAnswer("diagram-block", "write", textGenericFence);
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.errors[0]).toContain("```mermaid fence");
      }
    });
  });

  describe("lesson-page & page markdown target", () => {
    it("accepts clean page matching template slots", () => {
      const text =
        "## Overview\n\nIntroductory explanation.\n\n## What to know\n\n### Key mechanism\n\nExplanation of key mechanism.\n\n## Interview questions\n\nQuestion 1";
      const res = parseAiAnswer("lesson-page", "write", text, sampleContext);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect((res.value as any).sections).toBeDefined();
      }
    });

    it("rejects a page answer with a heading not in the template", () => {
      const text = "## NonExistentSlotHeading\n\nSome invalid slot content.";
      const res = parseAiAnswer("lesson-page", "write", text, sampleContext);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0]).toMatch(/Unknown slot heading "NonExistentSlotHeading"/);
      }
    });
  });

  describe("code-block and other targets", () => {
    it("accepts fenced code block", () => {
      const text = "```cpp\nclass Solution {\npublic:\n    vector<int> twoSum() {}\n};\n```";
      const res = parseAiAnswer("code-block", "write-optimal", text);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toContain("class Solution");
      }
    });

    it("rejects text-block with top-level # heading", () => {
      const text = "# Heading 1\nSome paragraph.";
      const res = parseAiAnswer("text-block", "write", text);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0]).toContain("must not contain top-level '# ' headings");
      }
    });

    it("parses problem constraints into lines", () => {
      const text = "- 1 <= n <= 100\n- -10^9 <= val <= 10^9";
      const res = parseAiAnswer("problem-constraints", "write", text);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual(["1 <= n <= 100", "-10^9 <= val <= 10^9"]);
      }
    });

    it("parses doc JSON", () => {
      const text = "```json\n{ \"title\": \"Doc title\", \"tags\": [\"tag1\"] }\n```";
      const res = parseAiAnswer("doc", "write", text);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual({ title: "Doc title", tags: ["tag1"] });
      }
    });
  });
});
