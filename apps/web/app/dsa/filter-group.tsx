"use client";

import { useEffect, useRef, useState } from "react";

export function FilterGroup({
  title,
  name,
  options,
  selected,
}: {
  title: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [prevSelected, setPrevSelected] = useState(selected);

  if (prevSelected !== selected) {
    setPrevSelected(selected);
    setLiveCount(null);
  }

  const count = liveCount ?? selected.length;

  // Sync checkboxes when selected prop changes
  useEffect(() => {
    const checkboxes = detailsRef.current?.querySelectorAll<HTMLInputElement>(
      `input[name="${name}"]`
    );
    checkboxes?.forEach((cb) => {
      cb.checked = selected.includes(cb.value);
    });
  }, [name, selected]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const updateCount = () => {
    const checked = detailsRef.current?.querySelectorAll<HTMLInputElement>(
      `input[name="${name}"]:checked`
    );
    setLiveCount(checked?.length ?? 0);
  };

  const selectAll = () => {
    const checkboxes = detailsRef.current?.querySelectorAll<HTMLInputElement>(
      `input[name="${name}"]`
    );
    checkboxes?.forEach((cb) => {
      cb.checked = true;
    });
    updateCount();
  };

  const clear = () => {
    const checkboxes = detailsRef.current?.querySelectorAll<HTMLInputElement>(
      `input[name="${name}"]`
    );
    checkboxes?.forEach((cb) => {
      cb.checked = false;
    });
    updateCount();
  };

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm select-none hover:bg-surface/50 [&::-webkit-details-marker]:hidden transition-colors ${
          count > 0
            ? "border-accent/60 bg-accent/10 text-accent font-medium"
            : "border-line bg-background text-foreground"
        }`}
      >
        <span>{title}</span>
        <span
          className={`size-1.5 rounded-full transition-opacity ${
            count > 0 ? "bg-accent opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
        <span className="text-[10px] text-muted transition-transform group-open:rotate-180" aria-hidden="true">
          ▼
        </span>
      </summary>
      <div
        className="fixed inset-0 z-40 hidden bg-black/40 max-md:group-open:block"
        onClick={close}
        aria-hidden="true"
      />
      <div className="rounded-xl border border-line bg-surface p-2 shadow-lg md:absolute md:left-0 md:top-full md:z-30 md:mt-1 md:min-w-[13rem] md:max-w-xs max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:z-50 max-md:mt-0 max-md:max-w-none max-md:rounded-b-none max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-1.5 flex items-center justify-between border-b border-line px-1 pb-1.5 text-xs text-muted">
          <span>{count > 0 ? `${count} selected` : "None selected"}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="font-medium hover:text-foreground max-md:min-h-11 max-md:px-2"
            >
              Select all
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={clear}
              className="font-medium hover:text-foreground max-md:min-h-11 max-md:px-2"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="md:max-h-60 max-md:max-h-[55dvh] overflow-y-auto space-y-1 pr-1 text-sm">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-background cursor-pointer select-none max-md:min-h-11"
            >
              <input
                type="checkbox"
                name={name}
                value={opt.value}
                defaultChecked={selected.includes(opt.value)}
                onChange={updateCount}
                className="rounded border-line text-accent focus:ring-accent max-md:size-5"
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex gap-2 border-t border-line pt-2 md:hidden">
          <button
            type="button"
            onClick={close}
            className="min-h-11 flex-1 rounded-lg border border-line text-sm font-medium"
          >
            Done
          </button>
          <button
            type="submit"
            className="min-h-11 flex-[2] rounded-lg bg-accent text-sm font-medium text-on-accent"
          >
            Show results
          </button>
        </div>
      </div>
    </details>
  );
}
