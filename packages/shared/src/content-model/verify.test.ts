import { describe, expect, it } from "vitest";
import {
  verifyContent,
  verifyEntity,
  REQUIRED_PATTERN_SECTIONS,
} from "./verify";
import type {
  ContentCourse,
  ContentDoc,
  ContentEntity,
  ContentLesson,
  ContentProblem,
  ContentSnapshot,
} from "./types";

function makeValidProblem(id = "lc-1"): ContentProblem {
  return {
    row: {
      id,
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
      extra: { brute: "same" },
    },
    cases: [
      { ord: 0, role: "example", input: [[2, 7, 11, 15], 9], output: [0, 1], explanationMd: "2 + 7 = 9" },
      { ord: 1, role: "test", input: [[3, 2, 4], 6], output: [1, 2], explanationMd: null },
    ],
    hints: [
      { ord: 0, bodyMd: "First hint: consider the complement." },
      { ord: 1, bodyMd: "Second hint: can you look up in O(1)?" },
      { ord: 2, bodyMd: "Third hint: use a hash map." },
    ],
    statement: {
      template: "problem",
      sections: [
        {
          id: `${id}-stmt`,
          slot: "statement",
          ord: 0,
          title: "Statement",
          blocks: [{ id: "b1", ord: 0, type: "markdown", body: "Given nums and target...", caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
      ],
    },
    solution: {
      template: "problem",
      sections: [
        {
          id: `${id}-sol`,
          slot: "solution",
          ord: 0,
          title: "Solution",
          blocks: [
            {
              id: "b-opt",
              ord: 0,
              type: "code",
              body: "",
              caption: null,
              variant: "optimal",
              label: "Optimal",
              timeComplexity: "O(n)",
              spaceComplexity: "O(n)",
              assetId: null,
              code: {
                cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};",
                java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}",
                python: "class Solution:\n    def twoSum(self, nums, target):\n        return []",
              },
            },
          ],
        },
      ],
    },
  };
}

function makeValidConceptLesson(id = "concept-caching"): ContentLesson {
  return {
    row: {
      id,
      courseId: "course-sd",
      ord: 0,
      title: "Caching Fundamentals",
      template: "concept",
      meta: {
        points: ["Cache hits and misses", "Eviction policies"],
      },
    },
    page: {
      template: "concept",
      sections: [
        {
          id: "s-overview",
          slot: "overview",
          ord: 0,
          title: "Overview",
          blocks: [
            {
              id: "b-ov",
              ord: 0,
              type: "markdown",
              body: "Caching is a core architectural technique to reduce latency and alleviate backend database load across distributed systems.",
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
          id: "s-explain-0",
          slot: "point:0",
          ord: 1,
          title: "Cache hits and misses",
          blocks: [
            {
              id: "b-pt0",
              ord: 0,
              type: "markdown",
              body: "When the application requests a key, a cache hit serves data immediately, while a cache miss falls back to disk or primary storage.",
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
          id: "s-explain-1",
          slot: "point:1",
          ord: 2,
          title: "Eviction policies",
          blocks: [
            {
              id: "b-pt1",
              ord: 0,
              type: "markdown",
              body: "Under memory pressure, caches evict entries using policies such as Least Recently Used (LRU) or Least Frequently Used (LFU).",
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
          id: "s-recap",
          slot: "recap",
          ord: 3,
          title: "Recap",
          blocks: [
            {
              id: "b-rc",
              ord: 0,
              type: "markdown",
              body: "- Caches store hot data in memory.\n- LRU evicts cold items first.\n- Invalidation prevents stale reads.",
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
          id: "s-deep-1",
          slot: "deeper",
          ord: 4,
          title: "Cache invalidation strategies",
          blocks: [{ id: "bd1", ord: 0, type: "markdown", body: "Write-through and write-back caches offer distinct consistency trade-offs. In write-through, data is written to the cache and the backing store synchronously, ensuring strong consistency at the cost of write latency.".repeat(2), caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
        {
          id: "s-deep-2",
          slot: "deeper",
          ord: 5,
          title: "Stampede prevention",
          blocks: [{ id: "bd2", ord: 0, type: "markdown", body: "Cache stampede occurs when high concurrency causes simultaneous misses on an expired key. Probabilistic early expiration or mutex locks protect backend databases from collapsing under load.".repeat(2), caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
        {
          id: "s-deep-3",
          slot: "deeper",
          ord: 6,
          title: "Near cache architectures",
          blocks: [{ id: "bd3", ord: 0, type: "markdown", body: "Near caches keep a small in-process cache on each client node, avoiding network roundtrips to Redis at the expense of needing distributed cache invalidation broadcasts.".repeat(2), caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
        {
          id: "s-deep-4",
          slot: "deeper",
          ord: 7,
          title: "Eviction algorithm internals",
          blocks: [{ id: "bd4", ord: 0, type: "markdown", body: "True LRU requires a doubly-linked list combined with a hash table. Approximated LRU samples random keys to preserve throughput while eliminating the synchronization bottleneck of list updates.".repeat(2), caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
        {
          id: "s-deep-5",
          slot: "deeper",
          ord: 8,
          title: "Hardware cache lines",
          blocks: [{ id: "bd5", ord: 0, type: "markdown", body: "Modern CPU architectures fetch memory in 64-byte cache lines. False sharing occurs when concurrent threads write to distinct variables located on the identical cache line.".repeat(2), caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
        {
          id: "s-questions",
          slot: "questions",
          ord: 9,
          title: null as unknown as string,
          blocks: [{ id: "bq1", ord: 0, type: "markdown", body: "How does a cache stay consistent with the database?", caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null, code: {} }],
        },
      ],
    },
  };
}

describe("verifyEntity - Problem", () => {
  it("passes for a valid problem", () => {
    const p = makeValidProblem();
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("catches missing optimal C++ code", () => {
    const p = makeValidProblem();
    p.solution.sections[0].blocks[0].code.cpp = "";
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes("missing optimal C++ solution"))).toBe(true);
  });

  it("catches missing brute force and no already optimal note", () => {
    const p = makeValidProblem();
    p.row.extra = {}; // remove brute: same
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes("missing brute force solution"))).toBe(true);
  });

  it("catches fewer than 3 hints", () => {
    const p = makeValidProblem();
    p.hints = p.hints.slice(0, 2);
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes("expected at least 3"))).toBe(true);
  });

  it("catches test case input arity mismatch", () => {
    const p = makeValidProblem();
    p.cases[0].input = [1]; // Function takes 2 params
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes("inputs but function takes 2"))).toBe(true);
  });

  it("catches forbidden calls in solution code", () => {
    const p = makeValidProblem();
    p.solution.sections[0].blocks[0].code.python = "import subprocess\nsubprocess.run(['ls'])";
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes('forbidden call "subprocess"'))).toBe(true);
  });

  it("catches misplaced skip-stress in python", () => {
    const p = makeValidProblem();
    p.solution.sections[0].blocks[0].code.python = "class Solution:\n    # verify: skip-stress\n    pass";
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes("only allowed as first line"))).toBe(true);
  });

  it("catches code larger than 40 KB", () => {
    const p = makeValidProblem();
    p.solution.sections[0].blocks[0].code.cpp = "x".repeat(41 * 1024);
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes("exceeds 40 KB limit"))).toBe(true);
  });

  it("validates interview walkthrough rules", () => {
    const p = makeValidProblem();
    p.row.extra = {
      ...p.row.extra,
      interviewMd: `## Clarify first\nSome text.\n## Examples to say out loud\nSome examples.\nAs an AI, I suggest this.`,
    };
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.some((i) => i.message.includes('forbidden phrase "As an AI"'))).toBe(true);
    expect(issues.some((i) => i.message.includes("missing required heading"))).toBe(true);
  });
});

describe("verifyEntity - Concept Lesson", () => {
  it("passes for a valid concept lesson", () => {
    const l = makeValidConceptLesson();
    const issues = verifyEntity({ kind: "lesson", value: l });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("catches overview shorter than 40 characters", () => {
    const l = makeValidConceptLesson();
    l.page.sections[0].blocks[0].body = "Too short.";
    const issues = verifyEntity({ kind: "lesson", value: l });
    expect(issues.some((i) => i.message.includes("overview must be at least 40 characters"))).toBe(true);
  });

  it("catches out-of-order point explanations", () => {
    const l = makeValidConceptLesson();
    // Swap slot point:0 and point:1
    l.page.sections[1].slot = "point:1";
    l.page.sections[2].slot = "point:0";
    const issues = verifyEntity({ kind: "lesson", value: l });
    expect(issues.some((i) => i.message.includes("comes after point"))).toBe(true);
  });

  it("catches duplicate deeper section titles", () => {
    const l = makeValidConceptLesson();
    l.page.sections[5].title = l.page.sections[4].title;
    const issues = verifyEntity({ kind: "lesson", value: l });
    expect(issues.some((i) => i.message.includes("Duplicate deeper section title"))).toBe(true);
  });

  it("catches title case in deeper section titles", () => {
    const l = makeValidConceptLesson();
    l.page.sections[4].title = "Cache Invalidation Strategies Distributed Systems";
    const issues = verifyEntity({ kind: "lesson", value: l });
    expect(issues.some((i) => i.message.includes("must use sentence case"))).toBe(true);
  });
});

describe("verifyEntity - Pattern Article", () => {
  function makeValidPatternArticle(): ContentLesson {
    const longProse = "Detailed pattern explanation text with sufficient depth, technical clarity, and rigorous algorithmic reasoning. ".repeat(15);
    const sections = REQUIRED_PATTERN_SECTIONS.map((title, ord) => ({
      id: `sec-${ord}`,
      slot: "sections",
      ord: ord + 1,
      title,
      blocks: [
        {
          id: `blk-${ord}`,
          ord: 0,
          type: (ord === 3 || ord === 4 ? "code" : "markdown") as any,
          body: ord === 7
            ? "Practice order: two-sum, 3sum, 4sum are essential problems that reinforce this invariant across various constraints and edge case distributions in technical interviews."
            : longProse,
          caption: null,
          variant: null,
          label: null,
          timeComplexity: null,
          spaceComplexity: null,
          assetId: null,
          code: ord === 3 || ord === 4 ? { cpp: "int patternTemplate() { return 0; }\n// More code lines\n// More lines\n" } : {},
        },
      ],
    }));

    return {
      row: {
        id: "pattern-two-pointers",
        courseId: "course-dsa",
        ord: 0,
        title: "Two Pointers Pattern",
        template: "article",
        meta: {},
      },
      page: {
        template: "article",
        sections: [
          {
            id: "sec-intro",
            slot: "intro",
            ord: 0,
            title: null as unknown as string,
            blocks: [
              {
                id: "blk-intro",
                ord: 0,
                type: "markdown",
                body: "Two pointers solve many array problems by moving two indices through sorted or constrained data, which avoids nested loops and keeps the work linear.",
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
          ...sections,
        ],
      },
    };
  }

  it("passes for a valid pattern article", () => {
    const a = makeValidPatternArticle();
    const issues = verifyEntity({ kind: "lesson", value: a });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("catches missing required outline sections", () => {
    const a = makeValidPatternArticle();
    a.page.sections.splice(2, 1); // remove "Why it works" (index 0 is the intro)
    const issues = verifyEntity({ kind: "lesson", value: a });
    expect(issues.some((i) => i.message.includes('missing required section "Why it works"'))).toBe(true);
  });
});

describe("verifyEntity - Doc", () => {
  it("passes for a valid reading doc", () => {
    const doc: ContentDoc = {
      row: {
        kind: "reading",
        id: "ddia",
        body: {
          url: "https://dataintensive.net",
          items: ["concept-caching"],
        },
      },
    };
    const issues = verifyEntity({ kind: "doc", value: doc });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("catches non-https or shortener URLs", () => {
    const docHttp: ContentDoc = {
      row: {
        kind: "reading",
        id: "http-link",
        body: { url: "http://example.com" },
      },
    };
    expect(verifyEntity({ kind: "doc", value: docHttp }).some((i) => i.message.includes("must be HTTPS"))).toBe(true);

    const docShort: ContentDoc = {
      row: {
        kind: "reading",
        id: "short-link",
        body: { url: "https://bit.ly/12345" },
      },
    };
    expect(verifyEntity({ kind: "doc", value: docShort }).some((i) => i.message.includes("URL shortener"))).toBe(true);
  });
});

describe("verifyContent - Snapshot Cross-Checks", () => {
  it("verifies a valid snapshot", () => {
    const course: ContentCourse = {
      row: { id: "course-sd", area: "sd", title: "System Design", summaryMd: "SD Course summary", ord: 0, data: {} },
    };
    const lesson = makeValidConceptLesson();
    const problem = makeValidProblem();

    const snapshot: ContentSnapshot = {
      schema: 1,
      version: 1,
      entities: [
        { kind: "course", value: course },
        { kind: "lesson", value: lesson },
        { kind: "problem", value: problem },
      ],
      assets: [],
    };

    const issues = verifyContent(snapshot, { checkRoadmapFocus: false });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("catches lesson referencing a non-existent courseId", () => {
    const lesson = makeValidConceptLesson();
    lesson.row.courseId = "non-existent-course";

    const snapshot: ContentSnapshot = {
      schema: 1,
      version: 1,
      entities: [{ kind: "lesson", value: lesson }],
      assets: [],
    };

    const issues = verifyContent(snapshot, { checkRoadmapFocus: false });
    expect(issues.some((i) => i.message.includes('non-existent courseId "non-existent-course"'))).toBe(true);
  });

  it("catches duplicate entity keys", () => {
    const problem1 = makeValidProblem("lc-1");
    const problem2 = makeValidProblem("lc-1");

    const snapshot: ContentSnapshot = {
      schema: 1,
      version: 1,
      entities: [
        { kind: "problem", value: problem1 },
        { kind: "problem", value: problem2 },
      ],
      assets: [],
    };

    const issues = verifyContent(snapshot, { checkRoadmapFocus: false });
    expect(issues.some((i) => i.message.includes('Duplicate entity key "problem:lc-1"'))).toBe(true);
  });

  it("catches missing referenced assetId", () => {
    const problem = makeValidProblem();
    problem.solution.sections[0].blocks[0].assetId = "missing-asset-id";

    const snapshot: ContentSnapshot = {
      schema: 1,
      version: 1,
      entities: [{ kind: "problem", value: problem }],
      assets: [],
    };

    const issues = verifyContent(snapshot, { checkRoadmapFocus: false });
    expect(issues.some((i) => i.message.includes('non-existent assetId "missing-asset-id"'))).toBe(true);
  });
});

describe("verify severity and shapes (wave 3)", () => {
  it("a missing brute force solution is a warning, not an error", () => {
    const p = makeValidProblem();
    p.row.extra = {};
    const issues = verifyEntity({ kind: "problem", value: p });
    const brute = issues.filter((i) => i.message.includes("missing brute force solution"));
    expect(brute.length).toBe(1);
    expect(brute[0].level).toBe("warning");
  });

  it("fewer than 3 hints is a warning", () => {
    const p = makeValidProblem();
    p.hints = p.hints.slice(0, 1);
    const issues = verifyEntity({ kind: "problem", value: p });
    expect(issues.find((i) => i.message.includes("expected at least 3"))?.level).toBe("warning");
  });

  it("a section in a slot the concept template does not have is an error", () => {
    const l = makeValidConceptLesson();
    l.page.sections.push({ ...l.page.sections[0], id: "s-bogus", slot: "bogus", title: "Bogus" });
    const issues = verifyEntity({ kind: "lesson", value: l });
    expect(issues.some((i) => i.level === "error" && i.message.includes('unknown slot "bogus"'))).toBe(true);
  });

  it("a missing required slot is an error", () => {
    const l = makeValidConceptLesson();
    l.page.sections = l.page.sections.filter((s) => s.slot !== "questions");
    const issues = verifyEntity({ kind: "lesson", value: l });
    expect(issues.some((i) => i.level === "error" && i.message.includes('required slot "questions" is missing'))).toBe(true);
  });

  it("checks every entry of the reading list (the doc body is an array)", () => {
    const doc: ContentDoc = {
      row: {
        kind: "reading",
        id: "main",
        body: [
          { id: "ok", url: "https://example.com/a", items: [] },
          { id: "plain", url: "http://example.com/b", items: [] },
        ],
      },
    };
    const issues = verifyEntity({ kind: "doc", value: doc });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(issues.some((i) => i.level === "warning" && i.message.includes("must be HTTPS") && i.message.includes("plain"))).toBe(true);
    expect(issues.some((i) => i.message.includes('"undefined"'))).toBe(false);
  });
});
