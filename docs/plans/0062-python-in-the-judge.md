# 0062: Python in the judge (run, templates, editor, saved code)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** Claude Code agent A, round twelve, 2026-11-11
- **Spec:** extends the judge of plans 0018 and 0021; part of round twelve (plan 0065)
- **Estimate at this project's pace:** one Claude agent, about 3 to 4 hours

## Goal

Python becomes a fourth language next to C++, Java and JavaScript. You can pick Python on any function or
design-a-class problem, get a Python starter, run it against the examples, tests and large inputs, save it per
problem, and see the same pass/fail detail as the other languages.

## Context (verified 2026-11-11)

- Languages: `packages/shared/src/judge/types.ts` line 11: `JUDGE_LANGS = ["cpp", "java", "javascript"] as const`, with
  `JUDGE_LANG_LABEL`. Starters: `templateFor(spec, lang)` and `designTemplate` in `packages/shared/src/judge/templates.ts`
  (switches over the three languages; special starters for `lc-297` Codec and `lc-133` Node; list/tree helper docs
  `JAVA_LIST_DOC`, `JAVA_TREE_DOC`, `CPP_*`).
- Running: `apps/web/lib/judge/run.ts` (tool lookup `tool(envName, fallback)` line 81, `nodeBinary()` line 82,
  `prepare(spec, lang, code, dir, ...)`, `runProcess`, `runSet`, `MISSING` messages near line 237, `runCode`) and
  `apps/web/lib/judge/harness.ts` (writes the test harness around the learner's code per language).
- Large inputs: `StressCase.limitMs` is "Milliseconds allowed in C++. Java gets 3 times as long and JavaScript 5 times"
  (`types.ts`). Python needs its own multiplier.
- Other files that know the language list (found with Grep for `JUDGE_LANGS|JudgeLang`): `apps/web/app/actions.ts`,
  `apps/web/lib/notes.ts`, `apps/web/app/api/judge/run/route.ts`, `apps/web/app/judge-workspace.tsx`,
  `apps/web/app/code-editor.tsx`, `apps/web/app/editor-help.ts`, `apps/web/app/problem-workspace.tsx`,
  `apps/web/lib/code-lang.ts` (+ `code-lang.test.ts`), `apps/web/lib/saved-solutions.test.ts`,
  `apps/web/lib/judge/blocked.ts`.
- The judge never leaves the machine; tests are JSON; harness code is added **around** the learner's code and hidden
  (plan 0021), like C++ `#include`s.
- AGENTS.md: no emoji in UI, tests fast (do not add per-problem loops), never touch `data/habit.db`, Windows uses
  `pnpm.cmd`.

## Design (decided)

- **Language id** `"python"`, label `"Python"`. Python 3.9 or newer (typing names `List`, `Optional` need no import in
  the harness prelude because the prelude imports them).
- **Starter** (everything written except the body):

  ```python
  class Solution:
      def twoSum(self, nums: List[int], target: int) -> List[int]:
          # Write your code here
          pass
  ```

  Method name = `spec.fn.name` exactly (camelCase kept, so the harness calls it the same way for every language).
  Type map: `int`/`long` `int`, `double` `float`, `bool` `bool`, `string` `str`, `int[]`/`long[]` `List[int]`,
  `bool[]` `List[bool]`, `string[]` `List[str]`, `int[][]` `List[List[int]]`, `string[][]` `List[List[str]]`,
  `list` `Optional[ListNode]`, `tree` `Optional[TreeNode]`. Design problems: a class with `__init__(self, ...)` and one method per
  `DesignMethod`; `void` has no annotation. Special starters for `lc-297` (functions `serialize`/`deserialize` in a
  `Codec` class) and `lc-133` (`Node` with `val`, `neighbors`).
- **Hidden prelude** added by the harness, never shown: `import sys, math, heapq, bisect, itertools, functools, collections, random`,
  `from typing import *`, `from collections import deque, defaultdict, Counter`, `ListNode` and `TreeNode` classes
  (`val`, `next` / `val`, `left`, `right`), `sys.setrecursionlimit(1_000_000)` with the main work run in a thread with a large
  stack (as LeetCode-style judges do) so deep recursion on 10^5 nodes does not crash.
- **Harness:** reads the JSON tests from a file, builds arguments (`list`/`tree` from arrays), calls the method, compares
  with the same equality rules as the other harnesses (including `unordered`, doubles tolerance, design operations),
  and prints the same result protocol `run.ts` already parses. Match the existing JavaScript harness as the closest model.
- **Tool lookup** in one new small module `apps/web/lib/judge/resolve.ts` exporting `pythonCommand()`, `nodeCommand()`
  and the existing `tool()`; `run.ts` and `run-project.ts` import from it. Order for Python: `HABIT_PYTHON`, then on
  Windows `py -3` then `python`, elsewhere `python3` then `python`. A candidate counts only if `--version` prints
  `Python 3.x` within 3 s; the Microsoft Store stub (exit code 9009 or the "Python was not found" text) counts as **missing**.
  This module is also used by plan 0061's tool check, which is built in the same round by another agent: export exactly
  `ToolCommand = { file: string; args: string[]; env?: Record<string, string> }` and
  `resolveTool(id: "cpp" | "javac" | "java" | "node" | "python"): ToolCommand` and keep it free of other imports.
- **Node-less JavaScript** (moved here from plan 0061 step A3 so one agent owns `run.ts`): inside Electron
  (`process.versions.electron`) and without `HABIT_NODE`, `nodeCommand()` returns `process.execPath` with
  `env: { ELECTRON_RUN_AS_NODE: "1" }`; if starting it fails with a missing or blocked error, fall back to `node` on PATH.
  `runProcess` accepts the optional `env`.
- **Limits:** time multiplier for Python on large inputs is 10 (document it next to the existing 3 and 5). Memory: use
  the same watcher mechanism `runProcess` uses for the other languages; on Linux and macOS also set
  `resource.setrlimit(RLIMIT_AS)` in the harness. Windows has no such call; note it in *Implementation notes*.
- **Messages:** `MISSING.python` says Python 3 was not found with the hint `winget install Python.Python.3.12`
  (verify the id with `winget search Python.Python`) and the `HABIT_PYTHON` override. A syntax error reports the line
  number shifted by the hidden prelude length, like the other languages (reuse the same line-shift helper).
- **Everything that lists languages** accepts `"python"`: the picker in `judge-workspace.tsx` (remembers the choice per
  problem as it does today), `code-editor.tsx` syntax mode (check how `code-lang.ts` maps languages; add the CodeMirror
  Python language package only if the editor needs it, and justify a new dependency in *Implementation notes*), saved
  solutions per language (`notes.ts`, `actions.ts`, `saved-solutions.test.ts`), `route.ts` validation, `editor-help.ts` text.

## Out of scope

- Python solutions for the existing problems (plan 0063 and the content agents).
- Python in the Java LLD project editor, packs' reference solutions (`pack:build` stays C++), the portable Python download
  (plan 0064).
- Typing the learner's code, linters, a Python debugger.

## Steps

Targeted tests only (`pnpm exec vitest run <file>`, `pnpm -r typecheck`, eslint on changed files). Do not run `pnpm test`
or `pnpm check` (the lead runs one `pnpm check` at the end). Local commits, explicit paths, no push, no attribution.

- [x] **1. Resolver and Node-less JS.** Create `apps/web/lib/judge/resolve.ts`, move/export `tool` and the node logic
  from `run.ts` and `run-project.ts` into it, add `pythonCommand()`, make `runProcess` take `env`.
  - Done when: `pnpm exec vitest run apps/web/lib/judge/resolve.test.ts` passes with a fake PATH folder: python3 found,
    Store stub rejected, `HABIT_PYTHON` wins, missing returns `found: false`; the Electron/`ELECTRON_RUN_AS_NODE` branch
    is unit-tested with a stubbed spawn and falls back on a missing-binary error. **Commit this first** so the plan 0061
    agent can import it.
- [x] **2. Language id, types and starters.** `types.ts` (`JUDGE_LANGS`, label, comments about multipliers),
  `templates.ts` (`python` cases for functions, design problems, `lc-297`, `lc-133`, helper docs for `ListNode`/`TreeNode`).
  - Done when: `pnpm exec vitest run packages/shared/src/judge` passes with a new pure test that, for **every** spec in
    `JUDGE_PROBLEMS`, `templateFor(spec, "python")` is non-empty, contains the function (or class) name and parses as
    balanced text (no leftover `undefined`).
- [x] **3. Harness and run.** `harness.ts` Python harness, `run.ts` `prepare`/`runCode`/stress limits/messages for
  `python`.
  - Done when: `apps/web/lib/judge/judge-python.test.ts` (skipped when no Python) passes with: a correct `lc-1`, a wrong
    answer shows the failing case, a syntax error reports the right line, a runtime exception shows the message, an
    infinite loop ends as time limit, 100 KB of printed output is capped, a `list` problem, a `tree` problem, an
    `unordered` problem, a design problem, and a 10^5-deep recursion works.
- [x] **4. Editor, picker and saved code.** `judge-workspace.tsx`, `code-editor.tsx`, `code-lang.ts` (+ test), `editor-help.ts`,
  `notes.ts`, `actions.ts`, `app/api/judge/run/route.ts`, `blocked.ts` if it lists languages.
  - Done when: `pnpm -r typecheck` passes, `pnpm exec vitest run apps/web/lib/code-lang.test.ts apps/web/lib/saved-solutions.test.ts`
    passes, and in the browser (`pnpm dev` on a **copy** of the database) a DSA problem offers Python, runs it, and
    reloading keeps the Python code.
- [x] **5. Hand-off notes.** Write in *Implementation notes* what the lead must add to docs: the Python detection order,
  `HABIT_PYTHON`, the Store-stub rule and the 10x large-input multiplier. (In round twelve the docs themselves are written by
  other agents: `docs/troubleshooting.md` by the plan 0061 agent, `AGENTS.md` by the lead. Do not edit them.)
  - Done when: the notes list those four facts.

## Acceptance criteria

- [ ] Every problem has a Python starter and can be run in Python; results look like the other languages'.
- [ ] A PC without Python shows a plain "Python 3 was not found" message with the install hint and does not break the
  other languages; the Microsoft Store stub does not count as Python.
- [ ] Inside the desktop app, JavaScript runs with no Node installed (verify once on the first CI-built release; note it).
- [ ] Python choice and code are saved per problem and survive reload.
- [ ] `pnpm check` passes (lead).

## Pitfalls

- Line numbers in errors must account for the hidden prelude.
- `ELECTRON_RUN_AS_NODE` goes only into the child's environment.
- Do not add a per-problem test loop to the normal suite; the all-problems starter check is pure string work and fast.
- Windows `py -3` is a launcher; pass arguments after `-3`, not as one string.

## Open questions

## Implementation notes

Commits: resolver (6779354), language id and starters (d7b914c), harness and run (9f49722), picker and saved code (7961e04).

- **Not run against real Python.** This machine has only the Microsoft Store stub (`python.exe` that says "Python was not found"),
  so `pythonCommand()` correctly reports it missing and the 12 tests in `judge-python.test.ts` that need Python are skipped.
  What did run: the resolver tests (stubbed spawn), the starter tests, the generated-program text tests and the "Python 3 was
  not found" path through `runCode`. The Python harness text was read line by line but never executed. The first machine with
  Python 3 should run `pnpm exec vitest run apps/web/lib/judge/judge-python.test.ts`. The browser check (pick Python, run, reload) was not done either.
- `resolve.ts` exports the fixed contract (`ToolId`, `ToolCommand`, `resolveTool`, `tool`) plus `pythonCommand()` (returns
  `{ file, args, found, version? }`) and `nodeCommand()`. Each takes optional fake dependencies for tests. A found Python is cached
  per `HABIT_PYTHON` and `PATH`; a missing one is looked up again on every Run, so installing Python is noticed without a restart.
- Node-less JavaScript: inside Electron without `HABIT_NODE`, `nodeCommand()` probes `process.execPath -e` with
  `ELECTRON_RUN_AS_NODE=1` (3 s) and falls back to `node` on PATH when that cannot start. The flag goes only into the child's
  environment (`runProcess` got an `env` option). Outside Electron the running Node is used, as before. Verify once on the first CI-built release.
- Harness: new file `apps/web/lib/judge/harness-python.ts` (re-exported from `harness.ts`) so the Python text is in one place.
  `main.py` = hidden prelude (`PYTHON_PRELUDE`, `PYTHON_PRELUDE_LINES`) + your code + harness. Cases run in a thread with a 128 MB stack
  and recursion limit 1,000,000. `run.ts` first compiles `main.py` in a tiny `check.py` so a syntax error becomes a compile error
  with the line shifted by the prelude (`shiftLines` now knows `main.py`). Runtime errors read `ValueError: msg (line N)` with N in
  your code. Python runs as `python -X utf8 -u main.py` (unbuffered output keeps order and survives a crash).
- Memory: Linux and macOS set `RLIMIT_AS` in the harness to 256 MB plus the 128 MB stack plus 64 MB slack (the stack is address
  space, not use). **Windows has no limit for Python** (no equivalent call; the other languages' limits are also not watched by
  `runProcess`). A `MemoryError` is reported as "Memory limit exceeded". `OUT_OF_MEMORY` now also matches `MemoryError`.
- Limits: `TIME_MULTIPLIER.python = 10` (large inputs), `DEFAULT_TIME_LIMIT_MS.python = 5000` (normal cases).
- No new dependency: `code-editor.tsx`, `code-lang.ts` and the highlighter already supported Python, so only the picker, saved
  code (`notes.ts`, `actions.ts`) and `editor-help.ts` changed. `route.ts` needed no change (it validates against `JUDGE_LANGS`).
  `blocked.ts` only got the type widened.
- Not covered: Python for packs' reference solutions, the Java project editor, NaN or Infinity answers (they are not valid JSON).

### For the lead to put into docs

1. **Detection order:** `HABIT_PYTHON`; otherwise on Windows `py -3`, then `python`; elsewhere `python3`, then `python`. A candidate counts only if `--version` prints `Python 3.x` within 3 seconds.
2. **`HABIT_PYTHON`:** full path (or command) of the Python to use. It wins, and is not silently replaced by another Python if it does not work.
3. **Store-stub rule:** the Microsoft Store `python.exe` shortcut (exit code 9009 or the text "Python was not found") counts as not installed. Install with `winget install Python.Python.3.12` (id verified with `winget search`).
4. **Large inputs:** time limit is C++ x1, Java x3, JavaScript x5, **Python x10**. Also mention: Python normal-case limit 5 s; Windows has no Python memory limit; JavaScript no longer needs Node inside the desktop app.

## Review
