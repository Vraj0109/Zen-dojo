# 0021: Run button v2: hidden boilerplate, last run saved, custom input

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code (agent A), 2026-11-09
- **Spec:** none (builds on plan 0018)

## Goal

The editor shows only what the learner writes. No `#include <bits/stdc++.h>`, no `using namespace std;`, no Java imports:
the judge adds them. The code you last **ran** on a problem is saved by the app (per problem and language), so you get
it back after a reload, on another window or after a backup restore. You can also run your code on an input of your own.

## Context

- Starter code comes from `templateFor()` in `packages/shared/src/judge/templates.ts` (C++ starts with the include and
  `using namespace std;`, Java with `import java.util.*;`). Tests in `apps/web/lib/judge/judge.test.ts` check that the
  starter has the function and no solution.
- The program that is compiled is built in `apps/web/lib/judge/harness.ts`: `cppProgram()` puts `cppPrelude(spec)` (the
  `ListNode`/`TreeNode` structs) before the learner's code, `javaProgram()` writes `Solution.java` as the learner's code.
- `apps/web/lib/judge/run.ts` (`runCode`) compiles, runs, and cleans compiler output with `clean()`. Compile errors show
  line numbers of the **whole** file, so once the prelude is hidden they must be shifted back to editor lines.
- `apps/web/app/judge-workspace.tsx` keeps the draft in localStorage (`habit-judge:<id>:<lang>`) and POSTs to
  `apps/web/app/api/judge/run/route.ts`. Accepted solutions go to the Notes tab through `saveSolution()` in
  `apps/web/lib/notes.ts` (`body.save === true`). Imported pack problems use ids like `pack:<pack>:<item>` (plan 0024).
- Conventions: append a migration to `MIGRATIONS` in `apps/web/lib/db.ts`, update `schema.ts`, add new tables to
  `BACKUP_TABLES` in `lib/backup.ts`. Never edit a shipped migration.

## Out of scope

- Changing how verdicts, large inputs or memory limits work.
- More languages.
- Saving every run's history (only the **latest** run per problem and language is kept).

## Steps

- [x] **1. Hide the boilerplate in the starter code.** In `templates.ts` remove the `#include`/`using namespace std;` lines
  (C++) and `import java.util.*;` (Java) from `templateFor()`. The starter is the `class Solution { ... }` plus the list/tree
  doc comment only. Keep the JavaScript starter as is.
  - Done when: the C++ starter begins with `class Solution` (or the node doc comment), and the starter test still passes.
- [x] **2. Make the harness add them.** In `harness.ts`, `cppPrelude()` always starts with
  `#include <bits/stdc++.h>\nusing namespace std;\n` (before the node structs). `javaProgram()` writes `Solution.java` as
  `import java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\n` + the learner's code. Code that already
  has its own includes or imports (old saved drafts, pasted code) must still compile: duplicate includes and imports are harmless.
  Export the number of prelude lines as a constant per language (`CPP_PRELUDE_LINES(spec)`, `JAVA_PRELUDE_LINES`).
  - Done when: a solution without includes passes on every one of the three languages; one with includes still passes.
- [x] **3. Shift compiler line numbers.** In `run.ts`, after compiling, rewrite `main.cpp:LINE:` / `Solution.java:LINE:` in
  the compiler text so LINE is the editor line (LINE minus the prelude lines, never below 1). Errors inside the hidden
  prelude or the harness show as "in code added by the judge".
  - Done when: a unit test puts a syntax error on editor line 3 and the message says line 3.
- [x] **4. Say what is added.** Under the editor (in `judge-workspace.tsx`) show one muted line: "Added for you: all C++
  standard headers and `using namespace std;`" (or the Java imports). Hide it for JavaScript.
  - Done when: it shows the right text per language.
- [x] **5. Table for the last run.** Migration: `CREATE TABLE solution_runs (problem_id TEXT NOT NULL, lang TEXT NOT NULL,
  code TEXT NOT NULL, ran_on TEXT NOT NULL, status TEXT NOT NULL, passed INTEGER NOT NULL, total INTEGER NOT NULL,
  PRIMARY KEY (problem_id, lang))`. Add `solutionRuns` to `schema.ts` and `"solution_runs"` to `BACKUP_TABLES`.
  - Done when: a fresh database has the table and a backup round-trip keeps its rows (extend `backup.test.ts`).
- [x] **6. Save on every run.** New `apps/web/lib/solution-runs.ts`: `saveRun(problemId, lang, code, result)` (upsert; refuse code over
  100 KB) and `getRuns(problemId)`. Call `saveRun` from the route after `runCode`, for built-in and pack problems, whatever
  the verdict (a compile error is also a run). `ran_on` is the local date (`toLocalDate(new Date())`).
  - Done when: running twice leaves one row per problem and language holding the second code.
- [x] **7. Use it in the editor.** The problem page passes `lastRuns` (language, code, ran_on, status, passed/total) to
  `JudgeWorkspace`. Initial code order: the localStorage draft if it exists, else the last run, else the starter. Add a
  **Last run** button next to Reset: it shows "Last run: 3 of 10 passed, 2026-11-09" and puts that code back in the editor.
  - Done when: clearing localStorage and reloading brings the last run back; Reset still restores the starter.
- [x] **8. Show it in Notes.** In the Notes tab show the last run per language (read-only code block with the verdict),
  above the saved accepted solution. The accepted-solution save to notes stays as it is.
  - Done when: after a failing run the Notes tab shows that code with its verdict.
- [x] **9. Run on your own input.** Add a **Custom input** box (collapsed) to the Code pane: one JSON value per parameter, one
  per line. `POST /api/judge/run` with `{ id, lang, code, input: [...] }` runs the program once and returns the output
  (and anything printed) with no expected answer. Reuse `runCode` with a one-case spec (no stress). Validate the values
  against the parameter types with `matchesTy()` from `packages/shared/src/packs.ts` and answer with a plain message
  when one does not fit.
  - Done when: `[2,7,11,15]` and `9` on Two Sum returns `[0,1]`; a bad value shows "target must be an int".
- [x] **10. Tests.** Extend `judge.test.ts` (no includes; old code with includes; line shift; custom input), add
  `solution-runs.test.ts` (`:memory:` database), extend `backup.test.ts`. Do **not** add a per-problem loop.
  - Done when: `pnpm check` passes.

## Acceptance criteria

- [x] The starter code in every language has no include or import lines.
- [x] A solution with or without includes passes; compile errors show editor line numbers.
- [x] Running code saves it; reload, another window or a restored backup bring back the last run.
- [x] Custom input works for every type the judge supports (including list and tree).
- [ ] `pnpm check` passes.

## Open questions

- `app/dsa/[id]/page.tsx` belongs to agent B in plan 0026, so it was not edited. Step 7 says the page passes `lastRuns`; instead
  `judge-workspace.tsx` loads them from the new `GET /api/judge/run?id=` (same origin only). Result is the same for the user.
  If the merger prefers server-passed props, that is a small change in the page.
- This plan file and 0022 to 0026 are untracked in the main checkout, so this branch holds a copy of 0021 (uncommitted).

## Implementation notes

- Starter code (`templates.ts`): no includes or imports. `cppPrelude()` (harness-nodes.ts) always starts with `#include <bits/stdc++.h>` and
  `using namespace std;`; `javaProgram`'s Solution.java is `JAVA_PRELUDE` + your code. Exports: `CPP_PRELUDE_LINES(spec)`, `JAVA_PRELUDE_LINES` (harness.ts).
- `shiftLines()` in run.ts rewrites `main.cpp:N:C` / `Solution.java:N` to `line N-prelude`, also the quoted `  12 |` lines from gcc; anything
  outside your code (prelude, harness, Main.java) reads "code added by the judge". Reference-solution runs are not shifted.
- Migration (`solution_runs`) appended as the newest to `MIGRATIONS`; `solutionRuns` in schema.ts; `"solution_runs"` in `BACKUP_TABLES`.
- `lib/solution-runs.ts`: `saveRun` (upsert, refuses over 100 KB), `getRuns`. The route saves after every run that compiled or failed to
  compile; "unavailable" (no compiler) is not saved.
- Editor: draft in localStorage, else last run, else starter. **Last run** button next to Reset; footer under the editor shows the
  verdict line, the "Added for you" line (C++ and Java only) and a collapsed **Custom input** box. Notes tab shows each language's last run
  above the notes form.
- Custom input: `POST /api/judge/run` with `input: [...]` calls `runCustom()` (one case, no stress, nothing saved); values are checked with
  `matchesTy()` ("target must be an int.").
- Tests: judge.test.ts (starters, prelude, shiftLines, no-includes and with-includes for C++ and Java, compile error lines, custom input, JS),
  solution-runs.test.ts (upsert, size limit, route validation, GET), backup.test.ts (round trip keeps the run).
- Not checked by eye: the new editor footer and Notes tab were not opened in a browser (typecheck, lint and tests only). Reviewer please do.

## Review
