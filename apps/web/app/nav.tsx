"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/dsa", label: "DSA" },
  { href: "/study/sd", label: "Design" },
  { href: "/study/lld", label: "LLD" },
  { href: "/study/core", label: "Core CS" },
] as const;

/** Nav with the current page highlighted. Render inside <Suspense fallback={<NavLinks pathname={null} />}>:
 * on routes with request-time params (e.g. /dsa/[id]) the pathname isn't known while prerendering. */
export function Nav() {
  return <NavLinks pathname={usePathname()} />;
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 text-sm">
      {LINKS.map(({ href, label }) => {
        const active = pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              active ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
