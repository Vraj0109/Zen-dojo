import Link from "next/link";

const TABS = [
  { href: "/profile", label: "Overview" },
  { href: "/profile/settings", label: "Settings" },
] as const;

/** Profile heading with Overview / Settings tabs. */
export function ProfileTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line">
      <h2 className="pb-3 text-2xl font-semibold tracking-tight">Profile</h2>
      <nav aria-label="Profile" className="flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 pb-3 text-sm font-medium ${
              t.href === active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
