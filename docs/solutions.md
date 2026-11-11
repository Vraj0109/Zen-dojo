# Reference solutions in C++, Java and Python

For anyone (a person, Antigravity, a cheaper model) who has never seen this repo. Every built-in problem shows its
reference solution in **C++, Java and Python** (tabs in the problem's Hints > "Show the solution"). The C++ solution lives on
the problem (`solution.cpp` in `packages/shared/src/judge/problems-*.ts`). The **Java and Python solutions are plain files**,
one per problem and language, so adding or fixing one never needs TypeScript.

The prompt to give an agent: **"Read docs/solutions.md, then fix <id>.java / <id>.py."**

## Where the files are

`packages/shared/content/solutions/<problem-id>.java` and `<problem-id>.py`. The folder is flat and the names are the
problem ids in lowercase: `lc-1.java`, `lc-1.py`, `cses-weird-algorithm.py`, `c-euler-1.java`. Nothing else goes there
except `README.md`. A file whose name is not a real problem id is rejected by `pnpm solutions:check`.

## The rules

- Write exactly what a learner would paste into the editor for that language: the starter with the body filled in.
- **Same algorithm as the C++ reference**, so the shared "idea" and "complexity" text stay true. A short comment may explain
  a language detail.
- No network, files or processes. Forbidden words (a test checks them): `Runtime.getRuntime().exec`, `ProcessBuilder`,
  `subprocess`, `os.system`, `socket`, `urllib`, `java.net`.
- A file is at most 40 KB. CRLF line endings are fine (the bundle uses `\n`).
- Do not touch anything else: not the problem files, not `generated/solutions.ts`. Only the lead rebuilds the bundle.

### Java

Same shape as the Java starter (`templateFor(spec, "java")`), body written. `import java.util.*;` and other imports may go on top.
No `package`, no `main`. Helper methods and nested or static helper classes are fine. `ListNode` and `TreeNode` are provided
for list and tree problems: do **not** define them again.

```java
import java.util.*;

class Solution {
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
```

Design problems ("design a class") use the class named `spec.design.className`, with the constructor and the methods of the starter.

### Python

`class Solution:` with the method named **exactly** as in the starter (`spec.fn.name`, camelCase as on LeetCode), with type
annotations. The judge provides `typing`, `collections`, `heapq`, `bisect`, `math`, `itertools` and `functools`, so imports are
optional. `ListNode` and `TreeNode` are provided here too.

```python
from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen: dict[int, int] = {}
        for i, v in enumerate(nums):
            if target - v in seen:
                return [seen[target - v], i]
            seen[v] = i
        return []
```

Design problems: the class named `spec.design.className` with `__init__` and the methods.

### Slow Python on large inputs

If the faithful Python solution is correct but cannot meet the large-input time limit, make this exactly the **first line**:

```python
# verify: skip-stress
```

The verifier then still requires every example and test to pass and only skips the large inputs. Use it sparingly;
`pnpm solutions:status` lists every use.

## Commands

All from the repo root (on Windows PowerShell use `pnpm.cmd`).

| Command | What it does |
|---|---|
| `pnpm solutions:status [d\|e\|f]` | Done/total per language for the three author groups; with a group, also the missing ids. |
| `pnpm solutions:todo <group> [--limit 10]` | The next problems without both files: id, title, the Java and Python starters and the C++ reference. |
| `pnpm solutions:verify <id or file> ...` | Runs the files through the real judge (examples, tests, large inputs). One line per file. |
| `pnpm solutions:verify --group d [--lang java\|python]` | The same for every existing file of a group. |
| `pnpm solutions:check` | Fails on a bad file name or a stale bundle. A test runs it in `pnpm check` too. |
| `pnpm solutions:build` | Rewrites `packages/shared/src/judge/generated/solutions.ts` from the folder. **Only the lead runs this**, once at the end. |

`solutions:verify` accepts ids (`lc-1` means both languages), file names (`lc-1.py`), globs (`lc-1*`), paths, and `--lang`.
Output is `ok lc-1.java 2.1s` or `FAIL lc-1.py case 3: expected [0,1] got [1,0]`; a compile error prints the compiler message.
It needs the same tools as the judge: a JDK for Java, Python 3 for Python (see `docs/troubleshooting.md`). Without the
`SOLUTIONS_FILES` variable the vitest file behind it is skipped, so `pnpm test` stays fast.

## Groups

Defined in `packages/shared/src/judge/solution-groups.ts`; a test checks that every problem is in exactly one:

| Group | Problems |
|---|---|
| `d` | LeetCode files 1 to 8 and CSES math |
| `e` | LeetCode file 9, CSES (except math and geometry/strings), design-a-class, special and other |
| `f` | Euler, AtCoder, Codeforces, Kattis, logic batches and CSES geometry/strings |

## Add or fix one solution

1. `pnpm solutions:todo <group> --limit 1` (or open the problem's starter in the app) to see the starters and the C++ reference.
2. Write or edit `packages/shared/content/solutions/<id>.java` and `<id>.py`.
3. `pnpm solutions:verify <id>`. Fix every `FAIL`. If the **test data** looks wrong (an expectation that the C++ reference also
   fails), do not edit the problem: report the id and the case.
4. Commit the two files. The bundle (and so the app) picks them up when the lead runs `pnpm solutions:build`.

## How it is wired

- `scripts/solutions.mjs` reads the folder and writes `generated/solutions.ts` (`SOLUTIONS: Record<id, { java?, python? }>`).
- `packages/shared/src/judge/solutions.ts` (import it as `@habit/shared/solutions`, **server code only**: the bundle is large)
  exports `solutionCode(spec, lang)` and `solutionLangs(spec)`. C++ comes from the spec, the others from the bundle. Stored
  (admin or pack) problems keep C++ only.
- `apps/web/app/problem-workspace.tsx` highlights each language on the server and `solution-tabs.tsx` switches between them
  (the last choice is remembered in the browser). A problem with C++ only shows one block and a muted line.
- Tests: `packages/shared/src/judge/solutions.test.ts` (names, structure, bundle up to date, groups) always runs;
  `apps/web/lib/judge/solutions-verify.test.ts` only when `SOLUTIONS_FILES` is set.
