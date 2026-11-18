import Link from "next/link";

const TABS = [
  { href: "/profile", label: "Stats" },
  { href: "/profile/badges", label: "Badges", gamify: true },
  { href: "/profile/portfolio", label: "Portfolio" },
  { href: "/profile/settings", label: "Settings" },
] as const;

export type ProfileTab = (typeof TABS)[number]["href"];

/** Profile heading with Stats / Badges / Portfolio / Settings underline tabs. Badges hides with the game features. */
export function ProfileTabs({ active }: { active: ProfileTab }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line">
      <h2 className="pb-3 text-2xl font-semibold tracking-tight">Profile</h2>
      <nav aria-label="Profile" className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === active ? "page" : undefined}
            className={`${"gamify" in t ? "gamify-only " : ""}shrink-0 border-b-2 px-3 pb-3 text-sm font-medium transition-colors duration-120 ${
              t.href === active ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
