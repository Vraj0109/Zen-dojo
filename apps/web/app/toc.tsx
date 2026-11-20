"use client";

import { useEffect, useMemo, useState } from "react";

// The "On this page" list for long lessons and articles (board XLesson): plain entries, the section you are reading in
// a soft pill. It follows the reading position of whatever scrolls the page: the shell's <main> from md up (the window
// itself never scrolls there), the window on phones.

export interface TocItem {
  id: string;
  title: string;
  /** Sub-sections, shown indented under the entry. */
  children?: TocItem[];
}

/** Every id in page order, parents before children. */
const flatIds = (items: TocItem[]): string[] => items.flatMap((i) => [i.id, ...flatIds(i.children ?? [])]);

/** How far below the top of the scroll area a heading counts as "reached". */
const OFFSET = 140;

/** The element that scrolls the page: <main id="main"> when it scrolls, else the window. */
function scrollRoot(): HTMLElement | null {
  const main = document.getElementById("main");
  if (main && /(auto|scroll)/.test(getComputedStyle(main).overflowY)) return main;
  return null;
}

export function Toc({ items }: { items: TocItem[] }) {
  const all = useMemo(() => flatIds(items), [items]);
  const [active, setActive] = useState(all[0] ?? "");

  useEffect(() => {
    let frame = 0;
    let root = scrollRoot();
    const update = () => {
      frame = 0;
      const top = root ? root.getBoundingClientRect().top : 0;
      let current = all[0] ?? "";
      for (const id of all) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - top <= OFFSET) current = id;
      }
      const atBottom = root
        ? root.scrollTop > 0 && root.scrollTop + root.clientHeight >= root.scrollHeight - 4
        : window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && all.length > 0) current = all[all.length - 1];
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const target: HTMLElement | Window = root ?? window;
    const onResize = () => {
      const next = scrollRoot();
      if (next !== root) {
        target.removeEventListener("scroll", schedule);
        root = next;
        (root ?? window).addEventListener("scroll", schedule, { passive: true });
      }
      schedule();
    };
    update();
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      (root ?? window).removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [all]);

  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <TocRow key={item.id} item={item} active={active} />
      ))}
    </ul>
  );
}

/** One entry. A parent reads as current (bold, no pill) while one of its children is the current one. */
function TocRow({ item, active, depth = 0 }: { item: TocItem; active: string; depth?: number }) {
  const children = item.children ?? [];
  const here = item.id === active;
  const inside = !here && flatIds(children).includes(active);
  return (
    <li>
      <a
        href={`#${item.id}`}
        aria-current={here ? "location" : undefined}
        className={`press block rounded-[12px] py-2 pr-3 leading-5 transition-colors duration-150 ${depth > 0 ? "pl-6 text-[13px]" : "pl-3 text-sm"} ${
          here ? "bg-surface-2 font-medium text-foreground" : inside ? "font-medium text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
        }`}
      >
        {item.title}
      </a>
      {children.length > 0 && (
        <ul className="space-y-0.5">
          {children.map((c) => (
            <TocRow key={c.id} item={c} active={active} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
