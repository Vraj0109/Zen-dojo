"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass } from "../ui";

export interface FilterSection {
  title: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
}

/**
 * One "Filters" button for the DSA list: a popover on desktop, a bottom sheet on phones. With JavaScript each tick
 * applies at once (the URL is replaced, the menu stays open); without it, "Show results" submits the surrounding GET form.
 */
export function FiltersMenu({ sections }: { sections: FilterSection[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selectedTotal = sections.reduce((n, s) => n + s.selected.length, 0);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [prevTotal, setPrevTotal] = useState(selectedTotal);
  if (prevTotal !== selectedTotal) {
    setPrevTotal(selectedTotal);
    setLiveCount(null);
  }
  const count = liveCount ?? selectedTotal;

  // Keep the boxes in step with the URL (chips can remove a value while the menu is closed).
  const key = sections.map((s) => `${s.name}=${s.selected.join(",")}`).join("&");
  useEffect(() => {
    const boxes = detailsRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]");
    boxes?.forEach((cb) => {
      const sec = sections.find((s) => s.name === cb.name);
      cb.checked = !!sec?.selected.includes(cb.value);
    });
    // sections is rebuilt on every render; `key` captures what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    function outside(e: PointerEvent) {
      if (detailsRef.current?.open && !detailsRef.current.contains(e.target as Node)) detailsRef.current.open = false;
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape" && detailsRef.current?.open) detailsRef.current.open = false;
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const apply = () => {
    const form = detailsRef.current?.closest("form");
    if (!form) return;
    setLiveCount(form.querySelectorAll("details input[type=checkbox]:checked").length);
    const sp = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v !== "" && k !== "page" && !(k === "sort" && v === "roadmap")) sp.append(k, v);
    startTransition(() => router.replace(`/dsa${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  const clearAll = () => {
    detailsRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((cb) => {
      cb.checked = false;
    });
    apply();
  };

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={`${buttonClass("secondary", "md")} cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden ${
          count > 0 ? "border-primary text-primary" : ""
        }`}
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filters
        {count > 0 && (
          <span className="rounded-full bg-primary-soft px-1.5 text-xs font-semibold text-primary tabular-nums" aria-label={`${count} selected`}>
            {count}
          </span>
        )}
        {pending && <span className="sr-only">Updating</span>}
      </summary>
      <div className="fixed inset-0 z-40 hidden bg-black/40 max-md:group-open:block" onClick={close} aria-hidden="true" />
      <div
        className="border border-line bg-surface shadow-lg md:absolute md:right-0 md:top-full md:z-30 md:mt-2 md:w-[min(34rem,calc(100vw-2rem))] md:rounded-md max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50 max-md:rounded-t-lg max-md:pb-[env(safe-area-inset-bottom)]"
        role="group"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm">
          <span className="font-semibold">Filters</span>
          <button type="button" onClick={clearAll} className="text-muted hover:text-foreground max-md:min-h-11 max-md:px-2">
            Clear all
          </button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-4 md:max-h-[26rem] md:grid-cols-2 max-md:max-h-[60dvh]">
          {sections.map((s) => (
            <fieldset key={s.name} className="min-w-0">
              <legend className="mb-1.5 text-xs font-semibold text-muted">{s.title}</legend>
              <div className={`space-y-0.5 text-sm ${s.options.length > 8 ? "max-h-48 overflow-y-auto pr-1" : ""}`}>
                {s.options.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 select-none hover:bg-surface-2 max-md:min-h-11">
                    <input
                      type="checkbox"
                      name={s.name}
                      value={opt.value}
                      defaultChecked={s.selected.includes(opt.value)}
                      onChange={apply}
                      className="accent-[var(--primary)] max-md:size-5"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line px-4 py-3">
          <button type="button" onClick={close} className={buttonClass("secondary", "md", "flex-1 max-md:min-h-11 md:hidden")}>
            Done
          </button>
          {/* Without JavaScript the ticks only apply on submit. */}
          <button type="submit" className={buttonClass("primary", "md", "flex-[2] max-md:min-h-11 md:ml-auto md:flex-none")}>
            Show results
          </button>
        </div>
      </div>
    </details>
  );
}

/** Sort select for the DSA list; applies on change with JavaScript, on submit without. */
export function SortSelect({ value, options }: { value: string; options: readonly { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="max-sm:sr-only">Sort</span>
      <select
        name="sort"
        defaultValue={value}
        onChange={(e) => {
          const form = e.currentTarget.form;
          if (!form) return;
          const sp = new URLSearchParams();
          for (const [k, v] of new FormData(form)) if (typeof v === "string" && v !== "" && k !== "page" && !(k === "sort" && v === "roadmap")) sp.append(k, v);
          router.replace(`/dsa${sp.size ? `?${sp}` : ""}`, { scroll: false });
        }}
        className="h-9 rounded-sm border border-line-strong bg-surface px-2 text-sm text-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
