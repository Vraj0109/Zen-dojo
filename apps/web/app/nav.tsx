"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { FOCUS_SESSION_ID, clock, remainingAt } from "./timer-math";
import { SlidingPill } from "./sliding-pill";
import { SessionControls } from "./start-timer";
import { timer, useFocusTimer } from "./timer-store";

// Icons from Material 3 Expressive spec (XRail.dc.html & XNavBar.dc.html)
export const ICONS = {
  today: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  practice: "m8 6-6 6 6 6M16 6l6 6-6 6",
  dsa: "m8 6-6 6 6 6M16 6l6 6-6 6",
  learn: "M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z",
  review: "M20 12a8 8 0 1 1-2.3-5.7L20 8M20 3v5h-5",
  roadmap: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  you: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
} as const;

export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Pages (besides `href` itself) that highlight this item. */
  matches: readonly string[];
};

export const MAIN: NavLink[] = [
  { href: "/", label: "Today", icon: "today", matches: ["/backlog"] },
  { href: "/dsa", label: "Practice", icon: "practice", matches: ["/dsa"] },
  { href: "/study", label: "Learn", icon: "learn", matches: ["/study"] },
  { href: "/review", label: "Review", icon: "review", matches: ["/review", "/revise"] },
];

export const ROADMAP: NavLink = { href: "/roadmap", label: "Roadmap", icon: "roadmap", matches: ["/roadmap"] };

/** The 5 rail links on desktop: Today, Practice, Learn, Review, Roadmap */
export const SIDEBAR: NavLink[] = [...MAIN, ROADMAP];

export const SECONDARY: NavLink[] = [{ href: "/profile", label: "Profile", icon: "profile", matches: ["/profile"] }];

/** Phone navigation bar (5 items): Today, Practice, Learn, Review, You */
export const TABS: NavLink[] = [...MAIN, { href: "/profile", label: "You", icon: "you", matches: ["/profile", "/profile/settings", "/profile/account", "/roadmap"] }];

export type NavCounts = Partial<Record<string, ReactNode>>;

const within = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

export function isActive(link: Pick<NavLink, "href" | "matches">, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (link.href === "/" && pathname === "/") return true;
  return link.matches.some((m) => within(pathname, m));
}

export function tabTitle(pathname: string | null): string | null {
  return TABS.find((l) => isActive(l, pathname))?.label ?? null;
}

export function Icon({ name, active = false, className = "size-6" }: { name: keyof typeof ICONS; active?: boolean; className?: string }) {
  const path = ICONS[name] ?? ICONS.today;
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * Focus FAB: 56px, rounded-[18px], reward-soft. Play icon when no session runs, the countdown while one does (tap to
 * pause), a check for a few seconds after a session ends by itself. The state clears at 0 (see finishSession).
 */
export function FocusFab() {
  const { state, running, now, done } = useFocusTimer();
  // The popover shows while a session runs or is paused. It is anchored to the FAB's top edge (fixed, so the rail's
  // overflow never clips it).
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(16);
  const fabRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const showMenu = open && state !== null;

  const onClick = () => {
    if (state) {
      const rect = fabRef.current?.getBoundingClientRect();
      if (rect) setTop(Math.max(16, Math.min(rect.top, window.innerHeight - 320)));
      setOpen((o) => !o);
      return;
    }
    setOpen(false);
    timer.start({ itemId: FOCUS_SESSION_ID, label: "Focus session", href: "/", targetMinutes: 25 });
  };

  // Outside click and Esc close the popover, as the account menu does. While a confirm dialog is open (Discard), both
  // are left to that dialog.
  useEffect(() => {
    if (!showMenu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || fabRef.current?.contains(target)) return;
      if (document.querySelector("dialog[open]")) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      setOpen(false);
      fabRef.current?.focus();
    };
    // Focus moves into the popover (its first control) so the keyboard can reach it straight away.
    menuRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showMenu]);

  const remaining = state ? remainingAt(state, now) : 0;
  const label = state
    ? `Focus timer: ${clock(remaining)} left, ${running ? "running" : "paused"}. Open timer controls.`
    : done
      ? "Focus session done. Start another."
      : "Start a focus session";

  return (
    <>
    <button
      ref={fabRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-haspopup={state ? "dialog" : undefined}
      aria-expanded={state ? showMenu : undefined}
      title={state ? `Focus timer: ${clock(remaining)} left` : done ? "Session done" : "Start a focus session (25 min)"}
      className="grid size-14 place-items-center rounded-[18px] bg-reward-soft text-on-reward-soft shadow-xs transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {state ? (
        <span className="font-mono text-xs font-semibold tabular-nums">{clock(remaining)}</span>
      ) : done ? (
        <svg viewBox="0 0 24 24" className="size-6 animate-[zd-pop-in_0.32s_var(--ease-spring)_both]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
      <span role="status" className="sr-only">
        {done && !state ? "Focus session done" : ""}
      </span>
    </button>
      {showMenu && state && (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Focus timer"
          style={{ top }}
          className="anim-pop fixed left-[104px] z-50 flex w-72 flex-col gap-4 rounded-[28px] border border-line bg-surface p-5 text-foreground shadow-menu dark:border-line-strong"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" title={state.label}>
              {state.label}
            </p>
            <p className="text-xs text-muted">
              {running ? "Running" : "Paused"} · {state.targetMinutes} min session
            </p>
          </div>
          <p className="font-mono text-4xl font-semibold tabular-nums" role="timer" aria-live="off" aria-label={`${clock(remaining)} left`}>
            {clock(remaining)}
          </p>
          <SessionControls onClose={() => { setOpen(false); fabRef.current?.focus(); }} />
        </div>
      )}
    </>
  );
}

/** 96px navigation rail for desktop: ZD logo, Focus FAB, 5 items, avatar at bottom. */
function NavRailInner({ counts, account, pathname }: { counts?: NavCounts; account?: ReactNode; pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="flex h-full w-24 shrink-0 flex-col items-center gap-4 bg-background py-5 text-foreground max-md:hidden print:hidden"
    >
      {/* ZD logo: 40px rounded square in primary */}
      <Link
        href="/"
        aria-label="Zen Dojo, Today"
        className="grid size-10 place-items-center rounded-[14px] bg-primary text-[15px] font-semibold text-on-primary transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-primary"
      >
        ZD
      </Link>

      {/* Focus FAB */}
      <FocusFab />

      {/* Five items: Today, Practice, Learn, Review, Roadmap */}
      <SlidingPill className="mt-2 flex flex-col items-center gap-3" target=":scope > span:first-child" pillClassName="h-8 w-14 rounded-full bg-primary-soft">
        {SIDEBAR.map((item) => {
          const active = isActive(item, pathname);
          const count = counts?.[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex w-20 flex-col items-center gap-1 text-center no-underline transition-colors ${
                active ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${
                  active ? "bg-primary-soft text-primary" : "text-muted group-hover:bg-surface-2 group-hover:text-foreground"
                }`}
              >
                <Icon name={item.icon} active={active} className="size-6" />
                {item.href === "/review" && count && (
                  // `count` is a streamed node that renders nothing when no review is due: :empty hides the badge then.
                  <span className="absolute -top-0.5 right-2 h-4 min-w-4 rounded-full bg-danger-soft px-1 text-center text-[12px] leading-4 font-semibold text-on-danger-soft empty:hidden [&>span]:ml-0 [&>span]:text-on-danger-soft!">
                    {count}
                  </span>
                )}
              </span>
              <span className={`text-[12px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </SlidingPill>

      {/* Bottom avatar trigger (Account menu) */}
      <div className="mt-auto">
        {account}
      </div>
    </nav>
  );
}

function NavRailDynamic({ counts, account }: { counts?: NavCounts; account?: ReactNode }) {
  const pathname = usePathname();
  return <NavRailInner counts={counts} account={account} pathname={pathname} />;
}

export function NavRail({ counts, account, pathname }: { counts?: NavCounts; account?: ReactNode; pathname?: string | null }) {
  if (pathname !== undefined) {
    return <NavRailInner counts={counts} account={account} pathname={pathname} />;
  }
  return (
    <Suspense fallback={<NavRailInner counts={counts} account={account} pathname={null} />}>
      <NavRailDynamic counts={counts} account={account} />
    </Suspense>
  );
}

/** Phone navigation bar (below `md`): 5 items including You */
export function PhoneNavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line dark:border-0 bg-surface-2 px-1 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden print:hidden"
    >
      <SlidingPill className="grid grid-cols-5" target=":scope > span:first-child" pillClassName="rounded-full bg-primary-soft">
        {TABS.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center gap-1 text-center no-underline transition-colors ${
                active ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`grid h-8 w-16 place-items-center rounded-full transition-colors ${
                  active ? "bg-primary-soft text-primary" : "text-muted"
                }`}
              >
                <Icon name={item.icon} active={active} className="size-6" />
              </span>
              <span className={`text-[12px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </SlidingPill>
    </nav>
  );
}

/** Legacy helpers preserved for backward compatibility */
export function Nav({ counts }: { counts?: NavCounts }) {
  return <NavRail counts={counts} />;
}

export function NavLinks({ counts }: { pathname?: string | null; counts?: NavCounts }) {
  return <NavRail counts={counts} />;
}

export function NavFooter({ account }: { account?: ReactNode }) {
  return account ?? null;
}

export function NavFooterLinks({ account }: { pathname?: string | null; account?: ReactNode }) {
  return account ?? null;
}
