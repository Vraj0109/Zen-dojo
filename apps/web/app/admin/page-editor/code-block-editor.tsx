"use client";

import { useState } from "react";
import { CODE_LANGS, type BlockRow, type CodeLang, type CodeVariant } from "@habit/shared";

const LANG_LABELS: Record<string, string> = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  go: "Go",
  rust: "Rust",
  csharp: "C#",
  sql: "SQL",
};

export function CodeBlockEditor({
  block,
  onChange,
  onRunCode,
  allowedLangs = CODE_LANGS,
}: {
  block: BlockRow;
  onChange: (updates: Partial<BlockRow>) => void;
  onRunCode?: (lang: CodeLang, code: string, isOptimal: boolean) => void;
  allowedLangs?: readonly string[];
}) {
  const codeMap: Record<string, string> = (block.code as Record<string, string>) ?? {};
  const currentLangs = Object.keys(codeMap);
  const [activeLang, setActiveLang] = useState<string>(currentLangs[0] ?? "cpp");

  const effectiveActiveLang = currentLangs.includes(activeLang) ? activeLang : currentLangs[0] ?? "cpp";
  const activeCode = codeMap[effectiveActiveLang] ?? "";

  const handleCodeChange = (lang: string, newCode: string) => {
    onChange({
      code: {
        ...codeMap,
        [lang]: newCode,
      },
    });
  };

  const handleAddLanguage = (lang: string) => {
    onChange({
      code: {
        ...codeMap,
        [lang]: "",
      },
    });
    setActiveLang(lang);
  };

  const handleRemoveLanguage = (lang: string) => {
    const next = { ...codeMap };
    delete next[lang];
    onChange({ code: next });
    // Only move the selection when the removed tab was the one showing; removing another tab keeps the current one.
    const remaining = Object.keys(next);
    if (lang === effectiveActiveLang && remaining.length > 0) {
      setActiveLang(remaining[0]);
    }
  };

  const availableToAdd = allowedLangs.filter((l) => !currentLangs.includes(l));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-2 text-xs">
        <div>
          <label className="mr-1.5 font-medium text-muted">Variant:</label>
          <select
            value={block.variant ?? "optimal"}
            onChange={(e) => onChange({ variant: e.target.value as CodeVariant })}
            className="rounded border border-line bg-surface px-2 py-1 text-xs focus:border-accent focus:outline-none"
          >
            <option value="optimal">Optimized (Optimal)</option>
            <option value="semi">Semi-optimized (Alternative)</option>
            <option value="brute">Brute force</option>
            <option value="custom">Custom label</option>
          </select>
        </div>

        {block.variant === "custom" && (
          <div>
            <label className="mr-1.5 font-medium text-muted">Label:</label>
            <input
              type="text"
              value={block.label ?? ""}
              onChange={(e) => onChange({ label: e.target.value || null })}
              placeholder="e.g. Two Pointers"
              className="w-36 rounded border border-line bg-surface px-2 py-1 text-xs focus:border-accent focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="mr-1.5 font-medium text-muted">Time:</label>
          <input
            type="text"
            value={block.timeComplexity ?? ""}
            onChange={(e) => onChange({ timeComplexity: e.target.value || null })}
            placeholder="O(n)"
            className="w-24 rounded border border-line bg-surface px-2 py-1 text-xs focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mr-1.5 font-medium text-muted">Space:</label>
          <input
            type="text"
            value={block.spaceComplexity ?? ""}
            onChange={(e) => onChange({ spaceComplexity: e.target.value || null })}
            placeholder="O(1)"
            className="w-24 rounded border border-line bg-surface px-2 py-1 text-xs focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          {currentLangs.map((lang) => (
            <div
              key={lang}
              className={`flex items-center rounded border ${
                effectiveActiveLang === lang
                  ? "border-accent bg-accent/15 text-accent font-semibold"
                  : "border-line bg-surface/50 text-muted hover:text-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveLang(lang)}
                className="px-2.5 py-1 text-xs focus:outline-none"
              >
                {LANG_LABELS[lang] ?? lang}
              </button>
              {currentLangs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(lang)}
                  className="px-1.5 py-1 text-muted hover:text-red-400"
                  title="Remove language tab"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {availableToAdd.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleAddLanguage(e.target.value);
              }}
              className="rounded border border-dashed border-line bg-surface px-2 py-1 text-xs text-muted hover:text-foreground focus:outline-none cursor-pointer"
            >
              <option value="" disabled>
                + Add language
              </option>
              {availableToAdd.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l] ?? l}
                </option>
              ))}
            </select>
          )}
        </div>

        {onRunCode && (
          <button
            type="button"
            onClick={() => onRunCode(effectiveActiveLang as CodeLang, activeCode, block.variant === "optimal")}
            className="rounded border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent/20"
          >
            Run tests ({LANG_LABELS[effectiveActiveLang] ?? effectiveActiveLang})
          </button>
        )}
      </div>

      <div>
        <textarea
          value={activeCode}
          onChange={(e) => handleCodeChange(effectiveActiveLang, e.target.value)}
          placeholder={`Write ${LANG_LABELS[effectiveActiveLang] ?? effectiveActiveLang} code here...`}
          rows={Math.max(6, Math.min(24, activeCode.split("\n").length + 1))}
          className="w-full rounded-md border border-line bg-surface/50 p-3 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
