"use client";

import { useEffect, useRef, useState } from "react";

const TRIGGER = 70; // px of pull (after the rubber-band damping) that starts a reload
const MAX = 110;

/** True when a finger started on something that scrolls on its own, or something that needs the touch for itself. */
function startsInsideScroller(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  if (el?.closest('[data-no-pull], [role="slider"], [role="dialog"], textarea, input, select')) return true;
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    const scrolls = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight;
    if (scrolls && el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Pull down from the top of the page to reload. Only in the installed app (Safari "Add to Home Screen" or an installed PWA),
 * because that mode has no browser reload button or pull-to-refresh of its own. Mount once in the root layout.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.scrollY > 0 || startsInsideScroller(e.target)) {
        start.current = null;
        return;
      }
      start.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        if (pullRef.current !== 0) set(0);
        return;
      }
      set(Math.min(MAX, dy * 0.5)); // rubber-band: the indicator moves half as far as the finger
    };
    const onEnd = () => {
      const reached = pullRef.current >= TRIGGER;
      start.current = null;
      if (reached) {
        setBusy(true);
        set(TRIGGER);
        window.location.reload();
      } else set(0);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (pull === 0 && !busy) return null;
  const ready = pull >= TRIGGER;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center print:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", transform: `translateY(${Math.max(0, pull - 36)}px)` }}
    >
      <div className="mt-2 flex size-10 items-center justify-center rounded-full border border-line bg-surface shadow-lg">
        <svg
          viewBox="0 0 24 24"
          className={`size-5 text-foreground ${busy ? "animate-spin" : ""}`}
          style={busy ? undefined : { transform: `rotate(${Math.min(180, (pull / TRIGGER) * 180)}deg)`, opacity: ready ? 1 : 0.6 }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {busy ? <path d="M21 12a9 9 0 1 1-3-6.7" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
        </svg>
      </div>
    </div>
  );
}
