import { TabRail, type ResolvedTabItem } from "./tab-rail";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly short?: string;
  readonly count?: number;
  readonly href?: string;
}

export function Tabs({
  tabs,
  active,
  hrefFor,
  label,
  className = "relative inline-flex max-w-full p-1 rounded-full bg-surface-2 gap-1 overflow-x-auto [scrollbar-width:none] print:hidden select-none",
}: {
  tabs: readonly TabItem[];
  active: string;
  hrefFor?: (id: string) => string;
  label: string;
  className?: string;
}) {
  const resolvedTabs: ResolvedTabItem[] = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    short: t.short,
    count: t.count,
    href: t.href ?? (hrefFor ? hrefFor(t.id) : "#"),
  }));

  return (
    <TabRail
      tabs={resolvedTabs}
      active={active}
      label={label}
      className={className}
    />
  );
}
