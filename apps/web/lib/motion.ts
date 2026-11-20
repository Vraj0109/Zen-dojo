/**
 * One place to ask "should JS-driven motion run?". Motion is off when the person turned Animations off in Settings
 * (`<html data-motion="off">`) or the system asks for reduced motion. CSS motion is already switched off by the global
 * rules in globals.css; use this for requestAnimationFrame tweens, `scrollIntoView({ behavior })`, sprite loops and the like.
 * Both are checked on purpose: the OS preference is honoured even when Settings says On. Never throws and is safe on the server (returns false there: nothing animates on the server anyway).
 */
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

export function motionOff(): boolean {
  if (typeof document === "undefined") return false;
  try {
    if (document.documentElement.dataset.motion === "off") return true;
    return typeof window.matchMedia === "function" && window.matchMedia(REDUCE_QUERY).matches;
  } catch {
    return false;
  }
}

/** For `useSyncExternalStore(subscribeMotionOff, motionOff, () => true)`: fires when either source changes. */
export function subscribeMotionOff(cb: () => void): () => void {
  try {
    const mq = typeof window.matchMedia === "function" ? window.matchMedia(REDUCE_QUERY) : null;
    mq?.addEventListener("change", cb);
    const mo = new MutationObserver(cb);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      mq?.removeEventListener("change", cb);
      mo.disconnect();
    };
  } catch {
    return () => {};
  }
}

/** `behavior` for scrollTo / scrollIntoView: "auto" (instant) when motion is off, otherwise "smooth". */
export function scrollBehavior(): ScrollBehavior {
  return motionOff() ? "auto" : "smooth";
}
