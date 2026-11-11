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
import type { PetMeta } from "./pets/pet-package";
import { listPets, loadPetSheetUrl } from "./pets/pet-store";
import { type DragPos, useDrag } from "./use-drag";
import { BuddyChat } from "./buddy-chat";
import { type Bounds, type Motion, isSettled, snapToEdge, springStep, throwTarget } from "./throw-physics";

const EDGE = 16;
const PANEL_W = 336;
const BUBBLE_MS = 8_000;
const FADE_MS = 500;
const TICK_MS = 30_000;
const ACTIVITY_THROTTLE_MS = 1_000;
const WAVE_MS = 2_500;
const AI_WAIT_MS = 10_000;
const AI_EVENT_COOLDOWN_MS = 60_000;
const CHATTER_MS = { rare: 12 * 60_000, normal: 5 * 60_000 } as const;

const noopSubscribe = () => () => {};

function viewport() {
  if (typeof window === "undefined") return { w: 1280, h: 800 };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function BuddyCompanion({ settings = DEFAULT_BUDDY_SETTINGS, ai }: { settings?: BuddySettings; ai?: { enabled: boolean } }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [prefs, setPrefs] = useState(() => (typeof window === "undefined" ? DEFAULT_BUDDY_PREFS : readBuddyPrefs()));
  const [vp, setVp] = useState(viewport);
  const [mood, setMood] = useState<BuddyMood>("idle");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"session" | "chat">("session");
  const [bubble, setBubble] = useState<{ text: string; fading: boolean } | null>(null);
  const [waving, setWaving] = useState(false);
  const [petAsset, setPetAsset] = useState<{ id: string; meta: PetMeta; url: string } | null>(null);

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
  const waveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    moodRef.current = mood;
    openRef.current = open;
    bubbleRef.current = bubble !== null;
  });

  // Load the selected pet from IndexedDB; a missing pet falls back to the fox.
  const petId = prefs.avatar === "pet" ? prefs.pet?.id : undefined;
  useEffect(() => {
    if (!petId) return;
    let alive = true;
    let url: string | null = null;
    void (async () => {
      try {
        const meta = (await listPets()).find((m) => m.id === petId);
        const u = meta ? await loadPetSheetUrl(petId) : null;
        if (!alive) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        if (meta && u) {
          url = u;
          setPetAsset({ id: petId, meta, url: u });
        }
      } catch {
        // IndexedDB blocked: keep the fox
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [petId]);

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
      setWaving(true);
      if (waveTimer.current) clearTimeout(waveTimer.current);
      waveTimer.current = setTimeout(() => setWaving(false), WAVE_MS);
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
      const persona = prefs.avatar === "pet" && prefs.pet ? { name: prefs.pet.name, description: prefs.pet.description } : undefined;
      void fetchAiLine(lineEvent, tone, name, ctl.signal, persona).then((line) => {
        clearTimeout(giveUp);
        if (ctl.signal.aborted && aiAbort.current !== ctl) return; // a newer line replaced this one
        if (aiAbort.current === ctl) aiAbort.current = null;
        say(line ?? fallback);
      });
    },
    [tone, name, prefs.aiLines, prefs.avatar, prefs.pet, say],
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
      if (waveTimer.current) clearTimeout(waveTimer.current);
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
  // The Buddy lives on the screen edges only: its resting place is always flush with an edge (EDGE px in).
  const bounds: Bounds = {
    minX: EDGE,
    maxX: Math.max(EDGE, vp.w - size - EDGE),
    minY: EDGE,
    maxY: Math.max(EDGE, vp.h - size - EDGE),
  };
  const basePos = snapToEdge(clamp(prefs.pos ?? { x: EDGE, y: vp.h - size - EDGE }), bounds);

  // Thrown: a flick slides it with friction toward the edge it is headed for and it settles there on a soft spring (no gravity).
  const [flying, setFlying] = useState<{ pos: DragPos; vx: number } | null>(null);
  const raf = useRef<number | null>(null);
  const stopFlying = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);
  useEffect(() => stopFlying, [stopFlying]);

  function startThrow(from: DragPos, v: DragPos) {
    stopFlying();
    const target = throwTarget(from, v, bounds);
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      writeBuddyPrefs({ pos: target });
      return;
    }
    let m: Motion = { pos: from, vel: v };
    let last = performance.now();
    const frame = (now: number) => {
      m = springStep(m, target, now - last);
      last = now;
      if (isSettled(m, target)) {
        raf.current = null;
        setFlying(null);
        writeBuddyPrefs({ pos: target });
        return;
      }
      setFlying({ pos: clamp(m.pos), vx: m.vel.x });
      raf.current = requestAnimationFrame(frame);
    };
    setFlying({ pos: from, vx: v.x });
    raf.current = requestAnimationFrame(frame);
  }

  const drag = useDrag({
    getPos: () => {
      stopFlying();
      setFlying(null);
      return flying?.pos ?? basePos;
    },
    clamp,
    onEnd: (p, v) => startThrow(p, v),
  });
  const pos = drag.dragPos ?? flying?.pos ?? basePos;
  const dragDx = drag.dragPos ? drag.dragPos.x - basePos.x : 0;
  const dragging = drag.dragPos
    ? Math.abs(dragDx) > 2
      ? dragDx < 0
        ? "left"
        : "right"
      : null
    : flying && Math.abs(flying.vx) > 0.05
      ? flying.vx < 0
        ? "left"
        : "right"
      : null;

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
    // Arrow keys send the Buddy to that edge of the screen (it only ever rests on an edge).
    const edges = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "top", ArrowDown: "bottom" } as const;
    const edge = edges[e.key as keyof typeof edges];
    if (!edge) return;
    e.preventDefault();
    stopFlying();
    setFlying(null);
    writeBuddyPrefs({ pos: snapToEdge(basePos, bounds, edge) });
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
  const chatOn = Boolean(ai?.enabled);
  const TAB_H = 34; // room for the Co-work / Chat switch between the avatar and the panel
  const panelLeft = Math.min(Math.max(8, pos.x), Math.max(8, vp.w - panelW - 8));
  const panelStyle: CSSProperties = {
    width: panelW,
    left: panelLeft,
    ...(below ? { top: pos.y + size + 8 + (chatOn ? TAB_H : 0) } : { bottom: vp.h - pos.y + 8 + (chatOn ? TAB_H : 0) }),
  };
  const tabStyle: CSSProperties = { width: panelW, left: panelLeft, ...(below ? { top: pos.y + size + 8 } : { bottom: vp.h - pos.y + 8 }) };
  const persona = prefs.avatar === "pet" && prefs.pet ? { name: prefs.pet.name, description: prefs.pet.description } : { name, description: "" };
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
        <BuddyAvatar
          id={prefs.avatar === "pet" && !(petAsset && petAsset.id === petId) ? "fox" : prefs.avatar}
          mood={mood}
          size={size}
          customSrc={prefs.customSrc}
          pet={petAsset?.meta}
          sheetUrl={petAsset?.url}
          speaking={waving}
          dragging={dragging}
        />
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
      {open && chatOn && (
        <div role="tablist" aria-label="Buddy" style={tabStyle} className="fixed z-40 flex gap-1 print:hidden">
          {(["session", "chat"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium shadow ${tab === t ? "border-accent bg-accent text-on-accent" : "border-line bg-surface hover:bg-background"}`}
            >
              {t === "session" ? "Co-work" : "Chat"}
            </button>
          ))}
        </div>
      )}
      <BuddySession settings={settings} open={open && (!chatOn || tab === "session")} onClose={() => setOpen(false)} style={panelStyle} />
      {open && chatOn && tab === "chat" && (
        <BuddyChat name={persona.name} description={persona.description} tone={settings.mode === "off" ? "peer" : settings.mode} style={panelStyle} />
      )}
    </>
  );
}
