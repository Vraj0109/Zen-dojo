"use client";

import type { BlockType } from "@habit/shared";

export function InsertBar({
  onAdd,
  sectionId,
  index,
}: {
  onAdd: (type: BlockType) => void;
  sectionId: string;
  index: number;
}) {
  return (
    <div className="group relative my-2 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-dashed border-line/60 group-hover:border-accent/60" />
      </div>
      <div className="relative flex items-center gap-1 bg-surface px-2 py-0.5 text-xs opacity-40 group-hover:opacity-100 transition-opacity rounded-full border border-line">
        <span className="text-[10px] text-muted mr-1">+</span>
        <button
          type="button"
          onClick={() => onAdd("markdown")}
          className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-accent/20 hover:text-foreground"
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => onAdd("code")}
          className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-accent/20 hover:text-foreground"
        >
          Code
        </button>
        <button
          type="button"
          onClick={() => onAdd("diagram")}
          className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-accent/20 hover:text-foreground"
        >
          Diagram
        </button>
        <button
          type="button"
          onClick={() => onAdd("image")}
          className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-accent/20 hover:text-foreground"
        >
          Image
        </button>

        {/* Fallback submit buttons for non-JS */}
        <noscript>
          <div className="inline-flex gap-1 ml-2">
            <button
              type="submit"
              name="op"
              value={`add:markdown:${sectionId}:${index}`}
              className="text-[10px] underline"
            >
              +Text
            </button>
            <button
              type="submit"
              name="op"
              value={`add:code:${sectionId}:${index}`}
              className="text-[10px] underline"
            >
              +Code
            </button>
            <button
              type="submit"
              name="op"
              value={`add:diagram:${sectionId}:${index}`}
              className="text-[10px] underline"
            >
              +Diag
            </button>
            <button
              type="submit"
              name="op"
              value={`add:image:${sectionId}:${index}`}
              className="text-[10px] underline"
            >
              +Img
            </button>
          </div>
        </noscript>
      </div>
    </div>
  );
}

export function BlockHeader({
  blockId,
  type,
  variant,
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  blockId: string;
  type: BlockType;
  variant?: string | null;
  label?: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const handleRemove = () => {
    const typeName = type === "markdown" ? "Text" : type.charAt(0).toUpperCase() + type.slice(1);
    if (window.confirm(`Remove this ${typeName} block?`)) {
      onRemove();
    }
  };

  const typeDisplay = () => {
    switch (type) {
      case "markdown":
        return "Text Block";
      case "code":
        return `Code (${label || variant || "solution"})`;
      case "diagram":
        return "Mermaid Diagram";
      case "image":
        return "Image Block";
      default:
        return type;
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-line/60 bg-surface/40 px-3 py-1.5 text-xs">
      <span className="font-semibold text-muted text-[11px] tracking-wide uppercase">{typeDisplay()}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="rounded p-1 text-muted hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          title="Move up (Alt+Up)"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="rounded p-1 text-muted hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          title="Move down (Alt+Down)"
        >
          ▼
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded px-1.5 py-0.5 text-muted hover:bg-surface hover:text-foreground"
          title="Duplicate block"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={handleRemove}
          className="rounded px-1.5 py-0.5 text-muted hover:bg-red-500/20 hover:text-red-400"
          title="Remove block"
        >
          Remove
        </button>

        {/* Fallback buttons for non-JS */}
        <noscript>
          <button type="submit" name="op" value={`up:${blockId}`} className="ml-1 text-[10px] underline">
            Up
          </button>
          <button type="submit" name="op" value={`down:${blockId}`} className="ml-1 text-[10px] underline">
            Down
          </button>
          <button type="submit" name="op" value={`dup:${blockId}`} className="ml-1 text-[10px] underline">
            Dup
          </button>
          <button type="submit" name="op" value={`remove:${blockId}`} className="ml-1 text-[10px] text-red-400 underline">
            Del
          </button>
        </noscript>
      </div>
    </div>
  );
}
