"use client";

import { useEffect, useState, useSyncExternalStore, type JSX } from "react";
import type { PetMeta } from "./pet-package";
import { PET_ROW_ORDER, frameDelayMs, type PetAnimRow } from "./pet-anim";

function subscribeMotion(cb: () => void): () => void {
  try {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  } catch {
    return () => {};
  }
}
function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** One row of a Petdex sheet, shown through a CSS background (never inlined). Reduced motion shows frame 0. */
export function PetSprite({ sheetUrl, meta, row, size }: { sheetUrl: string; meta: PetMeta; row: PetAnimRow; size: number }): JSX.Element {
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion, () => true);
  const rowIndex = Math.max(0, PET_ROW_ORDER.indexOf(row));
  const frames = Math.max(1, Math.min(meta.cols, (meta.frames as Record<string, number>)[row] ?? 1));
  const [state, setState] = useState({ row, frame: 0 });

  useEffect(() => {
    if (reduced || frames <= 1) return;
    const id = setInterval(() => {
      setState((s) => ({ row, frame: s.row === row ? (s.frame + 1) % frames : 0 }));
    }, frameDelayMs(row));
    return () => clearInterval(id);
  }, [row, frames, reduced]);

  const frame = reduced || state.row !== row ? 0 : state.frame % frames;
  const h = Math.round((size * meta.cellH) / meta.cellW);
  const px = meta.cols > 1 ? (frame / (meta.cols - 1)) * 100 : 0;
  const py = meta.rows > 1 ? (rowIndex / (meta.rows - 1)) * 100 : 0;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: h,
        backgroundImage: `url("${sheetUrl}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${meta.cols * 100}% ${meta.rows * 100}%`,
        backgroundPosition: `${px}% ${py}%`,
        imageRendering: "auto",
      }}
    />
  );
}
