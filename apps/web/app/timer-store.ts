"use client";

import { useEffect, useSyncExternalStore } from "react";
import { FOCUS_SESSION_ID, isRunning, newTimer, parseTimer, pauseTimer, resumeTimer, serializeTimer, sessionOutcome, withTarget, type TimerState } from "./timer-math";

// The one focus timer lives in localStorage (`habit.timer`), so it keeps running while you move between pages
// and survives reloads. When storage is blocked (private window) it falls back to memory for this tab.

const KEY = "habit.timer";

let memoryRaw: string | null | undefined; // set only when localStorage can't be written
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readRaw(): string | null {
  if (memoryRaw !== undefined) return memoryRaw;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(state: TimerState | null) {
  const raw = state ? serializeTimer(state) : null;
  try {
    if (raw === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, raw);
    memoryRaw = undefined;
  } catch {
    memoryRaw = raw;
  }
  emit();
}

// useSyncExternalStore needs a stable snapshot: parse again only when the raw string changes.
let cachedRaw: string | null | undefined;
let cachedState: TimerState | null = null;
function snapshot(): TimerState | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseTimer(raw);
  }
  return cachedState;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** The current timer, or null. Null on the server and during hydration. */
export const useTimer = (): TimerState | null => useSyncExternalStore(subscribe, snapshot, () => null);

const subscribeClock = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const noSubscribe = () => () => {};
// Whole seconds, so the snapshot only changes once a second. The server snapshot is 0: nothing renders a time there.
const clockNow = () => Math.floor(Date.now() / 1000) * 1000;

/** The current time in ms, ticking every second while `active` (frozen otherwise). */
export function useNow(active: boolean): number {
  return useSyncExternalStore(active ? subscribeClock : noSubscribe, clockNow, () => 0);
}

// "Session done": set for a few seconds after a countdown ends, so the rail button and the Today hero can say so.
const DONE_NOTICE_MS = 6000;
let doneNotice = false;
let doneTimeout: ReturnType<typeof setTimeout> | undefined;
function setDoneNotice(on: boolean) {
  doneNotice = on;
  clearTimeout(doneTimeout);
  if (on) doneTimeout = setTimeout(() => setDoneNotice(false), DONE_NOTICE_MS);
  emit();
}
/** True for a few seconds after a focus session ended by itself. */
export const useSessionDone = (): boolean => useSyncExternalStore(subscribe, () => doneNotice, () => false);

/**
 * Ends the stored session when its countdown has reached 0 (does nothing otherwise, so it is safe to call from every
 * component that shows the timer). The state is cleared, so nothing keeps saying "Focusing" or "0:00". A session on a
 * real item (problem, concept...) logs its minutes first; the quick focus session has no item to log to.
 */
export function finishSession() {
  const s = snapshot();
  if (!s) return;
  const out = sessionOutcome(s, Date.now());
  if (!out.ended) return;
  write(null);
  if (s.itemId !== FOCUS_SESSION_ID) {
    // Loaded on demand: global-timer pulls in the server action, which unit tests of this file do not need.
    void import("./global-timer").then((m) => m.saveFocus(s.itemId, out.minutes)).catch(() => {});
  }
  if (out.fresh) setDoneNotice(true);
}

/** The timer plus the ticking clock; ends the session at 0. */
export function useFocusTimer() {
  const state = useTimer();
  const running = state !== null && isRunning(state);
  const now = useNow(running);
  useEffect(() => {
    if (state) finishSession();
  }, [state, now]);
  return { state, running, now, done: useSessionDone() };
}

export const timer = {
  current: snapshot,
  start(item: { itemId: string; label: string; href: string; targetMinutes: number }) {
    setDoneNotice(false);
    write(newTimer(item, Date.now()));
  },
  pause() {
    const s = snapshot();
    if (s) write(pauseTimer(s, Date.now()));
  },
  resume() {
    const s = snapshot();
    if (s) write(resumeTimer(s, Date.now()));
  },
  setTarget(minutes: number) {
    const s = snapshot();
    if (s) write(withTarget(s, minutes));
  },
  reset: () => write(null),
};
