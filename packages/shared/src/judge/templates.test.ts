import { describe, expect, it } from "vitest";
import { JUDGE_LANGS, JUDGE_LANG_LABEL, JUDGE_PROBLEMS as BY_ID, templateFor } from "./index";

const JUDGE_PROBLEMS = Object.values(BY_ID);

/** Brackets in the starter must pair up (the starters contain no strings or comments with brackets). */
function balanced(text: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  for (const ch of text.replace(/#.*$/gm, "").replace(/"""[\s\S]*?"""/g, "")) {
    if ("([{".includes(ch)) stack.push(ch);
    else if (ch in pairs && stack.pop() !== pairs[ch]) return false;
  }
  return stack.length === 0;
}

describe("Python starters", () => {
  it("Python is a language with a label", () => {
    expect(JUDGE_LANGS).toContain("python");
    expect(JUDGE_LANG_LABEL.python).toBe("Python");
  });

  it("every problem has a non-empty Python starter that names its function or class", () => {
    const bad: string[] = [];
    for (const spec of JUDGE_PROBLEMS) {
      const t = templateFor(spec, "python");
      const wanted = spec.id === "lc-297" ? "class Codec" : spec.design ? `class ${spec.design.className}:` : `def ${spec.fn.name}(self`;
      if (!t.trim() || !t.includes(wanted) || /undefined|null/.test(t) || !balanced(t) || t.includes("\t")) bad.push(spec.id);
    }
    expect(bad).toEqual([]);
  });

  it("a function starter is exactly the starter in the plan", () => {
    const spec = JUDGE_PROBLEMS.find((p) => p.id === "lc-1")!;
    expect(templateFor(spec, "python")).toBe(
      "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your code here\n        pass\n"
    );
  });

  it("list and tree problems show the node class in a comment", () => {
    const list = JUDGE_PROBLEMS.find((p) => p.fn.params.some((x) => x.type === "list") && !p.design)!;
    expect(templateFor(list, "python")).toContain("# class ListNode:");
    expect(templateFor(list, "python")).toContain("Optional[ListNode]");
    const tree = JUDGE_PROBLEMS.find((p) => p.fn.returns === "tree" && !p.design && p.id !== "lc-297")!;
    expect(templateFor(tree, "python")).toContain("# class TreeNode:");
  });

  it("design problems get __init__ and one method per operation, void without an arrow", () => {
    const spec = JUDGE_PROBLEMS.find((p) => p.design && p.design.methods.some((m) => m.returns === "void"))!;
    const t = templateFor(spec, "python");
    expect(t).toContain("def __init__(self");
    for (const m of spec.design!.methods) expect(t).toContain(`def ${m.name}(self`);
    const v = spec.design!.methods.find((m) => m.returns === "void")!;
    const line = t.split("\n").find((l) => l.includes(`def ${v.name}(self`))!;
    expect(line.includes("->")).toBe(false);
  });

  it("lc-133 and lc-297 have special Python starters", () => {
    expect(templateFor(JUDGE_PROBLEMS.find((p) => p.id === "lc-133")!, "python")).toContain("def cloneGraph(self, node: Optional[Node]) -> Optional[Node]:");
    expect(templateFor(JUDGE_PROBLEMS.find((p) => p.id === "lc-297")!, "python")).toContain("def deserialize(self, data: str)");
  });
});
