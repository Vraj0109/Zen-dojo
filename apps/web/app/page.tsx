import { Suspense } from "react";
import { after, connection } from "next/server";
import Link from "next/link";
import { CATEGORIES, TOTAL_WEEKS, formatLong, type Category } from "@habit/shared";
import { getResolveDueCount } from "@/lib/dsa";
import { getWeekFocus, taskLink, type FocusItem, type TaskLink, type WeekFocusView } from "@/lib/focus";
import { syncLeetCodeIfStale } from "@/lib/leetcode/sync";
import type { Task } from "@/lib/schema";
import { REVIEW_KIND_LABELS, getReviewQueue, splitReviewQueue } from "@/lib/review";
import { getContinue } from "@/lib/courses";
import { getCountdown } from "@/lib/revise";
import { getTodayView } from "@/lib/tasks";
import { ToolsNotice } from "./tools-notice";
import { addTaskAction, deleteTaskAction, freezeDayAction, toggleTaskAction } from "./actions";
import { SubmitButton } from "./submit-button";
import { CatchUpDrawer } from "./today/today-ui";
import { PageMain, ProgressBar, StatusMark } from "./ui";
import { TodaySkeleton } from "./components/today-skeleton";

/** Rows shown in "Up next" before "+N more". */
const UP_NEXT_VISIBLE = 5;

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <PageMain title="Today">
      <Suspense fallback={<TodaySkeleton />}>
        <Today searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

/** One line of the Up next list: the interview countdown, the review queue, or an undone task for today. */
type UpNextRow =
  | { kind: "link"; key: string; label: string; title: string; detail: string; href: string }
  | { kind: "task"; key: string; task: Task };

async function Today({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // Today's date and the database are per-request; render at request time.
  await connection();
  if (process.env.HABIT_HOSTED !== "1") after(syncLeetCodeIfStale); // pull new LeetCode solves after the page is sent
  const params = await searchParams;
  const [v, resolveDue, reviews, countdown, keepLearning] = await Promise.all([getTodayView(), getResolveDueCount(), getReviewQueue(), getCountdown(), getContinue()]);
  const { dueToday, backlog } = splitReviewQueue(reviews);
  const beforeStart = v.beforeStart;
  const finished = v.finished;
  const currentWeek = Math.min(Math.max(v.weekNo, 1), TOTAL_WEEKS);
  // ?week=N shows another week's focus, so you can work ahead (or catch up).
  const asked = Number(Array.isArray(params.week) ? params.week[0] : params.week);
  const browsingWeek = Number.isInteger(asked) && asked >= 1 && asked <= TOTAL_WEEKS;
  const shownWeek = browsingWeek ? asked : currentWeek;
  const [focus, shown] = await Promise.all([
    getWeekFocus(currentWeek),
    shownWeek === currentWeek ? null : getWeekFocus(shownWeek),
  ]);

  const due = { resolve: resolveDue, reviews: dueToday.length };
  const link = (t: Task) => taskLink(t, focus, due);
  const doneTasks = v.dayTasks.filter((t) => t.status === "done");
  const undoneTasks = v.dayTasks.filter((t) => t.status !== "done");
  const lvl = v.level;

  const rows: UpNextRow[] = [];
  if (countdown && countdown.daysLeft >= 0 && countdown.daysLeft <= 14) {
    rows.push({
      kind: "link",
      key: "countdown",
      label: "Interview",
      title: countdown.daysLeft === 0 ? "Interview today" : countdown.daysLeft === 1 ? "Interview tomorrow" : `${countdown.daysLeft} days to your interview`,
      detail: countdown.phase ? `${countdown.phase.title}: see the plan` : "Quick revise",
      href: "/revise",
    });
  }
  if (dueToday.length > 0) {
    const kinds = Object.entries(
      dueToday.reduce<Record<string, number>>((acc, r) => ({ ...acc, [REVIEW_KIND_LABELS[r.kind]]: (acc[REVIEW_KIND_LABELS[r.kind]] ?? 0) + 1 }), {}),
    )
      .map(([label, n]) => `${n} ${label.toLowerCase()}`)
      .join(" · ");
    rows.push({ kind: "link", key: "reviews", label: "Review", title: `${dueToday.length} review${dueToday.length === 1 ? "" : "s"} due today`, detail: kinds, href: "/review" });
  }
  if (!beforeStart && !finished) for (const t of undoneTasks) rows.push({ kind: "task", key: `task-${t.id}`, task: t });

  const visible = rows.slice(0, UP_NEXT_VISIBLE);
  const more = rows.slice(UP_NEXT_VISIBLE);
  const nextWeekTask = v.weekTasks.find((t) => t.status !== "done");
  const showUpNext = rows.length > 0 || (!beforeStart && !finished);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">
            {beforeStart ? "Plan not started" : finished ? "Plan finished" : `Week ${v.weekNo} of ${TOTAL_WEEKS}`}
            {!beforeStart && !finished && (
              <span className="font-normal">
                {" · "}
                {v.weeksLeft} {v.weeksLeft === 1 ? "week" : "weeks"} left
              </span>
            )}
            {!beforeStart && !finished && v.backlogCount > 0 && (
              <>
                {" · "}
                <Link href="/backlog" className="font-medium hover:text-foreground hover:underline">
                  Backlog: {v.backlogCount} {v.backlogCount === 1 ? "task" : "tasks"}
                </Link>
              </>
            )}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{formatLong(v.today)}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Chip label="Streak" value={`${v.streak} day${v.streak === 1 ? "" : "s"}`} className="gamify-only" />
          <Chip label="Today" value={`+${v.todayXp} XP`} className="gamify-only" />
          <Link href="/profile" className="gamify-only rounded-xl border border-line bg-surface px-3 py-2 hover:bg-background">
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

      <Suspense fallback={null}>
        <ToolsNotice />
      </Suspense>

      {v.freezeOffer.length > 0 && (
        <form action={freezeDayAction} className="gamify-only flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
          <input type="hidden" name="day" value={v.freezeOffer[0]} />
          <p className="text-sm">
            You missed <strong>{formatLong(v.freezeOffer[0])}</strong>. Use this week&apos;s streak freeze to keep your streak? The day gives no XP.
          </p>
          <SubmitButton className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-background">Freeze that day</SubmitButton>
        </form>
      )}

      {beforeStart && (
        <p className="rounded-xl border border-line bg-surface p-4">
          Your plan starts on <strong>{formatLong(v.planStart)}</strong>. You can work ahead from the week focus below, or{" "}
          <Link href="/profile/settings" className="font-medium underline">
            change the start date
          </Link>
          .
        </p>
      )}
      {finished && <p className="rounded-xl border border-line bg-surface p-4">You finished all {TOTAL_WEEKS} weeks. Good luck in the interviews!</p>}

      {showUpNext && (
        <section aria-labelledby="up-next" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex items-center gap-3">
              <h3 id="up-next" className="font-semibold">
                Up next
              </h3>
              <CatchUpDrawer backlog={backlog} />
            </div>
            {!beforeStart && !finished && v.dayTasks.length > 0 && (
              <span className="flex items-center gap-3 text-sm text-muted">
                <span className="hidden w-28 sm:block">
                  <ProgressBar value={doneTasks.length} max={v.dayTasks.length} label="Tasks done today" />
                </span>
                {doneTasks.length} of {v.dayTasks.length} done
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="space-y-2 p-4">
              <p className="anim-pop font-medium">All done for today.</p>
              {keepLearning && (
                <p className="text-sm text-muted">
                  Keep learning:{" "}
                  <Link href={keepLearning.href} className="font-medium text-foreground underline">
                    {keepLearning.title}
                  </Link>{" "}
                  ({keepLearning.course})
                </p>
              )}
              {focus.dsa.next ? (
                <p className="text-sm text-muted">
                  Want to get ahead? Next problem:{" "}
                  <Link href={focus.dsa.next.href} className="font-medium text-foreground underline">
                    {focus.dsa.next.title}
                  </Link>
                </p>
              ) : nextWeekTask ? (
                <p className="text-sm text-muted">Next on this week&apos;s list: {nextWeekTask.title}</p>
              ) : null}
            </div>
          ) : (
            <>
              <ul className="anim-stagger divide-y divide-line">
                {visible.map((r) => (
                  <UpNextItem key={r.key} row={r} link={link} />
                ))}
              </ul>
              {more.length > 0 && (
                <details className="group border-t border-line">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted hover:text-foreground">
                    <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
                    +{more.length} more
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {more.map((r) => (
                      <UpNextItem key={r.key} row={r} link={link} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>
      )}

      {!beforeStart && !finished && doneTasks.length > 0 && (
        <Fold title={`Done today · ${doneTasks.length}`}>
          <TaskList tasks={doneTasks} link={link} />
        </Fold>
      )}

      {!beforeStart && !finished && (
        <Fold title={`This week · ${v.weekTasks.filter((t) => t.status === "done").length} / ${v.weekTasks.length} done`}>
          <TaskList tasks={v.weekTasks} link={link} />
          <form action={addTaskAction} className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Add your own task, e.g. LeetCode 560 Subarray Sum Equals K"
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
        </Fold>
      )}

      <Fold title={`Week ${shownWeek} focus`} open={browsingWeek || beforeStart}>
        <FocusPanel focus={shown ?? focus} currentWeek={currentWeek} started={!beforeStart} />
      </Fold>
    </div>
  );
}

/** A collapsed section: summary line, body behind one click. */
function Fold({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer list-none p-4 font-semibold">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  );
}

function Chip({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface px-3 py-2 ${className}`}>
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

function UpNextItem({ row, link }: { row: UpNextRow; link: (t: Task) => TaskLink | null }) {
  if (row.kind === "task") return <TaskRow t={row.task} link={link} />;
  return (
    <li className="hit flex items-center gap-3 p-4">
      <span aria-hidden className="size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{row.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className="font-medium text-accent">{row.label}</span>
          <span>· {row.detail}</span>
        </p>
      </div>
      <Link href={row.href} prefetch={false} className="hit-link shrink-0 rounded-lg border border-accent px-3 py-1.5 text-sm font-medium hover:bg-background">
        Open <span aria-hidden>→</span>
      </Link>
    </li>
  );
}

function TaskList({ tasks, link }: { tasks: Task[]; link: (t: Task) => TaskLink | null }) {
  if (tasks.length === 0) return <p className="p-4 text-muted">Nothing here yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => (
        <TaskRow key={t.id} t={t} link={link} />
      ))}
    </ul>
  );
}

function TaskRow({ t, link }: { t: Task; link: (t: Task) => TaskLink | null }) {
  const done = t.status === "done";
  const cat = (t.category in CATEGORIES ? t.category : "other") as Category;
  const go = link(t);
  return (
    <li className={`${go ? "hit " : ""}flex items-start gap-3 p-4`}>
      <form action={toggleTaskAction} className="pt-0.5">
        <input type="hidden" name="id" value={t.id} />
        <SubmitButton
          aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
            done ? "border-accent bg-accent text-on-accent" : "border-line hover:border-accent"
          }`}
        >
          {done && (
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m3.5 8.5 3 3 6-7" />
            </svg>
          )}
        </SubmitButton>
      </form>
      <div className="min-w-0 flex-1">
        <p className={done ? "break-words text-muted line-through" : "break-words font-medium"}>{t.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className={`inline-block size-2 rounded-full ${CATEGORY_STYLES[cat]}`} />
          {CATEGORIES[cat].label}
          {t.minutes ? <span>· {t.minutes} min</span> : null}
          <span className={`gamify-only ${done ? "" : "font-medium text-accent"}`}>· +{t.xp} XP</span>
        </p>
      </div>
      {go && (
        <Link
          href={go.href}
          prefetch={false}
          title={go.label}
          className={`hit-link hidden max-w-60 shrink-0 items-center gap-1 truncate rounded-lg border px-3 py-1.5 text-sm font-medium sm:inline-flex ${
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
}

/** One week's patterns, concepts and designs with your progress; ‹ › to look at other weeks. */
function FocusPanel({ focus, currentWeek, started }: { focus: WeekFocusView; currentWeek: number; started: boolean }) {
  const n = focus.weekNo;
  const isCurrent = n === currentWeek;
  const weekHref = (w: number) => (w === currentWeek ? "/" : `/?week=${w}`);
  const arrow = "flex size-8 items-center justify-center rounded-lg border border-line hover:bg-background";
  return (
    <div aria-labelledby="focus-title">
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

      <div className="grid gap-5 p-4 lg:grid-cols-3">
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
    </div>
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
                <StatusMark state={i.done ? "solved" : "none"} />
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
