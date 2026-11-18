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
import { BottomNav } from "./components/bottom-nav";
import { StudyModeSuggestion } from "./components/phone-study";
import { Logo } from "./logo";
import { tabTitle } from "./nav";

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

const BAR_PAD = "max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]";

/** Phones: the page's tab name and the streak chip, above the content. The tab bar at the bottom does the navigating. */
function PhoneHeader({ pathname, streak }: { pathname: string | null; streak?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden print:hidden">
      <Link href="/" aria-label="Zen Dojo, Today" className="shrink-0">
        <Logo className="size-7" />
      </Link>
      <p className="min-w-0 flex-1 truncate text-lg font-semibold">{tabTitle(pathname) ?? "Zen Dojo"}</p>
      {streak}
    </header>
  );
}

function FullShell({ aside, children, pathname = null, streak, notice }: ShellProps & { pathname?: string | null }) {
  return (
    <div className={`min-h-full lg:flex ${BAR_PAD}`}>
      {aside}
      <div className="flex min-w-0 flex-1 flex-col">
        <PhoneHeader pathname={pathname} streak={streak} />
        {notice}
        {/* Back and forward stay one click away on wide screens (the desktop app has no browser buttons). */}
        <div className="flex h-10 items-center px-6 max-md:hidden lg:px-10 print:hidden [&_button]:size-7 [&_button]:rounded-md [&_button]:border-0">
          <HistoryButtons />
        </div>
        <StudyModeSuggestion />
        {children}
      </div>
      <BottomNav pathname={pathname} />
    </div>
  );
}

function ShellInner({ aside, children, account, streak, notice }: ShellProps) {
  const pathname = usePathname();
  const compact = isFocusPage(pathname);
  const [openFor, setOpenFor] = useState<string | null>(null);
  // The drawer belongs to one page: moving to another page closes it without an effect.
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

  // Plan 0075: one appearance record (theme fields plus the custom palette), newest wins by its `at` stamp. Runs on
  // mount, when the tab becomes visible, after a sync pulled rows, and every 60 s while visible. Guests on the hosted
  // site skip the server entirely: their theme stays in this browser.
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

    // A change made here (theme picker, custom colours): stamp it and push. Changes we applied ourselves are ignored.
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

  if (!compact)
    return (
      <FullShell aside={aside} pathname={pathname} streak={streak} notice={notice}>
        {children}
      </FullShell>
    );

  return (
    <div className={`shell-compact flex min-h-full flex-col [--pane-h:calc(100dvh-7.75rem)] max-md:[--pane-h:calc(100dvh-11.25rem)] ${BAR_PAD}`}>
      <div className="sticky top-0 z-30 flex h-7 items-center gap-1 max-md:h-12 border-b border-line bg-surface px-2 print:hidden">
        <button
          type="button"
          onClick={() => setOpenFor(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="shell-drawer"
          aria-label="Menu"
          title="Menu (Ctrl+B)"
          className="grid size-6 place-items-center rounded-md text-muted hover:bg-background hover:text-foreground max-md:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="[&_button]:size-6 [&_button]:rounded-md [&_button]:border-0 max-md:hidden">
          <HistoryButtons />
        </div>
        <Link
          href={pathname?.startsWith("/study/") ? "/study" : "/dsa"}
          aria-label={pathname?.startsWith("/study/") ? "Back to Learn" : "Back to Practice"}
          title={pathname?.startsWith("/study/") ? "Back to Learn" : "Back to Practice"}
          className="grid size-6 place-items-center rounded-md text-sm text-muted hover:bg-background hover:text-foreground max-md:flex max-md:h-10 max-md:w-auto max-md:items-center max-md:gap-2 max-md:px-2"
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
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors max-md:hidden ${
            zen ? "bg-accent text-on-accent" : "text-muted hover:bg-background hover:text-foreground"
          }`}
        >
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-current" />
          <span>Zen</span>
        </button>
        {zen && <span className="text-[11px] text-muted italic ml-1 max-md:hidden">focus mode (Esc to exit)</span>}
        <div className="ml-auto flex items-center gap-1.5 max-md:hidden max-md:[&_button]:min-h-10 max-md:[&_button]:min-w-10 max-md:[&_a]:flex max-md:[&_a]:min-h-10 max-md:[&_a]:items-center">
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
        className={`drawer-panel fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto border-r border-line bg-surface shadow-xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {aside}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <StudyModeSuggestion />
        {children}
      </div>
      {!zen && <BottomNav pathname={pathname} />}
    </div>
  );
}
