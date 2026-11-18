import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getStats } from "@/lib/stats";
import { PageMain, ProgressBar, Skeleton, StatusMark } from "../../ui";
import { ProfileTabs } from "../profile-ui";

export const metadata: Metadata = { title: "Badges" };

export default function BadgesPage() {
  return (
    <PageMain title="Badges">
      <ProfileTabs active="/profile/badges" />
      <p className="mb-4 text-sm text-muted [[data-gamify=on]_&]:hidden">Badges are part of the game features. Turn them on in Settings to see them.</p>
      <div className="gamify-only">
        <Suspense
          fallback={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
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
              <h3 className="mb-3 text-lg font-semibold">{g.title}</h3>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {g.list.map((b) => (
                  <li key={b.id} className={`flex items-center gap-3 rounded-md border p-4 ${b.earned ? "border-line-strong bg-surface" : "border-line bg-surface-2"}`}>
                    <span className={`grid size-11 shrink-0 place-items-center rounded-full text-2xl ${b.earned ? "bg-reward-soft" : "bg-surface grayscale"}`} aria-hidden>
                      {b.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {b.title}
                        <span className="sr-only">{b.earned ? " (earned)" : " (locked)"}</span>
                      </p>
                      <p className="text-xs text-muted">{b.description}</p>
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
