import Link from "next/link";
import { Icon, TABS, isActive } from "../nav";

/** Phone tab bar (below `md`): Today, Practice, Learn, Review and You. Each tab is a 56px-high target. */
export function BottomNav({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="flex">
        {TABS.map((l) => {
          const active = isActive(l, pathname);
          return (
            <li key={l.href} className="min-w-0 flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 min-w-12 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-120 ${active ? "text-primary" : "text-muted"}`}
              >
                <span className={`grid h-6 w-12 place-items-center rounded-full ${active ? "bg-primary-soft" : ""}`}>
                  <Icon name={l.icon} className="size-5" />
                </span>
                <span className="truncate leading-none">{l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
