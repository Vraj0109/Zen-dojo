import { describe, expect, it } from "vitest";
import { markdownToPage, pageToMarkdown } from "./page-markdown";
import type { ContentPage, TemplateDef } from "./types";

const problemTemplate: TemplateDef = {
  id: "problem",
  title: "Problem Template",
  slots: [
    {
      key: "statement",
      heading: "Statement",
      purpose: "Problem description",
      required: true,
      sections: "one",
      allowedBlocks: ["markdown", "image", "diagram"],
      rules: [],
    },
    {
      key: "solution",
      heading: "Solution",
      purpose: "Solution approaches",
      required: true,
      sections: "one",
      allowedBlocks: ["markdown", "code", "diagram"],
      rules: [],
    },
  ],
};

const conceptTemplate: TemplateDef = {
  id: "concept",
  title: "Concept Template",
  slots: [
    {
      key: "overview",
      heading: "Overview",
      purpose: "Overview of the concept",
      required: true,
      sections: "one",
      allowedBlocks: ["markdown"],
      rules: [],
    },
    {
      key: "deeper",
      heading: "Go deeper",
      purpose: "Deep dive sections",
      required: false,
      sections: "many",
      allowedBlocks: ["markdown", "code", "diagram", "image"],
      rules: [],
    },
  ],
};

const articleTemplate: TemplateDef = {
  id: "article",
  title: "Article Template",
  slots: [
    {
      key: "body",
      heading: "Article Body",
      purpose: "Article contents",
      required: true,
      sections: "many",
      allowedBlocks: ["markdown", "code", "diagram", "image"],
      rules: [],
    },
  ],
};

function normalizeForComparison(page: ContentPage) {
  return {
    template: page.template,
    sections: page.sections.map((s) => ({
      slot: s.slot,
      title: s.title,
      blocks: s.blocks.map((b) => ({
        type: b.type,
        body: b.body,
        caption: b.caption,
        variant: b.variant,
        label: b.label,
        timeComplexity: b.timeComplexity,
        spaceComplexity: b.spaceComplexity,
        assetId: b.assetId,
        code: b.code,
      })),
    })),
  };
}

describe("page-markdown", () => {
  describe("round trip for every template using fixture pages", () => {
    it("round-trips a problem page with markdown, code, diagram, and image", () => {
      const page: ContentPage = {
        template: "problem",
        sections: [
          {
            id: "sec-stmt",
            slot: "statement",
            ord: 0,
            title: null,
            blocks: [
              {
                id: "b1",
                ord: 0,
                type: "markdown",
                body: "Given an array of integers nums and an integer target, return indices.",
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
                type: "image",
                body: "Sample array diagram",
                caption: "Initial array state",
                variant: null,
                label: null,
                timeComplexity: null,
                spaceComplexity: null,
                assetId: "asset-12345",
                code: {},
              },
            ],
          },
          {
            id: "sec-sol",
            slot: "solution",
            ord: 1,
            title: null,
            blocks: [
              {
                id: "b3",
                ord: 0,
                type: "markdown",
                body: "### Intuition\nUse a hash table to look up complements in O(1) time.",
                caption: null,
                variant: null,
                label: null,
                timeComplexity: null,
                spaceComplexity: null,
                assetId: null,
                code: {},
              },
              {
                id: "b4",
                ord: 1,
                type: "diagram",
                body: "flowchart LR\n  A[Number] --> B{Map has target - x?}\n  B -->|Yes| C[Return indices]",
                caption: "Lookup flowchart",
                variant: null,
                label: null,
                timeComplexity: null,
                spaceComplexity: null,
                assetId: null,
                code: {},
              },
              {
                id: "opt",
                ord: 2,
                type: "code",
                body: "",
                caption: null,
                variant: "optimal",
                label: "Hash Table",
                timeComplexity: "O(n)",
                spaceComplexity: "O(n)",
                assetId: null,
                code: {
                  cpp: "vector<int> twoSum(vector<int>& nums, int target) {\n  return {};\n}",
                  java: "class Solution {\n  public int[] twoSum(int[] nums, int target) {\n    return new int[0];\n  }\n}",
                },
              },
            ],
          },
        ],
      };

      const md = pageToMarkdown(problemTemplate, page);
      const parsed = markdownToPage(problemTemplate, md);

      expect(parsed.errors).toBeUndefined();
      expect(parsed.page).toBeDefined();
      expect(normalizeForComparison(parsed.page!)).toEqual(normalizeForComparison(page));
    });

    it("round-trips a concept page with repeating sections", () => {
      const page: ContentPage = {
        template: "concept",
        sections: [
          {
            id: "sec-ov",
            slot: "overview",
            ord: 0,
            title: null,
            blocks: [
              {
                id: "b1",
                ord: 0,
                type: "markdown",
                body: "Cache invalidation is one of the two hard things in Computer Science.",
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
            id: "sec-d1",
            slot: "deeper",
            ord: 1,
            title: "Write-through vs Write-back",
            blocks: [
              {
                id: "b2",
                ord: 0,
                type: "markdown",
                body: "In a write-through cache, writes are synchronous to both cache and storage.",
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
            id: "sec-d2",
            slot: "deeper",
            ord: 2,
            title: "TTL and Eviction",
            blocks: [
              {
                id: "b3",
                ord: 0,
                type: "diagram",
                body: "flowchart TD\n  Client --> Cache\n  Cache --> DB",
                caption: "Cache flow",
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

      const md = pageToMarkdown(conceptTemplate, page);
      const parsed = markdownToPage(conceptTemplate, md);

      expect(parsed.errors).toBeUndefined();
      expect(normalizeForComparison(parsed.page!)).toEqual(normalizeForComparison(page));
    });

    it("round-trips an article page", () => {
      const page: ContentPage = {
        template: "article",
        sections: [
          {
            id: "sec-a1",
            slot: "body",
            ord: 0,
            title: "Introduction to Raft",
            blocks: [
              {
                id: "b1",
                ord: 0,
                type: "markdown",
                body: "Raft is a consensus algorithm designed for understandability.",
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

      const md = pageToMarkdown(articleTemplate, page);
      const parsed = markdownToPage(articleTemplate, md);

      expect(parsed.errors).toBeUndefined();
      expect(normalizeForComparison(parsed.page!)).toEqual(normalizeForComparison(page));
    });
  });

  describe("multi-language code block via block=", () => {
    it("groups fences with identical block= into one code block", () => {
      const md = `## Solution

\`\`\`cpp {block=mycode variant=optimal label="Optimal Solution" time="O(n)" space="O(1)"}
int solve() { return 42; }
\`\`\`

\`\`\`java {block=mycode}
class Solution { int solve() { return 42; } }
\`\`\`

\`\`\`python {block=mycode}
def solve(): return 42
\`\`\`
`;
      const res = markdownToPage(problemTemplate, md);
      // statement is required so error for missing statement
      expect(res.errors).toBeDefined();
    });

    it("correctly groups multi-language block when required slots exist", () => {
      const md = `## Statement

Problem statement here.

## Solution

\`\`\`cpp {block=opt variant=optimal label="Optimal" time="O(n)" space="O(1)"}
int solve() { return 1; }
\`\`\`

\`\`\`java {block=opt}
int solve() { return 1; }
\`\`\`

\`\`\`python {block=opt}
def solve(): return 1
\`\`\`
`;
      const res = markdownToPage(problemTemplate, md);
      expect(res.errors).toBeUndefined();
      const solSection = res.page!.sections.find((s) => s.slot === "solution")!;
      expect(solSection.blocks).toHaveLength(1);

      const codeBlock = solSection.blocks[0];
      expect(codeBlock.type).toBe("code");
      expect(codeBlock.variant).toBe("optimal");
      expect(codeBlock.label).toBe("Optimal");
      expect(codeBlock.timeComplexity).toBe("O(n)");
      expect(codeBlock.spaceComplexity).toBe("O(1)");
      expect(codeBlock.code).toEqual({
        cpp: "int solve() { return 1; }",
        java: "int solve() { return 1; }",
        python: "def solve(): return 1",
      });
    });

    it("treats fences without block= as separate one-language code blocks", () => {
      const md = `## Statement

Problem.

## Solution

\`\`\`cpp
int a = 1;
\`\`\`

\`\`\`java
int b = 2;
\`\`\`
`;
      const res = markdownToPage(problemTemplate, md);
      expect(res.errors).toBeUndefined();
      const solSection = res.page!.sections.find((s) => s.slot === "solution")!;
      expect(solSection.blocks).toHaveLength(2);
      expect(solSection.blocks[0].code).toEqual({ cpp: "int a = 1;" });
      expect(solSection.blocks[1].code).toEqual({ java: "int b = 2;" });
    });
  });

  describe("diagram caption and image lines", () => {
    it("parses diagram caption", () => {
      const md = `## Statement

Problem.

## Solution

\`\`\`mermaid {caption="Architecture Overview"}
flowchart LR
  A --> B
\`\`\`
`;
      const res = markdownToPage(problemTemplate, md);
      expect(res.errors).toBeUndefined();
      const solSec = res.page!.sections.find((s) => s.slot === "solution")!;
      expect(solSec.blocks[0].type).toBe("diagram");
      expect(solSec.blocks[0].caption).toBe("Architecture Overview");
      expect(solSec.blocks[0].body).toBe("flowchart LR\n  A --> B");
    });

    it("parses image line with and without caption", () => {
      const md = `## Statement

![First Image](asset:asset-1 "First Caption")

![Second Image](asset:asset-2)

## Solution

Plain text solution.
`;
      const res = markdownToPage(problemTemplate, md);
      expect(res.errors).toBeUndefined();
      const stmtSec = res.page!.sections.find((s) => s.slot === "statement")!;
      expect(stmtSec.blocks).toHaveLength(2);

      expect(stmtSec.blocks[0]).toMatchObject({
        type: "image",
        body: "First Image",
        assetId: "asset-1",
        caption: "First Caption",
      });

      expect(stmtSec.blocks[1]).toMatchObject({
        type: "image",
        body: "Second Image",
        assetId: "asset-2",
        caption: null,
      });
    });
  });

  describe("line-numbered errors", () => {
    it("reports misspelled ## heading with the exact line number", () => {
      const md = `## Statement

Valid statement.

## Solutuon

Misspelled heading.
`;
      const res = markdownToPage(problemTemplate, md);
      expect(res.page).toBeUndefined();
      expect(res.errors).toBeDefined();
      const headingErr = res.errors!.find((e) => e.message.includes("Unknown slot heading"));
      expect(headingErr).toBeDefined();
      expect(headingErr!.line).toBe(5);
    });

    it("reports missing required slot with line 1", () => {
      const md = `## Statement

Only statement present.
`;
      const res = markdownToPage(problemTemplate, md);
      expect(res.page).toBeUndefined();
      expect(res.errors).toBeDefined();
      const missingErr = res.errors!.find((e) => e.message.includes('Missing required slot "Solution"'));
      expect(missingErr).toBeDefined();
      expect(missingErr!.line).toBe(1);
    });

    it("reports unclosed code fence with the line number where fence started", () => {
      const md = `## Statement

Statement.

## Solution

\`\`\`cpp
int x = 1;
// Notice fence is never closed
`;
      const res = markdownToPage(problemTemplate, md);
      expect(res.page).toBeUndefined();
      expect(res.errors).toBeDefined();
      const unclosedErr = res.errors!.find((e) => e.message.includes("Unclosed code fence"));
      expect(unclosedErr).toBeDefined();
      expect(unclosedErr!.line).toBe(7);
    });

    it("reports disallowed block type with its line number", () => {
      const md = `## Overview

\`\`\`mermaid
flowchart TD
  A --> B
\`\`\`
`;
      const res = markdownToPage(conceptTemplate, md);
      expect(res.page).toBeUndefined();
      expect(res.errors).toBeDefined();
      const blockErr = res.errors!.find((e) => e.message.includes('Block type "diagram" is not allowed'));
      expect(blockErr).toBeDefined();
      expect(blockErr!.line).toBe(3);
    });
  });
});
