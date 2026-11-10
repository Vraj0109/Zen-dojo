"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { THEME_EVENT, applyTheme, readStoredAppearance } from "@/lib/theme";
import { getZenMode, initZenMode, setZenMode, subscribeZen, toggleZenMode } from "@/lib/zen-mode";
import { getAppearanceAction, setAppearanceAction } from "./actions";
import { HistoryButtons } from "./history-buttons";

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
  const zen = useSyncExternalStore(subscribeZen, getZenMode, () => false);

  useEffect(() => {
    initZenMode();
    try {
      localStorage.removeItem("habit-bar-hidden");
    } catch {
      // storage blocked
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function syncAppearance() {
      try {
        const local = readStoredAppearance();
        const server = await getAppearanceAction();
        if (cancelled) return;
        if (!local && server) {
          applyTheme(server);
        } else if (local && !server) {
          await setAppearanceAction(local);
        } else if (local && server) {
          const diff =
            local.mode !== server.mode ||
            local.accent !== server.accent ||
            local.style !== server.style ||
            local.font !== server.font ||
            local.gamify !== server.gamify ||
            local.bionic !== server.bionic ||
            local.motion !== server.motion;
          if (diff) {
            applyTheme(server);
          }
        }
      } catch {
        // storage or network error
      }
    }
    syncAppearance();

    const onThemeChange = () => {
      const cur = readStoredAppearance();
      if (cur) {
        setAppearanceAction(cur).catch(() => {});
      }
    };
    window.addEventListener(THEME_EVENT, onThemeChange);
    return () => {
      cancelled = true;
      window.removeEventListener(THEME_EVENT, onThemeChange);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenFor(null);
        if (getZenMode()) setZenMode(false);
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOpenFor((o) => (o === pathname ? null : pathname));
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        toggleZenMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  if (!compact) return <FullShell aside={aside}>{children}</FullShell>;

  return (
    <div className="shell-compact flex min-h-full flex-col" style={{ "--pane-h": "calc(100dvh - 7.75rem)" } as CSSProperties}>
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
          onClick={toggleZenMode}
          aria-pressed={zen}
          aria-label="Zen mode"
          title="Zen mode: focus purely on problem and code (Ctrl+Shift+Z)"
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors ${
            zen ? "bg-accent text-on-accent" : "text-muted hover:bg-background hover:text-foreground"
          }`}
        >
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-current" />
          <span>Zen</span>
        </button>
        {zen && <span className="text-[11px] text-muted italic ml-1">focus mode (Esc to exit)</span>}
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
