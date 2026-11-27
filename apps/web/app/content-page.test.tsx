// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as React from "react";
import { prerender } from "react-dom/static";
import { TEMPLATES, type ContentPage as ContentPageData, type TemplateDef } from "@habit/shared";
import { ContentPage } from "./content-page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Renders a React tree to static HTML string via React 19 prerender stream. */
async function renderHtml(element: React.ReactNode): Promise<string> {
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

/** Parses rendered HTML string into a DOM element for querying. */
function parseDom(html: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

describe("ContentPage server component", () => {
  const mockPage: ContentPageData = {
    template: "concept",
    sections: [
      {
        id: "overview-1",
        slot: "overview",
        ord: 0,
        title: null,
        blocks: [
          {
            id: "b-md-1",
            ord: 0,
            type: "markdown",
            body: "This is an introductory overview of the concept.",
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
        id: "point-0",
        slot: "point:0",
        ord: 1,
        title: "Checklist Item 1: Core Mechanics",
        blocks: [
          {
            id: "b-md-2",
            ord: 0,
            type: "markdown",
            body: "Detailed explanation of the core mechanics.",
            caption: null,
            variant: null,
            label: null,
            timeComplexity: null,
            spaceComplexity: null,
            assetId: null,
            code: {},
          },
          {
            id: "b-diagram-1",
            ord: 1,
            type: "diagram",
            body: "flowchart TD\n    A[Start] --> B[Finish]",
            caption: "State flow diagram",
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
        id: "deeper-1",
        slot: "deeper",
        ord: 2,
        title: "Deep Dive: Implementation",
        blocks: [
          {
            id: "b-code-1",
            ord: 0,
            type: "code",
            body: "",
            caption: null,
            variant: "optimal",
            label: "Optimal approach",
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
            assetId: null,
            code: {
              cpp: "int solve() { return 42; }",
              python: "def solve(): return 42",
            },
          },
          {
            id: "b-img-1",
            ord: 1,
            type: "image",
            body: "Architectural blueprint",
            caption: "System structure visual",
            variant: null,
            label: null,
            timeComplexity: null,
            spaceComplexity: null,
            assetId: "asset-123",
            code: {},
          },
        ],
      },
    ],
  };

  it("walks template slots in order and prints slot headings", async () => {
    const html = await renderHtml(<ContentPage template="concept" page={mockPage} />);
    const dom = parseDom(html);

    const h2Elements = Array.from(dom.querySelectorAll("h2")).map((el) => el.textContent?.trim());
    // Concept slots: overview ("Overview"), point ("What to know"), deeper ("Go deeper")
    expect(h2Elements).toContain("Overview");
    expect(h2Elements).toContain("What to know");
    expect(h2Elements).toContain("Go deeper");

    // "Overview" must come before "What to know" which comes before "Go deeper"
    const overviewIdx = h2Elements.indexOf("Overview");
    const pointIdx = h2Elements.indexOf("What to know");
    const deeperIdx = h2Elements.indexOf("Go deeper");
    expect(overviewIdx).toBeLessThan(pointIdx);
    expect(pointIdx).toBeLessThan(deeperIdx);

    // Empty slots in the template (e.g. "Recap", "Interview questions", "Common mistakes") are not rendered
    expect(h2Elements).not.toContain("Recap");
    expect(h2Elements).not.toContain("Common mistakes");
  });

  it("renders section with id='s-<sectionId>' and prints section title", async () => {
    const html = await renderHtml(<ContentPage template="concept" page={mockPage} />);
    const dom = parseDom(html);

    const sec1 = dom.querySelector("#s-overview-1");
    expect(sec1).not.toBeNull();

    const sec2 = dom.querySelector("#s-point-0");
    expect(sec2).not.toBeNull();
    const h3Sec2 = sec2?.querySelector("h3");
    expect(h3Sec2?.textContent).toBe("Checklist Item 1: Core Mechanics");

    const sec3 = dom.querySelector("#s-deeper-1");
    expect(sec3).not.toBeNull();
    const h3Sec3 = sec3?.querySelector("h3");
    expect(h3Sec3?.textContent).toBe("Deep Dive: Implementation");
  });

  it("renders Markdown blocks", async () => {
    const html = await renderHtml(<ContentPage template="concept" page={mockPage} />);
    expect(html).toContain("This is an introductory overview of the concept.");
    expect(html).toContain("Detailed explanation of the core mechanics.");
  });

  it("renders Code blocks with SolutionTabs and labels", async () => {
    const html = await renderHtml(<ContentPage template="concept" page={mockPage} />);
    const dom = parseDom(html);

    // Block label
    expect(html).toContain("Optimal approach");
    // Tab labels
    expect(html).toContain("C++");
    expect(html).toContain("Python");
    // Code content is syntax-highlighted inside .code-block
    expect(dom.querySelector(".code-block")?.textContent).toContain("int solve() { return 42; }");
    // Complexity
    expect(html).toContain("Time: <!-- -->O(n)");
    expect(html).toContain("Space: <!-- -->O(1)");
  });

  it("renders Mermaid diagrams with caption", async () => {
    const html = await renderHtml(<ContentPage template="concept" page={mockPage} />);
    expect(html).toContain("flowchart TD");
    expect(html).toContain("State flow diagram");
  });

  it("renders images through assetUrl with alt and caption", async () => {
    const customAssetUrl = (id: string) => `https://cdn.example.com/assets/${id}.png`;
    const html = await renderHtml(<ContentPage template="concept" page={mockPage} assetUrl={customAssetUrl} />);
    const dom = parseDom(html);

    const img = dom.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://cdn.example.com/assets/asset-123.png");
    expect(img?.getAttribute("alt")).toBe("Architectural blueprint");

    const figcaption = img?.parentElement?.querySelector("figcaption");
    expect(figcaption?.textContent).toBe("System structure visual");
  });

  it("defaults template from page.template when template prop is omitted", async () => {
    const html = await renderHtml(<ContentPage page={mockPage} />);
    expect(html).toContain("Overview");
    expect(html).toContain("What to know");
  });

  it("accepts TemplateDef object as template prop", async () => {
    const customTpl: TemplateDef = TEMPLATES.concept;
    const html = await renderHtml(<ContentPage template={customTpl} page={mockPage} />);
    expect(html).toContain("Overview");
  });
});
