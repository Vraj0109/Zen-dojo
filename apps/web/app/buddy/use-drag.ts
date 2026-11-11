"use client";

import { useRef, useState, type PointerEvent } from "react";
import { releaseVelocity } from "./throw-physics";

export interface DragPos {
  x: number;
  y: number;
}

/** Pointer movement below this many pixels is a click, not a drag. */
export const DRAG_THRESHOLD_PX = 4;

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: DragPos;
  moved: boolean;
  last: DragPos;
  samples: { t: number; x: number; y: number }[];
}

/**
 * Drag behaviour for a fixed-position element. While dragging, `dragPos` holds the live position
 * (null otherwise); `onEnd` gets the final position on release. A press that never passes the
 * threshold is left alone so the click still happens; after a real drag the click is swallowed
 * (call `consumeClick()` first thing in the click handler).
 */
export function useDrag({
  getPos,
  clamp,
  onEnd,
}: {
  getPos: () => DragPos;
  clamp: (p: DragPos) => DragPos;
  /** Final position and the release velocity in px per ms (0,0 when the pointer rested before letting go). */
  onEnd: (p: DragPos, v: DragPos) => void;
}) {
  const [dragPos, setDragPos] = useState<DragPos | null>(null);
  const state = useRef<DragState | null>(null);
  const swallowClick = useRef(false);

  function finish(e: PointerEvent<HTMLElement>, commit: boolean) {
    const s = state.current;
    if (!s) return;
    state.current = null;
    try {
      e.currentTarget.releasePointerCapture(s.pointerId);
    } catch {
      // capture already gone
    }
    if (s.moved) {
      if (commit) {
        swallowClick.current = true;
        setTimeout(() => {
          swallowClick.current = false;
        }, 0);
        s.samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
        onEnd(s.last, releaseVelocity(s.samples));
      }
      setDragPos(null);
    }
  }

  return {
    dragPos,
    consumeClick(): boolean {
      return swallowClick.current;
    },
    handlers: {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        const origin = getPos();
        state.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origin, moved: false, last: origin, samples: [] };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // not capturable; dragging still works while the pointer stays over the element
        }
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        const s = state.current;
        if (!s || e.pointerId !== s.pointerId) return;
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        if (!s.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        s.moved = true;
        s.last = clamp({ x: s.origin.x + dx, y: s.origin.y + dy });
        s.samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
        if (s.samples.length > 40) s.samples.shift();
        setDragPos(s.last);
      },
      onPointerUp(e: PointerEvent<HTMLElement>) {
        finish(e, true);
      },
      onPointerCancel(e: PointerEvent<HTMLElement>) {
        finish(e, false);
      },
    },
  };
}
