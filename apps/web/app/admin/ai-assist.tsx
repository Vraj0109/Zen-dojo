"use client";

// "Write with AI" for one editor field or block (plan 0118 step 4). The panel copies a prompt, takes the answer back,
// checks it on the server with the editor's parser, shows a line diff, and applies it to the unsaved draft through
// onChange. Nothing is saved here: the admin saves as usual. Undo restores the value from before the last apply.

import { useRef, useState } from "react";
import {
  modesFor,
  pageToMarkdown,
  type AiMode,
  type AiTarget,
  type ContentPage,
  type HintRow,
  type SectionRow,
  type TemplateDef,
  type TestCaseRow,
} from "@habit/shared";
import { buildAiPromptAction, checkAiAnswerAction, type AiEntity } from "./ai-actions";
import { buttonClass } from "@/app/ui";

const MODE_LABELS: Record<string, string> = {
  write: "Write",
  improve: "Improve",
  "fix-format": "Fix format",
  shorter: "Make shorter",
  "more-edge-cases": "Add edge cases",
  "write-brute": "Write brute force",
  "write-semi": "Write intermediate",
  "write-optimal": "Write optimal",
  "explain-complexity": "Explain complexity",
  "draw-from-text": "Draw from text",
};

const LANG_NAMES: Record<string, string> = { cpp: "C++", java: "Java", python: "Python", javascript: "JavaScript" };

/** Button text for one mode, shown in the menu. */
export function aiModeLabel(mode: string): string {
  if (mode.startsWith("add-language:")) {
    const lang = mode.slice("add-language:".length);
    return `Add ${LANG_NAMES[lang] ?? lang}`;
  }
  return MODE_LABELS[mode] ?? mode;
}

export interface AiAssistProps {
  target: AiTarget;
  entity: AiEntity;
  id: string;
  /** Which part of the draft this is (see AiRequest in ai-actions.ts). */
  field?: string;
  /** Doc kind, for doc editors. */
  kind?: string;
  /** Code tab the admin is on, for code blocks. */
  lang?: string;
  /** The unsaved draft. Sent with every request so prompts include unsaved edits. */
  draft: unknown;
  /**
   * The current value of this field, in the same type the editor stores it in: a string, string[], HintRow[],
   * TestCaseRow[], a ContentPage, a SectionRow, a per-language code record, or the doc body. Used for the mode menu,
   * the diff and Undo.
   */
  current: unknown;
  /** Template, to show pages and sections as Markdown in the diff. */
  template?: TemplateDef;
  /** Receives the next value of the field (same type as `current`). Undo calls it with the previous value. */
  onChange: (next: unknown) => void;
  className?: string;
}

type DiffCell = { kind: "same" | "remove" | "add"; text: string };
export type DiffRow = { left: DiffCell | null; right: DiffCell | null };

const MAX_DIFF_CELLS = 250000;

/** Side-by-side line diff (longest common subsequence). Falls back to all-removed / all-added for very large inputs. */
export function lineDiff(before: string, after: string): DiffRow[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length * b.length > MAX_DIFF_CELLS) {
    return [
      ...a.map((text) => ({ left: { kind: "remove" as const, text }, right: null })),
      ...b.map((text) => ({ left: null, right: { kind: "add" as const, text } })),
    ];
  }
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ left: { kind: "same", text: a[i] }, right: { kind: "same", text: b[j] } });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ left: { kind: "remove", text: a[i] }, right: null });
      i++;
    } else {
      rows.push({ left: null, right: { kind: "add", text: b[j] } });
      j++;
    }
  }
  while (i < n) rows.push({ left: { kind: "remove", text: a[i++] }, right: null });
  while (j < m) rows.push({ left: null, right: { kind: "add", text: b[j++] } });
  return rows;
}

/** The language a request refers to: the mode's language for "add-language", else the tab, else the first stored one. */
export function langFor(target: AiTarget, mode: AiMode, lang: string | undefined, current: unknown): string {
  if (mode.startsWith("add-language:")) return mode.slice("add-language:".length);
  if (lang) return lang;
  if (target === "code-block") return Object.keys((current as Record<string, string>) ?? {})[0] ?? "cpp";
  return "cpp";
}

/** Shows a value as the text the admin reads in the diff. */
export function valueText(target: AiTarget, value: unknown, lang: string, template?: TemplateDef): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (target === "code-block") return (value as Record<string, string>)[lang] ?? "";
  if (Array.isArray(value)) {
    if (target === "problem-constraints") return (value as string[]).join("\n");
    if (target === "hints") return (value as HintRow[]).map((h, i) => `${i + 1}. ${h.bodyMd}`).join("\n");
    if (target === "test-cases") {
      return (value as TestCaseRow[]).map((c) => `${JSON.stringify(c.input)} -> ${JSON.stringify(c.output)}`).join("\n");
    }
  }
  if (typeof value === "object" && template) {
    if ("sections" in value) return pageToMarkdown(template, value as ContentPage);
    if ("blocks" in value) return pageToMarkdown(template, { template: template.id, sections: [value as SectionRow] });
  }
  return JSON.stringify(value, null, 2);
}

/** The field's value after an answer is applied, in the field's own type. Nothing is saved. */
export function mergeAnswer(target: AiTarget, mode: AiMode, current: unknown, value: unknown, lang: string): unknown {
  if (target === "code-block") return { ...((current as Record<string, string>) ?? {}), [lang]: value };
  if (target === "test-cases") {
    const base = mode === "more-edge-cases" ? ((current as TestCaseRow[]) ?? []) : [];
    return [...base, ...(value as TestCaseRow[])].map((c, ord) => ({ ...c, ord }));
  }
  if (target === "hints") return (value as HintRow[]).map((h, ord) => ({ ...h, ord }));
  if (target === "section" && current && typeof current === "object") {
    const cur = current as SectionRow;
    return { ...(value as SectionRow), id: cur.id, slot: cur.slot };
  }
  return value;
}

export function AiAssist({
  target,
  entity,
  id,
  field,
  kind,
  lang: langProp,
  draft,
  current,
  template,
  onChange,
  className = "",
}: AiAssistProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<AiMode | null>(null);
  const [prompt, setPrompt] = useState<{ text: string; chars: number } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<{ next: unknown; rows: DiffRow[] } | null>(null);
  const [applied, setApplied] = useState<{ previous: unknown; mode: AiMode } | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const modes = modesFor(target, current);

  const requestFor = (m: AiMode) => ({
    target,
    mode: m,
    entity,
    id,
    field,
    kind,
    lang: langFor(target, m, langProp, current),
    draft,
  });

  const selectPrompt = () => {
    const el = promptRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  };

  const startMode = async (m: AiMode) => {
    setMenuOpen(false);
    setMode(m);
    setPanelOpen(true);
    setPrompt(null);
    setChecked(null);
    setErrors([]);
    setAnswer("");
    setCopyState("idle");
    setShowPrompt(false);
    setBusy(true);
    try {
      const res = await buildAiPromptAction(requestFor(m));
      if (res.ok) setPrompt({ text: res.prompt, chars: res.chars });
      else setErrors(res.errors);
    } catch {
      setErrors(["Could not build the prompt. Try again."]);
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.text);
      setCopyState("copied");
    } catch {
      // No clipboard permission (or no clipboard API): show the prompt, selected, so it can be copied by hand.
      setCopyState("failed");
      setShowPrompt(true);
      setTimeout(selectPrompt, 0);
    }
  };

  const checkAnswer = async () => {
    if (!mode) return;
    setBusy(true);
    setErrors([]);
    setChecked(null);
    try {
      const res = await checkAiAnswerAction({ ...requestFor(mode), answer });
      if (!res.ok) {
        setErrors(res.errors);
        return;
      }
      const lang = langFor(target, mode, langProp, current);
      const next = mergeAnswer(target, mode, current, res.value, lang);
      const rows = lineDiff(valueText(target, current, lang, template), valueText(target, next, lang, template));
      setChecked({ next, rows });
    } catch {
      setErrors(["Could not check the answer. Try again."]);
    } finally {
      setBusy(false);
    }
  };

  const useThis = () => {
    if (!checked || !mode) return;
    setApplied({ previous: current, mode });
    onChange(checked.next);
    setPanelOpen(false);
    setChecked(null);
    setAnswer("");
    setPrompt(null);
    setMode(null);
  };

  const undo = () => {
    if (!applied) return;
    onChange(applied.previous);
    setApplied(null);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setChecked(null);
    setErrors([]);
  };

  return (
    <div className={`space-y-2 text-xs ${className}`} onKeyDown={(e) => { if (e.key === "Escape") { setMenuOpen(false); closePanel(); } }}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Write with AI"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className={buttonClass("outline", "sm")}
        >
          AI
        </button>
        {applied && !panelOpen && (
          <span className="flex items-center gap-2 text-muted">
            Changed by AI answer, not saved.
            <button type="button" onClick={undo} className={buttonClass("quiet", "sm")}>
              Undo
            </button>
          </span>
        )}
      </div>

      {menuOpen && (
        <div role="menu" aria-label="AI modes" className="flex flex-wrap gap-2 rounded-md border border-line bg-surface p-2">
          {modes.map((m) => (
            <button key={m} type="button" role="menuitem" onClick={() => startMode(m)} className={buttonClass("tonal", "sm")}>
              {aiModeLabel(m)}
            </button>
          ))}
        </div>
      )}

      {panelOpen && mode && (
        <div className="space-y-3 rounded-md border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-foreground">{aiModeLabel(mode)}</span>
            <button type="button" onClick={closePanel} className={buttonClass("quiet", "sm")}>
              Close
            </button>
          </div>

          {busy && !prompt && <p className="text-muted">Building the prompt...</p>}

          {prompt && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={copyPrompt} className={buttonClass("primary", "sm")}>
                  Copy prompt
                </button>
                <span role="status" aria-live="polite" className="text-muted">
                  {copyState === "copied"
                    ? `Copied (${prompt.chars.toLocaleString()} characters)`
                    : copyState === "failed"
                      ? "Copy failed. The prompt is selected below: press Ctrl+C to copy it."
                      : `${prompt.chars.toLocaleString()} characters`}
                </span>
              </div>
              <details open={showPrompt} onToggle={(e) => setShowPrompt((e.target as HTMLDetailsElement).open)}>
                <summary className="cursor-pointer text-muted hover:text-foreground">Show prompt</summary>
                <textarea
                  ref={promptRef}
                  readOnly
                  value={prompt.text}
                  rows={12}
                  spellCheck={false}
                  className="mt-2 w-full rounded-md border border-line bg-surface/50 p-2 font-mono text-[11px] leading-relaxed"
                />
              </details>
            </div>
          )}

          {prompt && (
            <div className="space-y-2">
              <label htmlFor={`ai-answer-${id}-${mode}`} className="block font-medium text-muted">
                Paste the AI&apos;s answer
              </label>
              <textarea
                id={`ai-answer-${id}-${mode}`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full rounded-md border border-line bg-surface/50 p-2 font-mono text-[11px] leading-relaxed"
              />
              <button type="button" onClick={checkAnswer} disabled={busy || !answer.trim()} className={buttonClass("tonal", "sm")}>
                Check answer
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <ul role="alert" className="list-disc space-y-1 pl-5 text-danger">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          {checked && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 font-medium text-muted">
                <span>Current</span>
                <span>Proposed</span>
              </div>
              <div className="max-h-96 overflow-auto rounded-md border border-line">
                {checked.rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 gap-px bg-line font-mono text-[11px]">
                    <div
                      className={`min-h-5 whitespace-pre-wrap break-words bg-surface px-2 py-0.5 ${row.left?.kind === "remove" ? "bg-danger/10" : ""}`}
                    >
                      {row.left?.text ?? ""}
                    </div>
                    <div
                      className={`min-h-5 whitespace-pre-wrap break-words bg-surface px-2 py-0.5 ${row.right?.kind === "add" ? "bg-accent/10" : ""}`}
                    >
                      {row.right?.text ?? ""}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={useThis} className={buttonClass("primary", "sm")}>
                Use this
              </button>
              <p className="text-muted">Applies to the draft only. Save the editor to keep it.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AiAssist;
