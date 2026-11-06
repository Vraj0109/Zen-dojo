import { Suspense } from "react";
import { after, connection } from "next/server";
import Link from "next/link";
import { CATEGORIES, TOTAL_WEEKS, formatLong, type Category } from "@habit/shared";
import { getResolveDueCount } from "@/lib/dsa";
import { getWeekFocus, taskLink, type FocusItem, type TaskLink, type WeekFocusView } from "@/lib/focus";
import { syncLeetCodeIfStale } from "@/lib/leetcode/sync";
import type { Task } from "@/lib/schema";
import { getStudyDue } from "@/lib/study";
import { getTodayView } from "@/lib/tasks";
import { addTaskAction, deleteTaskAction, toggleTaskAction } from "./actions";
import { SubmitButton } from "./submit-button";
import { PageMain, ProgressBar } from "./ui";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <PageMain title="Today">
      <Suspense fallback={<p className="text-muted">Loading today…</p>}>
        <Today searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

async function Today({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // Today's date and the database are per-request; render at request time.
  await connection();
  after(syncLeetCodeIfStale); // pull new LeetCode solves after the page is sent
  const params = await searchParams;
  const [v, resolveDue, studyDue] = await Promise.all([getTodayView(), getResolveDueCount(), getStudyDue()]);
  const beforeStart = v.weekNo < 1;
  const finished = v.weekNo > TOTAL_WEEKS;
  const currentWeek = Math.min(Math.max(v.weekNo, 1), TOTAL_WEEKS);
  // ?week=N shows another week's focus, so you can work ahead (or catch up).
  const asked = Number(Array.isArray(params.week) ? params.week[0] : params.week);
  const shownWeek = Number.isInteger(asked) && asked >= 1 && asked <= TOTAL_WEEKS ? asked : currentWeek;
  const [focus, shown] = await Promise.all([
    getWeekFocus(currentWeek),
    shownWeek === currentWeek ? null : getWeekFocus(shownWeek),
  ]);

  const due = { resolve: resolveDue, studyArea: studyDue[0]?.area.id };
  const link = (t: Task) => taskLink(t, focus, due);
  const doneToday = v.dayTasks.filter((t) => t.status === "done").length;
  const dayXp = v.dayTasks.reduce((a, t) => a + t.xp, 0);
  const lvl = v.level;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">
            {beforeStart ? "Plan not started" : finished ? "Plan finished" : `Week ${v.weekNo} of ${TOTAL_WEEKS}`}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{formatLong(v.today)}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Chip label="Streak" value={`🔥 ${v.streak} day${v.streak === 1 ? "" : "s"}`} />
          <Chip label="Today" value={`+${v.todayXp} XP`} />
          <Link href="/profile" className="rounded-xl border border-line bg-surface px-3 py-2 hover:bg-background">
            <p className="text-xs text-muted">Level</p>
            <div className="flex items-center gap-2 font-semibold">
              {lvl.level} · {lvl.tier}
              <div className="w-16">
                <ProgressBar value={lvl.xpIntoLevel} max={lvl.xpForNext} label="Progress to next level" />
              </div>
            </div>
          </Link>
        </div>
      </header>

      {(resolveDue > 0 || studyDue.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {resolveDue > 0 && (
            <Link href="/dsa?status=due" className="rounded-full border border-accent bg-surface px-3 py-1.5 text-sm font-medium hover:bg-background">
              🔁 {resolveDue} re-solve{resolveDue === 1 ? "" : "s"} due →
            </Link>
          )}
          {studyDue.map(({ area, count }) => (
            <Link key={area.id} href={`/study/${area.id}`} className="rounded-full border border-accent bg-surface px-3 py-1.5 text-sm font-medium hover:bg-background">
              🧠 {area.title}: {count} to review →
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          {beforeStart && (
            <p className="rounded-xl border border-line bg-surface p-4">
              Your plan starts on <strong>{formatLong(v.planStart)}</strong>. You can work ahead from the week panel, or{" "}
              <Link href="/profile/settings" className="font-medium underline">
                change the start date
              </Link>
              .
            </p>
          )}
          {finished && (
            <p className="rounded-xl border border-line bg-surface p-4">🎉 You finished all {TOTAL_WEEKS} weeks. Good luck in the interviews!</p>
          )}

          {!beforeStart && !finished && (
            <>
              <section className="rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between gap-3 border-b border-line p-4">
                  <h3 className="font-semibold">Today&apos;s plan</h3>
                  <span className="text-sm text-muted">
                    {doneToday} / {v.dayTasks.length} done · {dayXp} XP available
                  </span>
                </div>
                <div className="px-4 pt-3">
                  <ProgressBar value={doneToday} max={v.dayTasks.length} label="Today's tasks done" />
                </div>
                <TaskList tasks={v.dayTasks} link={link} />
              </section>

              <section className="rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between gap-3 border-b border-line p-4">
                  <h3 className="font-semibold">Week {v.weekNo} goals</h3>
                  <span className="text-sm text-muted">
                    {v.weekTasks.filter((t) => t.status === "done").length} / {v.weekTasks.length} done
                  </span>
                </div>
                <TaskList tasks={v.weekTasks} link={link} />
              </section>
            </>
          )}

          <details className="group rounded-xl border border-line bg-surface">
            <summary className="cursor-pointer list-none p-4 font-semibold">
              <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
              Add your own task
            </summary>
            <form action={addTaskAction} className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
              <input
                name="title"
                required
                maxLength={200}
                placeholder="e.g. LeetCode 560 Subarray Sum Equals K"
                aria-label="Task title"
                className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2"
              />
              <select name="category" aria-label="Category" className="rounded-lg border border-line bg-background px-3 py-2" defaultValue="dsa">
                {Object.entries(CATEGORIES).map(([key, c]) => (
                  <option key={key} value={key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select name="scope" aria-label="When" className="rounded-lg border border-line bg-background px-3 py-2" defaultValue="day">
                <option value="day">Today</option>
                <option value="week">This week</option>
              </select>
              <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Add</SubmitButton>
            </form>
          </details>
        </div>

        <FocusPanel focus={shown ?? focus} currentWeek={currentWeek} started={!beforeStart} />
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

const CATEGORY_STYLES: Record<Category, string> = {
  dsa: "bg-cat-dsa",
  sd: "bg-cat-sd",
  beh_lld: "bg-cat-beh",
  mock_app: "bg-cat-mock",
  other: "bg-cat-other",
};

function TaskList({ tasks, link }: { tasks: Task[]; link: (t: Task) => TaskLink | null }) {
  if (tasks.length === 0) return <p className="p-4 text-muted">Nothing here yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => {
        const done = t.status === "done";
        const cat = (t.category in CATEGORIES ? t.category : "other") as Category;
        const go = link(t);
        return (
          <li key={t.id} className="flex items-start gap-3 p-4">
            <form action={toggleTaskAction} className="pt-0.5">
              <input type="hidden" name="id" value={t.id} />
              <SubmitButton
                aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                  done ? "border-accent bg-accent text-on-accent" : "border-line hover:border-accent"
                }`}
              >
                {done ? "✓" : ""}
              </SubmitButton>
            </form>
            <div className="min-w-0 flex-1">
              <p className={done ? "text-muted line-through" : "font-medium"}>{t.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className={`inline-block size-2 rounded-full ${CATEGORY_STYLES[cat]}`} />
                {CATEGORIES[cat].label}
                {t.minutes ? <span>· {t.minutes} min</span> : null}
                <span className={done ? "" : "font-medium text-accent"}>· +{t.xp} XP</span>
              </p>
            </div>
            {go && (
              <Link
                href={go.href}
                prefetch={false}
                title={go.label}
                className={`hidden max-w-60 shrink-0 items-center gap-1 truncate rounded-lg border px-3 py-1.5 text-sm font-medium sm:inline-flex ${
                  done ? "border-line text-muted hover:text-foreground" : "border-accent text-foreground hover:bg-background"
                }`}
              >
                <span className="truncate">{go.label}</span>
                <span aria-hidden>→</span>
              </Link>
            )}
            {go && (
              <Link href={go.href} prefetch={false} aria-label={`Open: ${go.label}`} className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-sm sm:hidden">
                →
              </Link>
            )}
            {t.templateKey === null && (
              <form action={deleteTaskAction}>
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton aria-label={`Delete "${t.title}"`} className="px-1 text-muted hover:text-foreground">
                  ×
                </SubmitButton>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** One week's patterns, concepts and designs with your progress; ‹ › to look at other weeks. */
function FocusPanel({ focus, currentWeek, started }: { focus: WeekFocusView; currentWeek: number; started: boolean }) {
  const n = focus.weekNo;
  const isCurrent = n === currentWeek;
  const weekHref = (w: number) => (w === currentWeek ? "/" : `/?week=${w}`);
  const arrow = "flex size-8 items-center justify-center rounded-lg border border-line hover:bg-background";
  return (
    <aside className="h-fit rounded-xl border border-line bg-surface lg:sticky lg:top-6" aria-labelledby="focus-title">
      <div className="flex items-center justify-between gap-2 border-b border-line p-4">
        <div className="min-w-0">
          <h3 id="focus-title" className="font-semibold">
            Week {n} focus
          </h3>
          <p className="text-xs text-muted">
            {isCurrent ? (started ? "This week" : "Week 1, coming up") : n > currentWeek ? `${n - currentWeek} week${n - currentWeek === 1 ? "" : "s"} ahead` : `${currentWeek - n} week${currentWeek - n === 1 ? "" : "s"} back`}
            {!isCurrent && (
              <>
                {" · "}
                <Link href="/" className="font-medium text-foreground hover:underline">
                  back to this week
                </Link>
              </>
            )}
          </p>
        </div>
        <nav aria-label="Browse weeks" className="flex gap-1">
          {n > 1 ? (
            <Link href={weekHref(n - 1)} scroll={false} aria-label={`Week ${n - 1}`} className={arrow}>
              ‹
            </Link>
          ) : (
            <span className={`${arrow} opacity-40`} aria-hidden>
              ‹
            </span>
          )}
          {n < TOTAL_WEEKS ? (
            <Link href={weekHref(n + 1)} scroll={false} aria-label={`Week ${n + 1}`} className={arrow}>
              ›
            </Link>
          ) : (
            <span className={`${arrow} opacity-40`} aria-hidden>
              ›
            </span>
          )}
        </nav>
      </div>

      <div className="space-y-5 p-4">
        <FocusGroup title="DSA" dot="bg-cat-dsa" summary={focus.week.dsa} items={focus.dsa.items} moreHref={focus.dsa.href} moreLabel="Open in DSA">
          {focus.dsa.next && (
            <Link href={focus.dsa.next.href} className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent">
              <span className="truncate">Next problem: {focus.dsa.next.title}</span>
              <span aria-hidden>→</span>
            </Link>
          )}
        </FocusGroup>
        <FocusGroup title="System design" dot="bg-cat-sd" summary={focus.week.sd} items={focus.sd.items} moreHref="/study/sd" moreLabel="All system design" />
        <FocusGroup
          title={focus.lld.items.length ? "LLD + behavioral" : "Behavioral + other"}
          dot="bg-cat-beh"
          summary={focus.week.other}
          items={focus.lld.items}
          moreHref={focus.lld.items.length ? "/study/lld" : undefined}
          moreLabel="All LLD"
        />
      </div>
    </aside>
  );
}

function FocusGroup(props: {
  title: string;
  dot: string;
  summary: string;
  items: FocusItem[];
  moreHref?: string;
  moreLabel: string;
  children?: React.ReactNode;
}) {
  const done = props.items.filter((i) => i.done).length;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <span className={`inline-block size-2 rounded-full ${props.dot}`} />
          {props.title}
        </h4>
        {props.items.length > 0 && (
          <span className="text-xs text-muted">
            {done}/{props.items.length} done
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted">{props.summary}</p>
      {props.items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {props.items.map((i) => (
            <li key={i.id}>
              <Link href={i.href} prefetch={false} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-background">
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    i.done ? "border-accent bg-accent text-on-accent" : "border-line"
                  }`}
                  aria-hidden
                >
                  {i.done ? "✓" : ""}
                </span>
                <span className={`min-w-0 flex-1 truncate ${i.done ? "text-muted" : ""}`}>{i.title}</span>
                <span className="shrink-0 text-xs text-muted">{i.detail}</span>
                <span className="sr-only">{i.done ? "(done)" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {props.children}
      {props.moreHref && (
        <Link href={props.moreHref} prefetch={false} className="mt-2 inline-block text-xs font-medium text-muted hover:text-foreground">
          {props.moreLabel} →
        </Link>
      )}
    </section>
  );
}
