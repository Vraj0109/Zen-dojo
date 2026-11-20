import Link from "next/link";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

export function Tabs({
  tabs,
  active,
  hrefFor,
  label,
  className = "inline-flex p-1 rounded-full bg-surface-2 gap-1 overflow-x-auto print:hidden",
}: {
  tabs: readonly TabItem[];
  active: string;
  hrefFor: (id: string) => string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        const count = typeof t.count === "number" && t.count > 0 ? ` · ${t.count}` : "";
        return (
          <Link
            key={t.id}
            href={hrefFor(t.id)}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-180 ease-dojo ${
              isActive
                ? "bg-primary-soft text-on-primary-soft font-semibold shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {count}
          </Link>
        );
      })}
    </nav>
  );
}
