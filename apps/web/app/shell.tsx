"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { APPEARANCE_AT_KEY, THEME_EVENT, appearanceDecision, applyTheme, readStoredAppearance, sameAppearance, type Appearance } from "@/lib/theme";
import { CUSTOM_EVENT } from "@/lib/custom";
import { SYNC_PULLED_EVENT } from "@/lib/sync-manager";
import { setAppearanceSyncPaused } from "@/lib/appearance-sync-state";
import { getZenMode, initZenMode, setZenMode, subscribeZen, toggleZenMode } from "@/lib/zen-mode";
import { getAppearanceAction, getSyncAccountStateAction, setAppearanceAction } from "./actions";
import { HistoryButtons } from "./history-buttons";
import { SyncStatusPill } from "./components/sync-status";
import { PhoneNavBar } from "./nav";
import { ShortcutsSheet } from "./components/shortcuts-sheet";
import { StudyModeSuggestion } from "./components/phone-study";

/** Pages where the work (a problem and its editor) should fill the window: the sidebar becomes a slim bar. */
export function isFocusPage(pathname: string | null): boolean {
  if (!pathname) return false;
  if (/^\/study\/packs\/[^/]+\/[^/]+$/.test(pathname)) return true;
  return /^\/dsa\/[^/]+$/.test(pathname) && !["/dsa/boss"].includes(pathname);
}

type ShellProps = {
  aside: ReactNode;
  children: ReactNode;
  account?: ReactNode;
  /** Streak chip for the phone header (server-rendered, streams in). */
  streak?: ReactNode;
  /** Slim notice bar at the top of the content area (the guest notice). */
  notice?: ReactNode;
};

export function Shell(props: ShellProps) {
  return (
    <Suspense fallback={<FullShell {...props} />}>
      <ShellInner {...props} />
    </Suspense>
  );
}

const BAR_PAD = "max-md:pb-[calc(5rem+env(safe-area-inset-bottom))]";

/** FullShell: the fixed frame. From md up the 96px rail never scrolls and <main> is the only scroll area (an
 *  inline-size container, so pages size their side panels by the content width). Phones scroll the window. */
function FullShell({ aside, children, pathname = null, notice }: ShellProps & { pathname?: string | null }) {
  return (
    <div className={`md:flex md:h-dvh md:overflow-clip print:block print:h-auto print:overflow-visible ${BAR_PAD}`}>
      {aside}
      <main
        id="main"
        className="@container flex min-w-0 flex-1 flex-col md:h-dvh md:overflow-x-hidden md:overflow-y-auto md:overscroll-contain md:[scrollbar-gutter:stable] print:h-auto print:overflow-visible"
      >
        {notice}
        <StudyModeSuggestion />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </main>
      <PhoneNavBar pathname={pathname} />
      <ShortcutsSheet />
    </div>
  );
}

function ShellInner({ aside, children, account, notice }: ShellProps) {
  const pathname = usePathname();
  const compact = isFocusPage(pathname);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const zen = useSyncExternalStore(subscribeZen, getZenMode, () => false);

  useEffect(() => {
    initZenMode();
    // Phones have no Zen mode: it would only hide the tab bar, and the toggle is not shown there.
    if (window.matchMedia("(max-width: 767px)").matches && getZenMode()) setZenMode(false);
    try {
      localStorage.removeItem("habit-bar-hidden");
    } catch {
      // storage blocked
    }
  }, []);

  // Theme sync effect
  useEffect(() => {
    let cancelled = false;
    let guest: boolean | null = null;
    let applying = false;
    let busy = false;
    let last: Appearance | null = readStoredAppearance();

    const readAt = (): number | null => {
      try {
        const v = localStorage.getItem(APPEARANCE_AT_KEY);
        const n = v === null ? NaN : Number(v);
        return Number.isFinite(n) ? n : null;
      } catch {
        return null;
      }
    };
    const writeAt = (at: number) => {
      try {
        localStorage.setItem(APPEARANCE_AT_KEY, String(at));
      } catch {
        // blocked
      }
    };

    async function push(prefs: Appearance, at: number) {
      const r = await setAppearanceAction(prefs, at);
      setAppearanceSyncPaused(!r.ok);
    }

    async function syncAppearance() {
      if (busy || cancelled) return;
      busy = true;
      try {
        if (guest === null) guest = (await getSyncAccountStateAction()) === "guest";
        if (guest || cancelled) return;
        const local = readStoredAppearance();
        const server = await getAppearanceAction();
        if (cancelled) return;
        setAppearanceSyncPaused(server === "error");
        const decision = appearanceDecision(local, readAt(), server);
        if (decision === "apply" && server && server !== "error") {
          applying = true;
          try {
            applyTheme(server.prefs);
            window.dispatchEvent(new Event(CUSTOM_EVENT));
          } finally {
            applying = false;
          }
          writeAt(server.at);
          last = readStoredAppearance();
        } else if (decision === "push" && local) {
          await push(local, readAt() ?? Date.now());
        }
      } catch {
        setAppearanceSyncPaused(true);
      } finally {
        busy = false;
      }
    }
    void syncAppearance();

    const onLocalChange = () => {
      if (applying) return;
      const cur = readStoredAppearance();
      if (!cur || (last && sameAppearance(cur, last) && cur.customTheme === last.customTheme)) return;
      last = cur;
      const at = Date.now();
      writeAt(at);
      if (guest === false) push(cur, at).catch(() => setAppearanceSyncPaused(true));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncAppearance();
    };
    const onPulled = () => void syncAppearance();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncAppearance();
    }, 60_000);
    window.addEventListener(THEME_EVENT, onLocalChange);
    window.addEventListener(CUSTOM_EVENT, onLocalChange);
    window.addEventListener(SYNC_PULLED_EVENT, onPulled);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(THEME_EVENT, onLocalChange);
      window.removeEventListener(CUSTOM_EVENT, onLocalChange);
      window.removeEventListener(SYNC_PULLED_EVENT, onPulled);
      document.removeEventListener("visibilitychange", onVisible);
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

  // Sign in is a page of its own (Form (auth) pattern): no rail and no nav bar.
  if (pathname === "/login") {
    return (
      <div className="min-h-dvh md:h-dvh md:overflow-y-auto">
        <main id="main" className="min-h-dvh">
          {children}
        </main>
        <ShortcutsSheet />
      </div>
    );
  }

  if (!compact) {
    return (
      <FullShell aside={aside} pathname={pathname} notice={notice}>
        {children}
      </FullShell>
    );
  }

  return (
    <div className={`shell-compact flex min-h-full flex-col md:h-dvh md:overflow-hidden [--pane-h:calc(100dvh-7.75rem)] max-md:[--pane-h:calc(100dvh-11.25rem)] ${BAR_PAD}`}>
      <div className="sticky top-0 z-30 flex h-9 items-center gap-1 max-md:h-12 border-b border-line dark:border-0 bg-surface px-3 print:hidden md:hidden">
        <button
          type="button"
          onClick={() => setOpenFor(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="shell-drawer"
          aria-label="Menu"
          title="Menu (Ctrl+B)"
          className="grid size-8 place-items-center rounded-full text-muted hover:bg-background hover:text-foreground max-md:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="[&_button]:size-8 [&_button]:rounded-full [&_button]:border-0 max-md:hidden">
          <HistoryButtons />
        </div>
        <Link
          href={pathname?.startsWith("/study/") ? "/study" : "/dsa"}
          aria-label={pathname?.startsWith("/study/") ? "Back to Learn" : "Back to Practice"}
          title={pathname?.startsWith("/study/") ? "Back to Learn" : "Back to Practice"}
          className="grid size-8 place-items-center rounded-full text-sm text-muted hover:bg-background hover:text-foreground max-md:flex max-md:h-10 max-md:w-auto max-md:items-center max-md:gap-2 max-md:px-2"
        >
          <span aria-hidden>↩</span>
          <span className="hidden text-sm font-medium max-md:inline">{pathname?.startsWith("/study/") ? "Learn" : "Practice"}</span>
        </Link>
        <button
          type="button"
          onClick={toggleZenMode}
          aria-pressed={zen}
          aria-label="Zen mode"
          title="Zen mode: focus purely on problem and code (Ctrl+Shift+Z)"
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors max-md:hidden ${
            zen ? "bg-accent text-on-accent" : "text-muted hover:bg-background hover:text-foreground"
          }`}
        >
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-current" />
          <span>Zen</span>
        </button>
        {zen && <span className="text-[11px] text-muted italic ml-1 max-md:hidden">focus mode (Esc to exit)</span>}
        <div className="ml-auto flex items-center gap-1.5 max-md:hidden">
          <SyncStatusPill compact />
          {account}
        </div>
      </div>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpenFor(null)}
        aria-hidden
      />
      <div
        id="shell-drawer"
        inert={!open}
        className={`drawer-panel fixed inset-y-0 left-0 z-50 w-24 overflow-y-auto border-r border-line bg-surface shadow-menu transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {aside}
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto @container">
        <StudyModeSuggestion />
        {children}
      </div>
      {!zen && <PhoneNavBar pathname={pathname} />}
      <ShortcutsSheet />
    </div>
  );
}
