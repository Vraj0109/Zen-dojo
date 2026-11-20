"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { APPEARANCE_AT_KEY, THEME_EVENT, appearanceDecision, applyTheme, readStoredAppearance, sameAppearance, type Appearance } from "@/lib/theme";
import { CUSTOM_EVENT } from "@/lib/custom";
import { SYNC_PULLED_EVENT } from "@/lib/sync-manager";
import { setAppearanceSyncPaused } from "@/lib/appearance-sync-state";
import { getZenMode, initZenMode, setZenMode, subscribeZen, toggleZenMode } from "@/lib/zen-mode";
import { getAppearanceAction, getSyncAccountStateAction, setAppearanceAction } from "./actions";
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

/** First thing in the tab order: lets keyboard users jump past the rail to the page. Visible only while focused. */
function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[100] focus-visible:inline-flex focus-visible:h-11 focus-visible:items-center focus-visible:rounded-full focus-visible:bg-primary focus-visible:px-5 focus-visible:text-sm focus-visible:font-medium focus-visible:text-on-primary focus-visible:shadow-menu focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      Skip to main content
    </a>
  );
}

const BAR_PAD = "max-md:pb-[calc(5rem+env(safe-area-inset-bottom))]";

/** FullShell: the fixed frame. From md up the 96px rail never scrolls and <main> is the only scroll area (an
 *  inline-size container, so pages size their side panels by the content width). Phones scroll the window. */
function FullShell({ aside, children, pathname = null, notice }: ShellProps & { pathname?: string | null }) {
  return (
    <div className={`md:flex md:h-dvh md:overflow-clip print:block print:h-auto print:overflow-visible ${BAR_PAD}`}>
      <SkipLink />
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

function ShellInner({ aside, children, notice }: ShellProps) {
  const pathname = usePathname();
  const compact = isFocusPage(pathname);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const zen = useSyncExternalStore(subscribeZen, getZenMode, () => false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Drawer focus: move into it when it opens, give focus back to whatever opened it when it closes.
  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      drawerRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    } else if (returnFocus.current) {
      returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [open]);

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
        <SkipLink />
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

  // Focus pages (a problem and its editor): the workspace has its own header with a back button, so from md up there is
  // no bar here and the nav drawer opens with Ctrl+B. Phones get a slim bar with just the way back.
  const backToLearn = pathname?.startsWith("/study/");
  return (
    <div className={`shell-compact flex min-h-full flex-col md:h-dvh md:overflow-hidden [--pane-h:calc(100dvh-7.75rem)] max-md:[--pane-h:calc(100dvh-11.25rem)] ${BAR_PAD}`}>
      <SkipLink />
      <div
        inert={open}
        className="sticky top-0 z-30 flex h-12 items-center gap-1 border-b border-line dark:border-0 bg-surface px-3 print:hidden md:hidden"
      >
        <Link
          href={backToLearn ? "/study" : "/dsa"}
          aria-label={backToLearn ? "Back to Learn" : "Back to Practice"}
          className="flex h-11 items-center gap-2 rounded-full px-3 text-sm text-muted hover:bg-background hover:text-foreground"
        >
          <span aria-hidden>↩</span>
          <span className="text-sm font-medium">{backToLearn ? "Learn" : "Practice"}</span>
        </Link>
        {zen && <span className="ml-auto text-xs text-muted italic">Focus mode (Esc to exit)</span>}
      </div>
      <div
        className={`fixed inset-0 z-40 bg-foreground/40 transition-opacity duration-200 ease-[var(--ease-spring-soft)] ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpenFor(null)}
        aria-hidden
      />
      <div
        id="shell-drawer"
        ref={drawerRef}
        inert={!open}
        className={`drawer-panel fixed inset-y-0 left-0 z-50 w-24 overflow-y-auto border-r border-line bg-surface shadow-menu transition-transform duration-200 ease-[var(--ease-spring-soft)] ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {aside}
      </div>
      <main id="main" inert={open} className="flex min-w-0 flex-1 flex-col overflow-y-auto @container">
        <StudyModeSuggestion />
        {children}
      </main>
      {!zen && <PhoneNavBar pathname={pathname} />}
      <ShortcutsSheet />
    </div>
  );
}
