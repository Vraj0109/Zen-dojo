// Pure logic for the one global focus timer (no browser APIs, so it is unit-tested).
// The running time is derived from `startedAt`, so it survives navigation and reloads.

export interface TimerState {
  /** Problem, concept, exercise, `boss` or `pattern:<id>`: whatever `logFocus` accepts. */
  itemId: string;
  label: string;
  /** Page of the item, so the sidebar can link back to it. */
  href: string;
  /** Epoch ms of the current run, null while paused. */
  startedAt: number | null;
  /** Time counted before the current run. */
  elapsedMs: number;
  targetMinutes: number;
}

export const TIMER_PRESETS = [15, 25, 45, 60] as const;
export const MAX_TARGET_MINUTES = 600;

export function newTimer(item: { itemId: string; label: string; href: string; targetMinutes: number }, now: number): TimerState {
  return { ...item, targetMinutes: clampTarget(item.targetMinutes), startedAt: now, elapsedMs: 0 };
}

export const clampTarget = (minutes: number) => Math.min(MAX_TARGET_MINUTES, Math.max(1, Math.round(minutes) || 1));

export const isRunning = (s: TimerState) => s.startedAt !== null;

export const elapsedAt = (s: TimerState, now: number) => s.elapsedMs + (s.startedAt === null ? 0 : Math.max(0, now - s.startedAt));

export function pauseTimer(s: TimerState, now: number): TimerState {
  return s.startedAt === null ? s : { ...s, elapsedMs: elapsedAt(s, now), startedAt: null };
}

export function resumeTimer(s: TimerState, now: number): TimerState {
  return s.startedAt === null ? { ...s, startedAt: now } : s;
}

export const withTarget = (s: TimerState, minutes: number): TimerState => ({ ...s, targetMinutes: clampTarget(minutes) });

/** Whole minutes to log when saving (rounded like the old per-page timer). */
export const minutesToLog = (s: TimerState, now: number) => Math.round(elapsedAt(s, now) / 60_000);

export const reachedTarget = (s: TimerState, now: number) => elapsedAt(s, now) >= s.targetMinutes * 60_000;

/** mm:ss, or h:mm:ss from one hour. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}

/** Reads a stored timer; anything malformed is treated as "no timer". */
export function parseTimer(raw: string | null): TimerState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<TimerState>;
    if (
      typeof s.itemId === "string" &&
      s.itemId &&
      typeof s.label === "string" &&
      typeof s.href === "string" &&
      s.href.startsWith("/") &&
      typeof s.elapsedMs === "number" &&
      Number.isFinite(s.elapsedMs) &&
      s.elapsedMs >= 0 &&
      (s.startedAt === null || (typeof s.startedAt === "number" && Number.isFinite(s.startedAt))) &&
      typeof s.targetMinutes === "number"
    ) {
      return { itemId: s.itemId, label: s.label, href: s.href, startedAt: s.startedAt ?? null, elapsedMs: s.elapsedMs, targetMinutes: clampTarget(s.targetMinutes) };
    }
  } catch {
    // corrupt value
  }
  return null;
}

export const serializeTimer = (s: TimerState) => JSON.stringify(s);
