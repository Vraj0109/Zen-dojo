"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type DsaSort } from "@/lib/dsa-filters";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroupSection {
  title: string;
  options: FilterOption[];
}

interface FilterChipProps {
  name: string;
  label: string;
  selected: string[];
  options?: FilterOption[];
  groups?: FilterGroupSection[];
  searchable?: boolean;
  searchPlaceholder?: string;
  /** The current URL without this filter. When given, the chip's x is a plain link, so it also works without JS. */
  clearHref?: string;
}

/** "Pattern: Hash map, Two pointers" or "Pattern: Hash map, Two pointers +2". */
function chipLabel(label: string, selected: string[], all: FilterOption[]): string {
  if (selected.length === 0) return label;
  const names = selected.map((val) => all.find((o) => o.value === val)?.label ?? val);
  return names.length <= 2 ? `${label}: ${names.join(", ")}` : `${label}: ${names[0]}, ${names[1]} +${names.length - 2}`;
}

/** One checkbox row. Its look follows the real checkbox (CSS `peer-checked`), so it is right before and after
 *  navigation and without JavaScript. */
function OptionRow({ name, opt, checked, hidden, onChange }: { name: string; opt: FilterOption; checked: boolean; hidden: boolean; onChange: () => void }) {
  return (
    <label
      className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[12px] px-2 py-1 text-sm select-none transition-colors hover:bg-surface-2 has-[:checked]:font-medium ${
        hidden ? "hidden" : ""
      }`}
    >
      <input type="checkbox" name={name} value={opt.value} defaultChecked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 border-line-strong text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      >
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 truncate">{opt.label}</span>
    </label>
  );
}

const CLEAR_ICON = (
  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/**
 * Filter chip that opens a checkbox menu. It must sit inside the page's GET form.
 * - With JS: a change applies at once (URL replace); the Pattern menu can be searched; the x clears this filter.
 * - Without JS: the menu is a plain <details> with checkboxes and an Apply button that submits the form; the x is a
 *   link when the page passes `clearHref` (otherwise uncheck the boxes and press Apply).
 * Every option stays in the DOM while searching (non-matches are only hidden), so a search never drops a checked box.
 */
export function FilterChipMenu({ name, label, selected, options, groups, searchable = false, searchPlaceholder = "Search", clearHref }: FilterChipProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const pathname = usePathname() ?? "/dsa";
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const isActive = selected.length > 0;
  const all = groups ? groups.flatMap((g) => g.options) : (options ?? []);
  const chipText = chipLabel(label, selected, all);

  // Close on a click outside or Escape.
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (detailsRef.current?.open && !detailsRef.current.contains(e.target as Node)) detailsRef.current.open = false;
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector("summary")?.focus();
      }
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
    const sp = new URLSearchParams();
    for (const [k, v] of new FormData(form)) {
      if (typeof v === "string" && v !== "" && k !== "page" && !(k === "sort" && v === "roadmap")) sp.append(k, v);
    }
    startTransition(() => {
      router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
    });
  };

  // With JS: uncheck this filter's boxes and apply (also used when the page gave no clearHref).
  const clear = (e: React.MouseEvent) => {
    e.preventDefault();
    detailsRef.current?.querySelectorAll<HTMLInputElement>(`input[name="${CSS.escape(name)}"]`).forEach((cb) => {
      cb.checked = false;
    });
    close();
    apply();
  };

  const q = search.trim().toLowerCase();
  const matches = (o: FilterOption) => !q || o.label.toLowerCase().includes(q);
  const anyMatch = all.some(matches);
  const clearClass = "mr-0.5 flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-on-primary-soft/10";

  return (
    <div
      className={`relative inline-flex max-w-full items-center rounded-[10px] max-md:static ${
        isActive ? "bg-primary-soft text-on-primary-soft" : "border border-line-strong text-foreground"
      }`}
    >
      <details ref={detailsRef} className="group min-w-0">
        <summary
          className={`flex h-9 min-w-0 cursor-pointer list-none items-center gap-1.5 rounded-[10px] text-sm font-medium transition-colors select-none max-md:h-10 [&::-webkit-details-marker]:hidden ${
            isActive ? "pr-1 pl-3.5 hover:bg-primary-soft/80" : "pr-3 pl-4 hover:bg-surface-2"
          }`}
        >
          <span className="max-w-[220px] min-w-0 truncate sm:max-w-[300px]">{chipText}</span>
          {!isActive && (
            <svg className="size-4 shrink-0 opacity-70 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </summary>

        {/* The menu. Desktop: under the chip. Phone: as wide as the page, under the chip row (no fixed position:
            <main> is a size container, so fixed would be placed relative to it, not to the screen). */}
        <div
          role="group"
          aria-label={`${label} options`}
          className={`z-30 mt-2 flex max-h-[min(22rem,70dvh)] flex-col gap-1 rounded-[20px] border border-line bg-surface p-2.5 text-foreground shadow-menu max-md:absolute max-md:inset-x-4 md:absolute md:top-full md:left-0 dark:border-0 ${
            searchable ? "md:w-80" : "md:w-64"
          }`}
        >
          {searchable && (
            <label className="mb-1 flex h-10 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3 text-muted">
              <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Enter would submit the whole page form; here it only filters the list.
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </label>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            {groups
              ? groups.map((g) => (
                  <div key={g.title} className={g.options.some(matches) ? "" : "hidden"}>
                    <p className="mx-2 mt-2 mb-0.5 text-xs font-semibold tracking-[0.04em] text-muted uppercase">{g.title}</p>
                    {g.options.map((opt) => (
                      <OptionRow key={opt.value} name={name} opt={opt} checked={selected.includes(opt.value)} hidden={!matches(opt)} onChange={apply} />
                    ))}
                  </div>
                ))
              : (options ?? []).map((opt) => (
                  <OptionRow key={opt.value} name={name} opt={opt} checked={selected.includes(opt.value)} hidden={!matches(opt)} onChange={apply} />
                ))}
            {!anyMatch && (
              <p className="px-2 py-3 text-sm text-muted">
                No {label.toLowerCase()} matches &ldquo;{search.trim()}&rdquo;.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line pt-2">
            <button type="button" onClick={close} className="h-10 rounded-full px-4 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground">
              Done
            </button>
            <noscript>
              <button type="submit" className="h-10 rounded-full bg-primary px-5 text-sm font-medium text-on-primary">
                Apply
              </button>
            </noscript>
          </div>
        </div>
      </details>

      {isActive &&
        (clearHref ? (
          <Link href={clearHref} scroll={false} onClick={clear} aria-label={`Clear ${label} filter`} title={`Clear ${label} filter`} className={clearClass}>
            {CLEAR_ICON}
          </Link>
        ) : (
          <button type="button" onClick={clear} aria-label={`Clear ${label} filter`} title={`Clear ${label} filter`} className={clearClass}>
            {CLEAR_ICON}
          </button>
        ))}
    </div>
  );
}

/** Legacy wrapper kept for compatibility */
export function FiltersMenu({ sections }: { sections: { title: string; name: string; options: FilterOption[]; selected: string[] }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {sections.map((s) => (
        <FilterChipMenu key={s.name} name={s.name} label={s.title} selected={s.selected} options={s.options} />
      ))}
    </div>
  );
}

/** Sort select for the DSA list; applies on change with JavaScript, with the Sort button without. */
export function SortSelect({ value, options }: { value: string; options: readonly { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dsa";
  const [, startTransition] = useTransition();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSort = e.target.value as DsaSort;
    const form = e.target.closest("form");
    if (!form) return;
    const sp = new URLSearchParams();
    for (const [k, v] of new FormData(form)) {
      if (typeof v === "string" && v !== "" && k !== "page" && k !== "sort") sp.append(k, v);
    }
    if (nextSort !== "roadmap") sp.set("sort", nextSort);
    startTransition(() => {
      router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
    });
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <label className="inline-flex items-center gap-1.5 text-sm text-muted">
        <span className="max-sm:sr-only">sorted by</span>
        <select
          key={value}
          name="sort"
          defaultValue={value}
          onChange={onChange}
          aria-label="Sort problems"
          className="h-9 rounded-[10px] border border-line-strong bg-surface px-2.5 text-sm font-medium text-foreground hover:bg-surface-2 focus:border-primary focus:outline-none max-md:h-10"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="h-9 rounded-full px-3 text-sm font-medium text-primary hover:bg-surface-2">
          Sort
        </button>
      </noscript>
    </span>
  );
}
