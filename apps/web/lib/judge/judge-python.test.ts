import { describe, expect, it } from "vitest";
import { JUDGE_PROBLEMS, type ProblemSpec } from "@habit/shared";
import { PYTHON_PRELUDE_LINES, pythonProgram } from "./harness";
import { pythonCommand } from "./resolve";
import { DEFAULT_TIME_LIMIT_MS, TIME_MULTIPLIER, runCode, runCustom } from "./run";

// These run real Python 3. They are skipped on a computer without it (the Microsoft Store stub does not count).
const PY = pythonCommand().found;
const run = it.skipIf(!PY);

/** A small made-up problem, so each test checks one thing. */
function spec(over: Partial<ProblemSpec> & Pick<ProblemSpec, "fn">): ProblemSpec {
  return { id: "t-py", source: "other", title: "t", statement: ["t"], constraints: ["t"], examples: [], tests: [], hints: [], solution: { idea: "", cpp: "" }, ...over } as unknown as ProblemSpec;
}

const SUM = spec({
  fn: { name: "add", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int" },
  examples: [{ input: [1, 2], output: 3 }],
  tests: [{ input: [10, 5], output: 15 }],
});
const withCode = (body: string) => `class Solution:\n    def add(self, a: int, b: int) -> int:\n${body}\n`;

describe("the Python program text (no Python needed)", () => {
  it("puts the hidden prelude first, then your code, then the harness", () => {
    const code = withCode("        return a + b");
    const text = pythonProgram(SUM, code);
    expect(text.startsWith("import sys, math, heapq")).toBe(true);
    expect(text.split("\n").slice(PYTHON_PRELUDE_LINES).join("\n").startsWith("class Solution:")).toBe(true);
    expect(text).toContain("_HABIT_USER = " + code.split("\n").length);
    expect(text).toContain("# ---- test harness");
    expect(text).toContain("Solution().add(*call_args)");
    expect(text).not.toMatch(/undefined|\$\{|@MEM@|@STACK@/);
  });

  it("builds list and tree arguments and answers, and calls design classes by name", () => {
    const list = spec({ fn: { name: "rev", params: [{ name: "h", type: "list" }], returns: "list" } });
    expect(pythonProgram(list, "")).toContain("_habit_list_from(args[0])");
    expect(pythonProgram(list, "")).toContain("_habit_list_to(result)");
    const tree = spec({ fn: { name: "inv", params: [{ name: "r", type: "tree" }], returns: "tree" } });
    expect(pythonProgram(tree, "")).toContain("_habit_tree_to(result)");
    const lru = JUDGE_PROBLEMS["lc-146"];
    expect(pythonProgram(lru, "")).toContain("LRUCache(*arglists[k])");
    expect(pythonProgram(lru, "")).toContain('voids = ["put"]');
  });

  it("has a Python time limit and a 10 times multiplier for large inputs", () => {
    expect(TIME_MULTIPLIER.python).toBe(10);
    expect(DEFAULT_TIME_LIMIT_MS.python).toBeGreaterThan(DEFAULT_TIME_LIMIT_MS.javascript);
  });
});

describe("running Python", { timeout: 60_000 }, () => {
  run("a correct Two Sum passes every case, including the large inputs", async () => {
    const code = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, x in enumerate(nums):
            if target - x in seen:
                return [i, seen[target - x]]   # the other order: unordered answers are accepted
            seen[x] = i
        return []
`;
    const r = await runCode(JUDGE_PROBLEMS["lc-1"], "python", code);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed, JSON.stringify(r.results.filter((x) => !x.pass))).toBe(r.total);
  });

  run("a wrong answer shows the failing case", async () => {
    const r = await runCode(SUM, "python", withCode("        return a - b"));
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.passed).toBe(0);
      expect(r.results[0]).toMatchObject({ pass: false, input: "[1,2]", expected: "3", actual: "-1" });
    }
  });

  run("a syntax error is reported with the line number in your code", async () => {
    const r = await runCode(SUM, "python", "class Solution:\n    def add(self, a, b):\n        return a +\n");
    expect(r.status).toBe("compile_error");
    if (r.status === "compile_error") expect(r.message).toContain("line 3");
  });

  run("a runtime exception shows its message and your line", async () => {
    const r = await runCode(SUM, "python", withCode("        raise ValueError('boom')"));
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.results[0].problem).toBe("exception");
      expect(r.results[0].error).toContain("ValueError: boom");
      expect(r.results[0].error).toContain("(line 3)");
    }
  });

  run("an infinite loop ends as time limit exceeded", async () => {
    const r = await runCode(SUM, "python", withCode("        while True:\n            pass"));
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.results[0].problem).toBe("tle");
  }, 40_000);

  run("100 KB of printed output is capped", async () => {
    const r = await runCode(SUM, "python", withCode("        print(('x' * 99 + chr(10)) * 1000)\n        return a + b"));
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.results[0].pass).toBe(true);
      expect(r.results[0].output?.length ?? 0).toBeLessThan(20_100);
      expect(r.results[0].output).toContain("cut off");
    }
  });

  run("a list problem", async () => {
    const s = spec({
      fn: { name: "reverse", params: [{ name: "head", type: "list" }], returns: "list" },
      examples: [{ input: [[1, 2, 3]], output: [3, 2, 1] }],
      tests: [{ input: [[]], output: [] }, { input: [[7]], output: [7] }],
    });
    const code = `class Solution:
    def reverse(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev = None
        while head:
            head.next, prev, head = prev, head, head.next
        return prev
`;
    const r = await runCode(s, "python", code);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed, JSON.stringify(r.results)).toBe(3);
  });

  run("a tree problem", async () => {
    const s = spec({
      fn: { name: "invert", params: [{ name: "root", type: "tree" }], returns: "tree" },
      examples: [{ input: [[1, 2, 3]], output: [1, 3, 2] }],
      tests: [{ input: [[]], output: [] }, { input: [[1, 2, null, 3]], output: [1, null, 2, null, 3] }],
    });
    const code = `class Solution:
    def invert(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if root:
            root.left, root.right = self.invert(root.right), self.invert(root.left)
        return root
`;
    const r = await runCode(s, "python", code);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed, JSON.stringify(r.results)).toBe(3);
  });

  run("an unordered answer in another order passes", async () => {
    const s = spec({
      fn: { name: "pairs", params: [{ name: "n", type: "int" }], returns: "int[]" },
      unordered: true,
      examples: [{ input: [3], output: [1, 2, 3] }],
    });
    const r = await runCode(s, "python", "class Solution:\n    def pairs(self, n: int) -> List[int]:\n        return [3, 1, 2]\n");
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed).toBe(1);
  });

  run("a design problem (LRU cache)", async () => {
    const code = `class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.d = collections.OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.d:
            return -1
        self.d.move_to_end(key)
        return self.d[key]

    def put(self, key: int, value: int):
        self.d[key] = value
        self.d.move_to_end(key)
        if len(self.d) > self.cap:
            self.d.popitem(last=False)
`;
    const r = await runCode(JUDGE_PROBLEMS["lc-146"], "python", code);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed, JSON.stringify(r.results.filter((x) => !x.pass))).toBe(r.total);
  });

  run("recursion 100000 levels deep works", async () => {
    const s = spec({
      fn: { name: "depth", params: [{ name: "n", type: "int" }], returns: "int" },
      examples: [{ input: [100000], output: 100000 }],
    });
    const r = await runCode(s, "python", "class Solution:\n    def depth(self, n: int) -> int:\n        return 0 if n == 0 else 1 + self.depth(n - 1)\n");
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.results[0], JSON.stringify(r.results[0])).toMatchObject({ pass: true });
  });

  run("a custom input runs and prints", async () => {
    const r = await runCustom(SUM, "python", withCode("        print('hi')\n        return a + b"), [4, 5]);
    expect(r).toMatchObject({ status: "done", output: "9" });
    if (r.status === "done") expect(r.printed).toContain("hi");
  });
});

describe("without Python", () => {
  it("the run reports Python 3 as missing, not a crash", async () => {
    if (PY) return; // only meaningful on a machine without it
    const r = await runCode(SUM, "python", withCode("        return a + b"));
    expect(r.status).toBe("unavailable");
    if (r.status === "unavailable") {
      expect(r.message).toContain("Python 3 was not found");
      expect(r.message).toContain("winget install Python.Python.3.12");
      expect(r.message).toContain("HABIT_PYTHON");
    }
  });
});
