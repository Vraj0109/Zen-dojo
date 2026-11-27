# 0118: "Write with AI" on every admin edit field: copy a full prompt, paste the answer back

- **Status:** in-progress (wave 1 done, see docs/plans/wave1-content-db.md)
- **Planned by:** Claude Code, 2026-11-23
- **Implemented by:** (implementer fills in)
- **Series:** content in the database (0112 to 0119), overview `docs/architecture/content-in-db.md`.
- **Needs:** 0116 (admin editor, page editor, page Markdown format, draft validation).

## Goal

Every field an admin can edit (a problem statement, test cases, hints, a solution page, one code block, one text or
diagram block, a lesson section, a whole lesson, a course summary) has an **AI** button. It copies a ready prompt that
holds everything the AI needs: the content around the field (problem, course, lesson, neighbouring sections), what
this field is for, the house writing rules for this kind of content, and the exact format the answer must come back
in. The admin pastes the prompt into any AI (ChatGPT, Claude, Gemini, a local model), pastes the answer back into the
same panel, sees it checked and compared with the current text, and applies it to the draft with one click. Nothing is
saved until the admin saves as usual, so preview, validation and Run tests still apply.

## Context

- The editor and its pieces come from plan 0116: problem editor tabs (Statement, Test cases, Hints, Solution page),
  the page editor in `apps/web/app/admin/page-editor/` (blocks view and Markdown view), `ProblemDraft` and block
  operations in `packages/shared/src/content-model/draft.ts`, and the page Markdown format
  (`page-markdown.ts`: `pageToMarkdown` / `markdownToPage`).
- Templates and slots (`packages/shared/src/content-model/templates.ts`, plan 0112) say what each part of a page is
  for. Add a one-line `purpose` and a `rules` list per slot there, so prompts and the editor share them.
- Existing prompt code for learners is in `packages/shared/src/ai-prompts.ts` (`clip`, size limits) and
  `apps/web/lib/ai/` (providers: local Ollama, GGUF, bring-your-own-key in `byok.ts`). Reuse `clip`; do not change the
  learner chat.
- Judge signatures per language: `templateFor(spec, lang)` in `packages/shared/src/judge/templates.ts`. Code prompts
  must include the exact class and method signature for the target language, so the answer compiles in the judge.
- House rules to put into prompts (keep them in one module so they are easy to edit later): plain, specific language,
  short sentences, no hype (AGENTS.md "Writing for the user"); content written for this app, never copied from books
  or sites; hints are 3 or 4 steps, smallest nudge first, never code, never the full answer in hint 1, leading to the
  optimal approach (plan 0092); walkthrough sections follow the interview path (brute force, then optimal); code is
  idiomatic, commented only where it helps, matches the stated complexity.
- Clipboard: `apps/web/app/copy-button.tsx` exists; reuse its fallback (select the text when `navigator.clipboard`
  fails).

## Out of scope

- Calling an AI automatically on save, or batch-generating many items. Learner-facing AI features.
- Storing prompts or AI answers in the database.

## Steps

- [ ] **1. Prompt targets and builders (pure).** New `packages/shared/src/content-model/admin-ai.ts`:
  - `type AiTarget` = `problem-statement` | `problem-constraints` | `test-cases` | `hints` | `solution-page` |
    `code-block` | `text-block` | `diagram-block` | `section` | `lesson-page` | `course-summary` | `doc`.
  - `type AiMode` per target, for example: `write` (field empty), `improve`, `fix-format`, `shorter`;
    test cases add `more-edge-cases`; code blocks add `add-language:<lang>`, `write-brute`, `write-semi`,
    `write-optimal`, `explain-complexity`; diagrams add `draw-from-text` (turn the section's text into a diagram).
    `modesFor(target, field)` returns the modes that make sense (no `improve` on an empty field).
  - `buildAdminPrompt({ target, mode, context, current })` → one string with these parts, in this order, each under a
    plain heading: **Task** (one sentence), **Where this goes** (course → lesson → slot heading and purpose, or problem
    title and tab), **Context** (see below), **Current content** (or "empty"), **Rules** (house rules + the slot's
    rules), **Answer format** (exact format, one short valid example, and "Reply with only one fenced block in this
    format, nothing before or after it").
  - Context by target: problem targets get title, difficulty, statement, constraints, signature (`fn` / design spec),
    examples, the first 10 tests, current hints, and the labels and complexities of the solution's code blocks; code
    targets add the judge template for the language (`templateFor`) and, for `add-language`, the same block's code
    in the other languages; lesson targets get course title, lesson title, the template's slot list, the full page in
    page Markdown (clipped), and for concept lessons the checklist points from `study.ts`.
  - Clip each part with `clip` so the whole prompt stays under 24,000 characters; when something is cut, the prompt
    says so ("first 10 of 54 test cases shown").
  - Answer formats: hints → numbered Markdown list; test cases → JSON array `[{ "input": [...], "output": ... }]`
    matching the signature; code block → one fenced block in that language; text block → Markdown with no `#`
    headings; diagram → one `mermaid` fence; section, solution page, lesson page → the page Markdown format from 0116
    limited to the slots involved; statement → Markdown; constraints → one per line; doc → JSON for that kind.
  - Done when: `admin-ai.test.ts` passes (step 5).
- [ ] **2. Answer parsers (pure).** Same file: `parseAiAnswer(target, mode, text, context)` →
  `{ ok: true, value } | { ok: false, errors: string[] }`. It finds the first fenced block when there is one (models
  often add chatter), else uses the whole text; then parses with the target's format (JSON, `markdownToPage`, list
  items). It then runs the same validation as a save (`validateProblemDraft` for the affected part,
  `validatePageAgainstTemplate`, test case arity against the signature, hint count and length) and returns readable
  errors ("Case 3 has 1 input but the function takes 2").
  - Done when: parser tests pass (step 5).
- [ ] **3. Server action for context.** `apps/web/app/admin/ai-actions.ts`: `buildAiPromptAction(formData)` with
  `target`, `mode`, `entity`, `id`, the field or block id, and the current draft JSON (unsaved edits count). Starts
  with `requireAdminAction()` (the 0113 guard test checks it). Loads the extra context from the content repo (course,
  study checklist, neighbouring lessons' titles), calls `buildAdminPrompt`, returns `{ prompt, chars }`.
  - Done when: an action test returns a prompt containing the draft's unsaved hint text.
- [ ] **4. The AI button and panel.** `apps/web/app/admin/ai-assist.tsx` (client), placed on: each problem tab field
  (statement, constraints, test cases table, hints list), each block's toolbar in the page editor, each section header,
  the page header (whole page), the course summary field, and the doc JSON editor. Behaviour:
  - Click **AI** → a small menu of the modes for that field (`modesFor`).
  - Pick a mode → the panel opens beside the field with **Copy prompt** (copies; shows "Copied" and the character
    count; if copying fails, the prompt is shown selected in a read-only box) and a collapsed **Show prompt**.
  - Under it, **Paste the AI's answer** (textarea) and **Check answer** → errors from `parseAiAnswer`, or a
    side-by-side diff of current vs proposed (line diff; for test cases a table of added/changed/removed cases).
  - **Use this** applies the value to the draft (replacing that field or block, or for `add-language` adding the tab;
    for `more-edge-cases` appending cases), marks the field "Changed by AI answer, not saved", and closes the panel.
    **Undo** puts the old value back until the next save.
  - Without JS: the AI button is a link to `?ai=<target>:<field>&mode=<mode>` that renders the prompt in a read-only
    textarea and a paste form that posts to the same parser; applying re-renders the editor with the value in the
    draft.
  - Done when: on a seeded problem, "Hints → Improve" copies a prompt with the statement and current hints, and
    pasting a 4-item numbered list shows a diff and updates the hints in the draft.
- [ ] **4b. Optional: ask the app's AI directly.** When `apps/web/lib/ai` reports an available provider (local model on
  desktop, or the admin's own key), the panel also shows **Ask my AI**, which sends the same prompt through the
  existing provider code and streams the answer into the paste box. The admin still checks and applies it. Skip this
  step if it needs changes to the learner chat code; note it as a follow-up.
  - Done when: with a local model configured, the answer appears in the paste box.
- [ ] **5. Tests.**
  - `packages/shared/src/content-model/admin-ai.test.ts`: for every target, the prompt contains the task, where it goes,
    the rules for that slot and the answer format; code prompts contain `templateFor(spec, lang)`; `add-language`
    includes the other languages' code; clipping keeps the prompt under 24,000 characters and says what was cut;
    `modesFor` hides `improve` for empty fields.
  - Parsers: each format accepts a clean answer, an answer wrapped in chatter with one fence, and Windows line endings;
    rejects wrong JSON, wrong test arity, a hint list with code in it (fence inside a hint), a page answer with a heading
    not in the template, a Mermaid answer without a `mermaid` fence.
  - `apps/web/app/admin/ai-actions.test.ts`: non-admin gets "Not allowed." and no prompt; admin gets a prompt that uses
    the unsaved draft.
  - Done when: targeted runs pass, then `pnpm check` once.
- [ ] **6. Docs.** A section "Writing with AI" in `docs/content-editing.md`: where the buttons are, the modes, that the
  answer is checked before it is used, and that a human still reads and saves it.
  - Done when: the section exists.

## Acceptance criteria

- [ ] Every edit field in the problem editor, the page editor (block, section, page), lessons and course summaries has
      an AI button with modes that fit that field.
- [ ] The copied prompt holds the surrounding content, the rules for that kind of content and the exact answer format.
- [ ] A pasted answer is checked; bad answers show clear errors; good ones show a diff and can be applied to the draft
      and undone before saving.
- [ ] Nothing is saved until the admin presses Save; non-admins cannot get prompts.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
