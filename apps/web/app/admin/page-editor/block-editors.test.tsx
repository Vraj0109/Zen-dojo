// @vitest-environment jsdom
// Render-level tests for the block editors under the page editor (plan 0116 step 4b, wave 3 AG12). Mounted with
// react-dom/client and React's act; no Testing Library is installed.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockRow } from "@habit/shared";
import { CodeBlockEditor } from "./code-block-editor";
import { DiagramBlockEditor } from "./diagram-block-editor";
import { ImageBlockEditor } from "./image-block-editor";
import { TextBlockEditor } from "./text-block-editor";
import { uploadAssetAction } from "./actions";

const mermaidRender = vi.hoisted(() => vi.fn());
vi.mock("mermaid", () => ({ default: { initialize: () => {}, render: mermaidRender } }));
vi.mock("./actions", () => ({ uploadAssetAction: vi.fn() }));

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
  mermaidRender.mockReset();
});

async function render(node: React.ReactNode) {
  await act(async () => root.render(node));
}

/** Lets pending promises (the lazy Mermaid import and render) settle inside act. */
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function click(el: Element) {
  await act(async () => (el as HTMLElement).click());
}

function buttonByText(text: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);
  if (!found) throw new Error(`No button "${text}"`);
  return found;
}

/** Sets a value the way a user would, so React's onChange fires. */
async function typeInto(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const proto =
      el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

/** The "+ Add language" select: the one with the disabled placeholder option. */
function addLanguageSelect(): HTMLSelectElement {
  const found = Array.from(container.querySelectorAll("select")).find((s) =>
    Array.from(s.options).some((o) => o.textContent?.trim() === "+ Add language"),
  );
  if (!found) throw new Error("No add-language select");
  return found;
}

function block(over: Partial<BlockRow>): BlockRow {
  return {
    id: "b-1",
    ord: 0,
    type: "markdown",
    body: "",
    caption: null,
    variant: null,
    label: null,
    timeComplexity: null,
    spaceComplexity: null,
    assetId: null,
    code: {},
    ...over,
  };
}

describe("CodeBlockEditor", () => {
  const twoLangs = block({
    id: "b-code",
    type: "code",
    variant: "optimal",
    code: { cpp: "int a = 1;", java: "int a = 2;" },
  });

  it("shows one tab per language, in the stored order, and the first language's code", async () => {
    await render(<CodeBlockEditor block={twoLangs} onChange={() => {}} />);
    const tabs = Array.from(container.querySelectorAll("button"))
      .map((b) => b.textContent?.trim())
      .filter((t) => t === "C++" || t === "Java");
    expect(tabs).toEqual(["C++", "Java"]);
    expect(container.querySelector("textarea")!.value).toBe("int a = 1;");
  });

  it("switches the code shown when a language tab is clicked", async () => {
    await render(<CodeBlockEditor block={twoLangs} onChange={() => {}} />);
    await click(buttonByText("Java"));
    expect(container.querySelector("textarea")!.value).toBe("int a = 2;");
  });

  it("writes an edit to the active language only", async () => {
    const onChange = vi.fn();
    await render(<CodeBlockEditor block={twoLangs} onChange={onChange} />);
    await click(buttonByText("Java"));
    await typeInto(container.querySelector("textarea")!, "int a = 3;");
    expect(onChange).toHaveBeenLastCalledWith({ code: { cpp: "int a = 1;", java: "int a = 3;" } });
  });

  it("shows a remove mark on each tab only when there is more than one language", async () => {
    await render(<CodeBlockEditor block={twoLangs} onChange={() => {}} />);
    expect(container.querySelectorAll('button[title="Remove language tab"]')).toHaveLength(2);
    await render(<CodeBlockEditor block={block({ code: { cpp: "x" } })} onChange={() => {}} />);
    expect(container.querySelectorAll('button[title="Remove language tab"]')).toHaveLength(0);
  });

  it("lists only the languages not yet in the block under Add language", async () => {
    await render(<CodeBlockEditor block={twoLangs} onChange={() => {}} />);
    const select = addLanguageSelect();
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).not.toContain("cpp");
    expect(options).not.toContain("java");
    expect(options).toContain("python");
  });

  it("adds a language with empty code when one is picked", async () => {
    const onChange = vi.fn();
    await render(<CodeBlockEditor block={twoLangs} onChange={onChange} />);
    await typeInto(addLanguageSelect(), "python");
    expect(onChange).toHaveBeenCalledWith({ code: { cpp: "int a = 1;", java: "int a = 2;", python: "" } });
  });

  it("keeps the current tab when a different language tab is removed", async () => {
    const onChange = vi.fn();
    const three = block({
      id: "b-code",
      type: "code",
      code: { cpp: "C++ code", java: "Java code", python: "Python code" },
    });
    await render(<CodeBlockEditor block={three} onChange={onChange} />);
    await click(buttonByText("Python"));
    // Tabs are in order C++, Java, Python, so the second remove mark belongs to Java.
    const removeMarks = Array.from(container.querySelectorAll<HTMLButtonElement>('button[title="Remove language tab"]'));
    expect(removeMarks).toHaveLength(3);
    await click(removeMarks[1]);
    expect(onChange).toHaveBeenCalledWith({ code: { cpp: "C++ code", python: "Python code" } });
    expect(container.querySelector("textarea")!.value).toBe("Python code");
  });

  it("calls onRunCode with the active language, its code, and whether it is the optimal variant", async () => {
    const onRunCode = vi.fn();
    await render(<CodeBlockEditor block={twoLangs} onChange={() => {}} onRunCode={onRunCode} />);
    await click(buttonByText("Run tests (C++)"));
    expect(onRunCode).toHaveBeenCalledWith("cpp", "int a = 1;", true);
  });

  it("changes the variant from the select", async () => {
    const onChange = vi.fn();
    await render(<CodeBlockEditor block={twoLangs} onChange={onChange} />);
    const variant = container.querySelector("select") as HTMLSelectElement;
    await typeInto(variant, "brute");
    expect(onChange).toHaveBeenCalledWith({ variant: "brute" });
  });
});

describe("DiagramBlockEditor", () => {
  it("shows the Mermaid source in a text box and a caption field", async () => {
    mermaidRender.mockResolvedValue({ svg: "<svg></svg>" });
    await render(
      <DiagramBlockEditor block={block({ type: "diagram", body: "flowchart LR\n  A --> B", caption: "Flow" })} onChange={() => {}} />,
    );
    expect(container.querySelector("textarea")!.value).toBe("flowchart LR\n  A --> B");
    expect(container.querySelector<HTMLInputElement>('input[placeholder="Figure caption..."]')!.value).toBe("Flow");
  });

  it("shows the drawn SVG for valid Mermaid source", async () => {
    mermaidRender.mockResolvedValue({ svg: '<svg data-test="drawn"><text>A</text></svg>' });
    await render(<DiagramBlockEditor block={block({ type: "diagram", body: "flowchart LR\n  A --> B" })} onChange={() => {}} />);
    await settle();
    expect(container.querySelector('svg[data-test="drawn"]')).not.toBeNull();
  });

  it("shows an error message and the source when Mermaid cannot draw invalid source", async () => {
    mermaidRender.mockRejectedValue(new Error("Parse error on line 2"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = "flowchart LR\n  A -->";
    await render(<DiagramBlockEditor block={block({ type: "diagram", body: bad })} onChange={() => {}} />);
    await settle();
    expect(container.textContent).toContain("Diagram could not be drawn; showing its source.");
    expect(container.querySelector("figure pre")!.textContent).toBe(bad);
    expect(warn).toHaveBeenCalled();
  });

  it("shows a hint instead of a drawing when the source is empty", async () => {
    await render(<DiagramBlockEditor block={block({ type: "diagram", body: "  " })} onChange={() => {}} />);
    expect(container.textContent).toContain("Diagram preview appears here");
    expect(mermaidRender).not.toHaveBeenCalled();
  });

  it("replaces the source with a starter without asking when the source is empty", async () => {
    const onChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await render(<DiagramBlockEditor block={block({ type: "diagram", body: "" })} onChange={onChange} />);
    await click(buttonByText("sequence"));
    expect(confirm).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith({ body: expect.stringContaining("sequenceDiagram") });
  });

  it("asks before a starter replaces an existing source, and keeps it when the user says no", async () => {
    const onChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await render(<DiagramBlockEditor block={block({ type: "diagram", body: "flowchart LR\n  X --> Y" })} onChange={onChange} />);
    await click(buttonByText("er"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TextBlockEditor", () => {
  it("edits the Markdown in a text box", async () => {
    const onChange = vi.fn();
    await render(<TextBlockEditor block={block({ id: "b-t", body: "Hello" })} onChange={onChange} />);
    await typeInto(container.querySelector("textarea")!, "Hello again");
    expect(onChange).toHaveBeenCalledWith({ body: "Hello again" });
  });

  it("inserts bold markup at the cursor from the Bold button", async () => {
    const onChange = vi.fn();
    await render(<TextBlockEditor block={block({ id: "b-t", body: "Hello" })} onChange={onChange} />);
    await click(buttonByText("B"));
    expect(onChange).toHaveBeenCalledWith({ body: expect.stringContaining("**text**") });
  });

  it("renders the Markdown in the Preview tab and hides the toolbar there", async () => {
    await render(<TextBlockEditor block={block({ id: "b-t", body: "A **bold** word" })} onChange={() => {}} />);
    await click(buttonByText("Preview"));
    expect(container.querySelector("strong")!.textContent).toBe("bold");
    expect(container.querySelector("textarea")).toBeNull();
    expect(buttonByText("Preview").className).toContain("text-accent");
  });

  it("says there is nothing to preview for an empty block", async () => {
    await render(<TextBlockEditor block={block({ id: "b-t", body: "" })} onChange={() => {}} />);
    await click(buttonByText("Preview"));
    expect(container.textContent).toContain("Nothing to preview");
  });
});

describe("ImageBlockEditor", () => {
  it("shows the image from the asset route when the block has an asset id", async () => {
    await render(
      <ImageBlockEditor block={block({ id: "b-i", type: "image", body: "Sketch", assetId: "abc123" })} onChange={() => {}} />,
    );
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/api/content/assets/abc123");
    expect(img.getAttribute("alt")).toBe("Sketch");
  });

  it("shows a placeholder and no image when there is no asset yet", async () => {
    await render(<ImageBlockEditor block={block({ id: "b-i", type: "image" })} onChange={() => {}} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Image preview");
  });

  it("writes alt text and the asset id typed by the admin", async () => {
    const onChange = vi.fn();
    await render(<ImageBlockEditor block={block({ id: "b-i", type: "image" })} onChange={onChange} />);
    await typeInto(container.querySelector<HTMLInputElement>('input[placeholder="Describe image for accessibility..."]')!, "Diagram of X");
    expect(onChange).toHaveBeenLastCalledWith({ body: "Diagram of X" });
    await typeInto(container.querySelector<HTMLInputElement>('input[placeholder="e.g. 8f4a123b..."]')!, "f00d");
    expect(onChange).toHaveBeenLastCalledWith({ assetId: "f00d" });
  });

  it("refuses a file over 1 MB without uploading it", async () => {
    const upload = vi.mocked(uploadAssetAction);
    await render(<ImageBlockEditor block={block({ id: "b-i", type: "image" })} onChange={() => {}} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const big = new File([new Uint8Array(1024 * 1024 + 1)], "big.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(container.textContent).toContain("Image must be smaller than 1 MB.");
    expect(upload).not.toHaveBeenCalled();
  });

  it("stores the asset id returned by the upload", async () => {
    const upload = vi.mocked(uploadAssetAction);
    upload.mockResolvedValue({ ok: true, id: "beef" } as never);
    const onChange = vi.fn();
    await render(<ImageBlockEditor block={block({ id: "b-i", type: "image" })} onChange={onChange} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const small = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [small], configurable: true });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await settle();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ assetId: "beef" });
  });
});
