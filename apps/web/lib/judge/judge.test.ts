import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { JUDGE_PROBLEMS, JUDGE_LANGS, PROBLEMS, templateFor } from "@habit/shared";
import { sameAnswer } from "./compare";
import { runCode } from "./run";

const has = (cmd: string, args: string[]) => !spawnSync(cmd, args, { stdio: "ignore" }).error;
const GPP = has("g++", ["--version"]);
const JAVA = has("javac", ["-version"]) && has("java", ["-version"]);
const NODE = true;

const specs = Object.values(JUDGE_PROBLEMS);

describe("problem specs", () => {
  it("are well formed", () => {
    expect(specs.length).toBeGreaterThanOrEqual(53);
    for (const s of specs) {
      expect(s.statement.length, s.id).toBeGreaterThan(0);
      expect(s.constraints.length, s.id).toBeGreaterThan(0);
      expect(s.examples.length, s.id).toBeGreaterThanOrEqual(1);
      expect(s.tests.length, s.id).toBeGreaterThanOrEqual(6);
      expect(s.hints.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.solution.idea.length, s.id).toBeGreaterThan(0);
      expect(s.solution.cpp, s.id).toContain(`${s.fn.name}(`);
      for (const c of [...s.examples, ...s.tests]) expect(c.input.length, s.id).toBe(s.fn.params.length);
      expect(JSON.stringify(s), s.id).not.toContain("TODO");
    }
  });

  it("roadmap problems point at real roadmap ids", () => {
    for (const s of specs.filter((x) => x.source === "leetcode")) expect(PROBLEMS[s.id], s.id).toBeDefined();
    for (const s of specs.filter((x) => x.source === "cses")) {
      expect(s.id.startsWith("cses-"), s.id).toBe(true);
      expect(s.url, s.id).toMatch(/^https:\/\/cses\.fi\/problemset\/task\/\d+$/);
    }
  });

  it("have a starter template per language with the function and no solution", () => {
    for (const s of specs) {
      for (const lang of JUDGE_LANGS) {
        const t = templateFor(s, lang);
        expect(t, `${s.id} ${lang}`).toContain(s.fn.name);
        expect(t, `${s.id} ${lang}`).toContain("Write your code here");
      }
    }
  });
});

describe("sameAnswer", () => {
  it("compares numbers with a tolerance and lists exactly, or ignoring order", () => {
    expect(sameAnswer(0.1 + 0.2, 0.3)).toBe(true);
    expect(sameAnswer([1, 2], [2, 1])).toBe(false);
    expect(sameAnswer([1, 2], [2, 1], true)).toBe(true);
    expect(sameAnswer([[1, 2], [3]], [[3], [2, 1]], true)).toBe(true);
    expect(sameAnswer([1, 2], [1, 2, 3], true)).toBe(false);
    expect(sameAnswer("a", "b")).toBe(false);
  });
});

describe.skipIf(!GPP)("reference solutions (C++)", () => {
  for (const s of specs) {
    it(`${s.id} passes every example and test`, async () => {
      const r = await runCode(s, "cpp", s.solution.cpp);
      if (r.status !== "done") throw new Error(JSON.stringify(r));
      const failed = r.results.filter((x) => !x.pass);
      expect(failed, JSON.stringify(failed)).toEqual([]);
      expect(r.passed).toBe(s.examples.length + s.tests.length);
    }, 60_000);
  }

  it("reports wrong answers with the failing input, compile errors, crashes and timeouts", async () => {
    const two = JUDGE_PROBLEMS["lc-1"];
    const wrong = await runCode(two, "cpp", templateFor(two, "cpp").replace("// Write your code here", "return {0, 0};"));
    expect(wrong.status).toBe("done");
    if (wrong.status === "done") {
      expect(wrong.passed).toBe(0);
      expect(wrong.results[0]).toMatchObject({ pass: false, kind: "example", input: "[[2,7,11,15],9]", expected: "[0,1]", actual: "[0,0]" });
    }

    const bad = await runCode(two, "cpp", "class Solution { this is not C++ };");
    expect(bad.status).toBe("compile_error");

    const empty = await runCode(two, "cpp", templateFor(two, "cpp")); // body empty: falls off the end
    expect(["done", "timeout"]).toContain(empty.status);

    const loop = await runCode(two, "cpp", templateFor(two, "cpp").replace("// Write your code here", "while (true) {}"));
    expect(loop.status).toBe("timeout");
  }, 60_000);
});

describe.skipIf(!JAVA)("harness in Java", () => {
  it("runs Two Sum (int[] in, int[] out), Valid Parentheses (String, boolean) and Increasing Array (long[], long)", async () => {
    const two = await runCode(
      JUDGE_PROBLEMS["lc-1"],
      "java",
      `import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Long, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get((long) target - nums[i]);
            if (j != null) return new int[] {j, i};
            seen.put((long) nums[i], i);
        }
        return new int[0];
    }
}`,
    );
    expect(two).toMatchObject({ status: "done", passed: JUDGE_PROBLEMS["lc-1"].examples.length + JUDGE_PROBLEMS["lc-1"].tests.length });

    const par = await runCode(
      JUDGE_PROBLEMS["lc-20"],
      "java",
      `import java.util.*;
class Solution {
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') st.push(c);
            else {
                if (st.isEmpty()) return false;
                char o = st.pop();
                if ((c == ')' && o != '(') || (c == '}' && o != '{') || (c == ']' && o != '[')) return false;
            }
        }
        return st.isEmpty();
    }
}`,
    );
    expect(par).toMatchObject({ status: "done" });
    if (par.status === "done") expect(par.passed).toBe(par.total);

    const inc = await runCode(
      JUDGE_PROBLEMS["cses-increasing-array"],
      "java",
      `class Solution {
    public long increasingArray(long[] x) {
        long moves = 0;
        for (int i = 1; i < x.length; i++) if (x[i] < x[i - 1]) { moves += x[i - 1] - x[i]; x[i] = x[i - 1]; }
        return moves;
    }
}`,
    );
    expect(inc).toMatchObject({ status: "done" });
    if (inc.status === "done") expect(inc.passed).toBe(inc.total);

    const weird = await runCode(
      JUDGE_PROBLEMS["cses-weird-algorithm"],
      "java",
      `class Solution {
    public long[] weirdAlgorithm(int n) {
        java.util.List<Long> l = new java.util.ArrayList<>();
        long x = n; l.add(x);
        while (x != 1) { x = x % 2 == 0 ? x / 2 : 3 * x + 1; l.add(x); }
        long[] a = new long[l.size()];
        for (int i = 0; i < a.length; i++) a[i] = l.get(i);
        return a;
    }
}`,
    );
    expect(weird).toMatchObject({ status: "done" });
    if (weird.status === "done") expect(weird.passed).toBe(weird.total);

    expect((await runCode(JUDGE_PROBLEMS["lc-1"], "java", "class Solution { nope }")).status).toBe("compile_error");
  }, 120_000);
});

describe.skipIf(!NODE)("harness in JavaScript", () => {
  it("runs Two Sum, Valid Parentheses and Climbing Stairs, and reports thrown errors", async () => {
    const two = await runCode(
      JUDGE_PROBLEMS["lc-1"],
      "javascript",
      `function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
    }
    return [];
}`,
    );
    expect(two).toMatchObject({ status: "done" });
    if (two.status === "done") expect(two.passed).toBe(two.total);

    const par = await runCode(
      JUDGE_PROBLEMS["lc-20"],
      "javascript",
      `function isValid(s) {
    const pairs = { ")": "(", "}": "{", "]": "[" };
    const st = [];
    for (const c of s) {
        if (c in pairs) { if (st.pop() !== pairs[c]) return false; }
        else st.push(c);
    }
    return st.length === 0;
}`,
    );
    expect(par).toMatchObject({ status: "done" });
    if (par.status === "done") expect(par.passed).toBe(par.total);

    const boom = await runCode(JUDGE_PROBLEMS["lc-70"], "javascript", "function climbStairs(n) { throw new Error('nope'); }");
    expect(boom.status).toBe("done");
    if (boom.status === "done") expect(boom.results[0]).toMatchObject({ pass: false, error: "nope" });

    const wrongType = await runCode(JUDGE_PROBLEMS["lc-70"], "javascript", "function climbStairs(n) { return 1; }");
    expect(wrongType.status === "done" && wrongType.passed).toBe(1); // n = 1 happens to be right; the rest are not
  }, 60_000);
});

describe.skipIf(!JAVA)("linked lists and trees in Java", () => {
  it("runs Reverse Linked List II and Level Order Traversal", async () => {
    const list = await runCode(
      JUDGE_PROBLEMS["lc-92"],
      "java",
      `import java.util.*;
class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        ListNode dummy = new ListNode(0, head), prev = dummy;
        for (int i = 1; i < left; i++) prev = prev.next;
        ListNode cur = prev.next;
        for (int i = 0; i < right - left; i++) {
            ListNode nxt = cur.next;
            cur.next = nxt.next;
            nxt.next = prev.next;
            prev.next = nxt;
        }
        return dummy.next;
    }
}`,
    );
    expect(list).toMatchObject({ status: "done" });
    if (list.status === "done") expect(list.passed).toBe(list.total);

    const tree = await runCode(
      JUDGE_PROBLEMS["lc-102"],
      "java",
      `import java.util.*;
class Solution {
    public int[][] levelOrder(TreeNode root) {
        List<int[]> out = new ArrayList<>();
        if (root == null) return new int[0][];
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            int n = q.size();
            int[] level = new int[n];
            for (int i = 0; i < n; i++) {
                TreeNode x = q.poll();
                level[i] = x.val;
                if (x.left != null) q.add(x.left);
                if (x.right != null) q.add(x.right);
            }
            out.add(level);
        }
        return out.toArray(new int[0][]);
    }
}`,
    );
    expect(tree).toMatchObject({ status: "done" });
    if (tree.status === "done") expect(tree.passed).toBe(tree.total);

    const build = await runCode(
      JUDGE_PROBLEMS["lc-105"],
      "java",
      `import java.util.*;
class Solution {
    Map<Integer, Integer> pos = new HashMap<>();
    int next = 0;
    TreeNode go(int[] pre, int lo, int hi) {
        if (lo > hi) return null;
        int v = pre[next++];
        TreeNode n = new TreeNode(v);
        int mid = pos.get(v);
        n.left = go(pre, lo, mid - 1);
        n.right = go(pre, mid + 1, hi);
        return n;
    }
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        for (int i = 0; i < inorder.length; i++) pos.put(inorder[i], i);
        return go(preorder, 0, inorder.length - 1);
    }
}`,
    );
    expect(build).toMatchObject({ status: "done" });
    if (build.status === "done") expect(build.passed).toBe(build.total);
  }, 120_000);
});

describe("linked lists and trees in JavaScript", () => {
  it("runs Reverse Linked List II and Kth Smallest in a BST", async () => {
    const list = await runCode(
      JUDGE_PROBLEMS["lc-92"],
      "javascript",
      `function reverseBetween(head, left, right) {
    const dummy = new ListNode(0, head);
    let prev = dummy;
    for (let i = 1; i < left; i++) prev = prev.next;
    const cur = prev.next;
    for (let i = 0; i < right - left; i++) {
        const nxt = cur.next;
        cur.next = nxt.next;
        nxt.next = prev.next;
        prev.next = nxt;
    }
    return dummy.next;
}`,
    );
    expect(list).toMatchObject({ status: "done" });
    if (list.status === "done") expect(list.passed).toBe(list.total);

    const kth = await runCode(
      JUDGE_PROBLEMS["lc-230"],
      "javascript",
      `function kthSmallest(root, k) {
    const st = [];
    let cur = root;
    while (cur || st.length) {
        while (cur) { st.push(cur); cur = cur.left; }
        cur = st.pop();
        if (--k === 0) return cur.val;
        cur = cur.right;
    }
    return -1;
}`,
    );
    expect(kth).toMatchObject({ status: "done" });
    if (kth.status === "done") expect(kth.passed).toBe(kth.total);

    const tree = await runCode(
      JUDGE_PROBLEMS["lc-105"],
      "javascript",
      `function buildTree(preorder, inorder) {
    const pos = new Map(inorder.map((v, i) => [v, i]));
    let next = 0;
    const go = (lo, hi) => {
        if (lo > hi) return null;
        const v = preorder[next++];
        const n = new TreeNode(v);
        const mid = pos.get(v);
        n.left = go(lo, mid - 1);
        n.right = go(mid + 1, hi);
        return n;
    };
    return go(0, inorder.length - 1);
}`,
    );
    expect(tree).toMatchObject({ status: "done" });
    if (tree.status === "done") expect(tree.passed).toBe(tree.total);
  }, 60_000);
});
