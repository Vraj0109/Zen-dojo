"use client";

import { useEffect, useRef, useState } from "react";
import { SHORTCUT_GROUPS, SHORTCUTS, type ShortcutItem } from "../shortcuts";

export const OPEN_SHORTCUTS_EVENT = "habit-open-shortcuts";

export function openShortcutsSheet(): void {
  window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT));
}

export function ShortcutsSheet() {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Platform detection in effect
  useEffect(() => {
    const nav = window.navigator as { userAgentData?: { platform?: string }; platform?: string };
    const p = nav.userAgentData?.platform ?? nav.platform ?? "";
    const mac = /mac/i.test(p);
    queueMicrotask(() => setIsMac(mac));
  }, []);

  // Listen for '?' global keypress and custom event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A page that handled the key itself (the problem workspace opens the sheet on ?) prevents the default.
      if (e.defaultPrevented) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (target) {
          const tag = target.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
            return;
          }
        }
        e.preventDefault();
        setOpen((v) => !v);
      }
    };

    const onCustom = () => setOpen(true);

    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, onCustom);
    };
  }, []);

  // Focus trap and restore on open / close
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      // Focus the dialog or first focusable
      const focusable = dialogRef.current?.querySelector<HTMLElement>("button, [tabindex='0']");
      focusable?.focus();

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
        } else if (e.key === "Tab") {
          const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusables || focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  const groups = SHORTCUT_GROUPS.map((g) => ({ title: g, items: SHORTCUTS.filter((s) => s.group === g) })).filter((g) => g.items.length > 0);

  const renderKeys = (item: ShortcutItem) => {
    const keys = isMac && item.macKeys ? item.macKeys : item.keys;
    return (
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="inline-flex min-w-6 items-center justify-center rounded-lg border border-line bg-surface-2 px-2 py-0.5 text-xs font-mono font-medium text-foreground"
          >
            {k}
          </kbd>
        ))}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
        className="relative z-10 flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-md flex-col rounded-[28px] border border-line bg-surface p-6 shadow-menu dark:border-0"
      >
        <div className="flex shrink-0 items-center justify-between pb-1">
          <h2 id="shortcuts-dialog-title" className="text-xl font-semibold text-foreground">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts"
            className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="shrink-0 pb-4 text-[13px] text-muted">
          {isMac ? "Shown with Mac keys: ⌘ is Cmd, ⌥ is Option." : "On a Mac, use Cmd instead of Ctrl and Option instead of Alt."}
        </p>

        <div className="-mr-2 min-h-0 space-y-6 overflow-y-auto pr-2 [scrollbar-width:thin]">
          {groups.map((g) => (
            <section key={g.title} aria-labelledby={`shortcuts-${g.title.replace(/\s+/g, "-").toLowerCase()}`}>
              <h3 id={`shortcuts-${g.title.replace(/\s+/g, "-").toLowerCase()}`} className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
                {g.title}
              </h3>
              <ul className="space-y-1">
                {g.items.map((item) => (
                  <li key={item.description} className="flex min-h-9 items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{item.description}</span>
                    {renderKeys(item)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
