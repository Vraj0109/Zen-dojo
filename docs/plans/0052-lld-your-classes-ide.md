# 0052: An IDE in the LLD "Your classes" section

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-10
- **Implemented by:** (implementer fills in) Claude Code agent C, Antigravity agents E and F (see "Agents")
- **Spec:** builds on plan 0043 (Java IDE) and plan 0050 (sync of notes)
- **Priority:** 2 (do right after 0051)

## Goal

On a low-level design page, the **"Your classes"** box (where you write your own design to practice and compare) becomes
the multi-file Java editor: tabs per class, add and delete files, Run, console with output and compiler errors. Your
files are saved with the problem like your notes are, come back on reload, and sync to your other devices.

The IDE that exists today is the separate "Playground" (plan 0043), which starts from the reference project. This plan
is about **your own** attempt, in the place where the plain text box is now.

## Context (verified)

- `apps/web/app/notes-form.tsx` renders the notes form with `codeLabel` / `codePlaceholder`; for LLD pages
  `apps/web/app/study/[area]/[id]/page.tsx` passes `codeLabel="Your classes"` (line near 495) and the form posts to
  `saveNoteAction` (`apps/web/app/actions.ts`), which calls `saveNote` in `apps/web/lib/notes.ts` and stores one text
  `code` and one `language` in `problem_notes` (limits in `NOTE_LIMITS`, languages in `LANGUAGES`). This table already
  syncs to the cloud (plan 0050), so nothing new is needed for sync if the files live in `code`.
- `apps/web/app/components/project-editor.tsx` (`ProjectEditor({ projectId, initialFiles })`) is the multi-file editor. It
  keeps files in `localStorage` (`zen-dojo:project:<projectId>`), runs through `POST /api/judge/run-project`, and
  shows diagnostics. It does not know about the notes form.
- `apps/web/app/study/[area]/[id]/project-playground.tsx` wraps it as "Playground" with the reference files.
- System design pages use the same form for "Schema, API or pseudo-code"; they stay a text box.

## Design (decided)

- Storage: the files are saved in `problem_notes.code` as one JSON string: `{"v":1,"files":[{"name":"Main.java","content":"..."}]}`, with `language = "java-project"` (add it to
  `LANGUAGES`). Old plain-text answers keep working: when `language` is not `java-project`, the editor opens them as a
  single file `Main.java` with that text, and saving converts it. Limits: at most 30 files, 200 KB in total (raise `NOTE_LIMITS.code` for this
  language only; keep the old limit for others). Validation (names `^[A-Za-z][A-Za-z0-9_]{0,63}\.java$`, no duplicates, sizes) lives in a pure module `apps/web/lib/project-files.ts`, used by the client and the server action.
- UI: the editor replaces the textarea for LLD pages only. The form's "Save" still saves notes plus files together (one
  hidden field `code` holding the JSON, `language=java-project`), so it works with the existing action. Autosave to
  `localStorage` remains as a draft; the saved copy is the database one. On load the database copy wins unless the
  draft is newer (compare a `savedAt` in the draft); show a small "Unsaved changes" label.
- Starter: new files start from a tiny `Main.java` stub (`public class Main { public static void main(String[] args) { } }`), never the reference answer
  (that is what the Playground is for). "Reset" clears to the stub. A "Show reference" link scrolls to the existing
  reference section; no automatic diff.
- Run: same endpoint and limits as the Playground (`/api/judge/run-project`).
- No new table and no migration.

## Out of scope

- Other languages (Java only); system design pages; diffing your classes against the reference.
- Changing the Playground.

## Agents and file ownership (zero overlap)

Targeted tests only; the lead runs one `pnpm check`. Plain-English local commits, explicit `git add <paths>`; no push, tag or attribution; never touch `data/habit.db`. Read each file once, edit, verify once.

| Agent | Owns | Fast check |
|---|---|---|
| **C** (Claude) Storage | `apps/web/lib/project-files.ts` (+ `.test.ts`), `apps/web/lib/notes.ts` (+ its test file additions) | `pnpm exec vitest run apps/web/lib/project-files.test.ts apps/web/lib/notes.test.ts` |
| **E** (Antigravity) Editor in the form | `apps/web/app/notes-form.tsx`, `apps/web/app/components/project-editor.tsx` (only to add optional props below), `apps/web/app/study/[area]/[id]/page.tsx` | `pnpm --filter web typecheck` + eslint on those files |
| **F** (Antigravity) Tests | `apps/web/app/notes-form.test.tsx` (new, if the repo already has component tests; otherwise `apps/web/lib/lld-classes.test.ts` for the pure parts) | `pnpm exec vitest run` on that file |

## Steps

### Agent C: storage

- [ ] **C1. `project-files.ts`.** Export `ProjectFile`, `MAX_FILES`, `MAX_TOTAL_BYTES`, `emptyProject()` (the stub),
  `parseProjectCode(code, language): ProjectFile[]` (JSON for `java-project`, otherwise one `Main.java` with the old text; never throws, falls back to the stub on bad JSON), `serializeProject(files): string`, and `validateProject(files): { ok: true } | { ok: false; error: string }` per the Design rules.
  - Done when: tests cover round trip, legacy text, bad JSON, duplicate and illegal names, 31 files, oversize.
- [ ] **C2. `notes.ts`.** Add `"java-project"` to `LANGUAGES`; in `saveNote`, when `language === "java-project"` run
  `validateProject(parse)` and refuse (return an error object or throw a plain-English error that the action turns
  into a message) instead of silently truncating JSON; use the larger limit only for this language. An empty project (only the stub) counts as empty so the note row is removed as today.
  - Done when: tests: valid project saved and read back; invalid rejected; plain-text notes unchanged; empty project deletes the row; the existing `notes.test.ts` still passes.

### Agent E: editor in the form

- [ ] **E1. `project-editor.tsx` optional props.** Add `value?: ProjectFile[]`, `onChange?: (files: ProjectFile[]) => void`, `storageKey?: string`, `showReset?: boolean` so it can be controlled by the form (keep the current behavior when they are absent; the Playground must not change).
  - Done when: typecheck passes and the Playground code path is untouched.
- [ ] **E2. `notes-form.tsx`.** For an LLD form (a new prop `javaProject?: boolean`, set from `page.tsx`), render the editor instead of the code textarea: initial files from `parseProjectCode(note.code, note.language)`, hidden inputs `code` (serialized JSON) and `language=java-project`, the "Unsaved changes" label, and the plain-English error from the action when validation fails. Keep the textarea for system design.
  - Done when: lint and typecheck pass; saving and reloading shows the same files.
- [ ] **E3. `page.tsx`.** Pass `javaProject` for LLD (not design); change `codeLabel` text to "Your classes" with a one-line help: "Write your design as Java files and run them. Saved with this problem."; keep the placeholder for design pages.
  - Done when: the page renders for LLD and system design ids.

### Agent F: tests

- [ ] **F1.** Pure-logic tests for what the form does without a DOM (serialize on change, legacy open, error text), plus, if component tests exist in the repo, one render test of the LLD form. Do not add a new test framework.
  - Done when: the file passes and is fast (no compiling Java).

### Final (lead)

- [ ] **Z1.** Pull, `pnpm -r typecheck`, one `pnpm check`; try it on a copy of the database.

## Acceptance criteria

- [ ] On an LLD page, "Your classes" is the tabbed Java editor; add a class, delete a class, Run shows output or compile errors with clickable lines.
- [ ] Save, reload: the same files and active content come back; old plain-text answers open as `Main.java`.
- [ ] Another device signed in to the same account shows the same files after a sync.
- [ ] System design pages still show the text box.
- [ ] Saving more than 30 files or an illegal file name shows a plain message and loses nothing.
- [ ] `pnpm check` passes.

## Pitfalls

- Do not store files in `localStorage` only; the database copy is what syncs and survives a browser reset.
- Run results are not saved, only files.
- The form must keep working without JavaScript for system design pages.

## Open questions

## Implementation notes

## Review
