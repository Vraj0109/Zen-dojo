import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getStats } from "@/lib/stats";
import { PageMain, ProgressBar, Scallop, Skeleton, StatusMark } from "../../ui";
import { ProfileTabs } from "../profile-ui";

export const metadata: Metadata = { title: "Badges" };

export default function BadgesPage() {
  return (
    <PageMain title="Badges" hideTitle>
      <ProfileTabs active="/profile/badges" />
      <p className="mb-4 text-sm text-muted [[data-gamify=on]_&]:hidden">Badges are part of the game features. Turn them on in Settings to see them.</p>
      <div className="gamify-only">
        <Suspense
          fallback={
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-[24px]" />
              ))}
            </div>
          }
        >
          <Badges />
        </Suspense>
      </div>
    </PageMain>
  );
}

async function Badges() {
  await connection();
  const { badges } = await getStats();
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        {earned.length} of {badges.length} earned
      </p>
      {[
        { title: "Earned", list: earned },
        { title: "Still to earn", list: locked },
      ].map(
        (g) =>
          g.list.length > 0 && (
            <section key={g.title}>
              <h2 className="mb-3 text-lg font-medium">{g.title}</h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
                {g.list.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-3.5 rounded-[24px] border border-line bg-surface p-4 dark:border-0"
                  >
                    <Scallop size={56} fill={b.earned ? "var(--reward-soft)" : "var(--surface-2)"}>
                      <span className={`text-base font-semibold ${b.earned ? "text-reward" : "text-muted"}`}>
                        {b.target > 1 && b.target < 1000 ? b.target : b.title.charAt(0).toUpperCase()}
                      </span>
                    </Scallop>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {b.title}
                        <span className="sr-only">{b.earned ? " (earned)" : " (locked)"}</span>
                      </p>
                      <p className="text-sm text-muted">{b.description}</p>
                      {!b.earned && b.target > 1 && (
                        <div className="mt-2">
                          <ProgressBar value={b.value} max={b.target} label={`${b.title} progress`} showCount />
                        </div>
                      )}
                    </div>
                    {b.earned && <StatusMark state="solved" />}
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
