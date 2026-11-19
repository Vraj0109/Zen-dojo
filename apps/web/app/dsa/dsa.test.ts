// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { prerender } from "react-dom/static";

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

  const cases: [string, Record<string, string>][] = [
    ["default (patterns)", {}],
    ["patterns with open group", { group: "two-pointers" }],
    ["patterns with group=none", { group: "none" }],
    ["tab=all", { tab: "all" }],
    ["tab=all with page and sort", { tab: "all", page: "2", sort: "difficulty-asc" }],
    ["tab=all with filters", { tab: "all", q: "two", difficulty: "easy", status: "solved" }],
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
});
