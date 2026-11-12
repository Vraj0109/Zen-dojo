"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tick } from "@/lib/haptics";

type Item = { el: HTMLElement; title: string; level: 1 | 2 };

/** Pages with long reading: lessons, pattern guides and the help page. */
const READING = /^\/(study|dsa\/pattern|help)(\/|$)/;
const MIN_ITEMS = 4;
const MAX_WITH_SUBSECTIONS = 60;
const SLOT = 16; // px per dot: dots sit close together, like the macOS Dock
const SPREAD = 2.6; // how many dots either side of the finger are magnified

/** 0 at the edge of the magnified zone, 1 under the finger. Smooth, like the Dock's fisheye. */
const near = (d: number) => Math.max(0, 1 - Math.abs(d) / SPREAD) ** 2;

/**
 * Phones only. A compact column of dots on the right edge: big dots are sections (h2), small dots are the sub-sections
 * inside them (h3). Press and drag along it to move through the page: the dots under your finger grow like the macOS
 * Dock and show their names, and each step gives a light haptic tick (see lib/haptics.ts). When you are not touching it
 * the dot for the part you are reading is highlighted.
 */
export function SectionScrubber() {
  const pathname = usePathname();
  const enabled = READING.test(pathname ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const rail = useRef<HTMLDivElement | null>(null);
  const last = useRef(-1);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scan = () => {
      const all = [...document.querySelectorAll<HTMLElement>("main h2, main h3")].filter(
        (h) => h.offsetParent !== null && (h.textContent ?? "").trim() !== "",
      );
      const withSub = all.length <= MAX_WITH_SUBSECTIONS;
      const found: Item[] = all
        .filter((h) => withSub || h.tagName === "H2")
        .map((el) => ({ el, title: (el.textContent ?? "").trim(), level: el.tagName === "H3" ? 2 : 1 }));
      setItems((prev) => (prev.length === found.length && prev.every((p, i) => p.el === found[i].el) ? prev : found));
    };
    scan();
    // Lessons stream in after the first paint, so look again when the page changes.
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 250);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      clearTimeout(timer);
    };
  }, [enabled, pathname]);

  useEffect(() => {
    if (items.length < MIN_ITEMS) return;
    const onScroll = () => {
      let idx = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].el.getBoundingClientRect().top <= 140) idx = i;
        else break;
      }
      setActive(idx);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  if (!enabled || items.length < MIN_ITEMS) return null;

  const n = items.length;
  const go = (idx: number) => {
    if (idx === last.current) return;
    last.current = idx;
    tick(items[idx].level === 1 ? 10 : 5);
    items[idx].el.scrollIntoView({ block: "start" });
  };
  const pick = (clientY: number) => {
    const r = rail.current?.getBoundingClientRect();
    if (!r || r.height === 0) return;
    const f = (clientY - r.top) / (r.height / n) - 0.5; // fractional index under the finger
    const clamped = Math.min(n - 1, Math.max(0, f));
    setFocus(clamped);
    go(Math.round(clamped));
  };
  const end = () => {
    setFocus(null);
    last.current = -1;
  };

  const shown = focus === null ? active : Math.round(focus);
  return (
    <div className="md:hidden print:hidden">
      <div
        ref={rail}
        role="slider"
        aria-label="Jump between sections"
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={shown + 1}
        aria-valuetext={items[shown]?.title}
        tabIndex={0}
        data-no-haptic
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = -1;
          pick(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e.clientY);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            go(Math.min(n - 1, Math.max(0, shown + (e.key === "ArrowDown" ? 1 : -1))));
          }
        }}
        className="fixed right-0 top-1/2 z-30 w-14 -translate-y-1/2 touch-none select-none"
        style={{ height: `min(60dvh, ${n * SLOT}px)` }}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-1 w-5 rounded-full bg-surface/80 backdrop-blur transition-opacity duration-150 ${focus === null ? "opacity-0" : "opacity-100"}`}
        />
        {items.map((it, i) => {
          const m = focus === null ? 0 : near(i - focus);
          const isActive = i === shown;
          const base = it.level === 1 ? 6 : 4;
          return (
            <div key={i} className="relative flex items-center justify-end" style={{ height: `${100 / n}%` }}>
              {focus !== null && m > 0.12 && (
                <span
                  className="pointer-events-none absolute right-9 max-w-[13rem] origin-right truncate rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium shadow-md"
                  style={{
                    opacity: Math.min(1, m * 1.6),
                    transform: `translateX(${(1 - m) * 6}px) scale(${0.82 + 0.3 * m})`,
                    paddingLeft: it.level === 2 ? "0.9rem" : undefined,
                  }}
                >
                  {it.title}
                </span>
              )}
              <span
                className={`mr-2.5 block rounded-full ${isActive ? "bg-accent" : it.level === 1 ? "bg-muted/80" : "bg-muted/50"}`}
                style={{
                  width: base,
                  height: base,
                  transform: `translateX(${-m * 8}px) scale(${1 + m * 1.7})`,
                  transition: focus === null ? "transform 160ms ease-out" : "none",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
