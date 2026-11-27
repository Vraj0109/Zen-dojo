# Wave 3 round C, AG10: "Write with AI" buttons (plan 0118 steps 3, 4, 6)

## Files

New:
- `apps/web/app/admin/ai-actions.ts`: `buildAiPromptAction(input)` and `checkAiAnswerAction({ ...input, answer })`.
  Both start with `requireAdminAction()` inside `try`, return `{ ok: false, errors: ["Not allowed."] }` on
  `AdminDeniedError`, and read the unsaved draft sent by the editor. No DB writes.
- `apps/web/app/admin/ai-actions.test.ts`: 6 tests (non-admin refused for both actions, admin prompt contains the
  unsaved hint text and the unsaved statement block text, parsed hint list, missing draft is an error).
- `apps/web/app/admin/ai-assist.tsx`: client component `AiAssist` (AI button, mode menu, Copy prompt with
  select-to-copy fallback, Show prompt, paste box, Check answer, side-by-side line diff, Use this, Undo). Exports
  pure helpers `lineDiff`, `langFor`, `valueText`, `mergeAnswer`, `aiModeLabel`.

Edited (placement and wiring only):
- `apps/web/app/admin/page-editor/page-editor.tsx`: new optional `ai` prop (`{ entity, id, field, draft }`). Adds a
  whole-page AI row (blocks view), an AI row on each section, and an AI row on each markdown, code and diagram block
  (not images). `handleReplaceSection` keeps the section id and slot. No block editor files touched.
- `apps/web/app/admin/problems/[id]/problem-editor-client.tsx`: AI on statement page, constraints, test cases, hints,
  solution page.
- `apps/web/app/admin/study/[area]/[id]/lesson-editor-client.tsx`: `ai` prop on the lesson page editor.
- `apps/web/app/admin/docs/[kind]/[id]/doc-editor-client.tsx`: AI above the JSON textarea (message instead when the
  JSON does not parse).
- `docs/content-editing.md`: new section 8, "Writing with AI".

## Test commands and results

- `pnpm exec vitest run apps/web/app/admin apps/web/app/no-emoji.test.ts`: 9 files, 107 tests passed (includes
  `guard.test.ts`, which passes).
- `cd apps/web && npx tsc --noEmit`: clean on the last run (an earlier run showed one error in another agent's
  `lib/content-db/verify-db.test.ts`, not in my files; it had gone on the last run).
- `pnpm lint`: clean (one `react/no-unescaped-entities` error in `ai-assist.tsx` fixed with `&apos;`).
- Not run (by rule): `pnpm test`, `pnpm check`, `pnpm build`. Browser check not done.

## Deviations from 0118, and why

1. **Step 4b (Ask my AI) not built.** `apps/web/lib/ai` is wired to the learner chat (`context.ts`, `guard.ts`,
   `byok.ts` take a `Request`), so it needs changes to the learner code. Follow-up.
2. **`parseAiAnswer` is imported by relative path** (`../../../../packages/shared/src/content-model/admin-ai`) in
   `ai-actions.ts`, because the content-model barrel does not export it and `content-model/index.ts` is lead-owned.
   `lib/content-repo/stress.ts` uses the same precedent. Cleaner: the lead adds `parseAiAnswer` to the barrel line
   that exports `modesFor, buildAdminPrompt`.
3. **Parsing happens on the server** (`checkAiAnswerAction`), so the client never imports the parser. The client
   computes the merged value and the diff.
4. **Statement page uses target `solution-page`.** `admin-ai.ts` has no whole-page target for a problem statement,
   and the parser for `solution-page` already uses the problem template. The prompt's "Where this goes" therefore
   says `Field: solution-page` for the statement. Question below.
5. **Section and block AI on a problem's statement or solution** are resolved from the draft by field
   (`statement/section:<id>`, `solution/block:<id>`). Problem sections are parsed with the problem template (the
   parser would otherwise pick the concept template). The prompt context does not include a fake lesson.
6. **Code blocks use one tab.** The page editor does not expose the active code tab, so the AI uses the block's first
   language (or the one the AI mode adds). A tab switch is not tracked.
7. **Test cases diff is a line diff** (`input -> output` per line), not a table. Plan allowed either; the table can
   come later.
8. **Undo** keeps the value from before the last "Use this" in the component. It is not cleared on save (the editors
   give no save event to the component), so "Changed by AI answer, not saved." can stay visible after a save until
   the admin reloads or runs another AI apply. Question below.
9. **Whole-page AI row** shows in the blocks view only. In the Markdown view the Markdown text may have unsaved
   edits that the page value does not hold yet.
10. **Course summary has no button**: there is no course summary editor in admin (`summaryMd` is not edited there).
11. **Without JavaScript** the AI button does nothing. The editors are client components and already need JavaScript,
    so no separate form fallback was added (0118 step 4 allows this if the action cannot run without JS).
12. **Image blocks have no AI button** (alt text only; nothing useful to draft).

## Callers outside my files that need wiring

- None required for the feature to run.
- Optional: export `parseAiAnswer` from `packages/shared/src/content-model/index.ts` (see deviation 2), then import it
  from `@habit/shared` in `ai-actions.ts`.

## Questions for the lead

1. Add `parseAiAnswer` to the content-model barrel (deviation 2)? OK to change the import once it is there?
2. Should admin-ai get a `problem-statement-page` style target (or a label option) so the statement prompt says
   "statement" rather than "solution-page"?
3. Is the "Changed by AI answer, not saved." label good enough without a save signal, or should the editors pass a
   `savedAt` value to clear it?
4. Is Ask my AI (4b) for the next round, once the learner AI code is separated from the chat?
