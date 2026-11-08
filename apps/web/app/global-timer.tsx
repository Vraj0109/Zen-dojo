"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { logFocusAction } from "./actions";
import { TIMER_PRESETS, clock, elapsedAt, isRunning, minutesToLog, reachedTarget } from "./timer-math";
import { timer, useNow, useTimer } from "./timer-store";

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

/** Logs `minutes` to `itemId` (shows up in Profile hours). Used by Save here and by "Save first" in StartTimer. */
export async function saveFocus(itemId: string, minutes: number) {
  if (minutes < 1) return;
  const fd = new FormData();
  fd.set("itemId", itemId);
  fd.set("minutes", String(minutes));
  await logFocusAction(fd);
}

const btn = "rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-background disabled:opacity-40";

/** The sidebar timer: one for the whole app, keeps running across pages. */
export function GlobalTimer() {
  const state = useTimer();
  const running = state !== null && isRunning(state);
  const now = useNow(running);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rangFor = useRef<string | null>(null);
  const originalTitle = useRef<string | null>(null);

  const done = state !== null && reachedTarget(state, now);
  const key = state ? `${state.itemId}:${state.targetMinutes}` : null;

  useEffect(() => {
    if (!state || !done || rangFor.current === key) return;
    rangFor.current = key;
    beep();
    originalTitle.current = document.title;
    document.title = "Time's up · Zen Forge";
  }, [state, done, key]);

  useEffect(() => {
    if (key === null) rangFor.current = null;
  }, [key]);

  const restoreTitle = () => {
    if (originalTitle.current !== null) document.title = originalTitle.current;
    originalTitle.current = null;
  };

  if (!state) {
    return (
      <section aria-label="Focus timer" className="rounded-lg border border-line px-3 py-2">
        <p className="text-xs text-muted">{notice ?? "No timer running"}</p>
        <p className="text-[11px] text-muted">Press Start timer on a problem or lesson.</p>
      </section>
    );
  }

  const elapsed = elapsedAt(state, now);
  const minutes = minutesToLog(state, now);
  const target = state.targetMinutes * 60_000;

  return (
    <section aria-label="Focus timer" className="space-y-2 rounded-lg border border-line px-3 py-2">
      <Link href={state.href} className="block truncate text-xs font-medium hover:underline" title={state.label}>
        {state.label}
      </Link>
      <div className="flex items-baseline justify-between gap-2">
        <p className={`font-mono text-2xl tabular-nums ${done ? "text-accent" : ""}`} role="timer" aria-live="off">
          {clock(elapsed)}
        </p>
        <p className="text-xs text-muted">/ {state.targetMinutes} min</p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Progress to target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((elapsed / target) * 100))}>
        <div className="h-full bg-accent" style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {running ? (
          <button type="button" onClick={() => timer.pause()} className={btn}>
            Pause
          </button>
        ) : (
          <button type="button" onClick={() => timer.resume()} className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-on-accent">
            Resume
          </button>
        )}
        <button
          type="button"
          disabled={pending || minutes < 1}
          onClick={() =>
            startTransition(async () => {
              const s = timer.current();
              if (!s) return;
              const m = minutesToLog(s, Date.now());
              await saveFocus(s.itemId, m);
              timer.reset();
              restoreTitle();
              setNotice(`Saved ${m} min`);
              setTimeout(() => setNotice(null), 4000);
            })
          }
          className={btn}
        >
          Save{minutes > 0 ? ` ${minutes} min` : ""}
        </button>
        <button
          type="button"
          onClick={() => {
            timer.reset();
            restoreTitle();
          }}
          className={`${btn} text-muted`}
        >
          Discard
        </button>
      </div>
      {!running && elapsed === 0 && (
        <div className="flex gap-1" role="group" aria-label="Target minutes">
          {TIMER_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => timer.setTarget(p)}
              aria-pressed={state.targetMinutes === p}
              className={`rounded-md px-1.5 py-0.5 text-[11px] ${state.targetMinutes === p ? "bg-accent text-on-accent" : "text-muted hover:bg-background"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
