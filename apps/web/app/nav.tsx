"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, useProfile } from "./custom-appearance";
import { SyncStatusPill } from "./components/sync-status";

// Icons: 24x24 stroke paths (lucide-style), drawn in currentColor.
export const ICONS = {
  today: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 16l2 2 4-4",
  review: "M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5",
  dsa: "m16 18 6-6-6-6M8 6l-6 6 6 6",
  learn: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM6.5 10v4a2 2 0 0 0 2 2H14",
  roadmap: "M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
} as const;

export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Pages (besides `href` itself) that highlight this item. */
  matches: readonly string[];
};

// The daily list, practice, learning and review: in the sidebar and in the phone tab bar.
export const MAIN: NavLink[] = [
  { href: "/", label: "Today", icon: "today", matches: ["/backlog"] },
  { href: "/dsa", label: "Practice", icon: "dsa", matches: ["/dsa"] },
  { href: "/study", label: "Learn", icon: "learn", matches: ["/study"] },
  { href: "/review", label: "Review", icon: "review", matches: ["/review", "/revise"] },
];

/** Fifth sidebar item on wide screens (DESIGN.md sidebar). On phones Roadmap is inside the You tab. */
export const ROADMAP: NavLink = { href: "/roadmap", label: "Roadmap", icon: "roadmap", matches: ["/roadmap"] };

/** The sidebar list: Today, Practice, Learn, Review, Roadmap. */
export const SIDEBAR: NavLink[] = [...MAIN, ROADMAP];

// Profile: the account row at the bottom of the sidebar, the end of the tablet top bar, "You" on phones.
export const SECONDARY: NavLink[] = [{ href: "/profile", label: "Profile", icon: "profile", matches: ["/profile"] }];

/** Phone tab bar: Today, Practice, Learn, Review, You (You also covers Roadmap). */
export const TABS: NavLink[] = [...MAIN, { ...SECONDARY[0], label: "You", matches: ["/profile", "/roadmap"] }];

/** Counts shown beside nav items, by href (e.g. reviews due beside Review). Server-rendered nodes. */
export type NavCounts = Partial<Record<string, ReactNode>>;

/** True when `pathname` is `base` or inside it. */
const within = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

/** Which nav item a path belongs to (exported for tests). */
export function isActive(link: Pick<NavLink, "href" | "matches">, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (link.href === "/" && pathname === "/") return true;
  return link.matches.some((m) => within(pathname, m));
}

/** The tab a path belongs to, for the phone header title. */
export function tabTitle(pathname: string | null): string | null {
  return TABS.find((l) => isActive(l, pathname))?.label ?? null;
}

export function Icon({ name, className = "size-4" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Main nav with the current page highlighted. Render inside <Suspense fallback={<NavLinks pathname={null} />}>:
 * on routes with request-time params (e.g. /dsa/[id]) the pathname isn't known while prerendering. */
export function Nav({ counts }: { counts?: NavCounts }) {
  return <NavLinks pathname={usePathname()} counts={counts} />;
}

/** The account row at the bottom of the sidebar (wide screens). */
export function NavFooter({ account }: { account?: ReactNode }) {
  return <NavFooterLinks pathname={usePathname()} account={account} />;
}

function ProfileName({ fallback }: { fallback: string }) {
  const p = useProfile();
  return <span className="truncate">{p.name || fallback}</span>;
}

function NavItem({ link, pathname, extra = "", count }: { link: NavLink; pathname: string | null; extra?: string; count?: ReactNode }) {
  const active = isActive(link, pathname);
  return (
    <li className={`shrink-0 ${extra}`}>
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-120 ease-dojo ${
          active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface hover:text-foreground"
        }`}
      >
        {link.icon === "profile" ? <Avatar className="size-5 text-[10px]" /> : <Icon name={link.icon} />}
        {link.icon === "profile" ? <ProfileName fallback={link.label} /> : link.label}
        {count}
      </Link>
    </li>
  );
}

export function NavLinks({ pathname, counts }: { pathname: string | null; counts?: NavCounts }) {
  return (
    <nav aria-label="Main" className="-mx-1 overflow-x-auto px-1 max-md:hidden lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
        {SIDEBAR.map((l) => (
          <NavItem key={l.href} link={l} pathname={pathname} count={counts?.[l.href]} />
        ))}
        <li aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-line lg:hidden" />
        {SECONDARY.map((l) => (
          <NavItem key={l.href} link={l} pathname={pathname} extra="lg:hidden" />
        ))}
      </ul>
    </nav>
  );
}

export function NavFooterLinks({ pathname, account }: { pathname: string | null; account?: ReactNode }) {
  // With the account area (signed in or out), the profile button and sync status live in it. The plain Profile link
  // and sync icon remain as the fallback while it loads.
  if (account) {
    return <div className="hidden border-t border-line pt-2 lg:block">{account}</div>;
  }
  return (
    <div className="hidden items-center gap-1 border-t border-line pt-2 lg:flex">
      <ul className="min-w-0 flex-1">
        {SECONDARY.map((l) => (
          <NavItem key={l.href} link={l} pathname={pathname} />
        ))}
      </ul>
      <SyncStatusPill compact />
    </div>
  );
}
