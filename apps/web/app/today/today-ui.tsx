"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface BacklogItem {
  id: string;
  kind: "struggle" | "resolve" | "concept" | "exercise";
  title: string;
  href: string;
  detail: string;
}

const KIND_LABELS: Record<string, string> = {
  struggle: "Stuck list",
  resolve: "Re-solve",
  concept: "Concept",
  exercise: "Practice",
};

export function CatchUpDrawer({ backlog }: { backlog: BacklogItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open]);

  if (!backlog || backlog.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="catchup-drawer"
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-accent hover:text-foreground"
      >
        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 font-semibold text-accent">
          {backlog.length}
        </span>
        <span>in catch-up</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        id="catchup-drawer"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-96 max-w-[85vw] flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h3 className="font-semibold">Catch-up Backlog</h3>
            <p className="text-xs text-muted">
              {backlog.length} review{backlog.length === 1 ? "" : "s"} postponed to avoid overwhelm
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close catch-up backlog"
            className="grid size-7 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="p-4 text-xs text-muted">
          Review these at your own pace without streak penalty or cognitive dread.
        </div>

        <ul className="flex-1 divide-y divide-line overflow-y-auto px-2">
          {backlog.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="rounded-lg p-3 hover:bg-background/60">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {KIND_LABELS[item.kind] ?? item.kind}
                </span>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Start →
                </Link>
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">
                <Link href={item.href} onClick={() => setOpen(false)} className="hover:underline">
                  {item.title}
                </Link>
              </p>
              {item.detail && <p className="mt-0.5 truncate text-xs text-muted">{item.detail}</p>}
            </li>
          ))}
        </ul>

        <div className="border-t border-line p-4">
          <Link
            href="/review"
            onClick={() => setOpen(false)}
            className="block w-full rounded-lg border border-line bg-background py-2 text-center text-sm font-medium hover:border-accent"
          >
            Open in Review Mode →
          </Link>
        </div>
      </div>
    </>
  );
}
