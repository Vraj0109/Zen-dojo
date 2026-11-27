// @vitest-environment jsdom
// Render-level tests for the page editor (plan 0116 step 9, wave 3 AG12). No Testing Library is installed, so the
// tests mount the tree with react-dom/client and React's act, and dispatch DOM events directly.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEMPLATES,
  markdownToPage,
  pageToMarkdown,
  type BlockRow,
  type ContentPage,
  type SectionRow,
} from "@habit/shared";
import { PageEditor } from "./page-editor";

vi.mock("mermaid", () => ({
  default: { initialize: () => {}, render: async () => ({ svg: "<svg></svg>" }) },
}));
vi.mock("../actions", () => ({ previewAction: vi.fn(async () => ({ ok: false, errors: ["preview off"] })) }));
vi.mock("./actions", () => ({ uploadAssetAction: vi.fn(async () => ({ ok: false, error: "unused" })) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function render(node: React.ReactNode) {
  await act(async () => root.render(node));
}

function buttonsWithText(text: string): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll("button")).filter((b) => b.textContent?.trim() === text);
}

async function clickButton(text: string, index = 0) {
  const found = buttonsWithText(text)[index];
  if (!found) throw new Error(`No button "${text}" at ${index}`);
  await act(async () => found.click());
}

function blockEl(id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
  if (!el) throw new Error(`No block element ${id}`);
  return el;
}

/** The page used by most tests: every block type, in template order, one section per slot. */
function fullPage(): ContentPage {
  const sec = (id: string, slot: string, title: string | null, blocks: BlockRow[]): SectionRow => ({
    id,
    slot,
    ord: 0,
    title,
    blocks: blocks.map((b, i) => ({ ...b, ord: i })),
  });
  const base = { caption: null, variant: null, label: null, timeComplexity: null, spaceComplexity: null, assetId: null };
  return {
    template: "concept",
    sections: [
      sec("sec-overview-1", "overview", null, [
        { ...base, id: "b-text-1", ord: 0, type: "markdown", body: "Overview **text** here.", code: {} },
      ]),
      sec("sec-point-1", "point:0", "Core mechanics", [
        { ...base, id: "b-text-2", ord: 0, type: "markdown", body: "Mechanics body.", code: {} },
      ]),
      sec("sec-deeper-1", "deeper", "Worked example", [
        {
          ...base,
          id: "b-code-1",
          ord: 0,
          type: "code",
          body: "",
          variant: "optimal",
          timeComplexity: "O(n)",
          spaceComplexity: "O(1)",
          code: { cpp: "int f() {\n  return 1;\n}", java: "int f() {\n  return 1;\n}" },
        },
        {
          ...base,
          id: "b-diagram-1",
          ord: 1,
          type: "diagram",
          body: "flowchart LR\n  A --> B",
          caption: "Flow",
          code: {},
        },
        {
          ...base,
          id: "b-image-1",
          ord: 2,
          type: "image",
          body: "Architecture sketch",
          caption: "Fig 1",
          assetId: "abc123",
          code: {},
        },
      ]),
      sec("sec-questions-1", "questions", null, [
        { ...base, id: "b-text-3", ord: 0, type: "markdown", body: "What is the core idea?", code: {} },
      ]),
    ],
  };
}

/** Strips ids and ords so pages from different parsers can be compared. */
function shape(page: ContentPage) {
  return page.sections.map((s) => ({
    slot: s.slot,
    title: s.title ?? null,
    blocks: s.blocks.map((b) => ({
      type: b.type,
      body: b.body ?? "",
      caption: b.caption ?? null,
      variant: b.variant ?? null,
      label: b.label ?? null,
      time: b.timeComplexity ?? null,
      space: b.spaceComplexity ?? null,
      assetId: b.assetId ?? null,
      code: b.code ?? {},
    })),
  }));
}

const template = TEMPLATES.concept;

describe("PageEditor rendering", () => {
  it("shows every slot heading of the template, in template order, even empty ones", async () => {
    await render(<PageEditor template={template} page={fullPage()} onChange={() => {}} />);
    const headings = Array.from(container.querySelectorAll("h4")).map((h) => h.textContent?.trim());
    expect(headings).toEqual(template.slots.map((s) => s.heading));
  });

  it("shows a block for each block type, with its type label", async () => {
    await render(<PageEditor template={template} page={fullPage()} onChange={() => {}} />);
    expect(blockEl("b-text-1").textContent).toContain("Text Block");
    expect(blockEl("b-code-1").textContent).toContain("Code (optimal)");
    expect(blockEl("b-diagram-1").textContent).toContain("Mermaid Diagram");
    expect(blockEl("b-image-1").textContent).toContain("Image Block");
  });

  it("shows the title input for a titled section in a repeating slot", async () => {
    await render(<PageEditor template={template} page={fullPage()} onChange={() => {}} />);
    const titleInput = container.querySelector<HTMLInputElement>('input[placeholder="Section title..."]');
    expect(titleInput?.value).toBe("Core mechanics");
  });

  it("shows a placeholder in an empty slot", async () => {
    await render(<PageEditor template={template} page={{ template: "concept", sections: [] }} onChange={() => {}} />);
    expect(container.textContent).toContain("No sections in this slot yet.");
  });
});

describe("PageEditor block operations", () => {
  it("adds a diagram block at the top of a section from the insert bar", async () => {
    const onChange = vi.fn();
    await render(<PageEditor template={template} page={fullPage()} onChange={onChange} />);
    // The first insert bar in the page belongs to the Overview section, before its only block.
    await clickButton("Diagram", 0);
    const next: ContentPage = onChange.mock.calls[0][0];
    const overview = next.sections.find((s) => s.id === "sec-overview-1")!;
    expect(overview.blocks.map((b) => b.type)).toEqual(["diagram", "markdown"]);
    expect(overview.blocks.map((b) => b.ord)).toEqual([0, 1]);
  });

  it("removes a block only after confirmation", async () => {
    const onChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await render(<PageEditor template={template} page={fullPage()} onChange={onChange} />);
    await clickButton("Remove", 0);
    expect(confirm).toHaveBeenCalledWith("Remove this Text block?");
    expect(onChange).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await clickButton("Remove", 0);
    const next: ContentPage = onChange.mock.calls[0][0];
    expect(next.sections.find((s) => s.id === "sec-overview-1")!.blocks).toEqual([]);
  });

  it("duplicates a block right after the original", async () => {
    const onChange = vi.fn();
    await render(<PageEditor template={template} page={fullPage()} onChange={onChange} />);
    await clickButton("Copy", 0);
    const next: ContentPage = onChange.mock.calls[0][0];
    const overview = next.sections.find((s) => s.id === "sec-overview-1")!;
    expect(overview.blocks).toHaveLength(2);
    expect(overview.blocks[1].body).toBe("Overview **text** here.");
    expect(overview.blocks[1].id).not.toBe("b-text-1");
  });

  it("moves a block down with its Move down button", async () => {
    const onChange = vi.fn();
    await render(<PageEditor template={template} page={fullPage()} onChange={onChange} />);
    const down = blockEl("b-code-1").querySelector<HTMLButtonElement>('button[title^="Move down"]')!;
    await act(async () => down.click());
    const next: ContentPage = onChange.mock.calls[0][0];
    const deeper = next.sections.find((s) => s.id === "sec-deeper-1")!;
    expect(deeper.blocks.map((b) => b.id)).toEqual(["b-diagram-1", "b-code-1", "b-image-1"]);
  });

  it("disables Move up on the first block and Move down on the last block", async () => {
    await render(<PageEditor template={template} page={fullPage()} onChange={() => {}} />);
    const up = blockEl("b-code-1").querySelector<HTMLButtonElement>('button[title^="Move up"]')!;
    expect(up.disabled).toBe(true);
    const lastDown = blockEl("b-image-1").querySelector<HTMLButtonElement>('button[title^="Move down"]')!;
    expect(lastDown.disabled).toBe(true);
  });
});

describe("PageEditor Markdown view", () => {
  it("shows the page as the Markdown document from pageToMarkdown", async () => {
    const page = fullPage();
    await render(<PageEditor template={template} page={page} onChange={() => {}} />);
    await clickButton("Markdown View");
    const textarea = container.querySelector("textarea")!;
    expect(textarea.value).toBe(pageToMarkdown(template, page));
  });

  it("switching to Markdown and back without changes keeps the same page", async () => {
    const onChange = vi.fn();
    const page = fullPage();
    await render(<PageEditor template={template} page={page} onChange={onChange} />);
    await clickButton("Markdown View");
    await clickButton("Blocks View");
    expect(onChange).toHaveBeenCalledTimes(1);
    const back: ContentPage = onChange.mock.calls[0][0];
    expect(shape(back)).toEqual(shape(page));
  });

  it("pageToMarkdown then markdownToPage gives the same page for a page with every block type", () => {
    const page = fullPage();
    const res = markdownToPage(template, pageToMarkdown(template, page));
    expect(res.errors).toBeUndefined();
    expect(shape(res.page!)).toEqual(shape(page));
  });

  it("keeps the Markdown view and lists the line errors when the text cannot be parsed", async () => {
    const onChange = vi.fn();
    await render(<PageEditor template={template} page={fullPage()} onChange={onChange} />);
    await clickButton("Markdown View");
    const textarea = container.querySelector("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(textarea, "## Not a real slot\n\ntext");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await clickButton("Blocks View");
    expect(onChange).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Unknown slot heading");
    expect(container.querySelector("textarea")).not.toBeNull();
  });

  // Two text blocks in a row stay two blocks: pageToMarkdown writes a BLOCK_BREAK line between them.
  it("keeps two adjacent Markdown blocks as two blocks after a round trip", () => {
    const page = fullPage();
    page.sections[3].blocks.push({
      id: "b-text-4",
      ord: 1,
      type: "markdown",
      body: "A second paragraph.",
      caption: null,
      variant: null,
      label: null,
      timeComplexity: null,
      spaceComplexity: null,
      assetId: null,
      code: {},
    });
    const res = markdownToPage(template, pageToMarkdown(template, page));
    expect(res.page!.sections[3].blocks).toHaveLength(2);
  });

  // An empty text block survives the Markdown view: it is written as a lone BLOCK_BREAK line.
  it("keeps an empty Text block after a round trip", () => {
    const page = fullPage();
    page.sections[0].blocks.push({
      id: "b-text-empty",
      ord: 1,
      type: "markdown",
      body: "",
      caption: null,
      variant: null,
      label: null,
      timeComplexity: null,
      spaceComplexity: null,
      assetId: null,
      code: {},
    });
    const res = markdownToPage(template, pageToMarkdown(template, page));
    expect(res.page!.sections[0].blocks).toHaveLength(2);
  });
});
