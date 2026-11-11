# Reference solutions (Java and Python)

One file per problem and language: `<problem-id>.java` and `<problem-id>.py` (lowercase ids, for example `lc-1.java`,
`cses-weird-algorithm.py`, `c-euler-1.py`). The full guide is `docs/solutions.md`; the rules in short:

- The folder is flat. Only `.java` and `.py` files (and this README) belong here. The name must be a real problem id.
- **Java:** the shape of the Java starter with the body written: `class Solution { public int[] twoSum(int[] nums, int target) { ... } }`.
  `import` lines are allowed at the top; no `package`, no `main`. Helper methods and nested classes are fine. Design
  problems use `spec.design.className` with the constructor and methods of the starter. Do not redefine `ListNode` or
  `TreeNode`; they are provided.
- **Python:** `class Solution:` with the method named exactly as in the starter, with type annotations. Imports are
  optional (`typing`, `collections`, `heapq`, `bisect`, `math`, `itertools`, `functools` are provided). Design problems:
  the class with `__init__` and its methods.
- Same algorithm as the C++ reference. No network, files or processes (`subprocess`, `os.system`, `socket`, `urllib`,
  `java.net`, `ProcessBuilder`, `Runtime.getRuntime().exec`).
- A faithful Python solution that is correct but too slow on the large inputs may start with exactly
  `# verify: skip-stress` on the first line. Use it sparingly.
- Files stay under 40 KB. CRLF is fine; the bundle uses `\n`.

Commands: `pnpm solutions:todo <d|e|f> --limit 10`, `pnpm solutions:verify <ids or files>`, `pnpm solutions:status [group]`.
Only the lead runs `pnpm solutions:build` (it rewrites `packages/shared/src/judge/generated/solutions.ts`).
