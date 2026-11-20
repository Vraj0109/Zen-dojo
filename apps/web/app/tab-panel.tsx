"use client";

import { useState, type ReactNode } from "react";

/*
 * Content that changes with a tab. The new panel fades in (opacity only, 150ms, see globals.css, zd-tab-in): no
 * movement, so it never competes with the tab pill that slides in the strip above. The first render and `still`
 * panels (long lists) do not animate. The panel is keyed by the tab, so it remounts, as the pages did before.
 */

/**
 * Sets html[data-tab-switch] for a moment, so in-page panes that are shown and hidden (not remounted), such as the
 * judge workspace panes, fade in right after a tab click. Route tabs need nothing: their page already fades in.
 */
export function markTabSwitch() {
  const root = document.documentElement;
  root.dataset.tabSwitch = "";
  window.clearTimeout(markTabSwitch.timer);
  markTabSwitch.timer = window.setTimeout(() => {
    delete root.dataset.tabSwitch;
  }, 400);
}
markTabSwitch.timer = 0;

export function TabPanel({
  tab,
  still = false,
  className = "",
  children,
}: {
  tab: string;
  /** No longer used (the panel does not slide by direction); callers may drop it. */
  order?: readonly string[];
  /** Switch without a fade (a long list would jank). */
  still?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [seen, setSeen] = useState({ tab, switched: false });
  let switched = seen.switched;
  if (seen.tab !== tab) {
    switched = true;
    setSeen({ tab, switched: true });
  }
  return (
    <div key={tab} data-switched={switched && !still ? "" : undefined} className={`zd-tab-panel ${className}`}>
      {children}
    </div>
  );
}
