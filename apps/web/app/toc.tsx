"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// The "On this page" list for long lessons and articles. It follows your reading position: the section you are in is
// highlighted, a marker slides to it, and a thin bar shows how far down the page you are. Clicking an entry scrolls to
// it. With animations switched off (Settings > Animations) the marker simply jumps.

export interface TocItem {
  id: string;
  title: string;
  /** Sub-sections, shown indented under the entry. */
  children?: TocItem[];
}

/** Every id in page order, parents before children. */
const flatIds = (items: TocItem[]): string[] => items.flatMap((i) => [i.id, ...flatIds(i.children ?? [])]);

/** How far below the top of the window a heading counts as "reached". */
const OFFSET = 140;

export function Toc({ items }: { items: TocItem[] }) {
  const all = useMemo(() => flatIds(items), [items]);
  const [active, setActive] = useState(all[0] ?? "");
  const [progress, setProgress] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = all[0] ?? "";
      for (const id of all) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= OFFSET) current = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && items.length > 0) current = items[items.length - 1].id;
      setActive(current);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items, all]);

  // Move the marker to the active entry.
  useEffect(() => {
    const li = listRef.current?.querySelector<HTMLElement>(`[data-toc="${CSS.escape(active)}"]`);
    if (li) setMarker({ top: li.offsetTop, height: li.offsetHeight });
  }, [active]);

  return (
    <div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="How far down the page you are" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <ul ref={listRef} className="relative space-y-0.5 border-l border-line">
        {marker && (
          <span
            aria-hidden
            className="absolute -left-px w-0.5 rounded-full bg-accent transition-[transform,height] duration-300 ease-out"
            style={{ transform: `translateY(${marker.top}px)`, height: marker.height, top: 0 }}
          />
        )}
        {items.map((item) => (
          <TocRow key={item.id} item={item} active={active} />
        ))}
      </ul>
    </div>
  );
}

/** One entry. The parent is highlighted while it or any of its children is the current one. */
function TocRow({ item, active, depth = 0 }: { item: TocItem; active: string; depth?: number }) {
  const children = item.children ?? [];
  const inside = item.id === active || flatIds(children).includes(active);
  return (
    <li>
      <div data-toc={item.id}>
        <a
          href={`#${item.id}`}
          aria-current={item.id === active ? "location" : undefined}
          className={`block rounded-r py-1 pr-3 transition-colors ${depth > 0 ? "pl-6 text-[13px]" : "pl-3 text-sm"} ${
            item.id === active ? "bg-accent/10 font-medium text-foreground" : inside ? "font-medium text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {item.title}
        </a>
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <TocRow key={c.id} item={c} active={active} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
