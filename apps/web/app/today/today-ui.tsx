"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FOCUS_SESSION_ID, clock, elapsedAt } from "../timer-math";
import { timer, useFocusTimer } from "../timer-store";
import { Badge, buttonClass } from "../ui";

export interface BacklogItem {
  id: string;
  kind: "struggle" | "resolve" | "concept" | "exercise";
  title: string;
  href: string;
  detail: string;
}

const KIND_LABELS: Record<string, string> = {
  struggle: "Stuck list",
  resolve: "Re-solve",
  concept: "Concept",
  exercise: "Practice",
};

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Catch-up backlog as a modal dialog: focus moves in on open (to the close button) and returns to the trigger on
 * close; Tab stays inside; Escape, the close button and a click on the scrim close it. The panel is `inert` while
 * closed, so nothing in it is reachable.
 */
export function CatchUpDrawer({ backlog }: { backlog: BacklogItem[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!backlog || backlog.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="catchup-drawer"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-muted hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="rounded-full bg-reward-soft px-1.5 py-0.5 font-semibold text-on-reward-soft">{backlog.length}</span>
        <span>in catch-up</span>
      </button>

      {open && <div className="fixed inset-0 z-40 bg-foreground/40" onClick={close} aria-hidden="true" />}

      <div
        ref={panelRef}
        id="catchup-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catchup-title"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-96 max-w-[85vw] flex-col border-l border-line bg-surface shadow-lg transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line p-4">
          <div>
            <h3 id="catchup-title" className="font-semibold">
              Catch-up backlog
            </h3>
            <p className="text-xs text-muted">
              {backlog.length} review{backlog.length === 1 ? "" : "s"} postponed to avoid overwhelm
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close catch-up backlog"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="p-4 text-xs text-muted">Review these at your own pace without streak penalty or cognitive dread.</div>

        <ul className="flex-1 divide-y divide-line overflow-y-auto px-2">
          {backlog.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge>{KIND_LABELS[item.kind] ?? item.kind}</Badge>
                <Link href={item.href} onClick={() => setOpen(false)} className={buttonClass("tonal", "sm", "h-11")}>
                  Start
                </Link>
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">
                <Link href={item.href} onClick={() => setOpen(false)} className="hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                  {item.title}
                </Link>
              </p>
              {item.detail && <p className="mt-0.5 truncate text-xs text-muted">{item.detail}</p>}
            </li>
          ))}
        </ul>

        <div className="border-t border-line p-4">
          <Link href="/review" onClick={() => setOpen(false)} className={buttonClass("outline", "md", "w-full")}>
            Open in Review Mode
          </Link>
        </div>
      </div>
    </>
  );
}

/**
 * Today hero progress: a scalloped badge behind a thick ring (done / total) with the count centred.
 * Motion (all off under data-motion="off", which the global rule enforces): the ring fills with a spring on load and
 * whenever the count changes, the scallop turns once every 90 s, and the badge pops when a task is completed.
 */
const HERO_RING_CSS = `
@keyframes zd-hero-spin { from { rotate: 0deg; } to { rotate: 360deg; } }
@keyframes zd-hero-fill { from { stroke-dashoffset: 100; } }
@keyframes zd-hero-pop-a { from { scale: 0.88; } }
@keyframes zd-hero-pop-b { from { scale: 0.88; } }
.zd-hero-scallop { transform-box: view-box; transform-origin: 50px 50px; animation: zd-hero-spin 90s linear infinite; }
.zd-hero-arc { transition: stroke-dashoffset 380ms var(--ease-spring-soft), opacity 160ms ease-out; animation: zd-hero-fill 380ms var(--ease-spring-soft) 120ms backwards; }
.zd-hero-shape { fill: color-mix(in srgb, var(--primary) 28%, var(--primary-container)); }
:root[data-theme="dark"] .zd-hero-shape { fill: color-mix(in srgb, var(--primary) 16%, var(--primary-container)); }
.zd-hero-pop-a { animation: zd-hero-pop-a 360ms var(--ease-spring) both; }
.zd-hero-pop-b { animation: zd-hero-pop-b 360ms var(--ease-spring) both; }
`;

export function HeroRing({ done, total }: { done: number; total: number }) {
  // Adjust state while rendering (no effect): remember the last count and flip between two identical animations
  // when it goes up, so the pop restarts without remounting the ring (which would replay the fill from empty).
  const [seen, setSeen] = useState(done);
  const [pops, setPops] = useState(0);
  if (done !== seen) {
    setSeen(done);
    if (done > seen) setPops(pops + 1);
  }
  const frac = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const popClass = pops === 0 ? "" : pops % 2 === 1 ? "zd-hero-pop-a" : "zd-hero-pop-b";
  return (
    <div className="relative size-[112px] shrink-0 md:size-[132px]">
      <style href="zd-hero-ring" precedence="default">
        {HERO_RING_CSS}
      </style>
      <div className={`size-full ${popClass}`}>
        <svg role="img" aria-label={`${done} of ${total} done`} viewBox="0 0 100 100" className="size-full overflow-visible">
          <g className="zd-hero-scallop">
            <path
              d="M50 3 58 9 68 7 73 16 83 19 84 29 92 36 89 46 94 55 87 62 88 72 79 77 76 87 66 87 58 94 50 89 42 94 34 87 24 87 21 77 12 72 13 62 6 55 11 46 8 36 16 29 17 19 27 16 32 7 42 9z"
              className="zd-hero-shape"
            />
          </g>
          <g transform="rotate(-90 50 50)" fill="none" strokeWidth="8">
            <circle cx="50" cy="50" r="30" className="stroke-primary-container" />
            <circle
              cx="50"
              cy="50"
              r="30"
              pathLength={100}
              strokeLinecap="round"
              strokeDasharray="100 100"
              strokeDashoffset={100 - frac * 100}
              className="zd-hero-arc stroke-on-primary-container"
              style={{ opacity: frac > 0 ? 1 : 0, transitionTimingFunction: frac >= 1 ? "ease-out" : undefined, animationTimingFunction: frac >= 1 ? "ease-out" : undefined }}
            />
          </g>
        </svg>
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[26px] font-semibold tabular-nums text-on-primary-container">
          {done}/{total}
        </span>
      </div>
    </div>
  );
}

/**
 * Starts a 25-minute focus session with the same timer as the rail's focus button. While a session runs it says so
 * instead. `variant` picks the hero pill or the phone FAB look.
 */
export function StartFocusButton({ variant = "hero" }: { variant?: "hero" | "fab" }) {
  const { state, running, now, done } = useFocusTimer();
  const start = () => {
    if (!state) timer.start({ itemId: FOCUS_SESSION_ID, label: "Focus session", href: "/", targetMinutes: 25 });
    else if (!running) timer.resume();
  };
  // "Focusing" only while a countdown is really running; at 0 the session is cleared (finishSession) and this goes
  // back to "Start focus".
  const remaining = state ? Math.max(0, state.targetMinutes * 60_000 - elapsedAt(state, now)) : 0;
  const label = running ? `Focusing · ${clock(remaining)}` : state ? "Resume focus" : variant === "fab" ? "Focus" : "Start focus · 25 min";
  const cls =
    variant === "fab"
      ? "fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 inline-flex h-14 items-center gap-2.5 rounded-[18px] bg-reward-soft pr-5 pl-4 text-[15px] font-medium text-on-reward-soft shadow-lg transition-transform active:scale-95 md:hidden print:hidden"
      : "inline-flex h-12 items-center gap-2 rounded-full bg-primary px-[22px] text-[15px] font-medium text-on-primary transition-colors hover:bg-primary-hover active:scale-[0.98]";
  const button = (
    <button type="button" onClick={start} aria-label={variant === "fab" ? "Start a focus session" : undefined} className={cls}>
      <svg aria-hidden="true" width={variant === "fab" ? 24 : 20} height={variant === "fab" ? 24 : 20} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
      <span>{label}</span>
    </button>
  );
  if (variant === "fab") return button;
  return (
    <>
      {button}
      {/* A gentle note for a few seconds after a session ends; the button above is already back to "Start focus". */}
      <span role="status" className="sr-only">
        {done && !state ? "Focus session done" : ""}
      </span>
      {done && !state && (
        <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-sm font-medium">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="animate-[zd-pop-in_0.32s_var(--ease-spring)_both]">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
          Session done
        </span>
      )}
    </>
  );
}
