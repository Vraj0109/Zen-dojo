import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { TOTAL_WEEKS } from "@habit/shared";
import { getRoadmapView, type RoadmapWeek } from "@/lib/roadmap";
import { ProfileTabs } from "../profile/profile-ui";
import { PageMain, ProgressBar } from "../ui";
import { DsaRoadmapSkeleton } from "@/app/components/roadmap-skeleton";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return (
    <PageMain title="Roadmap">
      <ProfileTabs active="/roadmap" />
      <Suspense fallback={<DsaRoadmapSkeleton />}>
        <Roadmap />
      </Suspense>
    </PageMain>
  );
}

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

async function Roadmap() {
  await connection();
  const { weeks, currentWeek, finished, weeksLeft, currentDone, currentTotal, backlogCount } = await getRoadmapView();
  const doneWeeks = finished ? TOTAL_WEEKS : currentWeek - 1;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">16-week plan</h2>
          <span className="text-sm text-muted">
            {finished ? "Complete" : `Week ${currentWeek} of ${TOTAL_WEEKS} · ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"} left`}
          </span>
        </div>
        <ProgressBar value={doneWeeks} max={TOTAL_WEEKS} label="Weeks finished" />
        <p className="mt-2 text-xs text-muted">
          Roughly 40% DSA, 35% system design, 15% behavioral/LLD, 10% mocks and applications.
        </p>
      </section>

      <ol className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {weeks.map((w) => (
          <WeekCard key={w.week} w={w} state={w.state === "done" ? "past" : w.state === "current" ? "current" : "future"} progress={w.state === "current" ? { done: currentDone, total: currentTotal, backlog: backlogCount } : null} />
        ))}
      </ol>
    </div>
  );
}

function WeekCard({ w, state, progress }: { w: RoadmapWeek; state: "past" | "current" | "future"; progress: { done: number; total: number; backlog: number } | null }) {
  const border = state === "current" ? "border-accent ring-1 ring-accent" : "border-line";
  return (
    <li
      className={`rounded-xl border bg-surface p-4 ${border} ${state === "future" ? "opacity-70" : ""}`}
      aria-current={state === "current" ? "step" : undefined}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          Week {w.week}
          {state === "current" && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-on-accent">Now</span>}
        </h3>
        <span className="text-xs text-muted">
          {fmt(w.start)} – {fmt(w.end)}
        </span>
      </div>
      <dl className="grid gap-1 text-sm sm:grid-cols-[7rem_1fr]">
        <dt className="text-muted">DSA</dt>
        <dd>{w.dsa}</dd>
        <dt className="text-muted">System design</dt>
        <dd>{w.sd}</dd>
        <dt className="text-muted">Other</dt>
        <dd>{w.other}</dd>
      </dl>
      {state !== "future" && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              Goals {w.goalsDone}/{w.goalsTotal}
            </span>
            <span>{w.tasksDone} daily tasks</span>
            {progress && (
              <span>
                {progress.done} of {progress.total} plan tasks done{progress.backlog > 0 ? `, ${progress.backlog} in the backlog` : ""}
              </span>
            )}
            <span>{w.problemsSolved} problems</span>
            <span className="gamify-only">+{w.xp} XP</span>
          </div>
          <ProgressBar value={w.goalsDone} max={w.goalsTotal} label={`Week ${w.week} goals done`} />
        </div>
      )}
      <Link href={state === "current" ? "/" : `/?week=${w.week}`} prefetch={false} className="mt-3 inline-block text-sm font-medium hover:underline">
        {state === "future" ? "Work ahead" : "Open"}: week {w.week} focus →
      </Link>
    </li>
  );
}
