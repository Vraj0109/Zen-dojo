"use client";

import { useState } from "react";

/**
 * Reference code starts hidden. A plain <details>, so it opens without JavaScript (the summary is the button).
 * `lazy` mounts the children only after the first open: use it for the heavy editor, so a closed block costs nothing.
 * The id sits on the <details> itself, so a link to it always lands on something visible.
 */
export function RevealCode({
  id,
  title = "Reveal reference code",
  note = "Try it yourself first.",
  names = [],
  lazy = false,
  children,
}: {
  id?: string;
  /** What the summary says while closed. While open it reads "Hide". */
  title?: string;
  note?: string;
  /** File names shown as small chips in the summary (the first eight). */
  names?: string[];
  lazy?: boolean;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const shown = names.slice(0, 8);
  return (
    <details
      id={id}
      className="group scroll-mt-24 rounded-[24px] border border-line bg-surface dark:border-0"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="transition-transform size-4 shrink-0 text-muted group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 4l6 6-6 6" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">
            <span className="group-open:hidden">{title}</span>
            <span className="hidden group-open:inline">Hide {title.replace(/^Reveal /, "").replace(/^Open /, "")}</span>
          </span>
          <span className="block text-sm text-muted">{note}</span>
        </span>
        {shown.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 group-open:hidden">
            {shown.map((n) => (
              <li key={n} className="max-w-full truncate rounded-[10px] bg-surface-2 px-2.5 py-1 font-mono text-xs text-foreground">
                {n.replace(/^.*\//, "")}
              </li>
            ))}
            {names.length > shown.length && <li className="rounded-[10px] bg-surface-2 px-2.5 py-1 text-xs text-muted">+{names.length - shown.length} more</li>}
          </ul>
        )}
      </summary>
      <div className="space-y-6 border-t border-line p-4 sm:p-5">{lazy && !opened ? null : children}</div>
    </details>
  );
}
