"use client";

export function SaveFooter({
  note,
  onNoteChange,
  notify,
  onNotifyChange,
  onSave,
  saving,
  errors = [],
  conflict = false,
  onReloadLatest,
  onOverwrite,
  lastSavedAt,
  lastSavedBy,
  isDirty = false,
}: {
  note: string;
  onNoteChange: (note: string) => void;
  notify: boolean;
  onNotifyChange: (notify: boolean) => void;
  onSave: () => void;
  saving: boolean;
  errors?: string[];
  conflict?: boolean;
  onReloadLatest?: () => void;
  onOverwrite?: () => void;
  lastSavedAt?: number | string | null;
  lastSavedBy?: string | null;
  isDirty?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 rounded-lg border border-line bg-surface/95 p-4 backdrop-blur shadow-lg space-y-3">
      {errors.length > 0 && (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
          <p className="font-semibold mb-1">Please fix the following before saving:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {conflict && (
        <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-300 flex flex-wrap items-center justify-between gap-2">
          <span>Someone saved this item after you opened it.</span>
          <div className="flex items-center gap-2">
            {onReloadLatest && (
              <button
                type="button"
                onClick={onReloadLatest}
                className="rounded border border-yellow-500/40 bg-surface px-2.5 py-1 text-xs text-yellow-200 hover:bg-surface-2"
              >
                Load their version
              </button>
            )}
            {onOverwrite && (
              <button
                type="button"
                onClick={onOverwrite}
                className="rounded bg-yellow-600 px-2.5 py-1 text-xs font-semibold text-black hover:bg-yellow-500"
              >
                Overwrite
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1 min-w-[280px]">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-medium text-muted mb-0.5">
              What changed <span className="text-muted font-normal">(one line, up to 140 chars)</span>
              {notify && <span className="text-red-400"> *</span>}
            </label>
            <input
              type="text"
              name="note"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              maxLength={140}
              placeholder="e.g. Added Java solution, fixed constraint..."
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1 text-xs focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none">
              <input
                type="checkbox"
                name="notify"
                checked={notify}
                onChange={(e) => onNotifyChange(e.target.checked)}
                className="rounded border-line text-accent focus:ring-accent"
              />
              Tell learners
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] text-muted">
            {lastSavedAt ? (
              <span>
                Last saved {typeof lastSavedAt === "number" ? new Date(lastSavedAt).toLocaleTimeString() : lastSavedAt}
                {lastSavedBy ? ` by ${lastSavedBy}` : ""}
              </span>
            ) : (
              <span>Not saved yet</span>
            )}
            {isDirty && <span className="ml-1 text-accent font-semibold">• Unsaved changes</span>}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-md bg-accent px-5 py-2 text-xs font-semibold text-white shadow hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <noscript>
            <button
              type="submit"
              name="op"
              value="save"
              className="rounded-md bg-accent px-5 py-2 text-xs font-semibold text-white"
            >
              Save (no JS)
            </button>
          </noscript>
        </div>
      </div>
    </div>
  );
}
