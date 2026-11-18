import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { TOTAL_WEEKS } from "@habit/shared";
import { getRoadmapView, type RoadmapWeek } from "@/lib/roadmap";
import { Badge, PageMain, ProgressBar } from "../ui";
import { DsaRoadmapSkeleton } from "@/app/components/roadmap-skeleton";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return (
    <PageMain title="Roadmap">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Roadmap</h2>
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
  const stateOf = (w: RoadmapWeek): "past" | "current" | "future" => (w.state === "done" ? "past" : w.state === "current" ? "current" : "future");
  const phases = Array.from({ length: Math.ceil(weeks.length / PHASE_WEEKS) }, (_, i) => weeks.slice(i * PHASE_WEEKS, (i + 1) * PHASE_WEEKS));

  return (
    <div className="space-y-8">
      <section className="rounded-md border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">16-week plan</h3>
          <span className="text-sm text-muted">
            {finished ? "Complete" : `Week ${currentWeek} of ${TOTAL_WEEKS} · ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"} left`}
          </span>
        </div>
        <ol aria-label="Weeks" className="grid grid-cols-8 gap-1.5 sm:grid-cols-16">
          {weeks.map((w) => {
            const s = stateOf(w);
            return (
              <li key={w.week}>
                <a
                  href={`#week-${w.week}`}
                  aria-current={s === "current" ? "step" : undefined}
                  title={`Week ${w.week}: ${w.dsa}`}
                  className={`flex h-9 items-center justify-center rounded-sm text-xs font-semibold transition-colors duration-120 ${
                    s === "past" ? "bg-primary text-on-primary" : s === "current" ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {w.week}
                  <span className="sr-only">{s === "past" ? " (done)" : s === "current" ? " (now)" : ""}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <div className="mt-4">
          <ProgressBar value={doneWeeks} max={TOTAL_WEEKS} label="Weeks finished" showCount />
        </div>
        <p className="mt-2 text-xs text-muted">Roughly 40% DSA, 35% system design, 15% behavioral/LLD, 10% mocks and applications.</p>
      </section>

      {phases.map((ws, i) => (
        <section key={ws[0].week} aria-labelledby={`phase-${i + 1}`} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`phase-${i + 1}`} className="text-lg font-semibold">
              Phase {i + 1} <span className="font-normal text-muted">· weeks {ws[0].week} to {ws[ws.length - 1].week}</span>
            </h3>
            <span className="text-sm text-muted">
              {ws.filter((w) => w.state === "done").length} of {ws.length} weeks done
            </span>
          </div>
          <ol className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {ws.map((w) => (
              <WeekCard key={w.week} w={w} state={stateOf(w)} progress={w.state === "current" ? { done: currentDone, total: currentTotal, backlog: backlogCount } : null} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** The plan read as four phases of four weeks. */
const PHASE_WEEKS = 4;

function WeekCard({ w, state, progress }: { w: RoadmapWeek; state: "past" | "current" | "future"; progress: { done: number; total: number; backlog: number } | null }) {
  const border = state === "current" ? "border-primary ring-1 ring-primary" : "border-line";
  return (
    <li
      id={`week-${w.week}`}
      className={`scroll-mt-24 rounded-md border bg-surface p-5 ${border} ${state === "future" ? "opacity-80" : ""}`}
      aria-current={state === "current" ? "step" : undefined}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          Week {w.week}
          {state !== "future" && (
            <span className="ml-2 align-middle">
              <Badge tone={state === "current" ? "primary" : "success"}>{state === "current" ? "Now" : "Done"}</Badge>
            </span>
          )}
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
      <Link href={state === "current" ? "/" : `/?week=${w.week}`} prefetch={false} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        {state === "future" ? "Work ahead" : "Open"}: week {w.week} focus →
      </Link>
    </li>
  );
}
