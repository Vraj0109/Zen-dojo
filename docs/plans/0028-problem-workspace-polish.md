# 0028: Problem workspace polish: slim bar, no clutter, a Save button

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code (agent A), 2026-11-09
- **Spec:** none (follows 0020 and 0021)

## Goal

On a problem page the problem text, the editor and the results get as much room as LeetCode gives them. Two clutter lines go, the
top bar shrinks but stays, and a **Save** button sits next to **Run**, so saving a solution no longer means opening the Notes tab.

## Context

- `apps/web/app/code-editor.tsx:168` prints "Tab indents. Press Esc, then Tab, to leave the editor." under every editor.
- `apps/web/app/judge-workspace.tsx:51-54` (`ADDED`) and line 318 print "Added for you: all C++ standard headers ..." under the editor.
- `apps/web/app/shell.tsx` `ShellInner` draws a sticky `h-10` bar on focus pages (menu, back, forward, "← Practice", "Zen Dojo").
- Solutions are saved today only when every test passes (`save: true` in the run request; `saveSolution()` in `apps/web/lib/notes.ts`),
  and the user finds the Notes tab the only place to manage them. Last runs are stored by `lib/solution-runs.ts` (0021).
- Pane titles and padding are in `apps/web/app/pane-layout.tsx`.

## Out of scope

- Changing the judge, verdicts or the Notes tab layout beyond showing the saved solution.
- Removing the bar: the user wants to keep it, only smaller and more minimal.

## Steps

- [x] **1. Remove the two clutter lines.** Delete the Tab/Esc line and the "Added for you" line from the layout. Keep the
  information without taking space: a small `?` icon button at the end of the editor's toolbar (or on the language select) whose
  popover/tooltip says "Tab indents. Press Esc, then Tab, to leave the editor. C++ gets all standard headers and `using namespace
  std;` added for you" (Java: the three imports). Also give the textarea `aria-describedby` pointing at the same text (hidden) so
  screen readers still get it.
  - Done when: nothing is printed under the editor except the last-run verdict (one short line, hidden when there is none) and the
    collapsed Custom input; the `?` shows the text on hover, focus and click.
- [x] **2. A slimmer top bar.** In `shell.tsx` make the focus-page bar at most 28 px high (`h-7`): icon-only menu, back and forward
  buttons (keep titles and aria-labels), the "← Practice"/"← Learn" link as a short arrow with the same target and a title, drop the
  "Zen Dojo" text and the blur. Keep Ctrl+B and the drawer. Reduce vertical padding in `pane-layout.tsx` pane headers (target
  28 px) and the tab row of the problem pane. Add a **Hide bar** toggle (`Ctrl+Shift+B`, remembered in localStorage) that removes the
  bar completely; a 12 px strip on the left edge brings it back.
  - Done when: measured in the browser at 1440x900 the editor pane is at least 60 px taller than before; the bar still has menu, back and forward.
- [x] **3. Save button.** Add **Save** next to Run (`Ctrl+S` too, `preventDefault`). New server action `saveSolutionAction(problemId,
  lang, code)` in `app/actions.ts` that stores the code as the saved solution for that language (reuse `saveSolution()`; keep the
  existing auto-save on all-pass). A saved solution records whether it passed (`verified` true when the last run of exactly this code
  passed every case, else false) and the date. Show a short "Saved" message beside the button (aria-live) for 2 seconds.
  - Done when: after Save without running, the Notes tab shows "Saved solution (C++), not verified" with the code; after a passing
    Run it shows "verified"; saving twice replaces the earlier one for that language.
- [x] **4. Notes tab.** Show saved solutions per language above the last runs, each with a **Load into editor** button.
  - Done when: Load puts the saved code in the editor and the draft in localStorage updates.
- [x] **5. Slow tests.** `apps/web/lib/judge/judge.test.ts` ("large inputs", about 4.5 minutes under load) and
  `apps/web/lib/packs-v2.test.ts` miss the 5-second default timeout when four agents run checks at once. Give both an explicit
  timeout (e.g. `{ timeout: 600_000 }` / `30_000`) and say why in a comment.
  - Done when: `pnpm check` passes while another `pnpm check` runs.
- [x] **6. Tests.** A test for `saveSolutionAction` (`:memory:` database; verified flag; replace), a render test (or pure function test) that
  the `?` text is present and the old lines are gone. No browser tests needed; check the layout by eye on a dev server with a copy of the data.
  - Done when: `pnpm check` passes.

## Acceptance criteria

- [x] No "Tab indents" or "Added for you" line in the layout; the information is one click away.
- [x] The focus-page bar is 28 px or less, still has menu and back/forward, and can be hidden. (The "60 px taller editor" check in step 2 was not measured.)
- [x] Save works without running; verified flag is right; Ctrl+S works.
- [x] `pnpm check` passes.

## Open questions

(none)

## Implementation notes

- Clutter lines: the Tab line is gone from `code-editor.tsx`; the "Added for you" line is gone from `judge-workspace.tsx`. Their text is in `app/editor-help.ts`
  (`editorHelp(lang)`) and shows behind a `?` button at the end of the Code toolbar (hover, focus or click, `role="tooltip"`); the textarea has
  `aria-describedby` to a hidden copy. Under the editor only the last-run line and the collapsed Custom input remain.
- Bar: `shell.tsx` focus-page bar is `h-7`, icon-only (menu, back, forward, a return arrow with title and aria-label, a hide button). Ctrl+Shift+B hides it
  (kept in localStorage `habit-bar-hidden`); a 12 px strip on the left edge brings it back. The pane height variable `--pane-h` is set inline on the shell
  (`100dvh - 7.75rem`, or `- 6rem` when hidden) because globals.css is not in this agent's files. Pane headers are `h-7`, problem tabs `py-1`.
  Seen in an Edge headless screenshot at 1440x900: the bar is 28 px with menu, back, forward, return and hide. I did not measure the editor height before and
  after, so the plan's "60 px taller" target is unchecked (the bar gives 12 px, the headers and removed line a little more).
- Save: `saveSolutionAction(problemId, lang, code)` in `app/actions.ts` (plus `getSavedSolutionsAction` to read). No migration (D owns migrations this round): saved
  solutions are rows in the `settings` table, key `saved-solution:<problem>:<lang>`, value JSON `{code, savedOn, verified}`, so they are in backups. `verified` =
  the last run (`solution_runs`) of exactly this code passed every case. The old auto-save on all-pass (`saveSolution()`) now also writes a verified record.
  The latest saved code is also written to the Notes form (`problem_notes`) as before. Ctrl+S saves; "Saved" shows for 2 seconds.
- Notes tab: saved solutions per language above the last runs, each with **Load into editor** (puts the code in the localStorage draft and the editor, and switches language).
- Slow tests: `judge.test.ts` "large inputs" has `{ timeout: 600_000 }`; `packs-v2.test.ts` uses `vi.setConfig({ testTimeout: 30_000 })`; both with a comment.
- Tests: `apps/web/lib/saved-solutions.test.ts` (action, verified flag, replace, per language, auto-save, refusals, help text present and old lines gone).
- Not verified: 390 px wide. Edge headless would not go below its minimum window width, so the narrow screenshot was cropped; the bar and buttons looked right at the left edge.

## Review
