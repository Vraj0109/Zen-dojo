"use client";

import { useEffect } from "react";
import { canVibrate, tick, tickOnRelease } from "@/lib/haptics";

/**
 * Mount once in the root layout: a light tick when a finger presses a button, tab, link, checkbox or summary. Touch only.
 * Android ticks on press. iPhone can only tick inside a completed tap, so there it ticks when the finger lifts.
 */
export function HapticsListener() {
  useEffect(() => {
    const interactive = (e: PointerEvent): boolean => {
      if (e.pointerType !== "touch") return false;
      const t = e.target;
      if (!(t instanceof Element)) return false;
      if (t.closest('[data-no-haptic], button:disabled, [aria-disabled="true"]')) return false;
      return Boolean(t.closest('button, [role="tab"], summary, a[href], input[type="checkbox"], input[type="radio"], label'));
    };
    const onDown = (e: PointerEvent) => {
      if (canVibrate() && interactive(e)) tick(5);
    };
    const onUp = (e: PointerEvent) => {
      if (!canVibrate() && interactive(e)) tickOnRelease(5);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);
  return null;
}
