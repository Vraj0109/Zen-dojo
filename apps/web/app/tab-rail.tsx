"use client";

import Link from "next/link";
import { SlidingPill } from "./sliding-pill";

export interface ResolvedTabItem {
  readonly id: string;
  readonly label: string;
  readonly short?: string;
  readonly count?: number;
  readonly href: string;
}

/** A row of tab links with one pill that slides to the active tab (also across route changes, via persistKey). */
export function TabRail({
  tabs,
  active,
  label,
  className,
}: {
  tabs: readonly ResolvedTabItem[];
  active: string;
  label: string;
  className: string;
}) {
  return (
    <SlidingPill
      as="nav"
      aria-label={label}
      className={className}
      persistKey={`tabs:${label}`}
      pillClassName="rounded-full bg-primary-soft shadow-xs"
      data-sp-tabs=""
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        const count = typeof t.count === "number" && t.count > 0 ? ` · ${t.count}` : "";
        return (
          <Link
            key={t.id}
            href={t.href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
              isActive ? "bg-primary-soft text-on-primary-soft font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            {t.short ? (
              <>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </>
            ) : (
              t.label
            )}
            {count}
          </Link>
        );
      })}
    </SlidingPill>
  );
}
