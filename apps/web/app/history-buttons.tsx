"use client";

const ARROW = "M15 6l-6 6 6 6"; // chevron pointing left; mirrored for Forward

/**
 * Back and Forward buttons that stay in the sidebar, so you never scroll to the top of a long page to go back.
 * (In the desktop app, Alt+Left / Alt+Right, a two-finger swipe, the mouse side buttons and the Go menu do the same.)
 */
export function HistoryButtons() {
  const btn = "grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-background hover:text-foreground";
  return (
    <div className="flex gap-1 print:hidden">
      <button type="button" onClick={() => window.history.back()} className={btn} aria-label="Go back" title="Back (Alt+Left)">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={ARROW} />
        </svg>
      </button>
      <button type="button" onClick={() => window.history.forward()} className={btn} aria-label="Go forward" title="Forward (Alt+Right)">
        <svg viewBox="0 0 24 24" className="size-4 -scale-x-100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={ARROW} />
        </svg>
      </button>
    </div>
  );
}
