"use client";

import { useSyncExternalStore } from "react";
import { isAppearanceSyncPaused, subscribeAppearanceSync } from "@/lib/appearance-sync-state";

/** One line under the sync status while the theme cannot be read from or saved to the account (plan 0075). */
export function AppearanceSyncNote() {
  const paused = useSyncExternalStore(subscribeAppearanceSync, isAppearanceSyncPaused, () => false);
  if (!paused) return null;
  return (
    <p role="status" className="text-xs text-muted">
      Theme sync is paused. It will retry.
    </p>
  );
}
