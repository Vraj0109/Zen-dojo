// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { prerender } from "react-dom/static";
import { ALL_PATTERNS, DSA_GROUPS } from "@habit/shared";

vi.mock("@/lib/content-repo/lookups", async () => {
  const s = await import("@habit/shared");
  return {
    getStudyAreas: async () => s.STUDY_AREAS,
    getStudyArea: async (id: string) => s.STUDY_AREAS.find((a) => a.id === id),
    getAllConcepts: async () => s.ALL_CONCEPTS,
    getAllExercises: async () => s.ALL_EXERCISES,
    getRoadmapProblems: async () => s.PROBLEMS,
    getDsaGroups: async () => s.DSA_GROUPS,
    getAllPatterns: async () => s.ALL_PATTERNS,
  };
});

vi.mock("@/lib/content-repo/problems", async () => {
  const s = await import("@habit/shared");
  type SharedContent = typeof s & {
    INTERVIEW?: Record<string, { md?: string; optimal?: string }>;
    BRUTE?: Record<string, { cpp?: string; java?: string; python?: string }>;
  };
  const sc = s as unknown as SharedContent;
  return {
    getProblemSpec: async (id: string) => s.JUDGE_PROBLEMS[id] ?? null,
    getProblem: async (id: string) => {
      const spec = s.JUDGE_PROBLEMS[id];
      if (!spec) return null;
      const iv = sc.INTERVIEW?.[id];
      const brute = sc.BRUTE?.[id];
      return s.problemFromSpec(spec, {
        interviewMd: iv?.md,
        bruteSame: iv?.optimal === "brute: same",
        brute,
      });
    },
    getSolutionPage: async (id: string) => {
      const spec = s.JUDGE_PROBLEMS[id];
      if (!spec) return null;
      const iv = sc.INTERVIEW?.[id];
      const brute = sc.BRUTE?.[id];
      const problem = s.problemFromSpec(spec, {
        interviewMd: iv?.md,
        bruteSame: iv?.optimal === "brute: same",
        brute,
      });
      return problem.solution;
    },
    listProblemSummaries: async () => {
      return Object.values(s.JUDGE_PROBLEMS).map((p) => ({
        id: p.id,
        title: p.title,
        source: p.source,
        difficulty: p.difficulty,
        pattern: p.pattern ?? null,
        kind: p.kind ?? "function",
        languages: ["cpp"],
        hasBrute: false,
      }));
    },
  };
});

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
  after: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dsa",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import DsaPage from "./page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderToString(element: React.ReactNode): Promise<string> {
  const { prelude } = await prerender(element);
  const reader = prelude.getReader();
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    html += new TextDecoder().decode(value);
  }
  return html;
}

describe("Practice /dsa tabs and searchParams regression tests", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", ":memory:");
  });

  const cases: [string, Record<string, string | string[]>][] = [
    ["default (patterns)", {}],
    ["patterns with open group", { group: "two-pointers" }],
    ["tab=all", { tab: "all" }],
    ["tab=all with sort", { tab: "all", sort: "difficulty" }],
    ["tab=all with filters", { tab: "all", q: "two", difficulty: "easy" }],
    ["tab=resolve", { tab: "resolve" }],
    ["tab=other", { tab: "other" }],
    ["platforms=all", { platforms: "all" }],
  ];

  for (const [name, params] of cases) {
    it(`renders /dsa for ${name}`, async () => {
      const page = await DsaPage({ params: Promise.resolve({}), searchParams: Promise.resolve(params) });
      const html = await renderToString(page);
      expect(html).toContain("Practice");
    });
  }

  it("?tab=all renders every problem row without paging", async () => {
    const page = await DsaPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ tab: "all" }) });
    const html = await renderToString(page);
    expect(html).toContain("Two Sum");
    expect(html).toContain("rows are on this one page.");
  });

  it("an old ?page=3 is ignored", async () => {
    const page = await DsaPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ tab: "all", page: "3" }) });
    const html = await renderToString(page);
    expect(html).toContain("Two Sum");
    expect(html).toContain("Practice");
  });

  it("topic with two patterns filters correctly", async () => {
    const page = await DsaPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ tab: "all", topic: ["Hash map / counting", "Two pointers"] }),
    });
    const html = await renderToString(page);
    expect(html).toContain("Two Sum");
    expect(html).not.toContain("All 201 rows are on this one page.");
  });

  it("the patterns view renders all 10 group sections and every pattern tile", async () => {
    const page = await DsaPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
    const html = await renderToString(page);
    for (const g of DSA_GROUPS) {
      expect(html).toContain(g.title);
    }
    for (const p of ALL_PATTERNS) {
      expect(html).toContain(p.name);
    }
  });

  it("problem solution and hints tabs render correctly with walkthrough and fallback", async () => {
    const ProblemComponent = (await import("./[id]/page")).default;

    // Test with walkthrough (lc-1 has walkthrough in INTERVIEW)
    const pageWithWalkthrough = await ProblemComponent({
      params: Promise.resolve({ id: "lc-1" }),
      searchParams: Promise.resolve({ tab: "solution" }),
    });
    const html1 = await renderToString(pageWithWalkthrough);
    expect(html1).toContain("Try it yourself first");
    expect(html1).toContain("Optimal approach");
    expect(html1).toContain("Optimal");

    // Test with alias ?tab=interview
    const pageWithAlias = await ProblemComponent({
      params: Promise.resolve({ id: "lc-1" }),
      searchParams: Promise.resolve({ tab: "interview" }),
    });
    const htmlAlias = await renderToString(pageWithAlias);
    expect(htmlAlias).toContain("Try it yourself first");
    expect(htmlAlias).toContain("Optimal approach");

    // Test Hints tab: must show hints, but NOT "Show the solution"
    const hintsPage = await ProblemComponent({
      params: Promise.resolve({ id: "lc-1" }),
      searchParams: Promise.resolve({ tab: "help" }),
    });
    const htmlHints = await renderToString(hintsPage);
    expect(htmlHints).toContain("Open one hint at a time");
    expect(htmlHints).not.toContain("Show the solution");

    // Test problem without walkthrough (e.g. lc-37): should show fallback solution
    const pageWithoutWalkthrough = await ProblemComponent({
      params: Promise.resolve({ id: "lc-37" }),
      searchParams: Promise.resolve({ tab: "solution" }),
    });
    const html2 = await renderToString(pageWithoutWalkthrough);
    expect(html2).toContain("Try it yourself first");
    expect(html2).toContain("Complexity:");
  });
});
