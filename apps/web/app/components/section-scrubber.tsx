"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tick } from "@/lib/haptics";

type Item = { el: HTMLElement; title: string; level: 1 | 2 };

/** Pages with long reading: lessons, pattern guides and the help page. */
const READING = /^\/(study|dsa\/pattern|help)(\/|$)/;
const MIN_ITEMS = 4;
const MAX_WITH_SUBSECTIONS = 60;
const SLOT = 22; // px per dot: close together, but far enough apart to tell apart with a finger
const SPREAD = 2.4; // how many dots either side of the finger are magnified

let scrollAnim = 0;

/**
 * Scroll to a heading with a short ease-out animation. Each frame is a plain instant scroll (the browser's own smooth
 * scrolling fights a finger that keeps dragging), and a new target replaces the one still animating, so fast dragging
 * stays smooth instead of piling up. Instant when the phone asks for reduced motion.
 */
function jump(el: HTMLElement) {
  const target = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 72);
  cancelAnimationFrame(scrollAnim);
  const from = window.scrollY;
  const dist = target - from;
  if (Math.abs(dist) < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: target, behavior: "instant" });
    return;
  }
  const duration = Math.min(300, 140 + Math.abs(dist) / 20);
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo({ top: from + dist * (1 - (1 - p) ** 3), behavior: "instant" });
    if (p < 1) scrollAnim = requestAnimationFrame(step);
  };
  scrollAnim = requestAnimationFrame(step);
}

/** The main section a sub-section sits in (the closest earlier level-1 item). */
function parentOf(items: Item[], i: number): string | null {
  for (let k = i - 1; k >= 0; k--) if (items[k].level === 1) return items[k].title;
  return null;
}

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
    jump(items[idx].el);
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
        {focus !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-14 z-10 w-max max-w-[min(16rem,calc(100vw-5rem))] -translate-y-1/2 rounded-xl bg-background/30 px-2.5 py-1.5 text-right text-foreground backdrop-blur-md [text-shadow:0_0_6px_var(--background),0_0_14px_var(--background)]"
            style={{ top: `${((shown + 0.5) / n) * 100}%` }}
          >
            {items[shown].level === 2 && parentOf(items, shown) && <p className="mb-0.5 truncate text-xs font-medium text-foreground/70">{parentOf(items, shown)}</p>}
            <p className="line-clamp-3 text-base leading-snug font-semibold text-foreground">{items[shown].title}</p>
          </div>
        )}
        {items.map((it, i) => {
          const m = focus === null ? 0 : near(i - focus);
          const isActive = i === shown;
          const base = it.level === 1 ? 8 : 5;
          return (
            <div key={i} className="relative flex items-center justify-end" style={{ height: `${100 / n}%` }}>
              <span
                className={`mr-2.5 block rounded-full ${isActive ? "bg-accent" : it.level === 1 ? "bg-muted/80" : "bg-muted/50"}`}
                style={{
                  width: base,
                  height: base,
                  transform: `translateX(${-m * 10}px) scale(${1 + m * 1.9})`,
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
