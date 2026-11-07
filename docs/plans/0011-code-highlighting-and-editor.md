# 0011: Coloured code everywhere, and a real code editor where you write code

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code
- **Depends on:** 0010 (it restyles the problem page and tabs; do it first to avoid conflicts). Independent of 0007-0009.
- **Spec:** SPEC.md 7.3

## Goal

Code in the app is plain grey monospace text, and the places where you write code are plain textareas. Show all code
with syntax colours for its language (C++, Java, Python and so on), and where you can edit code (your solution notes,
cheat-sheet templates, LLD classes) give a proper editor: syntax colours as you type, line numbers, auto-indent,
bracket matching and closing, Tab to indent, undo/redo, find. Colours follow the app's light and dark theme.

## Context

- Read-only code today (all plain `<pre><code>`):
  `apps/web/app/learn-blocks.tsx` `CodeBlock` (used by pattern guides, lessons' deeper sections, cheat sheets),
  `apps/web/app/study/learn-ui.tsx` `LldGuideView` (Java), `apps/web/app/dsa/problem-ui.tsx` `CheatSheet` (template),
  `apps/web/app/dsa/[id]/page.tsx` (LeetCode submissions with `sub.lang`, and the cheat template).
- Editable code today (plain `<textarea>`): `apps/web/app/notes-form.tsx` (`name="code"` with a
  `<select name="language">` from the `LANGUAGES` list, used on problem pages and LLD/design exercise pages),
  `apps/web/app/dsa/problem-ui.tsx` `CheatSheet` (`name="template"`, language is a text input).
  The server actions (`saveNoteAction`, `savePatternNoteAction` in `apps/web/app/actions.ts`) read `code`/`template` and
  `language` from the form: **do not change them**. The form must keep working with JavaScript off.
- Language names in the data: LeetCode names from the extension (`C++`, `Java`, `Python3`, `JavaScript`, `TypeScript`,
  `Go`, `Rust`, `C#`, `Kotlin`, `Swift`, `MySQL`, `Unknown`), the `LANGUAGES` list in `notes-form.tsx`, and the
  pattern templates (C++). `Section.code` in `packages/shared/src/learn/types.ts` has no language field.
- Theme: `apps/web/app/globals.css` uses CSS variables and `@media (prefers-color-scheme: dark)` (no manual toggle).
- Desktop build: `apps/desktop/scripts/prepare-server.mjs` copies the Next standalone output; new server-side
  dependencies must still work there (step 8).
- **Decisions already made (don't re-litigate):**
  - Read-only colouring: **Shiki** on the server, fine-grained imports with the **JavaScript regex engine** (no WASM),
    languages `cpp java python javascript typescript sql go rust csharp kotlin swift json bash`, and Shiki's
    **CSS-variables theme** so one HTML output works in light and dark. Check the exact variable names in Shiki's docs
    in `node_modules` after installing (expected: `--shiki-foreground`, `--shiki-background`, `--shiki-token-keyword`,
    `-string`, `-comment`, `-function`, `-constant`, `-parameter`, `-punctuation`, `-string-expression`, `-link`).
  - Editor: **CodeMirror 6**, not Monaco (Monaco is several MB, needs web workers and complicates the Electron
    package; CodeMirror is small, themeable with the same CSS variables and lazy-loadable).
  - Progressive enhancement: the `<textarea>` stays in the HTML; JavaScript replaces it with the editor and keeps the
    textarea's value in sync, so form posts and no-JS still work.

## Out of scope

- Running or judging code, autocomplete beyond closing brackets, language servers (LSP), Vim/Emacs key modes, linting,
  formatting on save. (Possible later as settings; say so in *Implementation notes* if you have ideas.)
- Changing what is stored in the database or the server actions.
- Colouring inside prose or notes text.

## Steps

- [x] **1. Theme tokens.** In `globals.css` define the Shiki CSS variables for light and dark (GitHub-like palette: keywords
  red/purple, strings blue, comments grey, functions purple, numbers/constants blue, readable contrast of at least 4.5:1
  on `--background`/`--surface`). Add a `.code-block` class for the `pre` (border `border-line`, `bg-background`,
  `font-mono text-xs leading-relaxed`, `overflow-auto`, tab size 4).
  - Done when: variables exist for both schemes.

- [x] **2. Language helpers (pure, tested).** Create `apps/web/lib/code-lang.ts` (no `server-only`, so client code can
  import it) with:
  - `toLang(name?: string): Lang` mapping LeetCode and app names to the supported ids (`"C++"` and `"cpp"` to `cpp`,
    `"Python3"`/`"Python"` to `python`, `"MySQL"`/`"SQL"`/`"PostgreSQL"` to `sql`, `"C#"` to `csharp`, and so on);
    unknown or empty returns `"text"`.
  - `guessLang(code: string): Lang`: cheap heuristics for code with no language (`#include`, `std::`, `vector<` to `cpp`;
    `public class`, `import java.` to `java`; `SELECT `/`CREATE TABLE` to `sql`; `def ` + `:` to `python`;
    `function `/`=>`/`const ` to `javascript`; otherwise `text`).
  - `LANGUAGE_OPTIONS`: the list the editor's language `<select>` shows (reuse/replace `LANGUAGES` in
    `notes-form.tsx` so there is one list).
  Add `apps/web/lib/code-lang.test.ts` covering each mapping, unknown names, and `guessLang` on one sample per language.
  - Done when: `pnpm test` passes with the new cases.

- [x] **3. Server highlighter.** Add the `shiki` dependency to `apps/web`. Create `apps/web/lib/highlight.ts` (`server-only`)
  with a lazily created singleton highlighter (`createHighlighterCore` + the JS regex engine + the listed languages +
  the css-variables theme) and `highlight(code: string, lang: Lang): Promise<string>` returning HTML (`<pre class="code-block">…`)
  — for `text` return an escaped plain `<pre class="code-block"><code>`. Add `apps/web/lib/highlight.test.ts`: C++ sample
  contains `<span`, `<` in code is escaped as `&lt;`, `text` has no spans, and an unknown language does not throw.
  - Done when: tests pass and a build still compiles.

- [x] **4. `Code` component and replace every read-only block.** Create `apps/web/app/code.tsx` with async server
  component `Code({ code, lang, label, maxHeight })` that renders the highlighted HTML via `dangerouslySetInnerHTML`
  (Shiki escapes the code; nothing else is injected) with the optional `label` above it and a small **Copy** button
  (a tiny client component `CopyButton`, no emoji, falls back to nothing without JS). Make `CodeBlock` in
  `learn-blocks.tsx` delegate to it with an optional `lang` prop; if absent use `guessLang(code)`. Add an optional
  `lang?: string` to `Section` in `learn/types.ts` (no content edits needed now; `guessLang` covers existing sections).
  Replace the raw `<pre><code>` blocks in `study/learn-ui.tsx` (`lang="java"`), `dsa/problem-ui.tsx` (use the
  note's `language`), and `dsa/[id]/page.tsx` (submission `sub.lang`, cheat template `language`). If a call site is in a
  client component, highlight in a server parent and pass HTML down; don't make `Code` a client component.
  - Done when: `grep -rn "<pre" apps/web/app` finds only `Code`'s own markup (or none); a pattern template, an LLD
    reference answer and a LeetCode submission show colours in light and dark.

- [x] **5. Editor component.** Add dependencies to `apps/web`: `@codemirror/state`, `@codemirror/view`,
  `@codemirror/commands`, `@codemirror/language`, `@codemirror/search`, `@codemirror/autocomplete` (for closing
  brackets only), `@lezer/highlight`, and the language packages `@codemirror/lang-cpp`, `lang-java`, `lang-python`,
  `lang-javascript`, `lang-sql`. Create `apps/web/app/code-editor.tsx` (`"use client"`), export
  `EditorField({ children, languageSelectId, rows })`:
  - `children` is the existing `<textarea>`; keep it rendered (so no-JS works). In a `useEffect`, dynamically
    `import()` CodeMirror, create an `EditorView` in a `div` placed after the textarea, hide the textarea
    (`hidden`), initialise from `textarea.value`, and on every document change write the text back to
    `textarea.value` (so the surrounding form posts it). On unmount, destroy the view and un-hide the textarea.
  - Extensions: line numbers, highlight active line, history (undo/redo), default keymap, `indentWithTab`,
    bracket matching, `closeBrackets`, auto-indent on Enter, search (Ctrl/Cmd-F), the language extension for the
    current language, and a `HighlightStyle` built from the same CSS variables as step 1 (`var(--shiki-token-keyword)` etc.)
    so editor colours match read-only colours and follow dark mode. Editor background/gutter use `--background`/`--line`;
    min height = `rows * 1.5em`, `resize: vertical`, `font-mono text-sm`. 4-space indent.
  - When the element with `languageSelectId` fires `change`, reconfigure the language compartment (`toLang(select.value)`).
  - Accessibility: label the editor with the textarea's `aria-label`/`<label>`; keep a visible hint under the editor:
    "Tab indents. Press Esc, then Tab to leave the editor."
  - The editor chunk must be lazy: pages without an editor don't load CodeMirror.
  - Done when: on a problem page you can type C++, see colours, auto-indent, auto-close braces, Tab to indent, undo, and
    saving the form stores exactly what is in the editor; with JavaScript disabled the plain textarea still saves.

- [x] **6. Use the editor in the forms.** In `notes-form.tsx` wrap the code `<textarea id="code">` in
  `<EditorField languageSelectId="language" rows={16}>` and give the language `<select>` that `id`; use
  `LANGUAGE_OPTIONS`. In `problem-ui.tsx` `CheatSheet` do the same for the `template` textarea and turn its language
  text input into a `<select>` with the same options (keep `name="language"`; the action stores a free string, existing
  saved values like `Java` or `C++` must still pre-select: if a saved value isn't in the list, add it as an extra option).
  - Done when: both forms show the editor; saved language and code round-trip after reload; a previously saved
    value such as "C++" is selected.

- [x] **7. Check it in a browser.** Run the app on a copy of the data (`DATABASE_URL` = copy of `data/habit.db`). With
  headless Edge or a real browser open: a pattern page (template colours), an LLD exercise (Java reference answer and
  the editable "Your classes"), a problem page with a saved LeetCode submission, at 1440 px and 390 px, light and dark
  (`prefers-color-scheme`). Type into the editor, save, reload. Record what you saw in *Implementation notes*.
  - Done when: notes written; no horizontal page scroll at 390 px; the editor works on touch widths (typing, Tab is not
    required).

- [x] **8. Desktop build check.** Run `pnpm desktop:build` (or `pnpm --filter desktop prepare-server`) and confirm
  Shiki highlighting works in the standalone server (start it as the desktop app does, using `HABIT_DATA_DIR` for a
  temporary folder, not your data, and open a pattern page). If Shiki or its language grammars are missing from
  `apps/desktop/server`, fix the file tracing (`outputFileTracingIncludes` in `apps/web/next.config.ts`) and re-check.
  - Done when: noted in *Implementation notes*.

## Acceptance criteria

- [ ] All code shown in the app is syntax-coloured by language, readable in light and dark, with a Copy button.
- [ ] Code written by you is edited in a CodeMirror editor with line numbers, auto-indent, bracket handling, Tab indent,
  undo/redo and find; its colours match the read-only colours.
- [ ] Forms still post `code`/`template` and `language` unchanged and work with JavaScript off.
- [ ] Pages without an editor don't download CodeMirror.
- [ ] The desktop build highlights code too.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

Implemented by Claude Code, 2026-11-07 (not Antigravity).

- **Files:** `apps/web/lib/code-lang.ts` (+test), `apps/web/lib/highlight.ts` (+test), `apps/web/app/code.tsx`, `copy-button.tsx`, `code-editor.tsx`. Changed: `globals.css`, `learn-blocks.tsx`, `notes-form.tsx`, `dsa/problem-ui.tsx`, `dsa/[id]/page.tsx`, `study/learn-ui.tsx`, `revise/page.tsx`, `learn/types.ts` (optional `Section.lang`). Dependencies added to `apps/web`: `shiki` and the CodeMirror 6 packages.
- **Differences from the plan:**
  1. No `LANGUAGE_OPTIONS` was added. The one language list stays `LANGUAGES` in `lib/notes.ts`; the cheat-sheet select reuses it (a saved value outside the list is added as an extra option).
  2. `CodeBlock`'s `maxHeight` is now a CSS length such as "20rem", passed through a `--code-max` variable, instead of a Tailwind class.
  3. An unknown or "Other" language falls back to `guessLang`, so recognisable code is still coloured.
- **Checks:** `pnpm check` exits 0 (28 test files, 214 tests; new: code-lang, highlight).
- **Browser check** (Electron window against a copy of the database on port 3055, light and dark, 1440 and 390 px): the pattern page has coloured code and no plain `<pre>`, with no horizontal scroll. The editor mounts and hides the textarea. Typed C++ gets auto-indent, and a real "[" key press inserts "[]" (closeBrackets). The textarea mirrors the editor. Save and reload returned the same code and language (C++). Editor colours match the read-only colours in both themes. The submissions tab and the LLD reference answer are coloured (Java).
- **Desktop:** `pnpm --filter desktop prepare-server` works. The standalone server (`apps/desktop/server/apps/web/server.js`, port 3066, temp DB) serves coloured code (152 coloured spans on `/dsa/pattern/dijkstra`). The JavaScript regex engine needs no WASM and no tracing change.
- **Not tested:** typing on a phone (no device). Vim keys, running code and autocomplete are out of scope, as planned.

## Review
