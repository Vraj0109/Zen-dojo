import Link from "next/link";

const TABS = [
  { href: "/profile", label: "Profile", tab: "Stats" },
  { href: "/profile/badges", label: "Badges", tab: "Badges", gamify: true },
  { href: "/profile/portfolio", label: "Portfolio", tab: "Portfolio" },
  { href: "/profile/account", label: "Account", tab: "Account" },
  { href: "/profile/settings", label: "Settings", tab: "Settings" },
] as const;

export type ProfileTab = (typeof TABS)[number]["href"];

/**
 * The visible page heading (h1) for the profile pages, with the Stats / Badges / Portfolio / Account / Settings tabs.
 * Pages that use it pass `hideTitle` to PageMain. The tabs wrap instead of scrolling sideways, so on a phone they are
 * the account menu at the top of the You tab.
 */
export function ProfileTabs({ active, title }: { active: ProfileTab; title?: string }) {
  const current = TABS.find((t) => t.href === active);
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">{title ?? current?.label ?? "Profile"}</h1>
      <nav aria-label="Profile" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const isCur = t.href === active;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={isCur ? "page" : undefined}
              className={`${"gamify" in t ? "gamify-only " : ""}inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                isCur ? "bg-primary-soft text-on-primary-soft" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {t.tab}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
