"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { logFocusAction } from "./actions";

// Countdown timer for one item. State lives in localStorage, so reloading or leaving the page
// doesn't lose it; "Save" logs the elapsed minutes to the item (Profile → hours studied).

interface Saved {
  duration: number; // minutes
  elapsedBefore: number; // ms counted before the current run
  startedAt: number | null; // epoch ms of the current run, null when paused
}

const key = (itemId: string) => `habit-timer:${itemId}`;

// A tiny external store over localStorage (with an in-memory fallback when storage is blocked).
const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readRaw(itemId: string): string | null {
  const k = key(itemId);
  if (memory.has(k)) return memory.get(k) ?? null;
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function parse(raw: string | null, fallback: number): Saved {
  try {
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (typeof s.duration === "number" && typeof s.elapsedBefore === "number") return s;
    }
  } catch {
    // corrupt value: start fresh
  }
  return { duration: fallback, elapsedBefore: 0, startedAt: null };
}

function store(itemId: string, s: Saved) {
  const k = key(itemId);
  const value = s.elapsedBefore === 0 && s.startedAt === null ? null : JSON.stringify(s);
  memory.set(k, value);
  try {
    if (value === null) localStorage.removeItem(k);
    else localStorage.setItem(k, value);
  } catch {
    // memory copy still works for this page
  }
  emit();
}

const noop = () => () => {};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // no audio
  }
}

const clock = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
};

const fmtTotal = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

export function FocusTimer({
  itemId,
  defaultMinutes,
  presets = [25, 45, 60],
  totalMinutes,
}: {
  itemId: string;
  defaultMinutes: number;
  presets?: number[];
  totalMinutes: number;
}) {
  const raw = useSyncExternalStore(subscribe, () => readRaw(itemId), () => null);
  const loaded = useSyncExternalStore(noop, () => true, () => false);
  const state = useMemo(() => parse(raw, defaultMinutes), [raw, defaultMinutes]);
  const [now, setNow] = useState(() => Date.now());
  const rang = useRef(false);

  const update = (s: Saved) => store(itemId, s);

  const running = state.startedAt !== null;
  const elapsed = state.elapsedBefore + (running ? now - state.startedAt! : 0);
  const remaining = state.duration * 60_000 - elapsed;
  const done = remaining <= 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && done && !rang.current) {
      rang.current = true;
      beep();
      update({ ...state, elapsedBefore: state.duration * 60_000, startedAt: null });
      document.title = "⏰ Time's up · HabitManager";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, done]);

  const start = () => {
    rang.current = false;
    const t = Date.now();
    setNow(t);
    update({ ...state, startedAt: t });
  };
  const pause = () => update({ ...state, elapsedBefore: elapsed, startedAt: null });
  const reset = () => update({ duration: state.duration, elapsedBefore: 0, startedAt: null });
  const minutes = Math.round(elapsed / 60_000);

  const btn = "rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-40";
  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-label="Focus timer">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Focus timer</h3>
          <p className="text-xs text-muted">{totalMinutes > 0 ? `${fmtTotal(totalMinutes)} focused here so far` : "Time yourself; saved minutes count toward hours studied."}</p>
        </div>
        <p className={`font-mono text-3xl tabular-nums ${done ? "text-accent" : ""}`} role="timer" aria-live="off">
          {loaded ? (done ? "Done" : clock(remaining)) : clock(defaultMinutes * 60_000)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {running ? (
          <button type="button" onClick={pause} className={btn}>
            Pause
          </button>
        ) : (
          <button type="button" onClick={start} disabled={done} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent disabled:opacity-40">
            {elapsed > 0 ? "Resume" : "Start"}
          </button>
        )}
        <button type="button" onClick={reset} disabled={elapsed === 0} className={btn}>
          Reset
        </button>
        <form
          action={async (fd) => {
            await logFocusAction(fd);
            reset();
            document.title = "HabitManager";
          }}
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="minutes" value={minutes} />
          <button type="submit" disabled={minutes < 1} className={btn}>
            Save {minutes > 0 ? `${minutes} min` : ""}
          </button>
        </form>
        {!running && elapsed === 0 && (
          <span className="ml-auto flex gap-1" role="group" aria-label="Duration">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update({ ...state, duration: p })}
                aria-pressed={state.duration === p}
                className={`rounded-md px-2 py-1 text-xs ${state.duration === p ? "bg-accent text-on-accent" : "text-muted hover:bg-background"}`}
              >
                {p} min
              </button>
            ))}
          </span>
        )}
      </div>
    </section>
  );
}
