"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { setReaderModeAction } from "../actions";

/** Plan 0059: phone-only helpers (below the `md` breakpoint). */

/** The small line shown instead of a code editor on phones. Pure markup: visible only below `md`. */
export function PhoneCodeNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-xs text-muted md:hidden">
      Open on a computer to write and run code.
      {children}
    </p>
  );
}

// Same name and value as READER_COOKIE in lib/reader-mode.ts (that file imports next/headers, so a client file cannot import it).
const READER_COOKIE = "zd_reader";
const DISMISS_KEY = "zd-study-mode-suggestion";
const PHONE_QUERY = "(max-width: 767px)";
const listeners = new Set<() => void>();

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
let dismissedInMemory = false;
const snapshotDismissed = () => dismissedInMemory || readDismissed();
function dismiss() {
  dismissedInMemory = true;
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Storage blocked: the suggestion stays hidden until the page reloads.
  }
  listeners.forEach((l) => l());
}
const subscribeDismissed = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const isReaderOn = () => document.cookie.split("; ").some((c) => c === `${READER_COOKIE}=1`);

/**
 * One-time, dismissible suggestion on a phone: "Study mode on this phone: read-only, no Run". The button turns reader mode
 * on (setReaderModeAction); Not now remembers the choice in localStorage. Hidden on the server and while hydrating.
 */
export function StudyModeSuggestion() {
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
  const dismissed = useSyncExternalStore(subscribeDismissed, snapshotDismissed, () => true);
  const readerOn = useSyncExternalStore(subscribeDismissed, isReaderOn, () => true);
  if (!phone || dismissed || readerOn) return null;
  return (
    <div role="region" aria-label="Study mode suggestion" className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 text-sm md:hidden">
      <p className="min-w-0 flex-1 basis-48">Study mode on this phone: read-only, no Run.</p>
      <form action={setReaderModeAction} onSubmit={dismiss} className="contents">
        <input type="hidden" name="reader" value="1" />
        <button type="submit" className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-on-accent">
          Turn on
        </button>
      </form>
      <button type="button" onClick={dismiss} className="min-h-10 rounded-lg border border-line px-3 text-sm hover:bg-background">
        Not now
      </button>
    </div>
  );
}
