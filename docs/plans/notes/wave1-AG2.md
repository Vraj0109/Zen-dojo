# Wave 1 Notes — Agent AG2 (0116 Step 1: Draft model, block operations, page Markdown format)

## Files Created / Changed
- `packages/shared/src/content-model/draft.ts`:
  - `ProblemDraft` type (= `ContentProblem`)
  - `validateProblemDraft(draft)`: validates slug rules, title, difficulty, source/pattern limits, constraints, signature function name and param types (`TYPES`), test case input length matching param count and JSON-serializable values, at least one example case, hints count (up to 20) and character limits (up to 1,000), solution code blocks (at least one optimal C++ block), code block language presence, custom variant label requirements, block label length (up to 60), and total problem size under 2 MB.
  - `validatePageAgainstTemplate(template, page)`: validates required slots present, block types allowed in that slot, repeating slots having titles, and checks for unknown slots.
  - Block and section operations: `addBlock`, `removeBlock`, `moveBlock` (supports moving across section boundaries within the same slot), `duplicateBlock`, `addSection`, `removeSection`, `moveSection`, `addLanguage`, `removeLanguage`.
- `packages/shared/src/content-model/page-markdown.ts`:
  - `pageToMarkdown(template, page)`: serializes a page into Markdown with `## <slot heading>`, `### <title>` for repeating sections, plain markdown between fences, ```` ```mermaid {caption="..."} ```` for diagrams, ```` ```cpp {block=opt variant=optimal label="..." time="..." space="..."} ```` for code blocks (and multi-language code blocks grouped by `block=`), and `![alt](asset:<id> "caption")` image lines.
  - `markdownToPage(template, md)`: parses Markdown into a `ContentPage` with line-numbered errors (`{ errors: Array<{ line: number; message: string }> }`) for misspelled slot headings, missing required slots, unclosed fences, disallowed block types in slots, duplicate languages, and section requirements.
- `packages/shared/src/content-model/draft.test.ts`:
  - 36 tests covering all validation rules (passing and failing cases), block operations (add/remove/duplicate, move within section, boundary limits, moving across sections), section operations, and language add/remove.
- `packages/shared/src/content-model/page-markdown.test.ts`:
  - 12 tests covering round-tripping for multiple templates (problem, concept, article), multi-language code blocks via `block=`, diagram captions, image lines (with and without caption), and exact line numbers for misspelled `##` headings, missing required slots, unclosed fences, and disallowed block types.
- `docs/plans/notes/wave1-AG2.md`: this notes file.

## Test Commands and Results
- Fast vitest tests:
  `pnpm.cmd exec vitest run packages/shared/src/content-model/draft.test.ts packages/shared/src/content-model/page-markdown.test.ts`
  Result:
  ```
  Test Files  2 passed (2)
       Tests  48 passed (48)
  ```
- Typecheck:
  `pnpm.cmd --filter @habit/shared exec tsc --noEmit`
  Result:
  Exited with code 0 (no errors).

## Deviations from the Plan and Why
- In `markdownToPage`, lines starting with `### ` are treated as section starts when `currentSlot.sections === "many" || currentSlot.sections === "indexed"`. In `sections === "one"` slots (which do not allow repeating titled sections), `### ` inside prose is treated as normal markdown text within that single section so that markdown subheadings do not trigger an erroneous section split.
- `draft.test.ts` and `page-markdown.test.ts` define self-contained fixture `TemplateDef` objects without importing `templates.ts`, adhering to the parallel development constraints.

## Questions for the Lead
- None; the model and round-trip specifications aligned cleanly with the types in `types.ts` and `rev.ts`.

## Found but Not Changed
- `templates.ts` was being implemented in parallel by Agent C1. Both `draft.ts` and `page-markdown.ts` export clean standalone functions (`validatePageAgainstTemplate`, `validateProblemDraft`, `pageToMarkdown`, `markdownToPage`) that work with any `TemplateDef`.
