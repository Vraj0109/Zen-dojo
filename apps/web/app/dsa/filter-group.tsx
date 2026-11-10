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
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

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
      <div className="absolute left-0 top-full z-30 mt-1 min-w-[13rem] max-w-xs rounded-xl border border-line bg-surface p-2 shadow-lg">
        <div className="mb-1.5 flex items-center justify-between border-b border-line px-1 pb-1.5 text-xs text-muted">
          <span>{count > 0 ? `${count} selected` : "None selected"}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="font-medium hover:text-foreground"
            >
              Select all
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={clear}
              className="font-medium hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 text-sm">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-background cursor-pointer select-none"
            >
              <input
                type="checkbox"
                name={name}
                value={opt.value}
                defaultChecked={selected.includes(opt.value)}
                onChange={updateCount}
                className="rounded border-line text-accent focus:ring-accent"
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}
