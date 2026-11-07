import { describe, expect, it } from "vitest";
import { allDiagrams } from "./diagram-sources";

const KEYWORDS = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram)\b/;

describe("diagrams", () => {
  it("are valid-looking Mermaid, short, and free of scripts", () => {
    for (const { where, source } of allDiagrams()) {
      expect(source.trim().length, where).toBeGreaterThan(0);
      expect(source.trim(), `${where}: must start with a Mermaid diagram keyword`).toMatch(KEYWORDS);
      expect(source.length, `${where}: too long`).toBeLessThanOrEqual(4000);
      expect(source, `${where}: no script`).not.toMatch(/<script/i);
    }
  });
});
