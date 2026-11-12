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
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
} as const;

export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Pages (besides `href` itself) that highlight this item. */
  matches: readonly string[];
};

// Five items: the daily list, practice, learning, review, and you. Everything else is a tab inside one of them.
export const MAIN: NavLink[] = [
  { href: "/", label: "Today", icon: "today", matches: ["/backlog"] },
  { href: "/dsa", label: "Practice", icon: "dsa", matches: ["/dsa"] },
  { href: "/study", label: "Learn", icon: "learn", matches: ["/study"] },
  { href: "/review", label: "Review", icon: "review", matches: ["/review", "/revise"] },
];

// Less-visited pages sit at the bottom of the sidebar (end of the bar on phones).
export const SECONDARY: NavLink[] = [{ href: "/profile", label: "Profile", icon: "profile", matches: ["/profile", "/roadmap"] }];

/** True when `pathname` is `base` or inside it. */
const within = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

/** Which nav item a path belongs to (exported for tests). */
export function isActive(link: Pick<NavLink, "href" | "matches">, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (link.href === "/" && pathname === "/") return true;
  return link.matches.some((m) => within(pathname, m));
}

export function Icon({ name, className = "size-[18px]" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Main nav with the current page highlighted. Render inside <Suspense fallback={<NavLinks pathname={null} />}>:
 * on routes with request-time params (e.g. /dsa/[id]) the pathname isn't known while prerendering. */
export function Nav() {
  return <NavLinks pathname={usePathname()} />;
}

/** The Profile link at the bottom of the sidebar (wide screens). On phones Profile is the last item of the top bar. */
export function NavFooter({ account }: { account?: ReactNode }) {
  return <NavFooterLinks pathname={usePathname()} account={account} />;
}

function ProfileName({ fallback }: { fallback: string }) {
  const p = useProfile();
  return <span className="truncate">{p.name || fallback}</span>;
}

function NavItem({ link, pathname, extra = "" }: { link: NavLink; pathname: string | null; extra?: string }) {
  const active = isActive(link, pathname);
  return (
    <li className={`shrink-0 ${extra}`}>
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          active ? "bg-accent/12 text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent" : "text-muted hover:bg-background hover:text-foreground"
        }`}
      >
        {link.icon === "profile" ? (
          <Avatar className="size-[22px] text-[11px]" />
        ) : (
          <span className={active ? "text-accent" : ""}>
            <Icon name={link.icon} />
          </span>
        )}
        {link.icon === "profile" ? <ProfileName fallback={link.label} /> : link.label}
      </Link>
    </li>
  );
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="-mx-1 overflow-x-auto px-1 max-md:hidden lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {MAIN.map((l) => (
          <NavItem key={l.href} link={l} pathname={pathname} />
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
  // and pill remain as the fallback while it loads.
  if (account) {
    return <div className="hidden border-t border-line pt-3 lg:block">{account}</div>;
  }
  return (
    <ul className="hidden flex-col gap-1 border-t border-line pt-3 lg:flex">
      {SECONDARY.map((l) => (
        <NavItem key={l.href} link={l} pathname={pathname} />
      ))}
      <li className="pt-2">
        <SyncStatusPill className="w-full justify-between" />
      </li>
    </ul>
  );
}
