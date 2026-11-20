"use client";

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

/*
 * SlidingPill: one selection pill that glides to the chosen item of a tab strip or segmented control.
 *
 * Usage: wrap the items in <SlidingPill className="...the track classes..." pillClassName="rounded-full bg-primary-soft">.
 * The wrapper looks for the active item itself (aria-current, aria-selected, aria-checked or aria-pressed = true, or
 * data-sp-active="true"), so links and buttons both work and the items stay plain server-rendered markup.
 *
 * - Without JS (and before hydration) the active item keeps its own background; once the pill has been placed, the
 *   wrapper gets data-sp-ready and CSS (globals.css) makes the active item's background transparent. The first
 *   placement is instant, so nothing flashes and nothing shifts: the pill is absolutely positioned.
 * - It is positioned from offsetLeft/offsetTop, so a pressed (scaled) item does not skew the measurement.
 * - Movement uses transform + a spring (--ease-spring). Under data-motion="off" the global rule removes the
 *   transition, so the pill jumps.
 * - `target`: a selector, relative to the active item, for the part that carries the highlight (the rail and phone
 *   bar highlight the icon pill inside each link). `line`: a 2px underline instead of a filled pill.
 * - `persistKey`: remembers the last position for 15 s, so a strip that is re-created by a route change (each profile
 *   page renders its own strip, and /review, /review/week and /revise render theirs) still slides from where the
 *   previous page left it. The position is also kept in sessionStorage, so it survives a full navigation.
 */

const ACTIVE =
  '[aria-current="page"], [aria-current="true"], [aria-selected="true"], [aria-checked="true"], [aria-pressed="true"], [data-sp-active="true"]';
const WATCHED = ["aria-current", "aria-selected", "aria-checked", "aria-pressed", "data-sp-active"];
const REMEMBER_MS = 15000;
const STORE_PREFIX = "sliding-pill:";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const memory = new Map<string, Box & { at: number }>();

/** Last remembered position for `key`, or undefined. Memory first, then sessionStorage. Storage can be blocked: try/catch. */
function recall(key: string): (Box & { at: number }) | undefined {
  const mem = memory.get(key);
  if (mem) return mem;
  try {
    const raw = window.sessionStorage.getItem(STORE_PREFIX + key);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as Partial<Box & { at: number }>;
    if (typeof v.x === "number" && typeof v.y === "number" && typeof v.w === "number" && typeof v.h === "number" && typeof v.at === "number") {
      return { x: v.x, y: v.y, w: v.w, h: v.h, at: v.at };
    }
  } catch {
    // Storage unavailable or corrupt: fall back to the in-memory copy only.
  }
  return undefined;
}

function remember(key: string, value: Box & { at: number }) {
  memory.set(key, value);
  try {
    window.sessionStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the in-memory copy still works within this page.
  }
}

/** Position and size of `el` inside `box` (both measured without transforms). Null when `box` is not its offset ancestor. */
function within(box: HTMLElement, el: HTMLElement): Box | null {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== box) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  if (n !== box || el.offsetWidth === 0) return null;
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

type SlidingPillProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: "div" | "nav" | "span";
  /** Classes for the pill: its colour and shape. They should match the active item's own classes. */
  pillClassName?: string;
  target?: string;
  line?: boolean;
  persistKey?: string;
  children?: ReactNode;
};

export function SlidingPill({
  as = "div",
  pillClassName = "rounded-full bg-primary-soft",
  target,
  line = false,
  persistKey,
  className = "",
  children,
  ...rest
}: SlidingPillProps) {
  const boxRef = useRef<HTMLDivElement & HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const pill = pillRef.current;
    if (!box || !pill) return;
    let marked: HTMLElement | null = null;
    let shown = false;
    let raf = 0;
    // jsdom and very old browsers lack the observers: then it measures on mount and on window resize only.
    const resizer = typeof ResizeObserver === "function" ? new ResizeObserver(() => measure()) : null;
    let watched: HTMLElement | null = null;

    const place = (b: Box) => {
      const h = line ? 2 : b.h;
      const y = line ? b.y + b.h - 2 : b.y;
      pill.style.width = `${b.w}px`;
      pill.style.height = `${h}px`;
      pill.style.transform = `translate3d(${b.x}px, ${y}px, 0)`;
    };

    function measure() {
      const item = box!.querySelector<HTMLElement>(ACTIVE);
      const el = item && target ? item.querySelector<HTMLElement>(target) : item;
      if (marked && marked !== el) marked.removeAttribute("data-sp-on");
      marked = el;
      const b = el ? within(box!, el) : null;
      if (!el || !b) {
        shown = false;
        box!.removeAttribute("data-sp-ready");
        return;
      }
      el.setAttribute("data-sp-on", "");
      if (watched !== el) {
        if (watched) resizer?.unobserve(watched);
        resizer?.observe(el);
        watched = el;
      }
      if (!shown) {
        // First placement: no transition. With a fresh memory, start where the previous strip left the pill, then slide.
        const from = persistKey ? recall(persistKey) : undefined;
        const fresh = from !== undefined && Date.now() - from.at < REMEMBER_MS;
        box!.setAttribute("data-sp-still", "");
        place(fresh ? from : b);
        box!.setAttribute("data-sp-ready", "");
        shown = true;
        if (fresh) {
          void pill!.offsetWidth; // commit the start position
          box!.removeAttribute("data-sp-still");
          place(b);
        } else {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => box!.removeAttribute("data-sp-still"));
        }
      } else {
        place(b);
      }
      if (persistKey) remember(persistKey, { ...b, at: Date.now() });
    }

    measure();
    resizer?.observe(box);
    if (!resizer) window.addEventListener("resize", measure);
    const mutations = typeof MutationObserver === "function" ? new MutationObserver(measure) : null;
    mutations?.observe(box, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: WATCHED });
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(raf);
      resizer?.disconnect();
      window.removeEventListener("resize", measure);
      mutations?.disconnect();
      marked?.removeAttribute("data-sp-on");
      box.removeAttribute("data-sp-ready");
    };
  }, [target, line, persistKey]);

  // A strip that scrolls sideways (tab rails on phones): fade the edge that has more items past it, instead of
  // slicing a label against the rounded end, and bring the active item into view on first paint.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const edges = () => {
      const max = box.scrollWidth - box.clientWidth;
      box.toggleAttribute("data-sp-more-start", max > 1 && box.scrollLeft > 1);
      box.toggleAttribute("data-sp-more-end", max > 1 && box.scrollLeft < max - 1);
    };
    const active = box.querySelector<HTMLElement>(ACTIVE);
    if (active && box.scrollWidth > box.clientWidth) {
      const a = active.offsetLeft;
      const b = a + active.offsetWidth;
      if (a < box.scrollLeft || b > box.scrollLeft + box.clientWidth) box.scrollLeft = a - (box.clientWidth - active.offsetWidth) / 2;
    }
    // A mouse wheel only scrolls up and down; on a strip that overflows sideways, turn it into a sideways scroll so
    // the hidden items can be reached without a trackpad (it gives the wheel back at either end).
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = box.scrollWidth - box.clientWidth;
      if (max <= 1) return;
      const atStart = box.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = box.scrollLeft >= max - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      box.scrollLeft += e.deltaY;
    };
    edges();
    box.addEventListener("scroll", edges, { passive: true });
    box.addEventListener("wheel", wheel, { passive: false });
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(edges) : null;
    ro?.observe(box);
    return () => {
      box.removeEventListener("wheel", wheel);
      box.removeEventListener("scroll", edges);
      ro?.disconnect();
    };
  }, []);

  const props = { ...rest, className: `sp ${className}`, ...(line ? { "data-sp-line": "" } : {}) };
  const body = (
    <>
      <span ref={pillRef} aria-hidden="true" className={`sp-pill ${pillClassName}`} />
      {children}
    </>
  );
  if (as === "nav") return <nav ref={boxRef} {...props}>{body}</nav>;
  if (as === "span") return <span ref={boxRef} {...props}>{body}</span>;
  return <div ref={boxRef} {...props}>{body}</div>;
}
