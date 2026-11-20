/**
 * Small haptic ticks for touch screens.
 *  - Android Chrome: navigator.vibrate().
 *  - iPhone Safari has no Vibration API, so there is no haptic there. (A hidden-switch trick exists, but it made iOS cancel
 *    the touch during a drag, so it is not used.) Real iOS haptics need the native app (docs/plans/0070).
 * Off when the person turned it off (localStorage `zd_haptics` = "off") or prefers reduced motion. Never throws.
 */
export const HAPTICS_KEY = "zd_haptics";

export function hapticsEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem(HAPTICS_KEY) === "off") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(HAPTICS_KEY, on ? "on" : "off");
  } catch {
    // storage blocked
  }
}

/** One short tick. `ms` is the vibration length on Android (a light tap is about 5 to 10 ms). */
export function tick(ms = 8): void {
  if (!hapticsEnabled()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(ms);
  } catch {
    // unsupported; ignore
  }
}

/** Named haptic patterns (Android vibration lengths in ms; pauses between). */
export const HAPTIC_PATTERNS = {
  tick: [6],
  select: [10],
  success: [12, 60, 22],
  error: [40, 50, 40],
  heavy: [24],
} as const satisfies Record<string, readonly number[]>;
export type HapticKind = keyof typeof HAPTIC_PATTERNS;

/** Play a named pattern (success after a passing Submit, error after a failing run, select on toggles). */
export function haptic(kind: HapticKind): void {
  if (!hapticsEnabled()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([...HAPTIC_PATTERNS[kind]]);
  } catch {
    // unsupported; ignore
  }
}
