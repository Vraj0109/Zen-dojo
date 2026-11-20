import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { TOTAL_WEEKS } from "@habit/shared";
import { getRoadmapView, type RoadmapWeek } from "@/lib/roadmap";
import { Badge, PageMain, buttonClass } from "../ui";
import { RoadmapSkeleton } from "@/app/components/roadmap-skeleton";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return (
    <PageMain title="Roadmap" hideTitle>
      <Suspense fallback={<RoadmapSkeleton />}>
        <Roadmap />
      </Suspense>
    </PageMain>
  );
}

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const fmtLong = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
};

function fillPath(p: number): string {
  if (p <= 0) return "";
  if (p >= 100) return "M20 2a18 18 0 1 1 0 36a18 18 0 1 1 0-36z";
  const y = 38 - (36 * p) / 100;
  const dx = Math.sqrt(Math.max(0, 324 - Math.pow(y - 20, 2)));
  return `M${(20 - dx).toFixed(2)} ${y.toFixed(2)}A18 18 0 1 0 ${(20 + dx).toFixed(2)} ${y.toFixed(2)}Z`;
}

/** The plan read as four phases of four weeks. */
const PHASE_WEEKS = 4;

const PHASE_INFO = [
  {
    name: "Foundations",
    about: "Arrays, hashing, two pointers, design basics",
    tone: "bg-primary-container text-on-primary-container",
  },
  {
    name: "Core patterns",
    about: "Windows, search, caching, LLD patterns",
    tone: "bg-cat-dsa text-on-cat-dsa",
  },
  {
    name: "Depth",
    about: "Graphs, DP, distributed systems",
    tone: "bg-cat-sd text-on-cat-sd",
  },
  {
    name: "Interview mode",
    about: "Mocks, re-solves, rest",
    tone: "bg-cat-beh text-on-cat-beh",
  },
];

async function Roadmap() {
  await connection();
  const { weeks, currentWeek, finished, weeksLeft, currentDone, currentTotal, backlogCount } = await getRoadmapView();
  const doneWeeks = finished ? TOTAL_WEEKS : currentWeek - 1;
  const currentPct = finished ? 100 : Math.round((currentDone / Math.max(currentTotal, 1)) * 100);
  const weekPct = (w: RoadmapWeek) => (w.state === "done" ? 100 : w.state === "current" ? currentPct : 0);
  const totalPct = finished ? 100 : Math.round(((doneWeeks + currentPct / 100) / TOTAL_WEEKS) * 100);
  const planEnd = weeks.length > 0 ? weeks[weeks.length - 1].end : null;

  const stateOf = (w: RoadmapWeek): "past" | "current" | "future" =>
    w.state === "done" ? "past" : w.state === "current" ? "current" : "future";

  const phases = Array.from({ length: Math.ceil(weeks.length / PHASE_WEEKS) }, (_, i) =>
    weeks.slice(i * PHASE_WEEKS, (i + 1) * PHASE_WEEKS)
  );

  const curWeekObj = weeks.find((w) => w.week === currentWeek) ?? weeks[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">Your 16 weeks</h1>
        <p className="mt-1 text-sm text-muted">
          {finished
            ? "All 16 weeks done"
            : `Week ${currentWeek} · ${totalPct}% done · ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"} left${planEnd ? ` · on track for ${fmtLong(planEnd)}` : ""}`}
        </p>
      </header>

      {/* The 16 circles strip */}
      <section aria-label="16-week plan" className="rounded-[32px] border border-line bg-surface px-3.5 py-4 dark:border-0 @min-[600px]:px-6 @min-[600px]:py-5">
        <ol aria-label="Weeks" className="grid grid-cols-8 items-center justify-items-center gap-x-1 gap-y-3 @min-[480px]:gap-x-2 @min-[900px]:grid-cols-16">
          {weeks.map((w) => {
            const isCur = w.week === currentWeek;
            const pct = weekPct(w);
            const pathD = fillPath(pct);

            return (
              <li key={w.week} className="flex items-center justify-center">
                <a
                  href={`#week-${w.week}`}
                  aria-label={`Week ${w.week}: ${pct}% done`}
                  title={`Week ${w.week}: ${w.dsa} (${pct}% done)`}
                  className="relative flex items-center justify-center rounded-full transition-transform hover:scale-105 motion-reduce:transition-none"
                >
                  <svg
                    aria-hidden="true"
                    className={
                      isCur
                        ? "size-10 @min-[480px]:size-12 @min-[900px]:size-14"
                        : "size-8 @min-[480px]:size-10 @min-[900px]:size-11"
                    }
                    viewBox="0 0 40 40"
                  >
                    <circle cx="20" cy="20" r="18" className="fill-surface-2" />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      className={isCur ? "stroke-primary" : "stroke-transparent"}
                      strokeWidth={isCur ? 3 : 0}
                    />
                    {pathD && (
                      <path
                        d={pathD}
                        className={pct >= 100 ? "fill-primary" : "fill-primary-container"}
                      />
                    )}
                    <text
                      x="20"
                      y="25"
                      textAnchor="middle"
                      fontFamily="Google Sans, system-ui, sans-serif"
                      fontSize="13"
                      fontWeight="600"
                      className={pct >= 100 ? "fill-on-primary" : "fill-foreground"}
                    >
                      {w.week}
                    </text>
                  </svg>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Four Phase cards in tones */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3">
        {phases.map((ws, i) => {
          const info = PHASE_INFO[i] || {
            name: `Phase ${i + 1}`,
            about: `Weeks ${ws[0].week}–${ws[ws.length - 1].week}`,
            tone: "bg-surface-2 text-foreground",
          };
          const doneInPhase = ws.filter((w) => w.state === "done").length;
          const phasePct = Math.round(ws.reduce((n, w) => n + weekPct(w), 0) / ws.length);
          const isPhaseDone = doneInPhase === ws.length;
          const isPhaseCurrent = ws.some((w) => w.state === "current");

          return (
            <section
              key={i}
              className={`flex flex-col gap-2 rounded-[28px] p-5 ${info.tone}`}
            >
              <span className="self-start rounded-full bg-surface/60 px-2.5 py-0.5 text-xs font-semibold">
                Weeks {ws[0].week}–{ws[ws.length - 1].week}
              </span>
              <p className="text-lg font-medium">{info.name}</p>
              <p className="text-sm opacity-85 leading-snug">{info.about}</p>
              <div
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface/60"
                role="progressbar"
                aria-label={`${info.name} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={isPhaseDone ? 100 : phasePct}
              >
                <div
                  className="h-full rounded-full bg-current"
                  style={{ width: `${isPhaseDone ? 100 : phasePct}%` }}
                />
              </div>
              <p className="text-[13px] font-medium">
                {isPhaseDone
                  ? "Done"
                  : isPhaseCurrent
                  ? `In progress · ${phasePct}%`
                  : `Starts ${fmtLong(ws[0].start)}`}
              </p>
            </section>
          );
        })}
      </div>

      {/* Week n · this week card */}
      {!finished && curWeekObj && (
        <section className="flex flex-col gap-3.5 rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-medium tracking-tight">Week {currentWeek} · this week</h2>
            <a
              href={`#week-${currentWeek}`}
              className={buttonClass("primary", "sm", "h-11 px-5")}
            >
              Open week {currentWeek}
            </a>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-2.5 text-sm">
            <div className="flex flex-col gap-1 rounded-[20px] bg-cat-dsa text-on-cat-dsa p-3.5">
              <span className="font-semibold">DSA</span>
              <p className="leading-snug">{curWeekObj.dsa}</p>
            </div>
            <div className="flex flex-col gap-1 rounded-[20px] bg-cat-sd text-on-cat-sd p-3.5">
              <span className="font-semibold">System design</span>
              <p className="leading-snug">{curWeekObj.sd}</p>
            </div>
            <div className="flex flex-col gap-1 rounded-[20px] bg-cat-lld text-on-cat-lld p-3.5">
              <span className="font-semibold">LLD and more</span>
              <p className="leading-snug">{curWeekObj.other}</p>
            </div>
          </div>
        </section>
      )}

      {/* Detailed weeks list by phase */}
      <div className="space-y-8">
        {phases.map((ws, i) => (
          <section key={ws[0].week} aria-labelledby={`phase-detail-${i + 1}`} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`phase-detail-${i + 1}`} className="text-lg font-semibold">
                Phase {i + 1} <span className="font-normal text-muted">· weeks {ws[0].week} to {ws[ws.length - 1].week}</span>
              </h3>
              <span className="text-sm text-muted">
                {ws.filter((w) => w.state === "done").length} of {ws.length} weeks done
              </span>
            </div>
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
              {ws.map((w) => (
                <WeekCard
                  key={w.week}
                  w={w}
                  state={stateOf(w)}
                  progress={w.state === "current" ? { done: currentDone, total: currentTotal, backlog: backlogCount } : null}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function WeekCard({
  w,
  state,
  progress,
}: {
  w: RoadmapWeek;
  state: "past" | "current" | "future";
  progress: { done: number; total: number; backlog: number } | null;
}) {
  const border = state === "current" ? "border-primary ring-2 ring-primary/20" : "border-line dark:border-0";
  return (
    <li
      id={`week-${w.week}`}
      className={`scroll-mt-24 rounded-[24px] border bg-surface p-5 ${border} ${
        state === "future" ? "opacity-80" : ""
      }`}
      aria-current={state === "current" ? "step" : undefined}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-semibold text-base">
          Week {w.week}
          {state !== "future" && (
            <span className="ml-2 align-middle">
              <Badge tone={state === "current" ? "primary" : "success"}>
                {state === "current" ? "Now" : "Done"}
              </Badge>
            </span>
          )}
        </h4>
        <span className="text-xs text-muted">
          {fmt(w.start)} – {fmt(w.end)}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">DSA</dt>
        <dd className="font-medium">{w.dsa}</dd>
        <dt className="text-muted">System design</dt>
        <dd>{w.sd}</dd>
        <dt className="text-muted">Other</dt>
        <dd>{w.other}</dd>
      </dl>
      {state !== "future" && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span>Goals {w.goalsDone}/{w.goalsTotal}</span>
            <span>{w.tasksDone} daily tasks</span>
            {progress && (
              <span>
                {progress.done} of {progress.total} done{progress.backlog > 0 ? `, ${progress.backlog} backlog` : ""}
              </span>
            )}
            <span>{w.problemsSolved} problems</span>
            <span className="gamify-only">+{w.xp} XP</span>
          </div>
        </div>
      )}
    </li>
  );
}
