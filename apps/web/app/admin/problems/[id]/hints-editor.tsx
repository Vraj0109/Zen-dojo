"use client";

import { CloseIcon } from "@/app/ui";

import type { HintRow } from "@habit/shared";

export function HintsEditor({
  hints,
  onChange,
}: {
  hints: HintRow[];
  onChange: (hints: HintRow[]) => void;
}) {
  const handleUpdate = (index: number, bodyMd: string) => {
    const next = [...hints];
    next[index] = { ...next[index], bodyMd };
    onChange(next);
  };

  const handleAdd = () => {
    const newHint: HintRow = {
      ord: hints.length,
      bodyMd: "",
    };
    onChange([...hints, newHint]);
  };

  const handleRemove = (index: number) => {
    const next = hints.filter((_, i) => i !== index).map((h, i) => ({ ...h, ord: i }));
    onChange(next);
  };

  const handleMove = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= hints.length) return;
    const next = [...hints];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next.map((h, i) => ({ ...h, ord: i })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Hints ({hints.length}/20)</h3>
          <p className="text-xs text-muted">Progressive clues revealed one by one to learners.</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={hints.length >= 20}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-40"
        >
          + Add hint
        </button>
      </div>

      {hints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted text-xs">
          No hints defined. Click &ldquo;+ Add hint&rdquo; to add the first progressive hint.
        </div>
      ) : (
        <div className="space-y-3">
          {hints.map((h, idx) => (
            <div key={idx} className="rounded-lg border border-line bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-semibold text-foreground">Hint {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-muted hover:text-foreground disabled:opacity-20"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === hints.length - 1}
                    className="rounded p-1 text-muted hover:text-foreground disabled:opacity-20"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="rounded p-1 text-muted hover:text-red-400 ml-1"
                    title="Remove hint"
                  >
                    <CloseIcon className="size-4" label="Remove hint" />
                  </button>
                </div>
              </div>
              <textarea
                value={h.bodyMd}
                onChange={(e) => handleUpdate(idx, e.target.value)}
                placeholder={`Hint ${idx + 1} Markdown text...`}
                rows={2}
                maxLength={1000}
                className="w-full rounded border border-line bg-surface/50 p-2 text-xs focus:border-accent focus:outline-none"
              />
              <div className="text-[10px] text-right text-muted">{h.bodyMd.length}/1000 chars</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
