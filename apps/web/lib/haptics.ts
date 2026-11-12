/**
 * Small haptic ticks for touch screens.
 *  - Android Chrome: navigator.vibrate().
 *  - iPhone (Safari and every iOS browser) has no Vibration API. Best effort: clicking the label of a hidden
 *    <input type="checkbox" switch> gives a light tick on some iOS versions (undocumented; reported working on 17.4 to 26.4).
 *    It only fires inside a real tap (pointerup, click), never during a drag, and doing it during a drag made iOS cancel
 *    the touch. So `tickOnRelease` is for those moments only. Reliable iOS haptics need the native app (docs/plans/0070).
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

function iosTick(): void {
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.body.appendChild(label);
  label.click();
  setTimeout(() => label.remove(), 50);
}

/** True where navigator.vibrate exists (Android Chrome). */
export const canVibrate = (): boolean => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/**
 * A tick for a moment that is a real tap or the end of a touch (call it from pointerup or click). Android vibrates; on iPhone
 * it uses the switch trick above. Never call it while a finger is still moving.
 */
export function tickOnRelease(ms = 8): void {
  if (!hapticsEnabled()) return;
  try {
    if (canVibrate()) navigator.vibrate(ms);
    else iosTick();
  } catch {
    // unsupported; ignore
  }
}

/** One short tick (Android only; safe to call while a finger is moving). `ms` is the vibration length on Android (a light tap is about 5 to 10 ms). */
export function tick(ms = 8): void {
  if (!hapticsEnabled()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(ms);
  } catch {
    // unsupported; ignore
  }
}
