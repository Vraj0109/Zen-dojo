"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { matchSettings, type SettingsCategory, type SettingsEntry } from "./settings-search";

const ICONS: Record<string, string> = {
  appearance: "M12 3a9 9 0 100 18 4 4 0 004-4c0-1.5-1-2-2-2h-1a2 2 0 01-2-2c0-1 1-2 1-3 0-3-2-7-5-7z",
  plan: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4",
  practice: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  ai: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z",
  buddy: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  account: "M7 18a4 4 0 010-8 5 5 0 019.5-1A4.5 4.5 0 0117 18z",
  content: "M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2zM8 7h6M8 11h6",
  connections: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  profile: "M5 4h14v16H5zM9 9a2 2 0 104 0 2 2 0 00-4 0zM8 16c0-2 1.5-3 3-3s3 1 3 3",
  backup: "M12 4v12M7 11l5 5 5-5M5 20h14",
};

function Icon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={ICONS[id] ?? ICONS.appearance} />
    </svg>
  );
}

export function SettingsShell({
  categories,
  entries,
  children,
}: {
  categories: SettingsCategory[];
  entries: SettingsEntry[];
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const matched = useMemo(() => new Set(matchSettings(entries, categories, query)), [entries, categories, query]);
  const searching = query.trim() !== "";
  const visibleCats = useMemo(
    () => new Set(entries.filter((e) => matched.has(e.id)).map((e) => e.category)),
    [entries, matched],
  );

  // Hide non-matching sections and empty category blocks.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const apply = () => {
      root.querySelectorAll<HTMLElement>("[data-settings-section]").forEach((el) => {
        el.hidden = !matched.has(el.dataset.settingsSection ?? "");
      });
      root.querySelectorAll<HTMLElement>("[data-category-block]").forEach((el) => {
        el.hidden = !visibleCats.has(el.dataset.categoryBlock ?? "");
      });
    };
    apply();
    // Suspense streams sections in later; re-apply when the DOM changes.
    const mo = new MutationObserver(apply);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [matched, visibleCats]);

  // Highlight the category being read.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (items) => {
        for (const it of items) seen.set((it.target as HTMLElement).dataset.categoryBlock ?? "", it.isIntersecting);
        const first = categories.find((c) => seen.get(c.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-10% 0px -65% 0px" },
    );
    root.querySelectorAll("[data-category-block]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [categories]);

  // "/" focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  const navCats = categories.filter((c) => !searching || visibleCats.has(c.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xl">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Search settings"
            aria-label="Search settings"
            className="w-full rounded-lg border border-line bg-surface py-2 pr-12 pl-9"
          />
          {!searching && (
            <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line px-1.5 text-xs text-muted">/</kbd>
          )}
        </div>
        {searching && (
          <p role="status" className="text-sm text-muted">
            {matched.size} {matched.size === 1 ? "setting" : "settings"} found
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Settings categories" className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            {navCats.map((c) => (
              <li key={c.id} className="shrink-0">
                <a
                  href={`#${c.id}`}
                  onClick={(e) => go(e, c.id)}
                  aria-current={active === c.id ? "true" : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm whitespace-nowrap lg:border-transparent lg:py-2 ${
                    active === c.id ? "border-accent bg-surface font-medium text-foreground" : "border-line text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <Icon id={c.id} />
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {searching && matched.size === 0 && (
            <div role="status" className="rounded-xl border border-line bg-surface p-6 text-center">
              <p className="font-medium">No settings match &quot;{query.trim()}&quot;</p>
              <button type="button" onClick={() => setQuery("")} className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-background">
                Clear search
              </button>
            </div>
          )}
          <div ref={contentRef} className="space-y-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
