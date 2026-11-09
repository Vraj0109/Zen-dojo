"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { HistoryButtons } from "./history-buttons";

// Whether the slim top bar is hidden on focus pages (Ctrl+Shift+B), remembered in this browser.
const BAR_KEY = "habit-bar-hidden";
const barListeners = new Set<() => void>();
const barHidden = () => {
  try {
    return localStorage.getItem(BAR_KEY) === "1";
  } catch {
    return false;
  }
};
const setBarHidden = (hidden: boolean) => {
  try {
    localStorage.setItem(BAR_KEY, hidden ? "1" : "0");
  } catch {
    // storage can be blocked; the bar is then only hidden until the page reloads
  }
  barListeners.forEach((l) => l());
};
const subscribeBar = (l: () => void) => {
  barListeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    barListeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

/** Pages where the work (a problem and its editor) should fill the window: the sidebar becomes a slim bar. */
export function isFocusPage(pathname: string | null): boolean {
  if (!pathname) return false;
  if (/^\/study\/packs\/[^/]+\/[^/]+$/.test(pathname)) return true;
  return /^\/dsa\/[^/]+$/.test(pathname) && !["/dsa/boss"].includes(pathname);
}

/**
 * Wraps the whole page. Normally: sidebar + content. On a problem page: a thin top bar (menu, back, forward) and the
 * sidebar slides in from the left on demand (button, or Ctrl+B), so the problem and the editor get the room.
 */
/** The pathname is unknown while prerendering a dynamic route, so the full layout is the fallback. */
export function Shell(props: { aside: ReactNode; children: ReactNode }) {
  return (
    <Suspense fallback={<FullShell {...props} />}>
      <ShellInner {...props} />
    </Suspense>
  );
}

function FullShell({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-full lg:flex">
      {aside}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function ShellInner({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const compact = isFocusPage(pathname);
  const [openFor, setOpenFor] = useState<string | null>(null);
  // The drawer belongs to one page: moving to another page closes it without an effect.
  const open = openFor === pathname;
  const hiddenBar = useSyncExternalStore(subscribeBar, barHidden, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOpenFor((o) => (o === pathname ? null : pathname));
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setBarHidden(!barHidden());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  if (!compact) return <FullShell aside={aside}>{children}</FullShell>;

  return (
    // The panes fill what is left under the bar: 28 px for the bar (nothing when it is hidden) on top of the old 8.5rem minus the old 40 px bar.
    <div className="shell-compact flex min-h-full flex-col" style={{ "--pane-h": hiddenBar ? "calc(100dvh - 6rem)" : "calc(100dvh - 7.75rem)" } as CSSProperties}>
      {hiddenBar ? (
        <button
          type="button"
          onClick={() => setBarHidden(false)}
          aria-label="Show the top bar"
          title="Show the top bar (Ctrl+Shift+B)"
          className="fixed inset-y-0 left-0 z-30 w-3 bg-transparent hover:bg-accent/30 focus-visible:bg-accent/40 print:hidden"
        />
      ) : (
        <div className="sticky top-0 z-30 flex h-7 items-center gap-1 border-b border-line bg-surface px-2 print:hidden">
          <button
            type="button"
            onClick={() => setOpenFor(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="shell-drawer"
            aria-label="Menu"
            title="Menu (Ctrl+B)"
            className="grid size-6 place-items-center rounded-md text-muted hover:bg-background hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="[&_button]:size-6 [&_button]:rounded-md [&_button]:border-0">
            <HistoryButtons />
          </div>
          <Link
            href={pathname?.startsWith("/study/") ? "/study" : "/dsa"}
            aria-label={pathname?.startsWith("/study/") ? "Back to Learn" : "Back to Practice"}
            title={pathname?.startsWith("/study/") ? "Back to Learn" : "Back to Practice"}
            className="grid size-6 place-items-center rounded-md text-sm text-muted hover:bg-background hover:text-foreground"
          >
            <span aria-hidden>↩</span>
          </Link>
          <button
            type="button"
            onClick={() => setBarHidden(true)}
            aria-label="Hide the top bar"
            title="Hide the top bar (Ctrl+Shift+B)"
            className="ml-auto grid size-6 place-items-center rounded-md text-muted hover:bg-background hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
        </div>
      )}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpenFor(null)}
        aria-hidden
      />
      <div
        id="shell-drawer"
        inert={!open}
        className={`drawer-panel fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto border-r border-line bg-surface shadow-xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {aside}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
