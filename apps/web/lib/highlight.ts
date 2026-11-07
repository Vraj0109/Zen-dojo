import "server-only";
import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { Lang } from "./code-lang";

const theme = createCssVariablesTheme({ name: "habit-css", variablePrefix: "--shiki-", fontStyle: false });

let highlighter: Promise<HighlighterCore> | undefined;

/** One highlighter for the whole server: JavaScript regex engine (no WASM), only the languages the app uses. */
function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [theme],
    langs: [
      import("shiki/langs/cpp.mjs"),
      import("shiki/langs/java.mjs"),
      import("shiki/langs/python.mjs"),
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/sql.mjs"),
      import("shiki/langs/go.mjs"),
      import("shiki/langs/rust.mjs"),
      import("shiki/langs/csharp.mjs"),
      import("shiki/langs/kotlin.mjs"),
      import("shiki/langs/swift.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/bash.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const plain = (code: string) => `<pre class="code-block"><code>${escapeHtml(code)}</code></pre>`;

/** HTML for a code block: `<pre class="code-block">` with coloured spans. Never throws; falls back to plain text. */
export async function highlight(code: string, lang: Lang): Promise<string> {
  if (lang === "text") return plain(code);
  try {
    const h = await getHighlighter();
    const html = h.codeToHtml(code, { lang, theme: "habit-css" });
    // Shiki puts colours in an inline style on <pre>; our CSS class carries them instead.
    return html.replace(/<pre class="shiki[^"]*"[^>]*>/, '<pre class="code-block">');
  } catch {
    return plain(code);
  }
}
