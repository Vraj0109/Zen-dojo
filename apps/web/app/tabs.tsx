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
  className = "flex touch-pan-x gap-6 border-b border-line overflow-x-auto overflow-y-hidden overscroll-x-contain print:hidden",
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
            className={`-mb-px shrink-0 pb-2 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "border-b-2 border-accent text-foreground"
                : "border-b-2 border-transparent text-muted hover:text-foreground"
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
