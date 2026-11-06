"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Icons: 24x24 stroke paths (lucide-style), drawn in currentColor.
const ICONS = {
  today: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 16l2 2 4-4",
  dsa: "m16 18 6-6-6-6M8 6l-6 6 6 6",
  sd: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM6.5 10v4a2 2 0 0 0 2 2H14",
  lld: "M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5",
  core: "M5 5h14v14H5zM9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4",
  roadmap: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
} as const;

type NavLink = { href: string; label: string; icon: keyof typeof ICONS };

const MAIN: NavLink[] = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/dsa", label: "DSA", icon: "dsa" },
  { href: "/study/sd", label: "System design", icon: "sd" },
  { href: "/study/lld", label: "LLD", icon: "lld" },
  { href: "/study/core", label: "Core CS", icon: "core" },
];

// Less-visited pages sit at the bottom of the sidebar (end of the bar on phones).
const SECONDARY: NavLink[] = [
  { href: "/roadmap", label: "Roadmap", icon: "roadmap" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Nav with the current page highlighted. Render inside <Suspense fallback={<NavLinks pathname={null} />}>:
 * on routes with request-time params (e.g. /dsa/[id]) the pathname isn't known while prerendering. */
export function Nav() {
  return <NavLinks pathname={usePathname()} />;
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  const item = ({ href, label, icon }: NavLink, extra = "") => {
    const active = pathname !== null && (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
    return (
      <li key={href} className={`shrink-0 ${extra}`}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            active ? "bg-accent text-on-accent" : "text-muted hover:bg-background hover:text-foreground"
          }`}
        >
          <Icon name={icon} />
          {label}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Main" className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:flex lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {MAIN.map((l) => item(l))}
        <li aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-line lg:hidden" />
        {SECONDARY.map((l) => item(l, "lg:hidden"))}
      </ul>
      <ul className="mt-auto hidden flex-col gap-1 border-t border-line pt-3 lg:flex">{SECONDARY.map((l) => item(l))}</ul>
    </nav>
  );
}
