"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from "react";
import {
  type BuddyEventType,
  type BuddyLineEvent,
  type BuddyMood,
  type BuddySettings,
  type BuddyTone,
  DEFAULT_BUDDY_SETTINGS,
  EXCITED_FOR_MS,
  eventToLine,
  nextMood,
  pickLine,
} from "@habit/shared";
import { BuddySession } from "../buddy-session";
import { BuddyAvatar } from "./avatar";
import { fetchAiLine } from "./ai-line";
import { onBuddy } from "./buddy-events";
import { BUDDY_SIZE_PX, DEFAULT_BUDDY_PREFS, onBuddyPrefs, readBuddyPrefs, resetBuddyPosition, writeBuddyPrefs } from "./buddy-prefs";
import { type DragPos, useDrag } from "./use-drag";

const EDGE = 16;
const PANEL_W = 336;
const BUBBLE_MS = 8_000;
const FADE_MS = 500;
const TICK_MS = 30_000;
const ACTIVITY_THROTTLE_MS = 1_000;
const AI_WAIT_MS = 10_000;
const AI_EVENT_COOLDOWN_MS = 60_000;
const CHATTER_MS = { rare: 12 * 60_000, normal: 5 * 60_000 } as const;

const noopSubscribe = () => () => {};

function viewport() {
  if (typeof window === "undefined") return { w: 1280, h: 800 };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function BuddyCompanion({ settings = DEFAULT_BUDDY_SETTINGS }: { settings?: BuddySettings }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [prefs, setPrefs] = useState(() => (typeof window === "undefined" ? DEFAULT_BUDDY_PREFS : readBuddyPrefs()));
  const [vp, setVp] = useState(viewport);
  const [mood, setMood] = useState<BuddyMood>("idle");
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; fading: boolean } | null>(null);

  const off = settings.mode === "off";
  const tone: BuddyTone = settings.mode === "off" ? "calm" : settings.mode;
  const name = settings.name?.trim() || "Buddy";
  const size = BUDDY_SIZE_PX[prefs.size];

  // Mirrors for callbacks that outlive a render.
  const moodRef = useRef<BuddyMood>("idle");
  const openRef = useRef(false);
  const bubbleRef = useRef(false);
  const lastActivity = useRef(0);
  const excitedUntil = useRef(0);
  const aiBusy = useRef(false);
  const lastEventLine = useRef(0);
  const bubbleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const calmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    moodRef.current = mood;
    openRef.current = open;
    bubbleRef.current = bubble !== null;
  });

  // Preferences changed elsewhere (Settings) or here (drag).
  useEffect(() => onBuddyPrefs(setPrefs), []);

  useEffect(() => {
    const onResize = () => setVp(viewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clearBubbleTimers = useCallback(() => {
    for (const t of bubbleTimers.current) clearTimeout(t);
    bubbleTimers.current = [];
  }, []);

  const say = useCallback(
    (text: string) => {
      if (openRef.current || !text) return;
      clearBubbleTimers();
      setBubble({ text, fading: false });
      bubbleTimers.current = [
        setTimeout(() => setBubble((b) => (b ? { ...b, fading: true } : b)), BUBBLE_MS - FADE_MS),
        setTimeout(() => setBubble(null), BUBBLE_MS),
      ];
    },
    [clearBubbleTimers],
  );

  const apply = useCallback((type: BuddyEventType) => {
    const now = Date.now();
    if (type === "ai-start") aiBusy.current = true;
    if (type === "ai-end") aiBusy.current = false;
    if (type === "solved" || type === "session-end") excitedUntil.current = now + EXCITED_FOR_MS;
    if (type !== "tick") lastActivity.current = now;
    const ctx = { now, lastActivity: lastActivity.current, excitedUntil: excitedUntil.current, aiBusy: aiBusy.current };
    setMood((m) => nextMood(m, type, ctx));
  }, []);

  const dispatch = useCallback(
    (type: BuddyEventType) => {
      apply(type);
      if (type === "solved" || type === "session-end") {
        // Let the excited pose end on time instead of waiting for the next 30-second tick.
        if (calmTimer.current) clearTimeout(calmTimer.current);
        calmTimer.current = setTimeout(() => apply("tick"), EXCITED_FOR_MS + 50);
      }
    },
    [apply],
  );

  // Built-in line right away, or an AI line when wanted, with the built-in one as the fallback.
  const speak = useCallback(
    (lineEvent: BuddyLineEvent) => {
      const fallback = pickLine(tone, lineEvent, Math.floor(Math.random() * 1_000_000), name);
      aiAbort.current?.abort();
      aiAbort.current = null;
      if (!prefs.aiLines) {
        say(fallback);
        return;
      }
      const ctl = new AbortController();
      aiAbort.current = ctl;
      const giveUp = setTimeout(() => ctl.abort(), AI_WAIT_MS);
      void fetchAiLine(lineEvent, tone, name, ctl.signal).then((line) => {
        clearTimeout(giveUp);
        if (ctl.signal.aborted && aiAbort.current !== ctl) return; // a newer line replaced this one
        if (aiAbort.current === ctl) aiAbort.current = null;
        say(line ?? fallback);
      });
    },
    [tone, name, prefs.aiLines, say],
  );

  // Buddy events from the rest of the app.
  useEffect(() => {
    if (!hydrated || off) return;
    return onBuddy((type, detail) => {
      dispatch(type);
      if (prefs.frequency === "off") return;
      if (detail?.text) {
        say(detail.text);
        return;
      }
      const lineEvent = eventToLine(type);
      if (!lineEvent) return;
      if (type === "ai-end") {
        const now = Date.now();
        if (now - lastEventLine.current < AI_EVENT_COOLDOWN_MS) return;
        lastEventLine.current = now;
      }
      speak(lineEvent);
    });
  }, [hydrated, off, prefs.frequency, dispatch, say, speak]);

  // Activity (throttled) and the 30-second tick.
  useEffect(() => {
    if (!hydrated || off) return;
    lastActivity.current = Date.now();
    let last = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - last < ACTIVITY_THROTTLE_MS) return;
      last = now;
      dispatch("activity");
    };
    const events = ["pointerdown", "pointermove", "keydown"] as const;
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true });
    const tick = setInterval(() => dispatch("tick"), TICK_MS);
    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity);
      clearInterval(tick);
      if (calmTimer.current) clearTimeout(calmTimer.current);
    };
  }, [hydrated, off, dispatch]);

  // Talks by itself now and then.
  useEffect(() => {
    if (!hydrated || off || prefs.frequency === "off") return;
    const base = CHATTER_MS[prefs.frequency];
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          const quiet = moodRef.current === "sleeping" || moodRef.current === "thinking" || openRef.current || bubbleRef.current || document.hidden;
          if (!quiet) speak("idle-chatter");
          schedule();
        },
        base * (0.6 + Math.random() * 0.8),
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [hydrated, off, prefs.frequency, speak]);

  // Cancel timers and any pending AI request on unmount.
  useEffect(
    () => () => {
      clearBubbleTimers();
      aiAbort.current?.abort();
    },
    [clearBubbleTimers],
  );

  const clamp = useCallback(
    (p: DragPos): DragPos => ({
      x: Math.min(Math.max(0, p.x), Math.max(0, vp.w - size)),
      y: Math.min(Math.max(0, p.y), Math.max(0, vp.h - size)),
    }),
    [vp, size],
  );
  const basePos = clamp(prefs.pos ?? { x: EDGE, y: vp.h - size - EDGE });

  const drag = useDrag({
    getPos: () => basePos,
    clamp,
    onEnd: (p) => {
      writeBuddyPrefs({ pos: p });
    },
  });
  const pos = drag.dragPos ?? basePos;

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!hydrated || off) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 40 : 10;
    const d: Record<string, DragPos> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = d[e.key];
    if (!delta) return;
    e.preventDefault();
    writeBuddyPrefs({ pos: clamp({ x: basePos.x + delta.x, y: basePos.y + delta.y }) });
  };

  const onClick = () => {
    if (drag.consumeClick()) return;
    clearBubbleTimers();
    setBubble(null);
    setOpen((o) => !o);
  };

  // Panel and bubble sit next to the avatar: above it in the lower half of the screen, else below.
  const below = pos.y + size / 2 < vp.h / 2;
  const panelW = Math.min(PANEL_W, vp.w - 16);
  const panelStyle: CSSProperties = {
    width: panelW,
    left: Math.min(Math.max(8, pos.x), Math.max(8, vp.w - panelW - 8)),
    ...(below ? { top: pos.y + size + 8 } : { bottom: vp.h - pos.y + 8 }),
  };
  const bubbleRight = pos.x + size / 2 > vp.w / 2; // avatar on the right half: bubble goes to its left
  const bubbleStyle: CSSProperties = {
    top: pos.y + size / 2,
    transform: "translateY(-50%)",
    maxWidth: Math.max(120, Math.min(240, (bubbleRight ? pos.x : vp.w - pos.x - size) - 16)),
    ...(bubbleRight ? { right: vp.w - pos.x + 8 } : { left: pos.x + size + 8 }),
  };

  return (
    <>
      <button
        type="button"
        {...drag.handlers}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDoubleClick={(e) => {
          if (e.shiftKey) resetBuddyPosition();
        }}
        aria-label={`${name}, your study buddy. Press Enter for a co-work sprint, arrow keys to move`}
        aria-expanded={open}
        style={{ left: pos.x, top: pos.y, width: size, height: size, touchAction: "none" }}
        className={`fixed z-40 rounded-full select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent print:hidden ${
          drag.dragPos ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <BuddyAvatar id={prefs.avatar} mood={mood} size={size} customSrc={prefs.customSrc} />
      </button>
      <div
        role="status"
        aria-live="polite"
        style={bubble ? bubbleStyle : undefined}
        className={
          bubble
            ? `fixed z-40 rounded-2xl border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-foreground shadow-lg transition-opacity duration-500 print:hidden ${
                bubble.fading ? "opacity-0" : "opacity-100"
              }`
            : "sr-only"
        }
      >
        {bubble?.text}
      </div>
      <BuddySession settings={settings} open={open} onClose={() => setOpen(false)} style={panelStyle} />
    </>
  );
}
