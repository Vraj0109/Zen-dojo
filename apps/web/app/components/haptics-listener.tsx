"use client";

import { useEffect } from "react";
import { haptic, tick, type HapticKind } from "@/lib/haptics";

const PRESSABLE =
  'button, [role="tab"], [role="menuitem"], [role="radio"], [role="switch"], [role="option"], summary, a[href], input[type="checkbox"], input[type="radio"], label';

/**
 * Mount once in the root layout. Touch only (Android; iPhone Safari has no vibration API):
 * - a light tick when a finger presses a button, tab, menu item, link, checkbox, switch, summary or label;
 * - an element (or its ancestor) with `data-haptic="success|error|select|heavy"` plays that pattern instead;
 * - a "select" tick when a select, range or radio value changes.
 */
export function HapticsListener() {
  useEffect(() => {
    let lastTouch = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      lastTouch = Date.now();
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('[data-no-haptic], button:disabled, [aria-disabled="true"]')) return;
      const named = t.closest<HTMLElement>("[data-haptic]")?.dataset.haptic as HapticKind | undefined;
      if (named) haptic(named);
      else if (t.closest(PRESSABLE)) tick(5);
    };
    const onChange = (e: Event) => {
      // Only after a recent touch, so keyboard and mouse changes stay silent.
      if (Date.now() - lastTouch > 1500) return;
      const t = e.target;
      if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && (t.type === "range" || t.type === "radio"))) haptic("select");
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("change", onChange, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("change", onChange);
    };
  }, []);
  return null;
}
