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
