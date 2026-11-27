"use client";

import { useState } from "react";
import type { BlockRow } from "@habit/shared";
import { MarkdownPreview } from "@/app/markdown-client";

export function TextBlockEditor({
  block,
  onChange,
}: {
  block: BlockRow;
  onChange: (updates: Partial<BlockRow>) => void;
}) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const body = block.body ?? "";

  const insertSnippet = (prefix: string, suffix = "") => {
    const textarea = document.getElementById(`editor-text-${block.id}`) as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = body.slice(start, end);
    const replacement = `${prefix}${sel || "text"}${suffix}`;
    const next = body.slice(0, start) + replacement + body.slice(end);
    onChange({ body: next });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b border-line pb-1.5 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("edit")}
            className={`rounded px-2 py-1 font-medium ${
              tab === "edit" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`rounded px-2 py-1 font-medium ${
              tab === "preview" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            Preview
          </button>
        </div>
        {tab === "edit" && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => insertSnippet("**", "**")}
              className="rounded px-1.5 py-0.5 font-bold hover:bg-surface text-muted hover:text-foreground"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("`", "`")}
              className="rounded px-1.5 py-0.5 font-mono hover:bg-surface text-muted hover:text-foreground"
              title="Inline Code"
            >
              &lt;/&gt;
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("[", "](https://)")}
              className="rounded px-1.5 py-0.5 hover:bg-surface text-muted hover:text-foreground"
              title="Link"
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("- ")}
              className="rounded px-1.5 py-0.5 hover:bg-surface text-muted hover:text-foreground"
              title="Bullet list"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("1. ")}
              className="rounded px-1.5 py-0.5 hover:bg-surface text-muted hover:text-foreground"
              title="Numbered list"
            >
              1. List
            </button>
          </div>
        )}
      </div>

      {tab === "edit" ? (
        <textarea
          id={`editor-text-${block.id}`}
          value={body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Write Markdown here..."
          rows={Math.max(4, Math.min(18, body.split("\n").length + 1))}
          className="w-full rounded-md border border-line bg-surface/50 p-3 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
        />
      ) : (
        <div className="min-h-[6rem] rounded-md border border-line bg-surface/20 p-3 text-sm">
          {body ? <MarkdownPreview source={body} /> : <p className="italic text-muted">Nothing to preview</p>}
        </div>
      )}
    </div>
  );
}
