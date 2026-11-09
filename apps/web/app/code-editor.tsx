"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { toLang, type Lang } from "@/lib/code-lang";

/**
 * Wraps a `<textarea>` and, once JavaScript runs, replaces it with a CodeMirror editor (colours, line numbers,
 * auto-indent, brackets, Tab, undo, find). The textarea stays in the HTML and keeps the editor's text in its
 * `value`, so the surrounding form posts exactly what you see, and without JavaScript the textarea still works.
 *
 * `languageSelectId` is the id of a `<select>` whose value names the language ("C++", "Java"…).
 * CodeMirror loads lazily: pages without an editor never download it.
 */
export function EditorField({ children, languageSelectId, rows = 14, fill = false }: { children: ReactNode; languageSelectId?: string; rows?: number; fill?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const host = hostRef.current;
    const textarea = wrap?.querySelector("textarea");
    if (!wrap || !host || !textarea) return;
    const select = languageSelectId ? (document.getElementById(languageSelectId) as HTMLSelectElement | null) : null;

    let cancelled = false;
    let destroy: (() => void) | undefined;

    (async () => {
      const [view, state, commands, language, search, autocomplete, lezer, cpp, java, python, javascript, sql] = await Promise.all([
        import("@codemirror/view"),
        import("@codemirror/state"),
        import("@codemirror/commands"),
        import("@codemirror/language"),
        import("@codemirror/search"),
        import("@codemirror/autocomplete"),
        import("@lezer/highlight"),
        import("@codemirror/lang-cpp"),
        import("@codemirror/lang-java"),
        import("@codemirror/lang-python"),
        import("@codemirror/lang-javascript"),
        import("@codemirror/lang-sql"),
      ]);
      if (cancelled) return;

      const langExtension = (l: Lang) => {
        switch (l) {
          case "cpp":
            return cpp.cpp();
          case "java":
            return java.java();
          case "python":
            return python.python();
          case "javascript":
            return javascript.javascript();
          case "typescript":
            return javascript.javascript({ typescript: true });
          case "sql":
            return sql.sql();
          default:
            return [];
        }
      };

      const t = lezer.tags;
      const colours = language.HighlightStyle.define([
        { tag: [t.keyword, t.controlKeyword, t.modifier, t.operatorKeyword, t.definitionKeyword], color: "var(--shiki-token-keyword)" },
        { tag: [t.string, t.special(t.string), t.regexp], color: "var(--shiki-token-string)" },
        { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--shiki-token-comment)", fontStyle: "italic" },
        { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: "var(--shiki-token-function)" },
        { tag: [t.number, t.bool, t.null, t.atom, t.constant(t.variableName), t.standard(t.variableName)], color: "var(--shiki-token-constant)" },
        { tag: [t.typeName, t.className, t.namespace, t.macroName], color: "var(--shiki-token-parameter)" },
        { tag: [t.punctuation, t.bracket, t.separator, t.operator], color: "var(--shiki-token-punctuation)" },
      ]);

      const theme = view.EditorView.theme({
        "&": {
          color: "var(--shiki-foreground)",
          backgroundColor: "var(--shiki-background)",
          border: "1px solid var(--line)",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          ...(fill ? { height: "100%", borderRadius: "0", border: "none" } : {}),
        },
        "&.cm-focused": { outline: "2px solid var(--accent)", outlineOffset: "1px" },
        ".cm-scroller": fill
          ? { fontFamily: "var(--font-mono), ui-monospace, monospace", lineHeight: "1.6", overflow: "auto" }
          : { fontFamily: "var(--font-mono), ui-monospace, monospace", lineHeight: "1.6", minHeight: `${rows * 1.6}em`, maxHeight: "42rem" },
        ".cm-content": { caretColor: "var(--shiki-foreground)", padding: "0.5rem 0" },
        ".cm-cursor": { borderLeftColor: "var(--shiki-foreground)" },
        ".cm-gutters": { backgroundColor: "transparent", color: "var(--muted)", border: "none" },
        ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)" },
        ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "color-mix(in srgb, var(--accent) 28%, transparent)" },
        ".cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)", outline: "none" },
        ".cm-panels": { backgroundColor: "var(--surface)", color: "var(--foreground)", borderColor: "var(--line)" },
        ".cm-panels input, .cm-panels button": { fontSize: "0.8rem" },
        ".cm-placeholder": { color: "var(--muted)" },
      });

      const langCompartment = new state.Compartment();
      const currentLang = () => toLang(select?.value);
      const max = textarea.maxLength > 0 ? textarea.maxLength : Infinity;
      const label =
        textarea.getAttribute("aria-label") ??
        (textarea.id ? document.querySelector(`label[for="${CSS.escape(textarea.id)}"]`)?.textContent : null) ??
        "Code editor";

      const editor = new view.EditorView({
        parent: host,
        state: state.EditorState.create({
          doc: textarea.value,
          extensions: [
            view.lineNumbers(),
            view.highlightActiveLineGutter(),
            view.highlightActiveLine(),
            view.drawSelection(),
            view.placeholder(textarea.placeholder),
            commands.history(),
            language.bracketMatching(),
            language.indentOnInput(),
            language.indentUnit.of("    "),
            state.EditorState.tabSize.of(4),
            autocomplete.closeBrackets(),
            search.search({ top: true }),
            language.syntaxHighlighting(colours),
            langCompartment.of(langExtension(currentLang())),
            state.EditorState.changeFilter.of((tr) => !tr.docChanged || tr.newDoc.length <= max),
            view.EditorView.contentAttributes.of({ "aria-label": label.trim(), spellcheck: "false" }),
            view.keymap.of([...autocomplete.closeBracketsKeymap, ...commands.defaultKeymap, ...commands.historyKeymap, ...search.searchKeymap, commands.indentWithTab]),
            view.EditorView.updateListener.of((u) => {
              if (u.docChanged) textarea.value = u.state.doc.toString();
            }),
            theme,
          ],
        }),
      });

      const onLanguage = () => editor.dispatch({ effects: langCompartment.reconfigure(langExtension(currentLang())) });
      select?.addEventListener("change", onLanguage);

      textarea.hidden = true;
      host.hidden = false;

      destroy = () => {
        select?.removeEventListener("change", onLanguage);
        textarea.value = editor.state.doc.toString();
        editor.destroy();
        textarea.hidden = false;
        host.hidden = true;
      };
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [languageSelectId, rows, fill]);

  return (
    <div ref={wrapRef} className={fill ? "flex h-full min-h-0 flex-col" : undefined}>
      {children}
      <div ref={hostRef} hidden className={fill ? "min-h-0 flex-1 [&>.cm-editor]:h-full" : undefined} />
    </div>
  );
}
