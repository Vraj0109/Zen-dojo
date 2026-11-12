"use client";

import { useEffect } from "react";
import { tick } from "@/lib/haptics";

/** Mount once in the root layout: a light tick when a finger presses a button, tab, link, checkbox or summary. Touch only. */
export function HapticsListener() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('[data-no-haptic], button:disabled, [aria-disabled="true"]')) return;
      if (t.closest('button, [role="tab"], summary, a[href], input[type="checkbox"], input[type="radio"], label')) tick(5);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
