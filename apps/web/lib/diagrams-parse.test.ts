// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { allDiagrams } from "../../../packages/shared/src/learn/diagram-sources";

// Parses every diagram in the learning content with Mermaid itself, so a bad diagram fails here and not in the browser.
describe("diagram syntax", () => {
  it("every diagram parses", async () => {
    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({ startOnLoad: false });
    const bad: string[] = [];
    for (const { where, source } of allDiagrams()) {
      try {
        await mermaid.parse(source);
      } catch (e) {
        bad.push(`${where}: ${String(e).split("\n")[0]}`);
      }
    }
    expect(bad).toEqual([]);
  }, 60_000);
});
