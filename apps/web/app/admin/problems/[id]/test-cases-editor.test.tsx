// @vitest-environment jsdom
// Render-level tests for the test cases editor (plan 0116 step 4, wave 3 AG12). Mounted with react-dom/client and
// React's act; no Testing Library is installed.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestCaseRow } from "@habit/shared";
import { TestCasesEditor } from "./test-cases-editor";

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

async function click(el: Element) {
  await act(async () => (el as HTMLElement).click());
}

function buttonByText(text: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);
  if (!found) throw new Error(`No button "${text}"`);
  return found;
}

function rows(): HTMLTableRowElement[] {
  return Array.from(container.querySelectorAll("tbody tr"));
}

function cases(): TestCaseRow[] {
  return [
    { ord: 0, role: "example", input: [2, 7, 11, 15], output: 0, explanationMd: "Pair 2 and 7" },
    { ord: 1, role: "test", input: [3, 2, 4], output: 1, explanationMd: null },
    { ord: 2, role: "test", input: [], output: null, explanationMd: null },
  ];
}

describe("TestCasesEditor", () => {
  it("shows an empty-state message when there are no cases", async () => {
    await render(<TestCasesEditor testCases={[]} onChange={() => {}} />);
    expect(container.textContent).toContain("No test cases defined yet.");
    expect(container.querySelector("table")).toBeNull();
  });

  it("renders one table row per test case, numbered from 1", async () => {
    await render(<TestCasesEditor testCases={cases()} onChange={() => {}} />);
    expect(rows()).toHaveLength(3);
    expect(rows().map((r) => r.querySelector("td")!.textContent)).toEqual(["1", "2", "3"]);
  });

  it("shows each case's input, output and role", async () => {
    await render(<TestCasesEditor testCases={cases()} onChange={() => {}} />);
    const [first, second] = rows();
    const inputs = (r: HTMLTableRowElement) => Array.from(r.querySelectorAll("input")).map((i) => i.value || i.defaultValue);
    expect(inputs(first)[0]).toBe("[2,7,11,15]");
    expect(inputs(first)[1]).toBe("0");
    expect(first.querySelector("select")!.value).toBe("example");
    expect(second.querySelector("select")!.value).toBe("test");
  });

  it("disables the explanation of a test case, which only examples show", async () => {
    await render(<TestCasesEditor testCases={cases()} onChange={() => {}} />);
    const [first, second] = rows();
    const explanation = (r: HTMLTableRowElement) => r.querySelectorAll("input")[2] as HTMLInputElement;
    expect(explanation(first).disabled).toBe(false);
    expect(explanation(second).disabled).toBe(true);
  });

  it("appends a new test case with role test, or example for the first one", async () => {
    const onChange = vi.fn();
    await render(<TestCasesEditor testCases={[]} onChange={onChange} />);
    await click(buttonByText("+ Add test case"));
    expect(onChange).toHaveBeenLastCalledWith([{ ord: 0, role: "example", input: [], output: null, explanationMd: null }]);
  });

  it("removes a case and renumbers the rest", async () => {
    const onChange = vi.fn();
    await render(<TestCasesEditor testCases={cases()} onChange={onChange} />);
    await click(rows()[0].querySelector('button[title="Remove test case"]')!);
    const next: TestCaseRow[] = onChange.mock.calls[0][0];
    expect(next.map((c) => c.ord)).toEqual([0, 1]);
    expect(next[0].input).toEqual([3, 2, 4]);
  });

  it("moves a case down and renumbers", async () => {
    const onChange = vi.fn();
    await render(<TestCasesEditor testCases={cases()} onChange={onChange} />);
    await click(rows()[0].querySelector('button[title="Move down"]')!);
    const next: TestCaseRow[] = onChange.mock.calls[0][0];
    expect(next.map((c) => c.output)).toEqual([1, 0, null]);
    expect(next.map((c) => c.ord)).toEqual([0, 1, 2]);
  });

  it("disables Move up on the first row and Move down on the last", async () => {
    await render(<TestCasesEditor testCases={cases()} onChange={() => {}} />);
    expect(rows()[0].querySelector<HTMLButtonElement>('button[title="Move up"]')!.disabled).toBe(true);
    expect(rows()[2].querySelector<HTMLButtonElement>('button[title="Move down"]')!.disabled).toBe(true);
  });

  it("imports cases from a pasted JSON array and closes the box", async () => {
    const onChange = vi.fn();
    await render(<TestCasesEditor testCases={cases()} onChange={onChange} />);
    await click(buttonByText("Paste JSON array"));
    const area = container.querySelector("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(area, '[{"input": [1, 2], "output": 3, "explanation": "one plus two"}]');
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(buttonByText("Import Cases"));
    const next: TestCaseRow[] = onChange.mock.calls[0][0];
    expect(next).toHaveLength(4);
    expect(next[3]).toEqual({ ord: 3, role: "test", input: [1, 2], output: 3, explanationMd: "one plus two" });
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("reports a pasted value that is not an array and imports nothing", async () => {
    const onChange = vi.fn();
    await render(<TestCasesEditor testCases={[]} onChange={onChange} />);
    await click(buttonByText("Paste JSON array"));
    const area = container.querySelector("textarea")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(area, '{"input": [1]}');
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(buttonByText("Import Cases"));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Pasted JSON must be an array");
  });

  it("disables Fill expected outputs outside the desktop app", async () => {
    await render(<TestCasesEditor testCases={cases()} onChange={() => {}} onFillExpectedOutputs={() => {}} isDesktop={false} />);
    const button = buttonByText("Fill expected outputs (desktop only)");
    expect(button.disabled).toBe(true);
  });

  it("enables Fill expected outputs on desktop and calls it", async () => {
    const fill = vi.fn();
    await render(<TestCasesEditor testCases={cases()} onChange={() => {}} onFillExpectedOutputs={fill} isDesktop />);
    await click(buttonByText("Fill expected outputs"));
    expect(fill).toHaveBeenCalledTimes(1);
  });
});
