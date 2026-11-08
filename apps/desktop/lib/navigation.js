// @ts-check
// Back / forward in the desktop window: what each gesture or key means. Pure, so it can be tested.

/** @typedef {"back" | "forward" | null} NavAction */

/**
 * macOS three-finger swipe ("swipe" event on the window). Swiping left goes back, right goes forward, like Safari.
 * @param {string} direction
 * @returns {NavAction}
 */
export function swipeAction(direction) {
  if (direction === "left") return "back";
  if (direction === "right") return "forward";
  return null;
}

/**
 * Windows "app-command" events: the mouse side buttons, a keyboard's browser keys and some touchpad gestures.
 * @param {string} command
 * @returns {NavAction}
 */
export function appCommandAction(command) {
  if (command === "browser-backward") return "back";
  if (command === "browser-forward") return "forward";
  return null;
}

/**
 * The Chromium feature that turns a two-finger horizontal swipe on a touchpad into back/forward (with the arrow
 * hint at the window edge). It is on in Chrome but off in Electron by default.
 */
export const OVERSCROLL_FEATURE = "OverscrollHistoryNavigation";

/**
 * Merge our feature into an existing `--enable-features` value (comma separated) without losing the others.
 * @param {string | undefined} existing
 */
export function withFeature(existing, feature = OVERSCROLL_FEATURE) {
  const list = (existing ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return (list.includes(feature) ? list : [...list, feature]).join(",");
}
