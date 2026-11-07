import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// The first call loads the syntax highlighter (13 grammars); give it room on a busy machine or CI runner.
vi.setConfig({ testTimeout: 30_000 });

describe("highlight", () => {
  it("colours C++ and escapes angle brackets", async () => {
    const { highlight } = await import("./highlight");
    const html = await highlight("vector<int> a = {1, 2};\nint x = a.size(); // note", "cpp");
    expect(html).toContain("<span");
    expect(html).toContain("&#x3C;int>");
    expect(html).not.toContain("<int>");
    expect(html.startsWith('<pre class="code-block">')).toBe(true);
  });
  it("returns plain escaped text for text", async () => {
    const { highlight } = await import("./highlight");
    const html = await highlight("a < b && c", "text");
    expect(html).not.toContain("<span");
    expect(html).toContain("a &lt; b &amp;&amp; c");
  });
  it("never throws on odd input", async () => {
    const { highlight } = await import("./highlight");
    await expect(highlight("", "java")).resolves.toContain("code-block");
    await expect(highlight("select 1;", "sql")).resolves.toContain("<span");
    await expect(highlight("x", "nope" as never)).resolves.toContain("code-block");
  });
});
