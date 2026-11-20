"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "../tabs";

const TABS = [
  { id: "/profile", label: "Stats" },
  { id: "/profile/badges", label: "Badges" },
  { id: "/profile/portfolio", label: "Portfolio" },
  { id: "/profile/account", label: "Account" },
  { id: "/profile/settings", label: "Settings" },
] as const;

/** Pages under a tab that show that tab as active with their own heading. */
const SUB_PAGES: Record<string, { tab: string; title: string }> = {
  "/profile/settings/tools": { tab: "/profile/settings", title: "Tools for running code" },
};

/**
 * The visible page heading (h1) and the Stats / Badges / Portfolio / Account / Settings tabs, rendered once by
 * profile/layout.tsx. A layout stays mounted while you move between its pages, so the tab pill slides instead of being
 * re-created. It renders nothing for other pages under /profile (certificates). The tabs wrap instead of scrolling
 * sideways, so on a phone they are the account menu at the top of the You tab. Pages pass `hideTitle` to PageMain and
 * `PROFILE_PAGE_CLASS` (profile/shared.ts) so the layout's heading owns the top padding.
 */
export function ProfileHeader() {
  const raw = usePathname() ?? "";
  const path = raw.length > 1 ? raw.replace(/\/$/, "") : raw;
  const sub = SUB_PAGES[path];
  const active = sub?.tab ?? TABS.find((t) => t.id === path)?.id;
  if (!active) return null;
  const title = sub?.title ?? TABS.find((t) => t.id === active)?.label ?? "Profile";
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pt-5 sm:px-6 md:px-8 md:pt-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <Tabs tabs={TABS} active={active} hrefFor={(id) => id} label="Profile sections" />
      </div>
    </div>
  );
}
