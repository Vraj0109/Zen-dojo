import Link from "next/link";
import { certificateId, cleanPortfolioName, courseState, coursePercent, longDate, profileCourses, type PortfolioData } from "@habit/shared";
import { PortfolioSummary } from "./portfolio-summary";

const HEAT = ["bg-line", "bg-accent/35", "bg-accent/55", "bg-accent/80", "bg-accent"] as const;
const monthOf = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { month: "short" });
const dayOf = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A donut with three segments (easy, medium, hard) out of `total`, with the solved count in the middle. */
function SolvedRing({ solved, total, easy, medium, hard }: { solved: number; total: number; easy: number; medium: number; hard: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const whole = Math.max(total, solved, 1);
  const seg = (n: number) => (n / whole) * c;
  const arcs = [
    { n: easy, cls: "stroke-emerald-500" },
    { n: medium, cls: "stroke-amber-500" },
    { n: hard, cls: "stroke-rose-500" },
  ];
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="size-36 shrink-0" role="img" aria-label={`${solved} of ${whole} problems solved: ${easy} easy, ${medium} medium, ${hard} hard`}>
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-line" />
      {arcs.map((a, i) => {
        const len = seg(a.n);
        const el = a.n > 0 ? <circle key={i} cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="butt" className={a.cls} strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" /> : null;
        offset += len;
        return el;
      })}
      <text x="60" y="58" textAnchor="middle" className="fill-foreground text-[22px] font-semibold">
        {solved}
      </text>
      <text x="60" y="76" textAnchor="middle" className="fill-muted text-[9px]">
        {total > 0 ? `of ${whole} solved` : "solved"}
      </text>
    </svg>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * The profile as shown on /profile/portfolio and on the public page /u/<id>: solved ring, streaks, activity, badges and
 * certifications (completed and in progress). Takes a PortfolioData snapshot (name, numbers, course titles, dates): nothing
 * private ever goes through here. `certificateHref` links completed courses to their certificate (owner pages only);
 * `aiEnabled` offers the optional "Write it with AI" step of the summary (owner pages only).
 */
export function PortfolioView({ data, certificateHref, aiEnabled = false }: { data: PortfolioData; certificateHref?: (courseId: string) => string; aiEnabled?: boolean }) {
  const s = data.solvedByDifficulty;
  const name = cleanPortfolioName(data.name);
  const courses = profileCourses(data.courses);
  const heat = data.heatmap ?? [];
  const badges = data.badges ?? [];
  const earned = badges.filter((b) => b.earned).length;
  const activeCells = heat.flat().filter((c) => c.xp > 0).length;
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5">
        <div aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-2xl font-semibold text-on-accent">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight">{name}</h2>
          <p className="text-sm text-muted">
            Level {data.level} · {data.xp.toLocaleString("en-US")} XP · {data.planWeeksDone} of 16 plan weeks done
          </p>
          <p className="text-xs text-muted">Interview-prep progress with Zen Dojo, as of {longDate(data.generatedOn)}</p>
        </div>
        <PortfolioSummary data={data} aiEnabled={aiEnabled} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Solved</h3>
            <div className="flex items-center gap-5">
              <SolvedRing solved={data.totalSolved} total={0} easy={s.easy} medium={s.medium} hard={s.hard} />
              <ul className="min-w-0 flex-1 space-y-2 text-sm">
                {(
                  [
                    ["Easy", s.easy, "text-emerald-600 dark:text-emerald-400"],
                    ["Medium", s.medium, "text-amber-600 dark:text-amber-400"],
                    ["Hard", s.hard, "text-rose-600 dark:text-rose-400"],
                  ] as const
                ).map(([label, n, cls]) => (
                  <li key={label} className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5">
                    <span className={`font-medium ${cls}`}>{label}</span>
                    <span className="font-semibold">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Tile label="Current streak" value={`${data.streak} day${data.streak === 1 ? "" : "s"}`} />
            <Tile label="Best streak" value={`${data.bestStreak} day${data.bestStreak === 1 ? "" : "s"}`} />
            {data.activeDays !== undefined && <Tile label="Active days" value={String(data.activeDays)} />}
            {data.hours !== undefined && data.hours >= 1 && <Tile label="Focused hours" value={String(Math.round(data.hours))} />}
          </section>
        </div>

        <div className="space-y-6">
          {heat.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Activity, last 16 weeks</h3>
                <p className="text-xs text-muted">{activeCells} active day{activeCells === 1 ? "" : "s"}</p>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-[3px]" role="img" aria-label={`Activity heatmap: ${activeCells} active days in the last 16 weeks`}>
                  {heat.map((col, w) => {
                    const m = monthOf(col[0].date);
                    const showMonth = w === 0 || m !== monthOf(heat[w - 1][0].date);
                    return (
                      <div key={col[0].date} className="flex flex-col gap-[3px]">
                        <span className="h-4 text-[10px] leading-4 text-muted" aria-hidden>
                          {showMonth ? m : ""}
                        </span>
                        {col.map((c) => (
                          <span key={c.date} title={c.future ? undefined : `${dayOf(c.date)}: ${c.xp} XP`} className={`size-3.5 rounded-[3px] ${c.future ? "bg-transparent" : HEAT[c.level]}`} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-muted" aria-hidden>
                Less
                {HEAT.map((cls) => (
                  <span key={cls} className={`size-3 rounded-[3px] ${cls}`} />
                ))}
                More
              </div>
            </section>
          )}

          {badges.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Badges</h3>
                <p className="text-xs text-muted">
                  {earned} of {badges.length} earned
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {badges.map((b) => (
                  <li key={b.id} title={b.description} className={`rounded-xl border p-3 text-sm ${b.earned ? "border-accent bg-accent/10" : "border-line opacity-70"}`}>
                    <p className="font-medium leading-snug">{b.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{b.earned ? "Earned" : `${b.value} / ${b.target}`}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Certifications and courses</h3>
          <p className="text-xs text-muted">
            {courses.filter((c) => courseState(c) === "completed").length} completed · {courses.filter((c) => courseState(c) === "in-progress").length} in progress
          </p>
        </div>
        {courses.length === 0 ? (
          <p className="text-sm text-muted">Nothing started yet. Work through a course and it shows up here, finished or not.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => {
              const done = courseState(c) === "completed";
              const pct = coursePercent(c);
              return (
                <li key={c.id} className={`space-y-2 rounded-xl border p-4 ${done ? "border-accent bg-accent/5" : "border-line"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{c.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${done ? "bg-accent text-on-accent" : "border border-line text-muted"}`}>{done ? "Certified" : `${pct}%`}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`${c.title} progress`} aria-valuenow={c.done} aria-valuemin={0} aria-valuemax={c.total}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted">
                    {c.done} of {c.total} done
                    {done && c.completedOn ? ` · completed ${longDate(c.completedOn)}` : " · in progress"}
                  </p>
                  {done && c.completedOn && (
                    <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                      <span>Certificate {certificateId(name, c.id, c.completedOn)}</span>
                      {certificateHref && (
                        <Link href={certificateHref(c.id)} className="rounded-lg border border-line px-2.5 py-1 font-medium text-foreground hover:bg-background">
                          View certificate
                        </Link>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
