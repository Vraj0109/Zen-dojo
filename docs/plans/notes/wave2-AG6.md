# Wave 2 Round A — AG6 Implementation Notes

**Agent:** AG6 (Antigravity)  
**Task:** Shared page renderer and AI answer parsers (0114 step 4 renderer component only, 0118 step 2).

---

## Files Created or Changed

### Created
- `apps/web/app/content-page.tsx`:
  - Server component `ContentPage({ template, page, assetUrl })` taking pure props without database access or cookies.
  - Resolves `TemplateDef` via `pageTemplate` (accepts `TemplateDef` object or `TemplateId` string, or defaults from `page.template`).
  - Walks the template slots in order, rendering slot heading `<h2>` and each matching section (ordered by `ord`) in `<section id="s-<sectionId>">`.
  - Section title `<h3>` rendered when present.
  - Block renderers in `ord` sequence:
    - `markdown`: renders via `Markdown` from `apps/web/app/markdown.tsx`.
    - `code`: extracts languages with code, renders `SolutionTabs` with one tab per language and formatted display names (C++, Java, Python, JavaScript, TypeScript, Go, Rust, C#, etc.), passing syntax-coloured `Code` component from `apps/web/app/code.tsx`, displaying block label or variant ("Optimal", "Brute force", "Alternative") and complexity details.
    - `diagram`: renders Mermaid diagrams with caption via `Diagram` from `apps/web/app/diagram.tsx`.
    - `image`: renders `<figure>` with `<img>` pointing to `assetUrl(id)` (defaults to `/api/content/assets/<id>`), alt text, and `<figcaption>`.
- `apps/web/app/content-page.test.tsx`:
  - Component tests using React 19 `prerender` stream (following `study-render.test.ts`).
  - Covers slot ordering and omission of empty slots, section IDs `s-<sectionId>`, section titles, Markdown blocks, Code blocks with `SolutionTabs` and labels, Mermaid diagrams with captions, image rendering with custom `assetUrl`, and template resolution options.
- `docs/plans/notes/wave2-AG6.md`:
  - This implementation report.

### Modified
- `packages/shared/src/content-model/admin-ai.ts`:
  - Added `parseAiAnswer(target, mode, text, context)` and `ParseAiAnswerResult<T>` type.
  - Extracts first fenced block when present (stripping model chatter) with fallback to full text, normalizing Windows `\r\n` line endings.
  - Handles each format:
    - `hints`: extracts outer fence, strictly rejects any hint containing code blocks or fences, parses numbered list items, validates hint count and length against `MAX_LIMITS`.
    - `test-cases`: parses JSON, validates array and non-empty, checks test case arity against function signature (`Case <N> has <X> input(s) but the function takes <Y>`), validates against invalid JSON values (NaN, etc.).
    - `diagram-block`: strictly requires ```mermaid fence, rejects missing or generic fences, returns diagram source.
    - `lesson-page`, `solution-page`, `section`: parses via `markdownToPage`, returns readable line-numbered syntax/heading errors, checks template validity.
    - `code-block`: extracts code, ensures non-empty.
    - `text-block`: ensures non-empty, rejects top-level `# ` headings.
    - `problem-statement`: ensures non-empty.
    - `problem-constraints`: parses lines, strips bullet markers, validates total length against `MAX_LIMITS.constraints`.
    - `course-summary`: ensures non-empty.
    - `doc`: parses and returns valid JSON.
- `packages/shared/src/content-model/admin-ai.test.ts`:
  - Added tests for `parseAiAnswer` covering clean inputs, chatter-wrapped fenced inputs, Windows line endings, and error rejection cases:
    - Hints with code or nested code blocks.
    - Wrong JSON and wrong test arity against function signature.
    - Mermaid answers without a `mermaid` fence.
    - Page markdown with headings not in the template.
    - Text blocks with top-level headings.

---

## Test Commands and Results

1. **Vitest unit tests for AI parsers:**
   ```bash
   pnpm exec vitest run packages/shared/src/content-model/admin-ai.test.ts
   ```
   **Result:**
   ```
   ✓ packages/shared/src/content-model/admin-ai.test.ts (25 tests) 14ms
   Test Files  1 passed (1)
        Tests  25 passed (25)
   ```

2. **Vitest component tests for ContentPage:**
   ```bash
   pnpm exec vitest run apps/web/app/content-page.test.tsx
   ```
   *(Tested via Vitest with `apps/**/*.test.tsx` included in test pattern)*
   **Result:**
   ```
   ✓ apps/web/app/content-page.test.tsx (8 tests) 1092ms
   Test Files  1 passed (1)
        Tests  8 passed (8)
   ```

3. **Combined Vitest run (33 tests total):**
   ```bash
   ✓ packages/shared/src/content-model/admin-ai.test.ts (25 tests) 15ms
   ✓ apps/web/app/content-page.test.tsx (8 tests) 1092ms
   Test Files  2 passed (2)
        Tests  33 passed (33)
   ```

4. **TypeScript typecheck in `packages/shared`:**
   ```bash
   npx tsc --noEmit -p packages/shared
   ```
   **Result:** Clean exit (code 0), 0 errors.

5. **TypeScript typecheck in `apps/web`:**
   ```bash
   npx tsc --noEmit -p apps/web
   ```
   **Result:** 0 errors in `content-page.tsx` and `content-page.test.tsx`. (Pre-existing/concurrent errors in AG4 files `apps/web/app/admin/*`, `apps/web/app/api/admin/*`, and `apps/web/lib/admin-content/*`).

6. **ESLint on modified web files:**
   ```bash
   pnpm --filter web exec eslint app/content-page.tsx app/content-page.test.tsx
   ```
   **Result:** Clean exit (code 0), 0 errors, 0 warnings.

---

## Deviations from the Plan and Why

1. **`validatePageAgainstTemplate` in `parseAiAnswer`:**
   When validating AI answers for `lesson-page` or partial page slots, `validatePageAgainstTemplate` was filtered to ignore `required slot "..." is missing` because AI prompt responses may target a subset of slots (e.g. Overview and Questions) without reproducing all required slots across the entire template at once. Format, slot keys, block types, and repetition constraints are still fully validated.
2. **`assetUrl` fallback:**
   In `ContentPage`, `assetUrl` defaults to `(id) => /api/content/assets/${id}` when omitted by the caller, matching the plan 0114 step 4 asset route.

---

## Questions / Notes for the Lead

1. **`vitest.config.mts` test file pattern:**
   The repository's root `vitest.config.mts` defines `include: ["packages/**/*.test.ts", "apps/**/*.test.ts"]` which matches only `.test.ts` files, not `.test.tsx`. Previous component tests in `apps/web/app/` (e.g. `study-render.test.ts`, `pattern-map.test.ts`) were named `.test.ts` for this reason. Adding `"apps/**/*.test.tsx"` to `vitest.config.mts` will allow running `apps/web/app/content-page.test.tsx` directly via the standard root `pnpm test` without overriding `include`.

---

## Anything Found but Not Changed

- Type check errors exist in `apps/web/app/admin/*`, `apps/web/app/api/admin/*`, and `apps/web/lib/admin-content/*` which are owned by parallel agent AG4.
