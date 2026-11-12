"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tick } from "@/lib/haptics";

type Item = { el: HTMLElement; title: string };

/** Pages with long reading: lessons, pattern guides and the help page. */
const READING = /^\/(study|dsa\/pattern|help)(\/|$)/;
const MIN_SECTIONS = 4;

/**
 * Phones only. A rail of dots on the right edge, one per section heading (h2) of the page you are reading. Press and drag
 * along it to jump through the sections: a bubble names the section and each step gives a light haptic tick (see
 * lib/haptics.ts for what each phone supports). It also shows where you are while you scroll normally.
 */
export function SectionScrubber() {
  const pathname = usePathname();
  const enabled = READING.test(pathname ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const rail = useRef<HTMLDivElement | null>(null);
  const last = useRef(-1);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scan = () => {
      const found = [...document.querySelectorAll<HTMLElement>("main h2")]
        .filter((h) => h.offsetParent !== null && (h.textContent ?? "").trim() !== "")
        .map((el) => ({ el, title: (el.textContent ?? "").trim() }));
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
    if (items.length < MIN_SECTIONS) return;
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

  if (!enabled || items.length < MIN_SECTIONS) return null;

  const pick = (clientY: number) => {
    const r = rail.current?.getBoundingClientRect();
    if (!r || r.height === 0) return;
    const f = Math.min(0.999, Math.max(0, (clientY - r.top) / r.height));
    const idx = Math.floor(f * items.length);
    setDrag(idx);
    if (idx !== last.current) {
      last.current = idx;
      tick(8);
      items[idx].el.scrollIntoView({ block: "start" });
    }
  };

  const shown = drag ?? active;
  return (
    <div className="md:hidden print:hidden">
      {drag !== null && (
        <div
          aria-hidden
          className="pointer-events-none fixed right-12 z-40 max-w-[14rem] -translate-y-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium shadow-lg"
          style={{ top: `calc(50% + ${((drag + 0.5) / items.length - 0.5) * 60}dvh)` }}
        >
          <span className="line-clamp-2">{items[drag].title}</span>
        </div>
      )}
      <div
        ref={rail}
        role="slider"
        aria-label="Jump between sections"
        aria-valuemin={1}
        aria-valuemax={items.length}
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
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const n = Math.min(items.length - 1, Math.max(0, shown + (e.key === "ArrowDown" ? 1 : -1)));
            tick(8);
            items[n].el.scrollIntoView({ block: "start" });
          }
        }}
        className="fixed right-0 top-1/2 z-30 flex h-[60dvh] w-10 -translate-y-1/2 touch-none select-none flex-col items-end justify-between py-1 pr-2"
      >
        {items.map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`block rounded-full transition-all ${i === shown ? "h-2.5 w-2.5 bg-accent" : "h-1.5 w-1.5 bg-muted/60"}`}
          />
        ))}
      </div>
    </div>
  );
}
