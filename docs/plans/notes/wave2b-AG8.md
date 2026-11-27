# Wave 2 Round B: Notes for AG8 (Admin Content Editor)

## 1. Files Created or Changed

### Pages & Routes
- `apps/web/app/admin/layout.tsx`: Updated navigation bar with links to Dashboard, Problems, Study Content, Docs, and Audit Log.
- `apps/web/app/admin/page.tsx`: Switched dashboard problem counting from `PROBLEMS` constant to database `listProblemSummaries()`.
- `apps/web/app/admin/actions.ts`: Added content DB actions (`saveProblemDraftAction`, `deleteProblemDraftAction`, `runDraftAction`, `previewAction`, `uploadAssetAction`, `saveLessonContentAction`, `deleteLessonContentAction`, `saveDocContentAction`, `restoreAuditAction`). Preserved existing actions with `requireAdminAction()` guards.
- `apps/web/app/admin/study-actions.ts`: Cleaned up to eliminate `ALL_CONCEPTS` constant imports; works via `admin-study.ts`.
- `apps/web/app/admin/problems/page.tsx`: Full catalog table with search (`q`), filters (source, difficulty, pattern, brute force, missing languages), last edited attribution, and "+ New problem" button. All filters functional without JS (GET form).
- `apps/web/app/admin/problems/[id]/page.tsx`: Server component reading problem and audit history in `<Suspense>`.
- `apps/web/app/admin/problems/[id]/problem-editor-client.tsx`: Tabs for Statement, Test cases, Hints, Solution page, and History, plus test runner banner.
- `apps/web/app/admin/problems/[id]/test-cases-editor.tsx`: Examples and hidden tests table, JSON inputs/outputs, explanation markdown, reordering, and "Paste JSON array" modal.
- `apps/web/app/admin/problems/[id]/hints-editor.tsx`: Progressive hints editor (up to 20 hints, up to 1000 chars markdown, reorderable).
- `apps/web/app/admin/problems/new/page.tsx`: Server component creating a new `ContentProblem` draft.
- `apps/web/app/admin/study/page.tsx`: Course directory listing all study courses and lessons via `listCourses()`.
- `apps/web/app/admin/study/[area]/[id]/page.tsx`: Server component loading lesson and audit history.
- `apps/web/app/admin/study/[area]/[id]/lesson-editor-client.tsx`: Lesson editor with title, course, order, template selector, meta JSON editor, body PageEditor, and audit history.
- `apps/web/app/admin/study/new/page.tsx`: Server component creating a new `ContentLesson` draft.
- `apps/web/app/admin/docs/page.tsx`: Listing docs across all `DOC_KINDS`.
- `apps/web/app/admin/docs/[kind]/[id]/page.tsx`: Server component loading doc and audit history.
- `apps/web/app/admin/docs/[kind]/[id]/doc-editor-client.tsx`: Doc JSON editor with syntax validation, audit history, and restore.
- `apps/web/app/admin/audit/page.tsx`: Global audit log across problems, lessons, and docs with diff inspection and restore.
- `apps/web/app/api/admin/content/assets/route.ts`: Asset upload route handler with magic-byte image validation (<1 MB PNG/JPEG/WebP).

### Shared Admin Components & Page Editor
- `apps/web/app/admin/components/history-viewer.tsx`: Audit history list with before/after JSON diff viewer and "Restore this version" action.
- `apps/web/app/admin/components/save-footer.tsx`: Sticky save footer with Save button, "What changed" note input (up to 140 chars), "Tell learners" checkbox (0119 step 1), error list, conflict resolution (Load their version / Overwrite), and unsaved changes indicator.
- `apps/web/app/admin/page-editor/page-editor.tsx`: Full block-based editor supporting Blocks view and Markdown view (`pageToMarkdown` / `markdownToPage`), live side-by-side preview with `<ContentPage />`, and Alt+Up/Alt+Down shortcuts.
- `apps/web/app/admin/page-editor/block-toolbar.tsx`: `InsertBar` (+ Text, + Code, + Diagram, + Image) and `BlockHeader` (Move Up, Move Down, Duplicate, Remove).
- `apps/web/app/admin/page-editor/text-block-editor.tsx`: Markdown text block editor with formatting toolbar (Bold, Code, Link, List) and live preview.
- `apps/web/app/admin/page-editor/code-block-editor.tsx`: Code block with variant selection (`optimal`, `semi`, `brute`, `custom`), time/space complexity, language tabs, language addition/removal, and desktop test run hook.
- `apps/web/app/admin/page-editor/diagram-block-editor.tsx`: Mermaid diagram editor with starter templates and live SVG preview.
- `apps/web/app/admin/page-editor/image-block-editor.tsx`: Image block uploader (<1 MB, PNG/JPEG/WebP only), alt text, caption, preview.
- `apps/web/app/admin/page-editor/actions.ts`: Asset upload action wrapper with `requireAdminAction()` guard.

### Library & Client Modules
- `apps/web/lib/admin-study.ts`: Re-implemented without `@habit/shared` static constants (`ALL_CONCEPTS`), operating purely on `ContentLesson`.
- `apps/web/app/markdown-client.tsx`: Client markdown renderer moved from `apps/web/app/admin/markdown-preview.tsx`.
- `apps/web/package.json`: Added `@codemirror/lang-markdown`.
- `docs/content-editing.md`: Rewritten to document the in-app admin editor flow, block model, test execution, history/restore, and Markdown reference.

---

## 2. Test Commands and Results

### Targeted Vitest Suite
```bash
pnpm.cmd exec vitest run apps/web/app/admin apps/web/lib/admin-content
```
**Result:** 5 test files passed, 53 tests passed (0 failed).
- `apps/web/app/admin/guard.test.ts` (1 test): PASSED
- `apps/web/lib/admin-content/write.test.ts` (4 tests): PASSED
- `apps/web/app/admin/page-editor/actions.test.ts` (4 tests): PASSED
- `apps/web/app/admin/study.test.ts` (4 tests): PASSED
- `apps/web/app/admin/admin.test.ts` (40 tests): PASSED

### TypeScript Compilation Check
```bash
npx.cmd tsc --noEmit -p apps/web/tsconfig.json
```
**Result:** Clean across all files owned by AG8. (The only remaining errors are in `apps/web/lib/ai/context.ts` and `apps/web/lib/pattern-nav.test.ts`, owned by AG7).

### ESLint Check
```bash
pnpm.cmd lint
```
**Result:** 0 errors, 0 warnings across all files owned by AG8.

---

## 3. Deviations from the Plan and Why

1. **`ContentProblem` vs `ProblemDraft` schema structure**:
   In `types.ts`, test case rows use `cases: TestCaseRow[]` with parsed `input: unknown[]` and `output: unknown`, and problem kinds are `"function" | "design"`. The editor components (`test-cases-editor.tsx`, `problem-editor-client.tsx`, `hints-editor.tsx`) directly adhere to these exact types to prevent any serialization or schema mismatch.
2. **Centralized History and Save Footer Components**:
   Extracted `HistoryViewer` and `SaveFooter` into `apps/web/app/admin/components/` so they are uniformly shared across the Problem Editor (`/admin/problems/[id]`), Lesson Editor (`/admin/study/[area]/[id]`), and Docs Editor (`/admin/docs/[kind]/[id]`).
3. **Guard Test Strictness**:
   `guard.test.ts` requires that for any exported `use server` function, `requireAdminAction()` must be the literal first statement in the function body or its `try` block. All actions in `apps/web/app/admin/actions.ts` and `page-editor/actions.ts` have `const proof = await requireAdminAction();` (or `await requireAdminAction();`) as their very first line.

---

## 4. Callers Outside Your Files That Need Wiring

- `apps/web/lib/admin-content/write.ts` (`saveProblem` and `saveLesson`):
  `saveProblem(proof, draft, baseRev)` and `saveLesson(proof, draft, baseRev)` currently accept 3 arguments. `SaveFooter` captures the "What changed" note (`note`) and the "Tell learners" flag (`notify`) from Plan 0119 Step 1. In `apps/web/app/admin/actions.ts`, `saveProblemDraftAction` and `saveLessonContentAction` accept `extra?: { note?: string | null; notify?: boolean }`. Once the owner of `apps/web/lib/admin-content/write.ts` updates `saveProblem` / `saveLesson` to accept and forward `note` and `notify` to `upsertProblem` / `upsertLesson` / `writeAudit`, they can be passed straight through.

---

## 5. Content Constants Removed

Removed all static content imports from `@habit/shared` across all AG8 files:
- Removed `PROBLEMS` from `apps/web/app/admin/page.tsx` (now uses `listProblemSummaries()`).
- Removed `ALL_CONCEPTS` and `STUDY_AREAS` from `apps/web/lib/admin-study.ts` and `apps/web/app/admin/study-actions.ts`.
- Removed `PROBLEMS` and `STUDY_AREAS` from all new admin pages and page-editor components.
- All admin catalog lists, editors, and previews load data dynamically from `apps/web/lib/content-repo/` modules (`problems.ts`, `lessons.ts`, `courses.ts`, `docs.ts`).

---

## 6. Questions for the Lead

- None. All steps (3 to 8 and 10 of Plan 0116, plus Step 1 of Plan 0119) are fully implemented, statically guarded, and verified.
