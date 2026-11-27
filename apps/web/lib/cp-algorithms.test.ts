import { describe, expect, it, vi } from "vitest";
import { fixtureDoc } from "./content-db/test-helpers";

// The pattern -> article map comes from the content database (the fixture holds three patterns of it).
const CP_ALGO_ARTICLES = fixtureDoc<Record<string, string[]>>("cp-algorithms");

vi.mock("server-only", () => ({}));

// The first call loads the syntax highlighter (13 grammars); give it room on a busy machine or CI runner.
vi.setConfig({ testTimeout: 30_000 });

describe("getCpAlgoArticles", () => {
  it("returns the mapped articles with html and a source link", async () => {
    const { getCpAlgoArticles } = await import("./cp-algorithms");
    const articles = await getCpAlgoArticles("string-matching");
    expect(articles.length).toBe(CP_ALGO_ARTICLES["string-matching"].length);
    for (const a of articles) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.html.length).toBeGreaterThan(500);
      expect(a.sourceUrl).toMatch(/^https:\/\/cp-algorithms\.com\/.+\.html$/);
    }
    expect(articles.map((a) => a.path)).toEqual(CP_ALGO_ARTICLES["string-matching"]);
  });

  it("renders math and strips scripts", async () => {
    const { getCpAlgoArticles } = await import("./cp-algorithms");
    const [a] = await getCpAlgoArticles("string-matching");
    expect(a.html).toContain('class="katex"');
    expect(a.html).not.toMatch(/<script/i);
    // code blocks use the app's colouring, not the plain markdown output
    expect(a.html).toContain('<pre class="code-block">');
    expect(a.html).not.toContain("<pre><code");
  });

  it("returns an empty list for patterns without articles or unknown ids", async () => {
    const { getCpAlgoArticles, cpAlgoCount } = await import("./cp-algorithms");
    expect(await getCpAlgoArticles("hash-map")).toEqual([]);
    expect(await getCpAlgoArticles("not-a-pattern")).toEqual([]);
    expect(await cpAlgoCount("hash-map")).toBe(0);
    expect(await cpAlgoCount("string-matching")).toBeGreaterThan(0);
  });

  it("has a content file for every mapped article", async () => {
    const { getCpAlgoArticles } = await import("./cp-algorithms");
    for (const id of Object.keys(CP_ALGO_ARTICLES)) {
      expect((await getCpAlgoArticles(id)).length, id).toBe(CP_ALGO_ARTICLES[id].length);
    }
  });
});
