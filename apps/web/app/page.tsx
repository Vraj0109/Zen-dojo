import { Suspense } from "react";
import { after, connection } from "next/server";
import Link from "next/link";
import { CATEGORIES, TOTAL_WEEKS, formatLong, type Category } from "@habit/shared";
import { getResolveDueCount } from "@/lib/dsa";
import { taskLink, type FocusItem, type TaskLink, type WeekFocusView } from "@/lib/focus";
import { syncLeetCodeIfStale } from "@/lib/leetcode/sync";
import type { Task } from "@/lib/schema";
import { REVIEW_KIND_LABELS } from "@/lib/review";
import { getContinue } from "@/lib/courses";
import { getCountdown } from "@/lib/revise";
import { ToolsNotice } from "./tools-notice";
import { addTaskAction, deleteTaskAction, freezeDayAction, toggleTaskAction } from "./actions";
import { SubmitButton } from "./submit-button";
import { CatchUpDrawer } from "./today/today-ui";
import { todayView, reviewSplit, weekFocus } from "./today/data";
import { Badge, ButtonLink, CheckIcon, FlameIcon, INPUT_CLASS, PageMain, ProgressBar, ProgressRing, StatusMark, buttonClass } from "./ui";
import { SignInCard } from "./components/sign-in-card";
import { TodayCardSkeleton, TodayTopSkeleton, UpNextSkeleton } from "./components/today-skeleton";

/** Rows shown in "Up next" before "+N more". */
const UP_NEXT_VISIBLE = 5;
/** Reviews listed on the "Due for review" card. */
const REVIEW_VISIBLE = 5;

// Each section reads its own data inside its own <Suspense>, so the page shell and the first section paint without
// waiting for the slowest read (the review queue). Reads are shared through `cache` (today/data.ts).
export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <PageMain title="Today">
      <Suspense fallback={null}>
        <SignInCard next="/" phoneOnly />
      </Suspense>
      <div className="space-y-6">
        <Suspense fallback={<TodayTopSkeleton />}>
          <TodayTop />
        </Suspense>
        <Suspense fallback={<UpNextSkeleton />}>
          <UpNext />
        </Suspense>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Suspense fallback={<TodayCardSkeleton label="Loading this week's focus" rows={6} />}>
            <WeekFocusCard searchParams={searchParams} />
          </Suspense>
          <Suspense fallback={<TodayCardSkeleton label="Loading reviews" />}>
            <DueForReview />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ThisWeek />
        </Suspense>
      </div>
    </PageMain>
  );
}

const currentWeekOf = (weekNo: number) => Math.min(Math.max(weekNo, 1), TOTAL_WEEKS);

// ---- greeting and progress row

async function TodayTop() {
  // Today's date and the database are per-request; render at request time.
  await connection();
  if (process.env.HABIT_HOSTED !== "1") after(syncLeetCodeIfStale); // pull new LeetCode solves after the page is sent
  const v = await todayView();
  const { beforeStart, finished } = v;
  const done = v.dayTasks.filter((t) => t.status === "done").length;
  const lvl = v.level;
  const toNext = Math.max(0, lvl.xpForNext - lvl.xpIntoLevel);

  return (
    <div className="space-y-5">
      <header>
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
              <Link href="/backlog" className="font-medium text-warning hover:underline">
                Backlog: {v.backlogCount} {v.backlogCount === 1 ? "task" : "tasks"}
              </Link>
            </>
          )}
        </p>
        <h2 className="text-2xl font-bold tracking-tight">{formatLong(v.today)}</h2>
      </header>

      <div className="flex flex-wrap gap-4">
        {/* Daily goal: today's tasks done */}
        <div className="flex min-w-56 flex-1 items-center gap-4 rounded-md border border-line bg-surface p-5">
          <ProgressRing value={done} max={v.dayTasks.length} label="Today's tasks done" size={48} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Daily goal</p>
            {v.dayTasks.length > 0 ? (
              <p className="text-lg font-semibold tabular-nums">
                {done} of {v.dayTasks.length} tasks
              </p>
            ) : (
              <p className="text-lg font-semibold">No tasks today</p>
            )}
          </div>
        </div>

        {/* XP and level */}
        <Link href="/profile" className="gamify-only block min-w-56 flex-1 rounded-md border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-120 ease-dojo hover:border-line-strong hover:shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              Level {lvl.level} · {lvl.tier}
            </p>
            <p className="text-xs font-medium text-muted tabular-nums">+{v.todayXp} XP today</p>
          </div>
          <div className="mt-3">
            <ProgressBar value={lvl.xpIntoLevel} max={lvl.xpForNext} label="Progress to next level" tone="reward" />
          </div>
          <p className="mt-2 text-sm">
            <span className="font-semibold tabular-nums">{toNext} XP</span> <span className="text-muted">to level {lvl.level + 1}</span>
          </p>
        </Link>

        {/* Streak with the last 7 days */}
        <div className="gamify-only flex min-w-56 flex-1 items-center gap-4 rounded-md border border-line bg-surface p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-reward-soft">
            <FlameIcon className="size-6 text-reward" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">Streak</p>
            <p className="text-lg font-semibold tabular-nums">
              {v.streak} {v.streak === 1 ? "day" : "days"}
            </p>
            <ol className="mt-1.5 flex gap-1" aria-label="Last 7 days">
              {v.lastSevenDays.map((d, i) => (
                <li
                  key={d.date}
                  title={formatLong(d.date)}
                  className={`h-1.5 flex-1 rounded-full ${d.kept ? "bg-reward" : "bg-surface-2"} ${i === 6 ? "ring-1 ring-line-strong ring-offset-1 ring-offset-surface" : ""}`}
                >
                  <span className="sr-only">
                    {formatLong(d.date)}: {d.kept ? "kept" : "missed"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <ToolsNotice />
      </Suspense>

      {v.freezeOffer.length > 0 && (
        <form action={freezeDayAction} className="gamify-only flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-5">
          <input type="hidden" name="day" value={v.freezeOffer[0]} />
          <p className="text-sm">
            You missed <strong>{formatLong(v.freezeOffer[0])}</strong>. Use this week&apos;s streak freeze to keep your streak? The day gives no XP.
          </p>
          <SubmitButton className={buttonClass("secondary", "sm")}>Freeze that day</SubmitButton>
        </form>
      )}

      {beforeStart && (
        <p className="rounded-md border border-line bg-surface p-5">
          Your plan starts on <strong>{formatLong(v.planStart)}</strong>. You can work ahead from the week focus below, or{" "}
          <Link href="/profile/settings" className="font-medium text-primary hover:underline">
            change the start date
          </Link>
          .
        </p>
      )}
      {finished && <p className="rounded-md border border-line bg-surface p-5">You finished all {TOTAL_WEEKS} weeks. Good luck in the interviews!</p>}
    </div>
  );
}

// ---- up next

/** One line of the Up next list: the interview countdown, the review queue, or a task for today. */
type UpNextRow =
  | { kind: "link"; key: string; label: string; title: string; detail: string; href: string; edge: string }
  | { kind: "task"; key: string; task: Task };

async function UpNext() {
  await connection();
  const v = await todayView();
  const currentWeek = currentWeekOf(v.weekNo);
  const [resolveDue, { dueToday, backlog }, countdown, keepLearning, focus] = await Promise.all([
    getResolveDueCount(),
    reviewSplit(),
    getCountdown(),
    getContinue(),
    weekFocus(currentWeek),
  ]);
  const { beforeStart, finished } = v;
  const due = { resolve: resolveDue, reviews: dueToday.length };
  const link = (t: Task) => taskLink(t, focus, due);
  const doneTasks = v.dayTasks.filter((t) => t.status === "done");
  const undoneTasks = v.dayTasks.filter((t) => t.status !== "done");

  const rows: UpNextRow[] = [];
  if (countdown && countdown.daysLeft >= 0 && countdown.daysLeft <= 14) {
    rows.push({
      kind: "link",
      key: "countdown",
      label: "Interview",
      title: countdown.daysLeft === 0 ? "Interview today" : countdown.daysLeft === 1 ? "Interview tomorrow" : `${countdown.daysLeft} days to your interview`,
      detail: countdown.phase ? `${countdown.phase.title}: see the plan` : "Quick revise",
      href: "/revise",
      edge: "border-l-primary",
    });
  }
  if (dueToday.length > 0) {
    const kinds = Object.entries(
      dueToday.reduce<Record<string, number>>((acc, r) => ({ ...acc, [REVIEW_KIND_LABELS[r.kind]]: (acc[REVIEW_KIND_LABELS[r.kind]] ?? 0) + 1 }), {}),
    )
      .map(([label, n]) => `${n} ${label.toLowerCase()}`)
      .join(" · ");
    rows.push({ kind: "link", key: "reviews", label: "Review", title: `${dueToday.length} review${dueToday.length === 1 ? "" : "s"} due today`, detail: kinds, href: "/review", edge: "border-l-warning" });
  }
  const active = !beforeStart && !finished;
  if (active) for (const t of undoneTasks) rows.push({ kind: "task", key: `task-${t.id}`, task: t });
  const open = rows.length;
  // Done tasks stay in the list (checked, struck through) after the open ones, so they can be unticked.
  if (active) for (const t of doneTasks) rows.push({ kind: "task", key: `task-${t.id}`, task: t });

  const visible = rows.slice(0, UP_NEXT_VISIBLE);
  const more = rows.slice(UP_NEXT_VISIBLE);
  const nextWeekTask = v.weekTasks.find((t) => t.status !== "done");
  if (rows.length === 0 && !active) return null;

  return (
    <section aria-labelledby="up-next" className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <h3 id="up-next" className="text-lg font-semibold">
            Up next
          </h3>
          <CatchUpDrawer backlog={backlog} />
        </div>
        {active && v.dayTasks.length > 0 && (
          <span className="flex items-center gap-3 text-sm text-muted tabular-nums">
            <span className="hidden w-28 sm:block">
              <ProgressBar value={doneTasks.length} max={v.dayTasks.length} label="Tasks done today" />
            </span>
            {doneTasks.length} of {v.dayTasks.length} done
          </span>
        )}
      </div>

      {open === 0 && (
        <div className="space-y-2 border-b border-line px-5 py-4 last:border-b-0">
          <p className="anim-pop flex items-center gap-2 font-medium">
            <CheckIcon className="size-4 text-success" />
            All done for today.
          </p>
          {keepLearning && (
            <p className="text-sm text-muted">
              Keep learning:{" "}
              <Link href={keepLearning.href} className="font-medium text-primary hover:underline">
                {keepLearning.title}
              </Link>{" "}
              ({keepLearning.course})
            </p>
          )}
          {focus.dsa.next ? (
            <p className="text-sm text-muted">
              Want to get ahead? Next problem:{" "}
              <Link href={focus.dsa.next.href} className="font-medium text-primary hover:underline">
                {focus.dsa.next.title}
              </Link>
            </p>
          ) : nextWeekTask ? (
            <p className="text-sm text-muted">Next on this week&apos;s list: {nextWeekTask.title}</p>
          ) : null}
        </div>
      )}
      {rows.length > 0 && (
        <>
          <ul className="anim-stagger divide-y divide-line">
            {visible.map((r) => (
              <UpNextItem key={r.key} row={r} link={link} />
            ))}
          </ul>
          {more.length > 0 && (
            <details className="group border-t border-line">
              <summary className="cursor-pointer list-none px-5 py-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground">
                <span aria-hidden className="mr-2 inline-block transition-transform duration-180 group-open:rotate-90">
                  ›
                </span>
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
  );
}

const CATEGORY_DOT: Record<Category, string> = {
  dsa: "bg-cat-dsa",
  sd: "bg-cat-sd",
  beh_lld: "bg-cat-beh",
  mock_app: "bg-cat-mock",
  other: "bg-cat-other",
};

const CATEGORY_EDGE: Record<Category, string> = {
  dsa: "border-l-cat-dsa",
  sd: "border-l-cat-sd",
  beh_lld: "border-l-cat-beh",
  mock_app: "border-l-cat-mock",
  other: "border-l-cat-other",
};

function UpNextItem({ row, link }: { row: UpNextRow; link: (t: Task) => TaskLink | null }) {
  if (row.kind === "task") return <TaskRow t={row.task} link={link} />;
  return (
    <li className={`hit flex items-center gap-3 border-l-[3px] px-5 py-3.5 ${row.edge}`}>
      <span aria-hidden className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{row.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className="font-medium text-foreground">{row.label}</span>
          <span>· {row.detail}</span>
        </p>
      </div>
      <Link href={row.href} prefetch={false} className={buttonClass("secondary", "sm", "hit-link shrink-0")}>
        Open <span aria-hidden>→</span>
      </Link>
    </li>
  );
}

function TaskList({ tasks, link }: { tasks: Task[]; link: (t: Task) => TaskLink | null }) {
  if (tasks.length === 0) return <p className="px-5 py-4 text-sm text-muted">Nothing here yet.</p>;
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
    <li className={`${go ? "hit " : ""}flex items-start gap-3 border-l-[3px] px-5 py-3.5 ${done ? "border-l-transparent" : CATEGORY_EDGE[cat]}`}>
      <form action={toggleTaskAction} className="pt-0.5">
        <input type="hidden" name="id" value={t.id} />
        <SubmitButton
          aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
          className={`flex size-5 shrink-0 items-center justify-center rounded-sm border-2 transition-colors duration-120 ${
            done ? "border-success bg-success text-on-primary" : "border-line-strong hover:border-primary"
          }`}
        >
          {done && (
            <svg className="anim-pop size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m3.5 8.5 3 3 6-7" />
            </svg>
          )}
        </SubmitButton>
      </form>
      <div className="min-w-0 flex-1">
        <p className={done ? "break-words text-muted line-through" : "break-words font-medium"}>{t.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span aria-hidden className={`inline-block size-2 rounded-full ${CATEGORY_DOT[cat]}`} />
          {CATEGORIES[cat].label}
          {t.minutes ? <span className="tabular-nums">· {t.minutes} min</span> : null}
          <span className={`gamify-only tabular-nums ${done ? "" : "font-medium text-foreground"}`}>· +{t.xp} XP</span>
        </p>
      </div>
      {go && (
        <Link href={go.href} prefetch={false} title={go.label} className={buttonClass(done ? "quiet" : "secondary", "sm", "hit-link max-w-60 shrink-0 max-sm:hidden")}>
          <span className="truncate">{go.label}</span>
          <span aria-hidden>→</span>
        </Link>
      )}
      {go && (
        <Link href={go.href} prefetch={false} aria-label={`Open: ${go.label}`} className={buttonClass("secondary", "sm", "shrink-0 sm:hidden")}>
          <span aria-hidden>→</span>
        </Link>
      )}
      {t.templateKey === null && (
        <form action={deleteTaskAction}>
          <input type="hidden" name="id" value={t.id} />
          <SubmitButton aria-label={`Delete "${t.title}"`} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground">
            ×
          </SubmitButton>
        </form>
      )}
    </li>
  );
}

// ---- this week's tasks

async function ThisWeek() {
  await connection();
  const v = await todayView();
  if (v.beforeStart || v.finished) return null;
  const [resolveDue, { dueToday }, focus] = await Promise.all([getResolveDueCount(), reviewSplit(), weekFocus(currentWeekOf(v.weekNo))]);
  const link = (t: Task) => taskLink(t, focus, { resolve: resolveDue, reviews: dueToday.length });
  const doneCount = v.weekTasks.filter((t) => t.status === "done").length;
  return (
    <details className="group overflow-hidden rounded-md border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-surface-2">
        <span aria-hidden className="inline-block text-muted transition-transform duration-180 group-open:rotate-90">
          ›
        </span>
        <span className="font-semibold">This week&apos;s tasks</span>
        <span className="ml-auto w-40 max-sm:hidden">
          <ProgressBar value={doneCount} max={v.weekTasks.length} label="This week's tasks done" showCount />
        </span>
        <span className="text-sm text-muted tabular-nums sm:hidden">
          {doneCount} of {v.weekTasks.length}
        </span>
      </summary>
      <div className="border-t border-line">
        <TaskList tasks={v.weekTasks} link={link} />
        <form action={addTaskAction} className="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row">
          <input name="title" required maxLength={200} placeholder="Add your own task, e.g. LeetCode 560 Subarray Sum Equals K" aria-label="Task title" className={`${INPUT_CLASS} min-w-0 flex-1`} />
          <select name="category" aria-label="Category" className={`${INPUT_CLASS} sm:w-auto`} defaultValue="dsa">
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
          <select name="scope" aria-label="When" className={`${INPUT_CLASS} sm:w-auto`} defaultValue="day">
            <option value="day">Today</option>
            <option value="week">This week</option>
          </select>
          <SubmitButton className={buttonClass("primary", "md")}>Add task</SubmitButton>
        </form>
      </div>
    </details>
  );
}

// ---- due for review

async function DueForReview() {
  await connection();
  const { dueToday, backlog } = await reviewSplit();
  const shown = dueToday.slice(0, REVIEW_VISIBLE);
  return (
    <section aria-labelledby="due-review" className="rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h3 id="due-review" className="text-lg font-semibold">
          Due for review
        </h3>
        {dueToday.length > 0 && <span className="text-sm font-semibold text-warning tabular-nums">{dueToday.length} today</span>}
      </div>
      {shown.length === 0 ? (
        <div className="space-y-1 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CheckIcon className="size-4 text-success" />
            Nothing due today.
          </p>
          {backlog.length > 0 && <p className="text-sm text-muted">{backlog.length} older items wait in catch-up.</p>}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <Link href={r.href} prefetch={false} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted">{r.detail}</span>
                </span>
                <Badge tone="warning">{REVIEW_KIND_LABELS[r.kind]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line px-5 py-3">
        <ButtonLink href="/review" variant={dueToday.length > 0 ? "primary" : "secondary"} size="sm">
          {dueToday.length > 0 ? "Start review" : "Open review"}
        </ButtonLink>
      </div>
    </section>
  );
}

// ---- this week's focus

/** One week's patterns, concepts and designs with your progress; ‹ › to look at other weeks (?week=N). */
async function WeekFocusCard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  const [v, params] = await Promise.all([todayView(), searchParams]);
  const currentWeek = currentWeekOf(v.weekNo);
  const asked = Number(Array.isArray(params.week) ? params.week[0] : params.week);
  const browsingWeek = Number.isInteger(asked) && asked >= 1 && asked <= TOTAL_WEEKS;
  const focus = await weekFocus(browsingWeek ? asked : currentWeek);
  return <FocusPanel focus={focus} currentWeek={currentWeek} started={!v.beforeStart} />;
}

function FocusPanel({ focus, currentWeek, started }: { focus: WeekFocusView; currentWeek: number; started: boolean }) {
  const n = focus.weekNo;
  const isCurrent = n === currentWeek;
  const weekHref = (w: number) => (w === currentWeek ? "/" : `/?week=${w}`);
  const arrow = buttonClass("secondary", "sm", "w-8 px-0");
  return (
    <section aria-labelledby="focus-title" className="rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h3 id="focus-title" className="text-lg font-semibold">
            {isCurrent ? "This week's focus" : `Week ${n} focus`}
          </h3>
          <p className="text-xs text-muted">
            {isCurrent ? (started ? `Week ${n}` : "Week 1, coming up") : n > currentWeek ? `${n - currentWeek} week${n - currentWeek === 1 ? "" : "s"} ahead` : `${currentWeek - n} week${currentWeek - n === 1 ? "" : "s"} back`}
            {!isCurrent && (
              <>
                {" · "}
                <Link href="/" className="font-medium text-primary hover:underline">
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
            <span className={`${arrow} opacity-45`} aria-hidden>
              ‹
            </span>
          )}
          {n < TOTAL_WEEKS ? (
            <Link href={weekHref(n + 1)} scroll={false} aria-label={`Week ${n + 1}`} className={arrow}>
              ›
            </Link>
          ) : (
            <span className={`${arrow} opacity-45`} aria-hidden>
              ›
            </span>
          )}
        </nav>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-3">
        <FocusGroup title="DSA" dot="bg-cat-dsa" summary={focus.week.dsa} items={focus.dsa.items} moreHref={focus.dsa.href} moreLabel="Open in Practice">
          {focus.dsa.next && (
            <Link href={focus.dsa.next.href} className={buttonClass("primary", "sm", "mt-2 w-full justify-between")}>
              <span className="truncate">Next problem: {focus.dsa.next.title}</span>
              <span aria-hidden>→</span>
            </Link>
          )}
        </FocusGroup>
        <FocusGroup title="System design" dot="bg-cat-sd" summary={focus.week.sd} items={focus.sd.items} moreHref="/study/sd" moreLabel="All system design" />
        <FocusGroup
          title={focus.lld.items.length ? "LLD + behavioral" : "Behavioral + other"}
          dot={focus.lld.items.length ? "bg-cat-lld" : "bg-cat-beh"}
          summary={focus.week.other}
          items={focus.lld.items}
          moreHref={focus.lld.items.length ? "/study/lld" : undefined}
          moreLabel="All LLD"
        />
      </div>
    </section>
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
    <section className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className={`inline-block size-2 rounded-full ${props.dot}`} />
          {props.title}
        </h4>
        {props.items.length > 0 && (
          <span className="text-xs text-muted tabular-nums">
            {done} of {props.items.length}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted">{props.summary}</p>
      {props.items.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {props.items.map((i) => (
            <li key={i.id}>
              <Link href={i.href} prefetch={false} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
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
        <Link href={props.moreHref} prefetch={false} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
          {props.moreLabel} →
        </Link>
      )}
    </section>
  );
}
