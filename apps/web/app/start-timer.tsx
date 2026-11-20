"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "./components/confirm-dialog";
import { clock, isRunning, minutesToLog, remainingAt, savesMinutes } from "./timer-math";
import { timer, useNow, useTimer } from "./timer-store";

const fmtTotal = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

/** Logs `minutes` to `itemId` (shows up in Profile hours). Used by Save in SessionControls and by timer-store's auto-finish. */
export async function saveFocus(itemId: string, minutes: number) {
  if (minutes < 1) return;
  // The server action loads only when called, so nav.tsx (which shows these controls) stays light.
  const { logFocusAction } = await import("./actions");
  const fd = new FormData();
  fd.set("itemId", itemId);
  fd.set("minutes", String(minutes));
  await logFocusAction(fd);
}

export async function saveMinutes(itemId: string, minutes: number) {
  await saveFocus(itemId, minutes);
}

const tonal = "flex min-h-11 w-full items-center justify-center rounded-full bg-primary-soft px-4 text-sm font-medium text-on-primary-soft hover:bg-primary-container disabled:opacity-40";
const primary = "flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40";
const quiet = "flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-medium text-danger hover:bg-danger-soft hover:text-on-danger-soft disabled:opacity-40";

/**
 * Pause or resume, finish (saves the minutes, as the auto-finish does) and discard for the running session. Shown in
 * the rail popover (nav.tsx) and, on phones where the rail is hidden, under StartTimer. `onClose` runs after Finish or
 * Discard.
 */
export function SessionControls({ onClose }: { onClose?: () => void }) {
  const state = useTimer();
  const running = state !== null && isRunning(state);
  const now = useNow(running);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();
  if (!state) return null;

  const finish = () =>
    startTransition(async () => {
      const s = timer.current();
      if (!s) return;
      if (savesMinutes(s)) await saveMinutes(s.itemId, minutesToLog(s, Date.now()));
      timer.reset();
      onClose?.();
    });

  const discard = async () => {
    const minutes = minutesToLog(state, now);
    const ok = await confirm({
      title: "Discard this session?",
      body: minutes > 0 ? `The ${minutes} min counted so far will not be saved.` : "Nothing has been counted yet.",
      confirmLabel: "Discard session",
      danger: true,
    });
    if (!ok) return;
    timer.reset();
    onClose?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => (running ? timer.pause() : timer.resume())} className={tonal}>
        {running ? "Pause" : "Resume"}
      </button>
      <button type="button" disabled={pending} onClick={finish} className={primary}>
        {savesMinutes(state) ? "Finish and save" : "Finish"}
      </button>
      <button type="button" onClick={discard} className={quiet}>
        Discard
      </button>
      {dialog}
    </div>
  );
}

/**
 * Start button for the one global timer. `totalMinutes` is what has been logged on this item so far. Starting while
 * another item's timer has time on it asks what to do with that time. While this item's session runs, it shows the
 * time left; the controls are in the rail, or inline on phones where the rail is hidden.
 */
export function StartTimer({
  itemId,
  label,
  href,
  defaultMinutes,
  totalMinutes,
}: {
  itemId: string;
  label: string;
  href: string;
  defaultMinutes: number;
  totalMinutes: number;
}) {
  const current = useTimer();
  const running = current !== null && isRunning(current);
  const now = useNow(running);
  /** Minutes on the other item's timer while we ask what to do with them; null when not asking. */
  const [asking, setAsking] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const mine = current?.itemId === itemId;
  const item = { itemId, label, href, targetMinutes: defaultMinutes };

  const begin = () => {
    timer.start(item);
    setAsking(null);
  };

  const onStart = () => {
    const other = timer.current();
    const minutes = other ? minutesToLog(other, Date.now()) : 0;
    if (other && minutes >= 1) setAsking(minutes);
    else begin();
  };

  return (
    <div className="space-y-1.5 text-sm" role="group" aria-label="Focus timer">
      {mine && current ? (
        <div className="space-y-2">
          <p className="rounded-lg border border-accent px-3 py-1.5 text-xs font-medium">
            {running ? "Running" : "Paused"}
            <span className="max-md:hidden"> in the rail</span> · {clock(remainingAt(current, now))} left
          </p>
          <div className="md:hidden">
            <SessionControls />
          </div>
        </div>
      ) : asking !== null && current ? (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-xs">
            Save {asking} min on <span className="font-medium">{current.label}</span> first?
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const old = timer.current();
                  if (old) await saveMinutes(old.itemId, minutesToLog(old, Date.now()));
                  begin();
                })
              }
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-on-accent disabled:opacity-40"
            >
              Save and start
            </button>
            <button type="button" onClick={begin} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-background">
              Discard it
            </button>
            <button type="button" onClick={() => setAsking(null)} className="rounded-md px-2.5 py-1 text-xs text-muted hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={onStart} className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium hover:bg-background">
          Start timer · {defaultMinutes} min
        </button>
      )}
      {totalMinutes > 0 && <p className="text-xs text-muted">{fmtTotal(totalMinutes)} focused here so far</p>}
    </div>
  );
}
