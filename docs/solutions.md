# Checking solutions

Every problem's solution page is a list of blocks in the **content database** (plan 0117): Markdown, diagrams and code
blocks labelled brute force, optimal or a custom label, each with code in one or more judge languages (C++, Java,
JavaScript, Python). The admin edits them at `/admin/problems/<id>` (see `docs/content-editing.md`) and can run them
against the problem's tests before saving. There are no solution files in the repo any more.

The prompt to give an agent: **"Read docs/solutions.md, then check <id> with pnpm content:verify-solutions."**

## The rules

- Write exactly what a learner would paste into the editor for that language: the starter with the body filled in.
- **Same algorithm as the C++ reference**, so the shared "idea" and "complexity" text stay true. A short comment may explain
  a language detail.
- No network, files or processes: never use `Runtime.getRuntime().exec`, `ProcessBuilder`, `subprocess`, `os.system`,
  `socket`, `urllib` or `java.net`.
- A code block is at most 40 KB.
- Change only the code block you are fixing. If the **test data** looks wrong (an expectation that the C++ reference also
  fails), do not change the tests: report the id and the case.

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
search the content for `skip-stress` to see every use.

## Commands

All from the repo root (on Windows PowerShell use `pnpm.cmd`). Both read a content database file; get one with
`pnpm content:pull` (writes `data/content.db`) or `pnpm content:snapshot --out <file>`.

| Command | What it does |
|---|---|
| `pnpm content:verify-solutions [--ids a,b] [--lang java,python] [--brute] [--db <file>]` | Runs every code block of every problem (or only the given ids, languages or brute force blocks) through the local judge: examples, tests and large inputs. One line per problem, language and block; exit code 1 when any fails. |
| `pnpm content:verify [--db <file> \| --origin <url>]` | The content checks (`verifyContent`): for problems, an optimal C++ block, tests that match the function, hints and more. Errors fail with exit code 1; warnings are listed. |

Brute force blocks run without the large inputs and with five times the time limit. `content:verify-solutions` needs the
same tools as the judge: a C++ compiler, a JDK for Java, Python 3 (see `docs/troubleshooting.md`). It is not part of
`pnpm test`.

## Add or fix one solution

1. Open the problem at `/admin/problems/<id>`, tab Solution. Edit the code block (or add one with the block toolbar),
   pick its label and language.
2. Click **Run tests** in the editor. Fix every failing case.
3. Save with a short note. The save runs the content checks; errors block it, warnings are shown.
4. Optional, on a computer with the compilers: `pnpm content:pull` then `pnpm content:verify-solutions --ids <id>`.

## How it is wired

- The judge spec of a problem is built from the content database by `specFromContent`
  (`packages/shared/src/content-model/to-spec.ts`); large inputs come from `stress-registry.ts`, keyed by problem id.
- `apps/web/lib/content-repo/problems.ts` reads problems and solution pages (cached, tag per problem).
- The solution tab renders the blocks with `app/content-page.tsx`; each code block shows its languages as tabs.
- `scripts/content-verify-solutions.mjs` and `apps/web/lib/content-db/verify-db.ts` run the checks above.
