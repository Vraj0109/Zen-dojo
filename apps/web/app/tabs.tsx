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
  className = "-mx-1 flex gap-1 overflow-x-auto px-1 print:hidden",
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
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
              isActive ? "bg-accent text-on-accent" : "border border-line text-muted hover:text-foreground"
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
