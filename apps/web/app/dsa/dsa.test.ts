// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { prerender } from "react-dom/static";
import { ALL_PATTERNS, DSA_GROUPS } from "@habit/shared";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
  after: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dsa",
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
});
