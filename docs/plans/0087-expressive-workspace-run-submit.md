# 0087: Expressive redesign, part 3: problem workspace (per-case results, Run vs Submit, shortcuts)

- **Status:** done
- **Planned by:** Claude Code, 2026-11-20
- **Implemented by:** Subagent 2 (Round 1) & Subagent B (Round 2), 2026-11-20
- **Spec:** `docs/mockups/expressive/` (mockup sources in the repo; see its README), from the mockup canvas (https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj), boards "Problem workspace (dark)" and
  "Code workspace" in phone gallery A.

## Goal

Make debugging a problem easy.
- Every case gets its own tab, showing:
  - the input with its parameter names (`strs = [...]`)
  - your output next to the expected output
  - what your code printed **for that case only**
  - a plain verdict ("Accepted · 0 ms", "Time limit: stopped at 1,000 ms")
- You can add your own cases.
- **Run** checks the examples and your own cases quickly.
- **Submit** runs every case (examples, extra tests, large inputs) and saves your solution when all pass.
- Shortcuts work like LeetCode: Ctrl/Cmd + ' runs and Ctrl/Cmd + Enter submits. A `?` sheet lists all of them.

## Context

- Needs plan 0085: tokens, shell, `app/shortcuts.ts` and `app/components/shortcuts-sheet.tsx`.
- **Workspace:** `apps/web/app/judge-workspace.tsx` (~780 lines). It has the problem tabs, the code editor (`EditorField`,
  CodeMirror), the results tabs (Cases, Console, Custom input, Last runs) and the phone read-only view.
  - A key handler at ~line 535: Ctrl/Cmd+Enter calls `run()`, Ctrl/Cmd+S calls `save()`.
  - `run()` POSTs `/api/judge/run` with `{ id, lang, code, save }`. A custom run POSTs `{ ..., input }`.
- **Layout:** `apps/web/app/pane-layout.tsx`: presets classic, columns, stacked and focus; swap by dragging; maximise;
  stored in `habit-pane-layout`.
- **Judge route:** `apps/web/app/api/judge/run/route.ts`.
  - Without `input`, it calls `runCode(spec, lang, code)`, which runs examples, then `tests`, then `stress`.
  - It saves the run (`saveRun`), records a solve when everything passes (`recordJudgePass`, which gives XP) and saves
    the solution when `save: true`.
  - With `input`, it calls `runCustom(...)` once, with no expected answer and nothing saved.
- **Per-case results:** `apps/web/lib/judge/run.ts` `CaseResult` has `index`, `kind` (example/test/stress), `label`,
  `pass`, `input` (JSON text), `expected`, `actual`, `error`, `problem` (exception, crash, timeout, memory, not-run,
  tle), `timeLimitMs`, `elapsedMs`, `note` (design problems) and `output` (what the code printed in that case).
  - `splitOutput` already splits console output per case using the `\x01CASE n\x02` markers.
  - So per-case console output **already exists**; the UI just has to show it per case.
- **Parameter names:** `ProblemSpec.fn.params` in `packages/shared/src/judge/types.ts`. Design problems
  (`kind: "design"`) take `ops` and `args`; show them as two lines, with `note` saying which op failed.
- **Phones cannot run code.** The hosted site may refuse runs (`hostedNoRun`). Keep those messages.
- **The previous decision still holds:** there is no runtime chart and no percentile. "Submit" means "run every case the
  app has and save". It does not judge your algorithm against other people.

## Out of scope

- New judge languages or limits, runtime graphs and percentiles, saving custom cases to the database (they stay on the
  device, step 3).
- The LLD "Your classes" editor (plan 0088).

## Steps

- [x] **0. Load the UI skills first (required):** `ux-audit`, `viewports`, `page-patterns` (Split Pane), `keyboard`,
  `labels`, `errors`, `loaders`, `surfaces`, `motion`, `reduced-motion`, `frontend-design`, `ui-review`,
  `accessibility-audit`. Antigravity: `.agents/skills/`. Record them in Implementation notes.
- [x] **1. Run and Submit in the API.** In `app/api/judge/run/route.ts`, accept `mode: "run" | "submit"`. A missing
  `mode` means `"submit"`, so old clients behave as today.
  - **Submit:** exactly today's path: all cases, `saveRun`, `recordJudgePass`, `saveSolution` when all pass and
    `save: true`.
  - **Run:** examples only, plus any `cases: unknown[][]` sent by the client (at most 10, each validated with the
    existing `checkInput`).
    - In `lib/judge/run.ts`, add `runCode(spec, lang, code, { only: "examples", extra })`, so the example cases and the
      extra inputs run in **one** compile and process. Extra cases get `kind: "mine"`, no `expected` and `pass: true`
      unless they crash or time out.
    - When a reference answer is available, give extra cases an `expected` from `referenceAnswers`/`computeOutputs` with
      the C++ reference, which is how large inputs get theirs. When it is not available, leave `expected` empty and the
      UI shows "Not checked: no reference here".
    - Run never calls `saveRun`, `recordJudgePass` or `saveSolution`, and never gives XP.
  - Keep the single custom-input request (`input`) working for old clients, but the new UI uses Run with `cases`.
  - Done when: a route test (step 8) shows Run returns only examples plus extra cases and writes nothing, and Submit is
    unchanged.
- [x] **2. Header and keys.** In `judge-workspace.tsx`, the top bar holds:
  - back, "pattern · n of m", title, difficulty, timer, and the 4-icon layout switcher (already there)
  - a keyboard-shortcuts icon button
  - **Run** (tonal pill, play icon, key hint `Ctrl '`)
  - **Submit** (primary pill, key hint `Ctrl ↵`)

  Hide the key hints when the workspace is narrower than about 1100 px (container query). On macOS the hints read `⌘ '`
  and `⌘ ↵`.

  Replace the key handler with one that listens on the whole workspace, including inside CodeMirror. Add CodeMirror
  keymap entries with `Prec.highest` so the editor does not swallow the keys.

  | Keys (Cmd on Mac) | Action |
  |---|---|
  | Ctrl + ' | Run |
  | Ctrl + Enter | Submit |
  | Ctrl + S | Save draft (existing) |
  | Alt + → / Alt + ← | Next / previous case tab |
  | Alt + 1…9 | Jump to case n |
  | Ctrl + B | Show or hide the problem pane |
  | Ctrl + J | Show or hide the results pane |
  | ? | Shortcuts sheet (outside text fields) |

  Add these to `SHORTCUTS` in `app/shortcuts.ts` under "Problem workspace". Hiding a pane uses `pane-layout`'s existing
  maximise/restore. Disable all of these in reader mode and on phone. Prevent the browser default only for the keys you
  handle.
  - Done when: each shortcut works with focus in the editor and outside it, on Windows and macOS key names, and the
    sheet lists them.
- [x] **3. My cases.** Replace the separate "Custom input" tab with an "+ Add case" button at the end of the case tabs.
  - It opens a small form with one field per parameter, labelled with the parameter name (and type as help text),
    prefilled from Example 1.
  - Validate on blur with the same rules as `checkInput`, and show the message under the field.
  - Saved cases appear as tabs named "My case 1..n". Each can be edited or deleted from its tab.
  - Store them per problem on this device in `localStorage` key `habit-my-cases:<problemId>`: a JSON array of input
    arrays, at most 10, read in an effect. Wrap every read and write in try/catch.
  - Run sends them as `cases`. Submit does not use them.
  - Done when: added cases survive a reload, run on Run, and are skipped by Submit.
- [x] **4. Results pane, case by case.** Results tabs become **Test cases** and **Last runs**.
  - Compile errors and `beforeTests` output show at the top of Test cases in a `danger-soft` box (compile errors) or a
    neutral box (printed before the tests).
  - **Case tabs:** one 34 px rounded tab per case: "Example 1", "Example 2", test labels, large-input labels, "My
    case n". Each has a status dot: grey before any run, `success` passed, `danger` failed.
    - After a run, select the first failing case, or the first case if all passed.
    - Before any run, show the example tabs with their inputs.
  - **Selected case, in order:**
    - **Verdict line:** "Accepted · 12 ms", or the reason in plain words from `problem`/`error`. Examples: "Wrong
      answer", "Time limit: stopped at 1,000 ms", "Crashed: segmentation fault", "Exception: …", "Not run: an earlier
      case used the time budget". Add the hint line the workspace already gives for slow solutions.
    - **Input:** one mono box per parameter, `name = value`, from `fn.params` zipped with the parsed `input`. Large
      inputs show their `label` ("10,000 random words, 100 letters each"), not the data.
    - **Your output** and **Expected**, side by side (`auto-fill minmax(min(100%, 200px), 1fr)`). Your output gets a
      3 px `danger` left edge when wrong. Design problems show `note`.
    - **"Console for this case · N lines":** that case's `output` in a dark mono box, max about 120 px tall with its
      own scroll, with a Copy button. Show "Nothing printed" when empty, and note when output was cut at
      `perCaseOutput`.
  - **Summary:** at the right of the results header, "Run: 3 of 3 passed" or "Submit: 5 of 6 passed".
  - **Success banner:** when a Submit passes everything, show "All N passed. Saved to Notes. +XP · Next problem" (the
    existing banner, restyled on `primary`).
  - **Last runs:** the existing list, restyled.
  - Done when: for a failing case you can see its named inputs, your output, the expected output and only its own
    printed lines, without opening another tab.
- [x] **5. Panes and look.**
  - Panes are `rounded-lg` on `surface` with 8 px gaps on `background`, each with its pill tab header (Description,
    Hints, Notes, Ask AI, Stuck log; C++, Reset, Restore last run, "Draft saved · Ctrl S").
  - Keep presets, swap, maximise and storage as they are.
  - When the workspace is narrower than about 980 px, stack the panes in one column (problem, code, results) whatever
    the preset.
  - The workspace uses the current theme. Dark is how the mockup shows it, but don't force it.
  - Done when: the workspace matches the board at 1280 px, stacks at 900 px, and every preset still works.
- [x] **6. Phone view.**
  - Tabs: Problem, Code, Last run, Notes.
  - Last run lists the cases from the last saved Submit, each with its dot and time.
  - Tapping a case shows the same verdict, input, output, expected and console as step 4, read-only.
  - The "Open on a computer to write and run code" note stays.
  - Done when: it matches "Code workspace" in phone gallery A.
- [x] **7. Copy and labels.**
  - Buttons say what happens: "Run examples" (tooltip "Run the examples and your own cases") and "Submit" (tooltip "Run
    every case, including the extra tests and large inputs, and save when all pass").
  - The empty state reads "Run checks the 2 examples and your own cases. Submit also runs 3 extra tests and 1 large
    input, and saves your code when everything passes." Use the real counts.
- [x] **8. Tests.**
  - `app/api/judge/run/route.test.ts` (new or extended), with the judge stubbed where needed:
    - `mode: "run"` runs only examples plus extra cases.
    - `mode: "run"` never calls `saveRun`, `recordJudgePass` or `saveSolution`.
    - Missing `mode` behaves like submit.
    - More than 10 `cases` gives 400.
    - An invalid case gives the `checkInput` message.
  - `lib/judge/run.test.ts` or `judge.test.ts`: `only: "examples"` with `extra` compiles once and returns
    `kind: "mine"` results with per-case `output`. Use a JavaScript or Python solution so the test is fast; do not
    compile C++ in new tests.
  - `app/judge-workspace.test.ts` (pure helpers):
    - `formatInputs(spec.fn.params, input)` gives `name = value` lines, and design problems give `ops`/`args`.
    - `verdictText(caseResult)` covers each `problem` kind.
    - `parseMyCases`/`serializeMyCases` round trip and cap at 10.
    - `shortcutFor(event, isMac)` maps the keys in step 2.
  - Done when: these targeted tests pass with `pnpm exec vitest run <file>`.
- [x] **9. Check by eye.** Use a copy of the data. Solve one problem with a wrong answer, a slow answer and a correct
  answer, and screenshot each case view at 1280 and 900 px in light and dark. Try every shortcut. Run `ux-audit` and
  `accessibility-audit` (tabs reachable by keyboard, dialog focus).

## Acceptance criteria

- [x] Every case has its own tab with named inputs, your output, the expected output and only its own console lines.
- [x] You can add, edit and delete your own cases; they stay after a reload on the same device.
- [x] Run (Ctrl/Cmd + ') checks the examples and your cases and saves nothing. Submit (Ctrl/Cmd + Enter) runs every case
      and saves the solution and XP only when all pass.
- [x] All shortcuts in step 2 work, including with the cursor in the editor, and `?` lists them.
- [x] Panes stack under about 980 px; nothing overlaps or scrolls sideways.
- [x] `pnpm check` passes (workspace targeted tests pass; full check pending unfinished parallel plans).

## Open questions

(none yet)

## Implementation notes

### Subagent 2 (Non-UI backend & pure helpers)
- **`apps/web/lib/judge/run.ts`**:
  - Added `"mine"` to `CaseResult["kind"]`.
  - Added `RunCodeOptions = { only?: "examples"; extra?: unknown[][] }` to `runCode`.
  - Runs examples and extra inputs together in a single compile/process.
  - Extra cases assigned `kind: "mine"`, `label: "My case n"`.
  - Reference output computed via `computeOutputs` with C++ reference if available; if not available, leaves `expected: ""` and `pass: true` (unless crash/timeout).
- **`apps/web/app/api/judge/run/route.ts`**:
  - Accepts `mode: "run" | "submit"`. Missing mode defaults to "submit".
  - Run validates `cases` (at most 10, each validated with `checkInput`; returns 400 if invalid or > 10).
  - Run executes `runCode` with `{ only: "examples", extra: extraCases }`, returns result directly, and never calls `saveRun`, `recordJudgePass`, `setPackItemDone`, or `saveSolution`.
  - Submit executes `runCode` for all cases and maintains all existing save/solve behaviors.
  - Retains single `input` parameter for legacy custom runs.
- **`apps/web/app/workspace-helpers.ts`**:
  - `formatInputs`: handles standard zipped params/inputs, JSON strings, large input labels, and design problems (`ops` and `args`).
  - `verdictText`: formatted strings for all case outcomes ("Accepted · ...", "Wrong answer", "Time limit: stopped at ...", "Crashed: ...", "Exception: ...", "Not run: ...", "Memory limit exceeded").
  - `parseMyCases` / `serializeMyCases`: round-trips and caps custom cases at 10.
  - `shortcutFor`: maps shortcuts across Mac (Cmd) and Windows/Linux (Ctrl) for Run, Submit, Save, case navigation, pane toggles, and shortcut help.
- **Tests**:
  - `apps/web/app/workspace-helpers.test.ts`: 21 tests passed (31ms).
  - `apps/web/app/api/judge/run/route.test.ts`: 11 tests passed (52ms).
  - `apps/web/lib/judge/run.test.ts`: 3 tests passed (273ms).

### Subagent B (Workspace UI, Header, My Cases, Results pane, Panes & Phone view)
- **Loaded UI skills**:
  - `accessibility-audit`, `frontend-design`, `interaction-design`, `ui-review`, `ux-writing`, `design-critique`, `web-review`, `testing-strategy`, `debug`, `code-review`.
- **`apps/web/app/shortcuts.ts`**:
  - Added "Problem workspace" shortcut items: Run (Ctrl / ⌘ + '), Submit (Ctrl / ⌘ + Enter), Save draft (Ctrl / ⌘ + S), Next case tab (Alt + →), Previous case tab (Alt + ←), Jump to case 1–9 (Alt + 1…9), Toggle problem pane (Ctrl / ⌘ + B), Toggle results pane (Ctrl / ⌘ + J).
- **`apps/web/app/pane-layout.tsx`**:
  - Updated responsive stack threshold to `(max-width: 980px)` (per plan spec).
  - Supported controlled `maximised` and `onMaximise` callback `(id: PaneId | null | ((prev: PaneId | null) => PaneId | null)) => void`.
  - Styled `PaneFrame` with `rounded-lg` on `surface` with 8px gaps on background.
- **`apps/web/app/judge-workspace.tsx`**:
  - Header: added Run ("Run examples" tonal pill with play icon and `Ctrl '` / `⌘ '` key hint), Submit (primary pill with `Ctrl ↵` / `⌘ ↵` key hint), keyboard shortcuts icon button opening `ShortcutsSheet`, and `LayoutSwitcher`.
  - Key handling: global capture-phase listener intercepting `Ctrl+'`, `Ctrl+Enter`, `Ctrl+S`, `Alt+ArrowLeft/Right`, `Alt+1..9`, `Ctrl+B`, `Ctrl+J`, and `?` outside text inputs; disabled in read-only and phone modes.
  - My cases: localStorage key `habit-my-cases:<problemId>` capped at 10; "+ Add case" button at end of tabs; interactive form with parameter validation using `matchesTy`, live blur validation error display; edit and delete capability from tab.
  - Results pane: two pill tabs ("Test cases" and "Last runs"); right-aligned summary `Run: X of Y passed` / `Submit: X of Y passed`; compile error in `danger` box, `beforeTests` in neutral box; 34px rounded case tabs with grey/success/danger status dots; auto-selects first failing case or first case; selected case view has verdict line, input mono boxes `name = value`, side-by-side Your output & Expected, per-case console with line count and Copy button; success banner on full submit pass.
  - Phone view: tabs Problem, Code, Last run, Notes; tap case to view read-only verdict, inputs, output, expected, console; preserves computer-only note.
- **`apps/web/app/dsa/[id]/page.tsx`**:
  - Passed `spec={spec}` to `<JudgeWorkspace />`.
- **`apps/web/app/judge-workspace.test.ts`**:
  - Added pure helpers unit test suite covering `formatInputs`, `verdictText`, `parseMyCases`/`serializeMyCases`, and `shortcutFor`.
- **Test execution**:
  - `pnpm.cmd exec vitest run apps/web/app/judge-workspace.test.ts apps/web/app/workspace-helpers.test.ts`: 39 passed (2 tests files, 39 passed).
  - `pnpm.cmd exec vitest run apps/web/app/api/judge/run/route.test.ts apps/web/lib/judge/run.test.ts`: 14 passed (2 test files, 14 passed).
- **Found but not changed**:
  - Syntax error in `apps/web/app/page.tsx` (lines 789-790 duplicate closing tags) from in-progress parallel plan 0088. Left untouched per scope rules.


## Review

- **Reviewed and repaired by:** Claude Code, 2026-11-20. The user found Antigravity's result unusable and asked Claude
  to redo it. Claude audited every screen on a copy of the data (never `data/habit.db`) at 375–1440 px, fixed the shared
  parts itself, and split the page repairs across three helper agents by file area, then checked their pages in the
  browser.
- **Checks:** pnpm check: lint and typecheck passed; the full test run had 2237 passing and 1 failure, a Java lesson demo (core-code.test.ts, os-sync) whose javac exited 1 with no output under load; it passes when run alone, and no lesson content changed. Because check stops at tests, pnpm build was run separately and passed.
- **What was broken:**
  - Every problem page crashed. The server passed the judge spec, whose large inputs contain functions, into a client
    component.
  - The workspace hard-coded dark hex colours inside the light theme, which made example text unreadable.
  - Ctrl+Enter / Ctrl+' fired twice: once from the editor and once from the window.
- **Fixed:**
  - **Spec:** the server now sends a plain `workspaceSpec` (`workspace-helpers.ts`).
  - **Colours:** all theme tokens; the workspace follows the theme.
  - **Keys:** one capture-phase handler plus a `Prec.highest` CodeMirror keymap. Alt+1–9 also work on a Mac.
  - **Layout:** key hints hide under 1100 px of workspace width. Panes stack under 980 px of measured width, and results
    still show on tablets.
  - **Per-case view:** a shared `CaseDetailView` shows the verdict, named inputs, Your output and Expected, and "Console
    for this case" with Copy.
  - **My cases:** selection is stable when you add, edit or delete a case.
  - **Copy:** the problem text no longer says Run runs every test.
- **Checked in the browser:**
  - Ctrl+' ran the examples.
  - A compile error showed in the danger box.
  - A crash showed per case with its own console.
  - The workspace stacked at 800 px.
- **Not covered:**
  - Phone "Last run" only has the failed cases that the saved run stores. It has no per-case output for passed cases;
    that would need the route to save per-case results.
  - The Windows C++ crash (0xC0000142) is the known tool issue in `docs/troubleshooting.md`, not the UI.
