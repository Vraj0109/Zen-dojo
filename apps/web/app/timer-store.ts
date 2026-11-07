"use client";

import { useSyncExternalStore } from "react";
import { newTimer, parseTimer, pauseTimer, resumeTimer, serializeTimer, withTarget, type TimerState } from "./timer-math";

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

export const timer = {
  current: snapshot,
  start: (item: { itemId: string; label: string; href: string; targetMinutes: number }) => write(newTimer(item, Date.now())),
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
