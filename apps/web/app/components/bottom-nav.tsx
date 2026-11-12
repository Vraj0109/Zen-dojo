import Link from "next/link";
import { Icon, MAIN, SECONDARY, isActive } from "../nav";

/** Phone tab bar (below `md`): Today, Practice, Learn, Review and You, from the same data as the sidebar. */
export function BottomNav({ pathname }: { pathname: string | null }) {
  const items = [...MAIN, ...SECONDARY.map((l) => ({ ...l, label: "You" }))];
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="flex">
        {items.map((l) => {
          const active = isActive(l, pathname);
          return (
            <li key={l.href} className="min-w-0 flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}
              >
                <Icon name={l.icon} className="size-5" />
                <span className="truncate">{l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
