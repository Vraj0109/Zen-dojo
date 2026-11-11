# 0063: Reference solutions in C++, Java and Python (data-only content, with a verifier)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** Claude agent C (tooling, steps 1 to 6) and Antigravity agents D, E, F (content, step 7); see plan 0065
- **Spec:** extends `ProblemSpec.solution` (`packages/shared/src/judge/types.ts`); depends on plan 0062 only for *verifying Python*
- **Estimate at this project's pace:** tooling about 3 hours (Claude); content about one Antigravity round (roughly 450
  problems times two languages, split three ways)

## Goal

Every problem's Solution section shows the reference solution in **C++, Java and Python**, with tabs. The new Java and
Python solutions live as **plain files**, one per problem and language, so adding or fixing a solution is a data
change: no TypeScript editing, no per-problem code. A verifier runs each new solution through the real judge, so a
translation is accepted only when it passes the problem's examples and tests.

## Context (verified 2026-11-11)

- Problems are **TypeScript objects** (`ProblemSpec`) in `packages/shared/src/judge/problems-*.ts`, registered in
  `packages/shared/src/judge/index.ts` as `JUDGE_PROBLEMS`. About 450 specs. Each has
  `solution: { idea: string[]; complexity: string; cpp: string }` (C++ only). The `idea` and `complexity` are
  language-neutral and stay as they are.
- The UI shows only C++: `apps/web/app/problem-workspace.tsx` line ~109 `<Code code={spec.solution.cpp} lang="C++" ... />`.
  Stored (admin/pack) problems carry their own `solution` (`apps/web/lib/content.ts:165`, `content-admin.ts:31`).
- Precedent for file-based content: lessons are Markdown files in `packages/shared/content/<area>/` compiled by
  `scripts/build-content.mjs` into a committed generated file (`packages/shared/src/learn/generated/lessons.ts`) with a
  `--check` mode that fails when it is stale. Scripts that import TypeScript use `scripts/lib/register-ts.mjs`
  (see the `content:*` scripts in the root `package.json`).
- The judge starters (`templateFor`) show the exact shape of the code to write in each language
  (`packages/shared/src/judge/templates.ts`): Java is `class Solution { public T name(params) { ... } }`, with
  `ListNode`/`TreeNode` helper classes provided for `list`/`tree` problems; design problems are a class named
  `spec.design.className`.
- Running a solution: `runCode(spec, lang, code)` in `apps/web/lib/judge/run.ts` (used by `judge.test.ts`).
  Python is added to it by plan 0062 in the same round.
- AGENTS.md: keep the normal test run fast (no per-problem compile loop), never touch `data/habit.db`.

## Design (decided)

**Files.** `packages/shared/content/solutions/<problem-id>.java` and `<problem-id>.py`, for example `lc-1.java`,
`lc-1.py`, `cses-weird-algorithm.py`, `c-euler-1.java`. The folder is flat. Contents are exactly what a learner would
paste into the editor for that language:

- **Java:** the same shape as the Java starter with the body written: `class Solution { public int[] twoSum(int[] nums, int target) { ... } }`.
  Imports (`import java.util.*;`) may be added at the top. No `package`, no `main`. Helper methods and nested/static
  helper classes are fine. For design problems the class is `spec.design.className` with the constructor and methods of
  the starter. For `list`/`tree` problems use the provided `ListNode`/`TreeNode` (do not redefine them).
- **Python:** the same shape as the Python starter (plan 0062): `class Solution:` with the method named exactly
  `spec.fn.name`, type annotations as in the starter. Imports are optional (the harness provides `typing`, `collections`,
  `heapq`, `bisect`, `math`, `itertools`, `functools`). Design problems: the class with `__init__` and methods.
- **Same algorithm as the C++ reference** (so the shared `idea` and `complexity` stay true). A short comment may explain a
  language-specific detail. A solution may not call the network, read files or spawn processes.
- **Slow Python on large inputs:** if the faithful Python version is correct but cannot meet the large-input time limit,
  put exactly this as the first line: `# verify: skip-stress`. The verifier then still requires all examples and tests to
  pass and only skips the large inputs. Use it sparingly; the status command lists every use.

**Generated bundle.** `scripts/solutions.mjs build` reads the folder and writes
`packages/shared/src/judge/generated/solutions.ts` exporting
`SOLUTIONS: Record<string, { java?: string; python?: string }>`; `check` fails if it is stale or if a file name is not a
known problem id or has an extension other than `.java`/`.py`. The generated file is committed and **only the lead
regenerates it, once, at the end** (agents never run `build`, so there are no merge conflicts).

**API.** `packages/shared/src/judge/solutions.ts` exports
`SolutionLang = "cpp" | "java" | "python"`, `solutionCode(spec, lang): string | null` (C++ from `spec.solution.cpp`,
others from `SOLUTIONS[spec.id]`; stored problems with their own `solution` keep C++ only) and
`solutionLangs(spec): SolutionLang[]`. Import it only from **server** code (the generated file is large); the problem
page passes the chosen strings to the client.

**UI.** The Solution section in `problem-workspace.tsx` shows tabs for the languages that exist (C++ first), remembers
the last tab in `localStorage` (wrapped in try/catch), and shows a muted line "Java and Python solutions are being
added" for a problem that has only C++. The existing "Load into editor" behaviour for your own saved solutions is not
touched.

**Verifier.** `apps/web/lib/judge/solutions-verify.test.ts` is a vitest file that is **skipped unless**
`SOLUTIONS_FILES` is set (so `pnpm test` stays fast). It reads those files directly from the content folder (no
generated bundle needed), loads the spec by id, runs `runCode(spec, lang, code)` and requires every example and test to
pass; large inputs must also pass unless the Python skip-stress line is present. Run it with
`pnpm solutions:verify <files or id globs>` (a thin script that sets the variable and runs vitest). Output is one line per
solution: `ok lc-1.java 2.1s` or `FAIL lc-1.py case 3: expected ... got ...`.

**Authoring helpers.** `pnpm solutions:status [group]` prints counts per group (done/total per language) and lists
missing ids; `pnpm solutions:todo <group> [--limit 10]` prints, for the next missing ids, the problem id, title, the Java
and Python **starters**, and the C++ reference, so an author does not have to open the TypeScript files. Groups are
defined in `packages/shared/src/judge/solution-groups.ts`:

| Group | Spec arrays (import from the problem files) | Problems |
|---|---|---|
| `d` | `LEETCODE_SPECS`, `_2`, `_3`, `_4`, `_5`, `_6`, `_7`, `_8` | 163 |
| `e` | `LEETCODE_SPECS_9`, all `CSES_*`, `DESIGN_SPECS_A/B/C`, `SPECIAL_SPECS`, `OTHER_SPECS` | 159 |
| `f` | `LOGIC_SPECS_EULER/ATCODER/CODEFORCES/KATTIS/BATCH2/C`, `PROBLEMS_LOGIC_D` | 164 |

A test checks that every problem in `JUDGE_PROBLEMS` is in exactly one group.

## Out of scope

- Changing any `problems-*.ts` file or any `solution.cpp`.
- Python/Java for stored (admin or pack) problems; `pack:build` stays C++.
- Rewriting `idea` / `complexity` text per language; per-language hints.
- Making the verifier part of `pnpm check`.

## Steps (tooling: Claude agent C)

Targeted tests only. The lead runs one `pnpm check`. Local commits, explicit paths, no push, no attribution.

- [ ] **1. Groups and the build script.** `packages/shared/src/judge/solution-groups.ts`,
  `scripts/solutions.mjs` with `build`, `check`, `status`, `todo` (use `scripts/lib/register-ts.mjs` like `content:*`), root
  `package.json` scripts `solutions:build`, `solutions:check`, `solutions:status`, `solutions:todo`, `solutions:verify`
  (wire `solutions:check` wherever `content:check` already runs, so `pnpm check` catches a stale bundle). Create the
  empty folder with a `README.md` describing the file rules and an empty generated bundle `SOLUTIONS = {}`.
  - Done when: `pnpm solutions:status` prints three groups with 0 done; `pnpm solutions:todo d --limit 2` prints two
    problems with starters and the C++ reference; the group test passes. **Commit this first**; the content agents start
    from it.
- [ ] **2. Verifier.** `solutions-verify.test.ts` and `scripts/solutions-verify.mjs` as in Design.
  - Done when: with two hand-written files (`lc-1.java`, `lc-1.py` in a temporary folder or a fixture) the command prints
    `ok`, and a deliberately wrong file prints `FAIL` with the case; without `SOLUTIONS_FILES` the test file is skipped
    and takes no time. **Commit this second.**
- [ ] **3. Structural tests (fast, always run).** `packages/shared/src/judge/solutions.test.ts`: every file's id exists in
  `JUDGE_PROBLEMS`, only `.java`/`.py`, Java files contain `class ` and (for function problems) `fn.name(`, Python files
  contain `def <fn.name>(` or `class <design.className>`, no file over 40 KB, the skip-stress line only on `.py` and only
  as the first line, no `Runtime.getRuntime().exec`, `ProcessBuilder`, `subprocess`, `os.system`, `socket`, `urllib`,
  `java.net`.
  - Done when: `pnpm exec vitest run packages/shared/src/judge/solutions.test.ts` passes with an empty folder and with
    the fixtures.
- [ ] **4. API.** `packages/shared/src/judge/solutions.ts` and its tests (C++ from the spec, others from the bundle,
  stored-problem fallback, missing returns null).
  - Done when: `pnpm exec vitest run packages/shared/src/judge/solutions.test.ts` passes.
- [ ] **5. UI tabs.** `apps/web/app/problem-workspace.tsx` (and the problem page that renders it, `app/dsa/[id]/page.tsx`
  and the study packs problem page if they render the same component) show the language tabs.
  - Done when: `pnpm -r typecheck` and eslint on the changed files pass; with two sample files and a locally
    regenerated bundle on a **copy** of the data, a problem shows three tabs; a problem with C++ only shows one tab and
    the muted line; **discard** the sample files and bundle afterwards.
- [ ] **6. Docs.** `docs/solutions.md`: file rules, the Java and Python shapes with one worked example each, the commands,
  how to add or fix one solution, and the prompt to give an agent:
  "Read docs/solutions.md, then fix <id>.java / <id>.py". Link it from `docs/content-editing.md` (the link from `AGENTS.md`
  is added by the lead at the end of the round).
  - Done when: the doc exists and `docs/content-editing.md` links to it.

## Step 7: content (Antigravity agents D, E, F)

Each agent owns **only** the files of its group's problem ids in `packages/shared/content/solutions/` and touches nothing
else (no TypeScript, no generated file, no plan files). Work in batches of about 10 problems:

1. `pnpm solutions:todo <group> --limit 10`.
2. Write `<id>.java` and `<id>.py` for each (rules above), translating the C++ reference faithfully.
3. `pnpm solutions:verify <the ten ids>`; fix every `FAIL` (a wrong test expectation in a problem is **reported, not
   edited**: list it in your final message with the id and the case).
4. Commit with a plain message such as `Add Java and Python solutions for lc-1 to lc-10` using explicit `git add` of those
   files; no push, no attribution.
5. Repeat until `pnpm solutions:status <group>` shows every problem done in both languages.

Until plan 0062 has landed, verify Java only (`pnpm solutions:verify --lang java ...`); keep writing Python files and verify
them once Python works. Verified state is not stored anywhere, so at the end re-run the verifier over the whole group:
`pnpm solutions:verify --group <group>` (add `--lang java` or `--lang python` to limit it).

- [ ] **7d / 7e / 7f.** Group `d`, `e`, `f` complete.
  - Done when: `pnpm solutions:status <group>` shows 100% for Java and Python and `pnpm solutions:verify --group <group>`
    prints no `FAIL` (problems reported as having wrong data are listed in *Implementation notes* by the lead).

## Final (lead)

- [ ] `pnpm solutions:build`, then one `pnpm check`; commit the generated bundle with the last batch.

## Acceptance criteria

- [ ] Open any problem: the Solution section has C++, Java and Python tabs with correct code.
- [ ] Adding or fixing a solution means editing one `.java` or `.py` file and running `pnpm solutions:verify <id>`; no code.
- [ ] A broken file is caught before release: a wrong solution fails the verifier; a stale bundle fails `pnpm check`.
- [ ] `pnpm solutions:status` shows 100% for all three groups.
- [ ] `pnpm check` passes.

## Pitfalls

- Never import the generated bundle into a client component.
- Agents must not run `solutions:build` (shared generated file) or edit the plan file.
- A Java solution that compiles locally but uses a class the harness also defines (`ListNode`, `TreeNode`) fails; do not redefine them.
- File names are case-sensitive on Linux (`lc-1.java`, lowercase ids).
- Windows line endings: files may be CRLF; the bundle script normalises to `\n`.

## Open questions

## Implementation notes

Agent C, 2026-11-11 (steps 1 to 6 done; step 7 is the content agents').

- **Groups were rebalanced.** The table above gave group e about 149 problems; the real count was 184 (all ten CSES files were in e).
  Final sizes: d 163, e 159, f 164 (486 problems). CSES math moved to d and CSES geometry/strings to f; everything else is as in
  the table. The group test requires the sizes to differ by less than 10.
- Commands: `scripts/solutions.mjs` (build, check, status, todo), `scripts/solutions-verify.mjs` (spawns vitest with `SOLUTIONS_FILES`,
  reads the result lines from a temp file, prints `ok`/`FAIL`/`SKIP`; exit code 1 on any FAIL). `--lang`, `--group`, ids, file names,
  paths and globs work. A python file is reported as SKIP when the judge has no Python.
- `solutions:check` is not part of the root `check` script (neither is `content:check`); the stale-bundle guard that `pnpm check` runs
  is the test "are in the generated bundle" in `solutions.test.ts`, the same way `content-build.test.ts` guards the lessons. While
  the content agents add files, that one test fails until the lead runs `pnpm solutions:build`.
- The fs-based reader test lives in `apps/web/lib/judge/solutions-files.test.ts` because `packages/shared` has no Node types.
- `solutionCode` returns the bundled Java/Python only when the spec is the shipped one (`hasBundledSolutions`), so a stored problem that
  reuses a built-in id keeps C++ only.
- UI: `packages/shared/package.json` got an export `@habit/shared/solutions` (the main index does not export the bundle, so client code
  cannot pull it in). `problem-workspace.tsx` renders each language with the server-side `Code` and passes the nodes to the new client
  component `apps/web/app/solution-tabs.tsx` (localStorage key `zen-dojo.solution-lang`, tabs hidden when only C++ exists, muted line
  "Java and Python solutions are being added." for built-in problems with C++ only). No page file needed a change: the pack problem page
  and `dsa/[id]/page.tsx` both go through `ProblemHelp`.
- Checked in the browser on a VACUUM copy of the data (port 3101): three tabs on lc-1 with the content agents' files, the remembered tab
  survives a reload, a problem with C++ only shows the muted line. The temporary bundle was restored and the copy deleted.
- Not verified: running a Python file through the verifier (no Python 3 on this machine; Java verified).

## Review
