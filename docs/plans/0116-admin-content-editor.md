# 0116: Admin content editor: problems, test cases, hints and block-based solution pages

- **Status:** in-progress (wave 1 done, see docs/plans/wave1-content-db.md)
- **Planned by:** Claude Code, 2026-11-23
- **Implemented by:** (implementer fills in)
- **Series:** content in the database (0112 to 0119), overview `docs/architecture/content-in-db.md`.
- **Needs:** 0112 (tables, write helpers), 0113 (admin checks, write client, audit), 0114 (repo, invalidation),
  0115 (desktop applies changes locally).

## Goal

An admin edits a problem completely in the app, on the hosted site or in the desktop app: statement, constraints,
function signature, test cases, hints, and the **solution page**. The solution page is a list of blocks the admin
arranges freely: Markdown text blocks and any number of code blocks (Brute force, Semi-optimized, Optimized, or a custom
label), each with code in any language the judge supports. Blocks can be added, removed and reordered. Every Markdown
field has a live preview that looks exactly like the public page. On the desktop app the admin can run the test cases
against any code block before saving. A save is live for everyone at once, with no commit or release. Lessons get a
Markdown editor too.

## Context

- Today's admin portal (plan 0045): `apps/web/app/admin/` with `problems/page.tsx` + `problem-drawer.tsx` (a drawer
  form for **stored** problems in the per-user `content_items` table, built-in problems are read-only),
  `study/[area]/[id]/lesson-editor.tsx` (a patch editor), `markdown-preview.tsx` (client preview without Shiki),
  actions in `actions.ts` (`saveProblemAction`, `updateProblemAction`, `verifyProblemAction`, `deleteProblemAction`)
  and `study-actions.ts`. After this plan all of them edit the content DB, and built-in problems are editable.
- Editors: `apps/web/app/code-editor.tsx` (`EditorField` wraps a `<textarea>` and upgrades it to CodeMirror; the form
  still posts the textarea, so it works without JS). Add `@codemirror/lang-markdown` for Markdown fields (small, same
  family as the existing CodeMirror packages).
- Renderer: `apps/web/app/markdown.tsx` (server, with Shiki highlighting) is what the public pages use.
- Judge languages: `JUDGE_LANGS` in `packages/shared/src/judge/types.ts` (C++, Java, JavaScript, Python).
  `runCode(spec, lang, code)` and `computeOutputs` in `apps/web/lib/judge/run.ts`. Hosted cannot run code
  (`lib/hosted/no-run.ts`, 403 `hosted-no-run`).
- Writes: only the hosted server has the content write token (0113). So:
  - **Hosted**: server action → `requireAdminAction()` → `getContentWriteDb(proof)` → write helpers + `writeAudit` in
    one transaction → `expireContentTagsInAction`.
  - **Desktop**: server action → `requireAdminAction()` → `POST <contentOrigin>/api/admin/content/...` with the user's
    access token (reuse the refresh logic of `workerFetch` in `lib/auth/session.ts`; factor a
    `fetchWithAccessToken(url, init)` out of it) → the hosted route does the hosted path above → the desktop then runs
    the 0115 `syncContent` once so its local copy and caches show the change immediately.
  - Put this choice in one place: `apps/web/lib/content-admin/write.ts` → `saveProblem(proof, draft, baseRev)`,
    `deleteProblem`, `saveLesson`, `restoreFromAudit`. Each returns `{ ok, rev, version } | { ok: false, errors } |
    { ok: false, conflict: true, current }`.
- Conflicts: every save sends `baseRev` (the `rev` the editor loaded). If the stored `rev` differs, nothing is written
  and the editor shows "Someone saved this problem after you opened it" with **Load their version** and **Overwrite**
  (overwrite resends with the new `baseRev`).
- Forms must work without JS (AGENTS.md). Without JS: the whole editor is one form; block "Move up/Move down/Remove/Add"
  are submit buttons (`name="op" value="up:<blockId>"`) handled by the same action that re-renders the draft. With JS:
  the same controls work instantly on client state, plus drag to reorder.
- The user prefers wide layouts: use the full width, editor left and preview right on wide screens.

## Out of scope

- Editing stress generators (code) and judge templates. Editing `docs` kinds other than as raw JSON (step 7 gives a
  JSON editor only). Images upload (Markdown links to existing images only). Multi-user live co-editing.
- Approval workflow or drafts visible to others (a save publishes). Undo beyond "restore a version" from the audit log.

## Steps

- [ ] **1. Draft model and validation (pure).** `packages/shared/src/content-model/draft.ts`:
  - `ProblemDraft` = `ContentProblem` without `rev`/`updated_at`, plus block ids for new blocks (`new-<n>`).
  - `validateProblemDraft(draft)` → `{ ok, errors[] }` (messages say which field and how to fix): id slug rules (from
    today's `SLUG` in `app/admin/actions.ts`), title, difficulty, signature types (today's `TYPES`), every test case's
    `input` length = parameter count and JSON-parsable values, at least one example, hints 0 to 20 of up to 1,000
    characters, blocks: at least one code block with `variant: "optimal"` and C++ code (the judge's reference),
    each code block has at least one language, no duplicate language in a block, labels up to 60 characters,
    custom variant needs a label, total size under 2 MB. Size limits from today's `MAX` table where they exist.
  - Block operations on any `ContentPage`: `addBlock(page, sectionId, type, atIndex)`, `removeBlock`,
    `moveBlock(page, blockId, delta)` (moves across section boundaries inside one slot), `duplicateBlock`,
    `addSection(page, slot, atIndex, title)`, `removeSection`, `moveSection`, `addLanguage(block, lang)`,
    `removeLanguage`. Every page is also checked with `validatePageAgainstTemplate` (0112): required slots present,
    block types allowed in that slot, repeating slots have titles.
  - **Markdown source format** (`packages/shared/src/content-model/page-markdown.ts`): `pageToMarkdown(template, page)`
    and `markdownToPage(template, md)` → `{ page } | { errors: [{ line, message }] }`. Format, close to today's
    `docs/content-editing.md` so it feels familiar:
    - `## <slot heading>` exactly as the template names it; `### <title>` starts a section in a repeating slot.
    - Plain Markdown between fences = a Markdown block.
    - ```` ```mermaid {caption="..."} ```` = a diagram block.
    - ```` ```cpp {block=opt variant=optimal label="Optimal" time="O(n)" space="O(1)"} ```` = a code block; following
      fences with the same `block=opt` (```` ```java {block=opt} ````) add languages to that block. A fence without
      `block=` is a one-language code block.
    - `![alt text](asset:<id> "caption")` alone on a line = an image block.
    Round trip is exact: `markdownToPage(pageToMarkdown(p))` equals `p` apart from new ids for new blocks.
  - Done when: `draft.test.ts` and `page-markdown.test.ts` pass (step 9).
- [ ] **2. Hosted admin API for writes.** `apps/web/app/api/admin/content/problems/[id]/route.ts`: `GET` (full entity
  with `rev`), `PUT` (body `{ draft, baseRev }`), `DELETE` (body `{ baseRev }`);
  `apps/web/app/api/admin/content/lessons/[id]/route.ts` the same; `apps/web/app/api/admin/audit/route.ts` `GET`
  (filters). Each handler starts with `requireAdminRequest` (0113 guard test enforces it), validates with step 1, calls
  `lib/content-admin/write.ts`, then `expireContentTagsInRoute`. Bodies over 2 MB → 413. Answers 409 with the current
  entity on a `rev` conflict. Remove the old `app/api/admin/content/route.ts` item endpoint once nothing uses it
  (0117 deletes the scripts that call it; keep it until then).
  - Done when: route tests pass (step 9).
- [ ] **3. Problem list.** Rewrite `apps/web/app/admin/problems/page.tsx` to list every problem from the content DB
  (built-in and new are the same now): search by id/title, filter by source, difficulty, pattern, "has brute force",
  "missing a language"; columns id, title, difficulty, languages, last edited (from `updated_at`) and by whom (latest
  audit row). **New problem** button. Remove `problem-drawer.tsx` when the editor replaces it.
  - Done when: all 486 seeded problems are listed and filters work without JS (GET form).
- [ ] **4. Problem editor page.** `apps/web/app/admin/problems/[id]/page.tsx` (+ `new/page.tsx`), components in
  `apps/web/app/admin/problems/[id]/`: tabs **Statement**, **Test cases**, **Hints**, **Solution page**, **History**.
  - Statement: title, difficulty, source, pattern, URL, statement (Markdown), constraints (one per line), input and
    output format (Markdown), function signature (name, params `name:type`, return type) or design spec (JSON field
    with validation), `unordered` checkbox.
  - Test cases: table with role (example/test), input (JSON), expected output (JSON), explanation (Markdown, examples
    only); add, remove, move up/down; **Fill expected outputs from the optimal solution** (desktop only; uses
    `computeOutputs` like `fillMissingOutputs` in `lib/content-admin.ts`); paste many cases as a JSON array.
  - Hints: ordered list of Markdown fields; add, remove, move.
  - The statement and the solution page are edited with the page editor (step 4b).
  - Footer: **Save** (disabled while invalid; shows errors next to fields and a summary at the top), unsaved-changes
    warning on leave (JS), last saved by/when.
  - Done when: editing and saving each part of a seeded problem changes the public problem page (after the save,
    without a reload of the server).
- [ ] **4b. Page editor (one component for statements, solution pages and lessons).**
  `apps/web/app/admin/page-editor/` (client components, plus server actions in `page-editor/actions.ts`). Two views of
  the same page, switchable at any time without losing work:
  - **Blocks view.** The template's slot headings are fixed labels (they cannot be deleted or misspelled). Inside a
    slot, sections (with a title field in repeating slots) and their blocks are shown in order. Between any two
    blocks, and at the end of each section, a thin **+** bar opens a menu: **Text**, **Code**, **Diagram**, **Image**.
    Each block has a toolbar: Move up, Move down, Duplicate, Remove (asks to confirm and names the block), and a drag
    handle (JS only). Keyboard: Alt+Up / Alt+Down move the focused block.
    - Text: `EditorField` with `@codemirror/lang-markdown`, a small toolbar (bold, inline code, link, bullet list,
      numbered list). Typing `/` at the start of an empty line opens the same insert menu. Pasting Markdown that
      contains fences splits it into blocks (a pasted ```````cpp```` fence becomes a code block).
    - Code: variant select (Brute force, Semi-optimized, Optimized, Custom → label field), time and space complexity,
      one tab per language with an `EditorField`; **Add language** lists the languages not yet in the block
      (`JUDGE_LANGS` for problem solutions; any highlighter language for lessons).
    - Diagram: Mermaid source on the left, the live diagram on the right with `app/diagram.tsx` (same theme as the
      reader), caption field, the Mermaid error message under the source when it does not parse, and **Start from**
      buttons that insert a small flowchart, sequence, class or ER example.
    - Image: upload or paste (PNG, JPEG, WebP; up to 1 MB; no SVG, use a diagram block for vector drawings), alt text
      (required) and caption. Upload goes through `uploadAssetAction` (admin only) → `putAsset` on the hosted DB
      (desktop: `POST /api/admin/content/assets` on the hosted site). The server checks the real type from the bytes'
      magic number, not the file name.
  - **Markdown view.** The whole page as one Markdown document in the step 1 format, in one CodeMirror editor.
    Switching back to Blocks parses it; errors are listed with line numbers and the view stays on Markdown until they
    are fixed. Good for big rewrites and for pasting a whole page.
  - Without JS: Blocks view only, one form; the + menu and toolbar buttons are submit buttons
    (`name="op" value="add:code:<sectionId>:<index>"`, `up:<blockId>` …) that the save action applies and re-renders.
  - Done when: in a seeded concept lesson an admin can put a diagram between two paragraphs, add a second code block
    with Java and Python after it, move a section, switch to Markdown view and back without changes, and save.
- [ ] **5. Preview that matches the public page.** A **Preview** toggle per tab and a side-by-side preview on wide
  screens. Implement as a server action `previewAction(fragment)` that renders the same components the public page uses
  (`app/content-page.tsx` from 0114 step 4, so Markdown, code tabs, diagrams and images look exactly like the reader) and returns the
  rendered JSX; the client shows it, debounced 400 ms. Admin-only (`requireAdminAction`). Without JS, the Preview
  button submits and the page re-renders with the preview below the form.
  - Done when: preview of a code block shows highlighted code with language tabs exactly like the problem page.
- [ ] **6. Run tests before saving (desktop).** Next to every code block language tab: **Run tests** runs that code
  against the draft's examples and tests (not saved yet) with `runCode(specFromContent(draft, stressFor(id)), lang,
  code)`; a checkbox adds the stress tests for optimal blocks. Show passed/total, the slowest case time and the first 5
  failures (input, expected, got). **Run all** runs every block and language and shows a grid (block × language).
  Brute force blocks run without stress and with the time limit × 5 (same rule as `solutions:verify --brute`). On the
  hosted site the buttons are disabled with "Run tests in the desktop app". The action is
  `runDraftAction` in `app/admin/actions.ts` and starts with `requireAdminAction()`; on hosted it returns the
  `hosted-no-run` message without running anything.
  - Done when: on desktop a wrong expected output shows as a failure, and fixing it passes.
- [ ] **7. Lessons and other content.** Replace `study/[area]/[id]/lesson-editor.tsx` (patch editor) with a lesson
  page: title, course, order, the `meta_json` fields, and the page editor (step 4b) for the body, using the lesson's
  template. **New lesson** picks a course and a template and starts with the template's required slots. For `docs` rows add a plain JSON editor page `/admin/docs/[kind]/[id]` that validates JSON and the
  shape check for that kind (from `packages/shared/src/content-model`), with preview where a renderer exists.
  - Done when: a lesson edit shows on the lesson page after save.
- [ ] **8. History and restore.** History tab lists this entity's `admin_audit` rows (who, when, action) with a diff
  view of `before_json`/`after_json` (a simple line diff of pretty JSON is enough) and **Restore this version**
  (saves `after_json` of that row as a new change with action `restore`). Also `/admin/audit`: all rows, filter by
  admin, entity, date. Read-only for everyone except via restore.
  - Done when: restoring an older version brings back its content and adds a new audit row.
- [ ] **9. Tests.**
  - `packages/shared/src/content-model/draft.test.ts`: every validation rule (one failing and one passing case each);
    block add/remove/move/duplicate including first/last edges and moving across sections; add/remove language;
    custom variant without label fails; a block type not allowed in a slot fails.
  - `packages/shared/src/content-model/page-markdown.test.ts`: round trip for every template using fixture pages;
    multi-language code block via `block=`; diagram caption; image line; a misspelled `##` heading, a missing required
    slot and an unclosed fence each give an error with the right line number.
  - `apps/web/app/admin/page-editor/actions.test.ts`: `uploadAssetAction` refuses non-admins, files over 1 MB, SVG, and
    takes the type from the bytes (a JPEG named `.png` is stored as JPEG).
  - `apps/web/lib/content-admin/write.test.ts` (`:memory:` content DB from the fixture): save creates one change, one
    audit row and returns the new `rev`; same draft again → no change, no audit row; stale `baseRev` → conflict and
    nothing written; delete → soft delete + audit; restore → content equal to the old `after_json`. Desktop mode with a
    stubbed `fetch`: sends the bearer token to the hosted URL and runs `syncContent` after success; 401/403 from the
    hosted API becomes "Not allowed." and nothing is written locally.
  - `apps/web/app/api/admin/content/problems/route.test.ts`: anonymous 401, non-admin 403, admin PUT 200 + audit +
    tags expired (mock `next/cache`), invalid draft 400 with errors, 409 conflict, 413 too large.
  - `apps/web/app/admin/admin.test.ts`: `runDraftAction` and `previewAction` refuse non-admins; `runDraftAction` on
    hosted returns the no-run message and does not call `runCode`.
  - The 0113 `guard.test.ts` must still pass with the new files (it scans them automatically).
  - Done when: targeted runs pass, then `pnpm check` once.
- [ ] **10. Docs.** Rewrite `docs/content-editing.md` around the admin editor (how to edit a problem, the block model,
  run tests on desktop, history/restore). Keep the Markdown subset reference that is still true.
  - Done when: the doc describes only the new flow.

## Acceptance criteria

- [ ] An admin can open any of the 486 problems on the hosted site, change its statement, a test case, a hint and the
      solution page (add a "Semi-optimized" Java block between two Markdown blocks, add a diagram, reorder, remove
      one), preview it,
      save, and see it on the public page right away; a desktop app sees it after "Check for updates".
- [ ] In any lesson an admin can insert text, code, a Mermaid diagram or an image between any two blocks, and the
      page headings stay where the template puts them. The Markdown view shows the same page as one document.
- [ ] On desktop, Run tests runs unsaved code against unsaved test cases and reports failures per case.
- [ ] Two admins editing the same problem cannot overwrite each other silently.
- [ ] Every save, delete and restore appears in History and `/admin/audit` with the admin's name.
- [ ] A non-admin gets 404 on every editor page and "Not allowed." / 401 / 403 from every action and route.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
