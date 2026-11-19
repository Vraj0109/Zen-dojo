// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { prerender } from "react-dom/static";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
  after: vi.fn(),
}));

import RoadmapPage from "./page";

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

describe("Roadmap page regression test", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", ":memory:");
  });

  it("renders the 16-week plan and phases", async () => {
    const page = RoadmapPage();
    const html = await renderToString(page);
    expect(html).toContain("Roadmap");
    expect(html).toContain("16-week plan");
    expect(html).toMatch(/Phase\s*(?:<!-- -->)?\s*1/);
    expect(html).toMatch(/Week\s*(?:<!-- -->)?\s*1/);
  });
});
