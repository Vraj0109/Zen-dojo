import { describe, expect, it } from "vitest";
import { ALL_PATTERNS } from "./dsa";
import { CP_ALGO_ARTICLES, cpAlgoUrl } from "./cp-algorithms";

describe("cp-algorithms mapping", () => {
  const patternIds = new Set(ALL_PATTERNS.map((p) => p.id));

  it("references only real pattern ids from ALL_PATTERNS", () => {
    for (const id of Object.keys(CP_ALGO_ARTICLES)) {
      expect(patternIds.has(id), `Unknown pattern id: ${id}`).toBe(true);
    }
  });

  it("has non-empty article lists with no duplicates per pattern", () => {
    for (const [id, paths] of Object.entries(CP_ALGO_ARTICLES)) {
      expect(paths.length, `Empty articles for pattern: ${id}`).toBeGreaterThan(0);
      const set = new Set(paths);
      expect(set.size, `Duplicate article path in pattern: ${id}`).toBe(paths.length);
      for (const p of paths) {
        expect(p).not.toMatch(/\.md$/);
        expect(p).not.toMatch(/^\//);
      }
    }
  });

  it("builds the correct cp-algorithms website URL", () => {
    expect(cpAlgoUrl("graph/dijkstra")).toBe(
      "https://cp-algorithms.com/graph/dijkstra.html"
    );
  });
});
