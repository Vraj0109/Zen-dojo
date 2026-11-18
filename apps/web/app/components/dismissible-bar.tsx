"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const EVENT = "zen-dojo:bar-dismissed";
/** Dismissed this page load (covers blocked storage). */
const closed = new Set<string>();

function read(key: string): boolean {
  if (closed.has(key)) return true;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** A slim notice bar at the top of the content area with a close button. Closing hides it for this browser session. */
export function DismissibleBar({ storageKey, className = "", children }: { storageKey: string; className?: string; children: ReactNode }) {
  const dismissed = useSyncExternalStore(subscribe, () => read(storageKey), () => false);
  if (dismissed) return null;
  return (
    <div role="note" className={`flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-1.5 text-sm text-muted sm:px-6 lg:px-10 print:hidden ${className}`}>
      <p className="min-w-0 flex-1">{children}</p>
      <button
        type="button"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => {
          closed.add(storageKey);
          try {
            sessionStorage.setItem(storageKey, "1");
          } catch {
            // storage blocked: `closed` hides it until the next page load
          }
          window.dispatchEvent(new Event(EVENT));
        }}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
