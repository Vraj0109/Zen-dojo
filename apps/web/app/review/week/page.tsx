import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { addDays, formatLong, toLocalDate } from "@habit/shared";
import { REFLECTION_MAX, getWeeklyReview, weekOf } from "@/lib/weekly";
import { saveReflectionAction } from "../../actions";
import { ReviewTabsWithCount } from "../../section-tabs";
import { SubmitButton } from "../../submit-button";
import { PageMain, Stat } from "../../ui";
import { ReviewQueueSkeleton } from "@/app/components/review-skeleton";

export const metadata: Metadata = { title: "Weekly review" };

export default function WeeklyReviewPage({ searchParams }: PageProps<"/review/week">) {
  return (
    <PageMain title="Weekly review">
      <Suspense fallback={null}>
        <ReviewTabsWithCount active="weekly" />
      </Suspense>
      <Suspense fallback={<ReviewQueueSkeleton />}>
        <Week searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

/** "3 last week" / "same as last week", for the small line under a number. */
function versus(now: number, before: number, unit = ""): string {
  if (now === before) return `same as last week (${before}${unit})`;
  return `${before}${unit} last week`;
}

const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

async function Week({ searchParams }: { searchParams: PageProps<"/review/week">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const raw = Array.isArray(params.week) ? params.week[0] : params.week;
  const today = toLocalDate();
  const monday = weekOf(raw, today);
  const thisWeek = weekOf(undefined, today);
  const r = await getWeeklyReview(monday);
  const s = r.stats;
  const p = r.previous;
  const isCurrent = monday === thisWeek;
  const weakCount = r.weak.patterns.length + r.weak.concepts.length + r.weak.exercises.length + r.weak.stuck.length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{r.weekNo ? `Plan week ${r.weekNo}` : "Outside the 16-week plan"}</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {formatLong(r.monday)} to {formatLong(r.sunday)}
          </h2>
          {isCurrent && <p className="mt-1 text-sm text-muted">This week so far. Come back on Sunday to write your reflection.</p>}
        </div>
        <nav aria-label="Choose a week" className="flex gap-2 text-sm">
          <Link href={`/review/week?week=${addDays(monday, -7)}`} className="rounded-lg border border-line px-3 py-1.5 hover:bg-background">
            Earlier week
          </Link>
          {!isCurrent && (
            <Link href={`/review/week?week=${addDays(monday, 7)}`} className="rounded-lg border border-line px-3 py-1.5 hover:bg-background">
              Later week
            </Link>
          )}
          {!isCurrent && (
            <Link href="/review/week" className="rounded-lg border border-line px-3 py-1.5 hover:bg-background">
              This week
            </Link>
          )}
        </nav>
      </header>

      <section aria-label="The week in numbers" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="XP" value={`${s.xp}`} hint={versus(s.xp, p.xp)} className="gamify-only" />
        <Stat label="Active days" value={`${s.activeDays} of 7`} hint={versus(s.activeDays, p.activeDays)} />
        <Stat label="Tasks done" value={`${s.tasksDone} of ${s.tasksTotal}`} hint={versus(s.tasksDone, p.tasksDone)} />
        <Stat label="Problems solved" value={`${s.solves}`} hint={`${s.resolves} re-solve${s.resolves === 1 ? "" : "s"} · ${versus(s.solves, p.solves)}`} />
        <Stat label="Concepts covered" value={`${s.conceptsCovered}`} hint={versus(s.conceptsCovered, p.conceptsCovered)} />
        <Stat
          label="Design / LLD practice"
          value={`${s.practices}`}
          hint={s.practiceAvg === null ? versus(s.practices, p.practices) : `average score ${s.practiceAvg} of 5`}
        />
        <Stat label="Focus timer" value={hours(s.focusMinutes)} hint={versus(s.focusMinutes, p.focusMinutes, " min")} />
        <Stat
          label="On LeetCode pages"
          value={s.siteMinutes > 0 ? hours(s.siteMinutes) : "No data"}
          hint={s.siteMinutes > 0 ? versus(s.siteMinutes, p.siteMinutes, " min") : "Needs the browser extension"}
        />
        <Stat label="Stuck problems" value={`${s.stuckLogged} logged`} hint={`${s.stuckCleared} cleared`} />
        <Stat label="Boss fights" value={`${s.bossFights}`} hint={versus(s.bossFights, p.bossFights)} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="reflection" className="space-y-3">
          <h3 id="reflection" className="text-lg font-semibold">
            Your reflection
          </h3>
          <p className="text-sm text-muted">A few honest lines. Saved for this week only, and part of your backup.</p>
          <form action={saveReflectionAction} className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <input type="hidden" name="week" value={r.monday} />
            <Field name="wins" label="What went well" value={r.reflection.wins} />
            <Field name="struggles" label="What was hard or slipped" value={r.reflection.struggles} />
            <Field name="nextFocus" label="What to do first next week" value={r.reflection.nextFocus} />
            <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Save reflection</SubmitButton>
          </form>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="weak" className="space-y-3">
            <h3 id="weak" className="text-lg font-semibold">
              Weak spots to look at
            </h3>
            {weakCount === 0 ? (
              <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Nothing stands out right now.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
                {r.weak.stuck.map((x) => (
                  <Row key={`stuck-${x.id}`} href={`/dsa/${encodeURIComponent(x.id)}?tab=stuck#stuck`} kind="Stuck" title={x.title} detail={x.reason || `${x.count} time${x.count === 1 ? "" : "s"}`} />
                ))}
                {r.weak.patterns.map((x) => (
                  <Row key={`pat-${x.id}`} href={`/dsa/pattern/${x.id}`} kind="Pattern" title={x.name} detail={`${x.solved} of ${x.target} solved${x.stuck ? ` · ${x.stuck} stuck` : ""}`} />
                ))}
                {r.weak.concepts.map((x) => (
                  <Row key={`con-${x.id}`} href={`/study/${x.area}/${x.id}`} kind="Concept" title={x.title} detail={x.confidence === 0 ? "not rated yet" : `confidence ${x.confidence} of 5`} />
                ))}
                {r.weak.exercises.map((x) => (
                  <Row key={`ex-${x.id}`} href={`/study/${x.area}/${x.id}`} kind="Practice" title={x.title} detail={x.lastScore === null ? "not practised yet" : `last score ${x.lastScore}`} />
                ))}
              </ul>
            )}
            <p className="text-sm text-muted">
              The full list and recap sheets are in{" "}
              <Link href="/revise" className="font-medium text-foreground underline">
                Quick revise
              </Link>
              .
            </p>
          </section>

          {r.topProblems.length > 0 && (
            <section aria-labelledby="site" className="space-y-3">
              <h3 id="site" className="text-lg font-semibold">
                Most time on LeetCode this week
              </h3>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
                {r.topProblems.map((x) => (
                  <li key={x.slug} className="flex items-center justify-between gap-3 p-3">
                    {x.id ? (
                      <Link href={`/dsa/${encodeURIComponent(x.id)}`} className="font-medium hover:underline">
                        {x.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{x.title}</span>
                    )}
                    <span className="shrink-0 text-muted">{hours(x.minutes)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea
        name={name}
        defaultValue={value}
        rows={4}
        maxLength={REFLECTION_MAX}
        className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function Row({ href, kind, title, detail }: { href: string; kind: string; title: string; detail: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 p-3 hover:bg-background">
        <span>
          <span className="mr-2 text-xs uppercase tracking-wide text-muted">{kind}</span>
          <span className="font-medium">{title}</span>
        </span>
        <span className="shrink-0 text-muted">{detail}</span>
      </Link>
    </li>
  );
}
