"use client";

import { useState, useTransition } from "react";
import { saveFocus } from "./global-timer";
import { isRunning, minutesToLog } from "./timer-math";
import { timer, useTimer } from "./timer-store";

const fmtTotal = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

/**
 * Start button for the one global timer (it lives in the sidebar). `totalMinutes` is what has been logged on this
 * item so far. Starting while another item's timer has time on it asks what to do with that time.
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
      {mine ? (
        <p className="rounded-lg border border-accent px-3 py-1.5 text-xs font-medium">{current && isRunning(current) ? "Timer running, see the sidebar" : "Timer paused, see the sidebar"}</p>
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
                  if (old) await saveFocus(old.itemId, minutesToLog(old, Date.now()));
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
