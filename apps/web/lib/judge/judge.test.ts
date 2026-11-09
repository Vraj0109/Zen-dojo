import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { JUDGE_PROBLEMS, JUDGE_LANGS, PROBLEMS, templateFor } from "@habit/shared";
import { sameAnswer } from "./compare";
import { CPP_PRELUDE_LINES, JAVA_PRELUDE_LINES, cppProgram } from "./harness";
import { firstDifference } from "./compare";
import { runCode, runCustom, shiftLines } from "./run";

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

describe("large inputs (speed and memory checks)", () => {
  it("every problem has some, and each builds an input with the right number of arguments", () => {
    for (const spec of specs) {
      expect(spec.stress?.length ?? 0, spec.id + ": large inputs").toBeGreaterThanOrEqual(1);
      for (const st of spec.stress!) {
        expect(st.label.length, spec.id).toBeGreaterThan(3);
        const input = st.make();
        expect(input.length, spec.id + " / " + st.label).toBe(spec.fn.params.length);
        expect(JSON.stringify(input).length, spec.id + " / " + st.label).toBeLessThan(8_000_000);
      }
    }
  });

  it("are built from fixed seeds, so the same input comes out every time", () => {
    for (const id of ["lc-1", "lc-15", "lc-49", "lc-105", "lc-200", "lc-347"]) {
      const a = JUDGE_PROBLEMS[id].stress!.map((x) => JSON.stringify(x.make()));
      const b = JUDGE_PROBLEMS[id].stress!.map((x) => JSON.stringify(x.make()));
      expect(a, id).toEqual(b);
    }
  });

  it("keep the promise of a unique answer in Two Sum", () => {
    for (const st of JUDGE_PROBLEMS["lc-1"].stress!) {
      const [nums, target] = st.make() as [number[], number];
      const seen = new Map<number, number>();
      let pairs = 0;
      for (const x of nums) {
        pairs += seen.get(target - x) ?? 0;
        seen.set(x, (seen.get(x) ?? 0) + 1);
      }
      expect(pairs).toBe(1);
      expect(Math.abs(target)).toBeLessThanOrEqual(1_000_000_000);
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
  // The judge is tested on how it behaves (verdicts, crashes, limits, output). It does not re-run every problem here: a
  // problem whose reference answer is wrong is found when the problem is added.

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
    expect(empty.status).toBe("done");

    // A hang is reported per case; the run still finishes and stays within the total time budget.
    const loop = await runCode(two, "cpp", templateFor(two, "cpp").replace("// Write your code here", "while (true) {}"));
    expect(loop.status).toBe("done");
    if (loop.status === "done") {
      expect(loop.passed).toBe(0);
      expect(loop.results[0]).toMatchObject({ pass: false, problem: "timeout" });
      expect(loop.results.length).toBe(two.examples.length + two.tests.length + (two.stress?.length ?? 0));
      expect(loop.results.some((r) => r.problem === "not-run")).toBe(true); // the 15 s budget ran out
    }
  }, 90_000);

  it("explains the out-of-range bug in the Missing Number code from the bug report, and still runs every case", async () => {
    const spec = JUDGE_PROBLEMS["cses-missing-number"];
    // The list has n - 1 numbers, but this loop reads n of them: one past the end.
    const buggy = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int missingNumber(int n, vector<int>& arr) {
        int ans = 0;
        for(int i = 0;i<n;i++){
            ans ^= (arr[i] ^ (i+1));
        }
        return ans;
    }
};
`;
    const r = await runCode(spec, "cpp", buggy);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.results.length).toBe(spec.examples.length + spec.tests.length + (spec.stress?.length ?? 0));
      expect(r.results.every((x) => x.problem !== "not-run")).toBe(true); // every case got its own verdict
      const crashed = r.results.filter((x) => x.problem === "crash");
      expect(crashed.length).toBeGreaterThan(0);
      expect(crashed[0].error).toMatch(/aborted|memory/);
      expect(crashed[0].output ?? "").toContain("size()"); // the library's own message about the bad index is shown
    }

    const fixed = buggy.replace("i<n;", "i<n-1;").replace("return ans;", "return ans ^ n;");
    const ok = await runCode(spec, "cpp", fixed);
    expect(ok).toMatchObject({ status: "done" });
    if (ok.status === "done") expect(ok.passed).toBe(ok.total);
  }, 90_000);

  it("keeps what your code prints apart from the answers, per case, in the right order", async () => {
    const two = JUDGE_PROBLEMS["lc-70"];
    const code = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int climbStairs(int n) {
        printf("printf %d|", n);
        cout << "cout " << n << "|";
        cerr << "cerr " << n << endl;
        int a = 1, b = 1;
        for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; }
        return b;
    }
};
`;
    const r = await runCode(two, "cpp", code);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.passed).toBe(r.total); // printing does not disturb the answers
      expect(r.results[0].output).toContain("printf 2|cout 2|cerr 2"); // example 1 is n = 2, and the three calls stay in order
      expect(r.results[1].output).toContain("printf 3|");
      expect(r.beforeTests).toBeUndefined();
    }
    const quiet = await runCode(two, "cpp", JUDGE_PROBLEMS["lc-70"].solution.cpp);
    expect(quiet.status === "done" && quiet.results.every((x) => x.output === undefined)).toBe(true); // no output, no section
  }, 60_000);

  it("isolates a crash on one case: the others still run and pass", async () => {
    const two = JUDGE_PROBLEMS["lc-70"];
    const code = JUDGE_PROBLEMS["lc-70"].solution.cpp.replace("int a = 1, b = 1;", "if (n == 4) abort();\n        int a = 1, b = 1;");
    const r = await runCode(two, "cpp", code);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      const crashed = r.results.filter((x) => x.problem === "crash");
      expect(crashed.length).toBe(1);
      expect(crashed[0].input).toBe("[4]");
      expect(r.passed).toBe(r.total - 1);
    }
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
    expect(two).toMatchObject({ status: "done" });
    if (two.status === "done") expect(two.passed).toBe(two.total); // including the large inputs, with Java's longer time limit

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

describe.skipIf(!JAVA)("printing in Java", () => {
  it("shows System.out output per case and keeps the answers separate", async () => {
    const r = await runCode(
      JUDGE_PROBLEMS["lc-70"],
      "java",
      `class Solution {
    public int climbStairs(int n) {
        System.out.println("n is " + n);
        int a = 1, b = 1;
        for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; }
        return b;
    }
}`,
    );
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.passed).toBe(r.total);
      expect(r.results[0].output).toContain("n is 2");
      expect(r.results[1].output).toContain("n is 3");
    }
  }, 60_000);
});

describe("printing in JavaScript", () => {
  it("shows console.log output per case, keeps the answers separate, and isolates a thrown error", async () => {
    const r = await runCode(
      JUDGE_PROBLEMS["lc-70"],
      "javascript",
      `function climbStairs(n) {
    console.log("n is", n);
    if (n === 4) throw new Error("boom");
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) { const c = a + b; a = b; b = c; }
    return b;
}`,
    );
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.results[0].output).toContain("n is 2");
      expect(r.results.filter((x) => x.problem === "exception").map((x) => x.error)).toEqual(["boom"]);
      expect(r.passed).toBe(r.total - 1);
    }
  }, 60_000);
});

describe.skipIf(!GPP)("runaway output", () => {
  it("stops a program that prints without end, and still finishes", async () => {
    const two = JUDGE_PROBLEMS["lc-70"];
    const code = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int climbStairs(int n) {
        while (true) puts("spam spam spam spam spam spam spam spam spam spam");
        return n;
    }
};
`;
    const started = Date.now();
    const r = await runCode(two, "cpp", code);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.passed).toBe(0);
      expect(r.results[0]).toMatchObject({ problem: "crash", error: expect.stringContaining("too much output") });
      expect(r.results[0].output!.length).toBeLessThanOrEqual(20_100); // shown output is cut off
    }
    expect(Date.now() - started).toBeLessThan(40_000);
  }, 90_000);
});

describe.skipIf(!GPP)("speed and memory limits", () => {
  it("fails a correct but quadratic Container With Most Water on the large inputs, and says why", async () => {
    const spec = JUDGE_PROBLEMS["lc-11"];
    const slowCode = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        int best = 0, n = (int)height.size();
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) best = max(best, (j - i) * min(height[i], height[j]));
        return best;
    }
};
`;
    const r = await runCode(spec, "cpp", slowCode);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      const known = spec.examples.length + spec.tests.length;
      expect(r.results.slice(0, known).every((x) => x.pass)).toBe(true); // right on all the small cases
      const large = r.results.slice(known);
      expect(large.length).toBe(spec.stress!.length);
      expect(large.some((x) => x.problem === "timeout")).toBe(true); // too slow on the big ones
      expect(large.find((x) => x.problem === "timeout")!.error).toMatch(/too slow|Time limit exceeded/i);
    }
  }, 120_000);

  it("stops a program that allocates far too much memory", async () => {
    const spec = JUDGE_PROBLEMS["lc-70"];
    const code = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int climbStairs(int n) {
        vector<int> big(300000000, n);
        return big[n];
    }
};
`;
    const r = await runCode(spec, "cpp", code);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.passed).toBe(0);
      expect(r.results[0]).toMatchObject({ problem: "memory", error: expect.stringContaining("Memory limit exceeded") });
    }
  }, 90_000);

  it("a fast, correct solution passes the large inputs of every kind of problem (C++ reference answers match)", async () => {
    // One list problem, one tree problem and one string problem, end to end.
    for (const id of ["lc-92", "lc-98", "lc-76", "cses-increasing-array"]) {
      const spec = JUDGE_PROBLEMS[id];
      const r = await runCode(spec, "cpp", spec.solution.cpp);
      expect(r.status, id).toBe("done");
      if (r.status === "done") {
        expect(r.results.filter((x) => x.kind === "stress").length, id).toBe(spec.stress!.length);
        expect(r.passed, id).toBe(r.total);
      }
    }
  }, 180_000);
});

describe.skipIf(!JAVA)("memory limit in Java", () => {
  it("reports an OutOfMemoryError as a memory limit", async () => {
    const r = await runCode(
      JUDGE_PROBLEMS["lc-70"],
      "java",
      `class Solution {
    public int climbStairs(int n) {
        int[] big = new int[400000000];
        return big[n];
    }
}`,
    );
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.results[0]).toMatchObject({ problem: "memory" });
  }, 90_000);
});

describe("hidden boilerplate", () => {
  it("starter code has no include or import lines", () => {
    for (const s of specs) {
      expect(templateFor(s, "cpp"), s.id).not.toMatch(/#include|using namespace/);
      expect(templateFor(s, "java"), s.id).not.toMatch(/^import /m);
    }
    expect(templateFor(JUDGE_PROBLEMS["lc-1"], "cpp").startsWith("class Solution")).toBe(true);
    expect(templateFor(JUDGE_PROBLEMS["lc-92"], "cpp").startsWith("/**")).toBe(true);
  });

  it("the harness adds the headers, so the line count of the prelude is known", () => {
    expect(CPP_PRELUDE_LINES(JUDGE_PROBLEMS["lc-1"])).toBe(2);
    expect(CPP_PRELUDE_LINES(JUDGE_PROBLEMS["lc-92"])).toBeGreaterThan(2);
    expect(JAVA_PRELUDE_LINES).toBe(3);
    expect(cppProgram(JUDGE_PROBLEMS["lc-1"], "class Solution {};").startsWith("#include <bits/stdc++.h>\nusing namespace std;\nclass Solution")).toBe(true);
  });

  it("shiftLines turns compiler line numbers into editor lines", () => {
    const text = "./main.cpp:5:9: error: expected primary-expression\n    5 |   int x = ;\n./main.cpp:40:1: error: later\nmain.cpp:2:1: error: header";
    const out = shiftLines(text, 2, 10);
    expect(out).toContain("line 3: error: expected primary-expression");
    expect(out).toContain("    3 |   int x = ;");
    expect(out).toContain("code added by the judge: error: later");
    expect(out).toContain("code added by the judge: error: header");
    expect(shiftLines("Solution.java:4: error: x\nMain.java:9: error: y", 3, 5)).toBe("line 1: error: x\ncode added by the judge: error: y");
  });
});

describe.skipIf(!GPP)("solutions without includes (C++)", () => {
  const two = JUDGE_PROBLEMS["lc-1"];
  const body = `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            auto it = seen.find(target - nums[i]);
            if (it != seen.end()) return {it->second, i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`;

  it("passes with no includes, and still passes when the code has its own", async () => {
    for (const code of [body, "#include <bits/stdc++.h>\nusing namespace std;\n" + body]) {
      const r = await runCode(two, "cpp", code);
      expect(r.status).toBe("done");
      if (r.status === "done") expect(r.passed, JSON.stringify(r.results.filter((x) => !x.pass))).toBe(r.total);
    }
  }, 90_000);

  it("shows compile errors on editor lines", async () => {
    const r = await runCode(two, "cpp", "class Solution {\npublic:\n    int x = ;\n};\n");
    expect(r.status).toBe("compile_error");
    if (r.status === "compile_error") {
      expect(r.message).toContain("line 3");
      expect(r.message).not.toContain("main.cpp");
    }
    const nodes = await runCode(JUDGE_PROBLEMS["lc-92"], "cpp", "int x = ;\nclass Solution {};\n");
    if (nodes.status === "compile_error") expect(nodes.message).toContain("line 1");
    else throw new Error("expected a compile error");
  }, 90_000);

  it("runs on your own input", async () => {
    const r = await runCustom(two, "cpp", body, [[2, 7, 11, 15], 9]);
    expect(r).toMatchObject({ status: "done", output: "[0,1]" });
    const printing = await runCustom(two, "cpp", body.replace("seen;", "seen; cout << \"hi\" << endl;"), [[3, 3], 6]);
    expect(printing).toMatchObject({ status: "done", output: "[0,1]" });
    if (printing.status === "done") expect(printing.printed).toContain("hi");
  }, 90_000);
});

describe.skipIf(!JAVA)("solutions without imports (Java)", () => {
  const two = JUDGE_PROBLEMS["lc-1"];
  const body = `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[] {j, i};
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}
`;
  it("passes with no imports, and with its own", async () => {
    for (const code of [body, "import java.util.*;\n" + body]) {
      const r = await runCode(two, "java", code);
      expect(r.status).toBe("done");
      if (r.status === "done") expect(r.passed, JSON.stringify(r.results.filter((x) => !x.pass))).toBe(r.total);
    }
  }, 120_000);

  it("shows compile errors on editor lines", async () => {
    const r = await runCode(two, "java", "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        int x = ;\n    }\n}\n");
    expect(r.status).toBe("compile_error");
    if (r.status === "compile_error") expect(r.message).toContain("line 3");
  }, 60_000);
});

describe("solutions (JavaScript)", () => {
  it("passes, and runs on your own input", async () => {
    const two = JUDGE_PROBLEMS["lc-1"];
    const code = "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n";
    const r = await runCode(two, "javascript", code);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed).toBe(r.total);
    expect(await runCustom(two, "javascript", code, [[2, 7, 11, 15], 9])).toMatchObject({ status: "done", output: "[0,1]" });
  }, 60_000);
});

describe("design-a-class problems", () => {
  const lru = JUDGE_PROBLEMS["lc-146"];

  it("have a starter class per language with the constructor and every method", () => {
    const cpp = templateFor(lru, "cpp");
    expect(cpp).toContain("LRUCache(int capacity)");
    expect(cpp).toContain("int get(int key)");
    expect(cpp).toContain("void put(int key, int value)");
    expect(templateFor(lru, "java")).toContain("public void put(int key, int value)");
    expect(templateFor(lru, "javascript")).toContain("constructor(capacity)");
    const twitter = templateFor(JUDGE_PROBLEMS["lc-355"], "cpp");
    expect(twitter).toContain("vector<int> getNewsFeed(int userId)");
    expect(twitter).not.toMatch(/#include|Solution/);
  });

  it("every design problem is a design with a constructor, methods and cases written as [ops, args]", () => {
    const designs = specs.filter((s) => s.design);
    expect(designs.length).toBeGreaterThanOrEqual(11);
    for (const s of designs) {
      expect(s.kind, s.id).toBe("design");
      for (const c of [...s.examples, ...s.tests]) {
        const [ops, args] = c.input as [string[], unknown[][]];
        expect(ops[0], s.id).toBe(s.design!.className);
        expect(args.length, s.id).toBe(ops.length);
        expect((c.output as unknown[]).length, s.id).toBe(ops.length);
        for (const op of ops.slice(1)) expect(s.design!.methods.map((m) => m.name), s.id).toContain(op);
      }
    }
  });

  const cppLru = `class LRUCache {
    int cap;
    list<pair<int, int>> items;
    unordered_map<int, list<pair<int, int>>::iterator> where;
public:
    LRUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        items.splice(items.begin(), items, it->second);
        return it->second->second;
    }
    void put(int key, int value) {
        auto it = where.find(key);
        if (it != where.end()) { it->second->second = value; items.splice(items.begin(), items, it->second); return; }
        if ((int)items.size() == cap) { where.erase(items.back().first); items.pop_back(); }
        items.emplace_front(key, value);
        where[key] = items.begin();
    }
};
`;
  const javaLru = `class LRUCache {
    private final int cap;
    private final LinkedHashMap<Integer, Integer> map = new LinkedHashMap<>();
    public LRUCache(int capacity) { cap = capacity; }
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        int v = map.remove(key);
        map.put(key, v);
        return v;
    }
    public void put(int key, int value) {
        map.remove(key);
        if (map.size() == cap) map.remove(map.keySet().iterator().next());
        map.put(key, value);
    }
}
`;
  const jsLru = `class LRUCache {
    constructor(capacity) { this.cap = capacity; this.map = new Map(); }
    get(key) {
        if (!this.map.has(key)) return -1;
        const v = this.map.get(key);
        this.map.delete(key);
        this.map.set(key, v);
        return v;
    }
    put(key, value) {
        this.map.delete(key);
        if (this.map.size === this.cap) this.map.delete(this.map.keys().next().value);
        this.map.set(key, value);
    }
}
`;

  it.skipIf(!GPP)("LRU Cache passes in C++, and a wrong get names the operation that failed", async () => {
    const ok = await runCode(lru, "cpp", cppLru);
    expect(ok.status).toBe("done");
    if (ok.status === "done") expect(ok.passed, JSON.stringify(ok.results.filter((x) => !x.pass))).toBe(ok.total);

    const wrong = await runCode(lru, "cpp", cppLru.replace("items.splice(items.begin(), items, it->second);\n        return it->second->second;", "return it->second->second;")); // get forgets to count as a use
    expect(wrong.status).toBe("done");
    if (wrong.status === "done") {
      const first = wrong.results.find((x) => !x.pass)!;
      expect(first.kind).toBe("example");
      expect(first.note).toBe("Operation 6, get(2), returned 2; expected -1.");
    }
    const crash = await runCode(lru, "cpp", cppLru.replace("where[key] = items.begin();", "where[key] = items.begin(); throw std::runtime_error(\"boom\");"));
    if (crash.status === "done") expect(crash.results[0].error).toContain("operation 2 (put): boom");
  }, 120_000);

  it.skipIf(!JAVA)("LRU Cache passes in Java", async () => {
    const r = await runCode(lru, "java", javaLru);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed, JSON.stringify(r.results.filter((x) => !x.pass))).toBe(r.total);
  }, 120_000);

  it("LRU Cache passes in JavaScript, and runs on your own input", async () => {
    const r = await runCode(lru, "javascript", jsLru);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed, JSON.stringify(r.results.filter((x) => !x.pass))).toBe(r.total);
    const own = await runCustom(lru, "javascript", jsLru, [["LRUCache", "put", "get", "get"], [[1], [1, 5], [1], [2]]]);
    expect(own).toMatchObject({ status: "done", output: "[null,null,5,-1]" });
  }, 60_000);

  it("firstDifference says which operation was wrong", () => {
    const input = [["Trie", "insert", "search"], [[], ["a"], ["a"]]];
    expect(firstDifference(input, [null, null, true], [null, null, false])).toBe('Operation 3, search("a"), returned false; expected true.');
    expect(firstDifference(input, [null, null, true], [null, null, true])).toBeUndefined();
    expect(firstDifference(input, [null, null, true], [null])).toContain("answered 1 operations");
  });
});
