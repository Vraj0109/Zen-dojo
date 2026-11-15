// Plan 0075 step 7: whether theme sync is paused (a read or a push failed). Browser-only, in memory: the shell sets
// it, the Settings page shows a one-line note while it is true.

export const APPEARANCE_SYNC_EVENT = "habit-appearance-sync";

let paused = false;

export function setAppearanceSyncPaused(next: boolean): void {
  if (paused === next) return;
  paused = next;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(APPEARANCE_SYNC_EVENT));
}

export function isAppearanceSyncPaused(): boolean {
  return paused;
}

export function subscribeAppearanceSync(onChange: () => void): () => void {
  window.addEventListener(APPEARANCE_SYNC_EVENT, onChange);
  return () => window.removeEventListener(APPEARANCE_SYNC_EVENT, onChange);
}
