"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { HistoryButtons } from "./history-buttons";

/** Pages where the work (a problem and its editor) should fill the window: the sidebar becomes a slim bar. */
export function isFocusPage(pathname: string | null): boolean {
  if (!pathname) return false;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOpenFor((o) => (o === pathname ? null : pathname));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  if (!compact) return <FullShell aside={aside}>{children}</FullShell>;

  return (
    <div className="shell-compact flex min-h-full flex-col">
      <div className="sticky top-0 z-30 flex h-10 items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur print:hidden">
        <button
          type="button"
          onClick={() => setOpenFor(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="shell-drawer"
          aria-label="Menu"
          title="Menu (Ctrl+B)"
          className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:bg-background hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <HistoryButtons />
        <Link href="/dsa" className="ml-1 text-sm text-muted hover:text-foreground">
          ← Practice
        </Link>
        <span className="ml-auto text-xs text-muted">Prepwise</span>
      </div>
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
