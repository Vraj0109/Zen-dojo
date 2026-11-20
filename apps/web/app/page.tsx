import { Suspense } from "react";
import { after, connection } from "next/server";
import Link from "next/link";
import { CATEGORIES, TOTAL_WEEKS, addDays, formatLong, startOfWeek, type Category } from "@habit/shared";
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
import { CatchUpDrawer, HeroRing, StartFocusButton } from "./today/today-ui";
import { xpEvents } from "@/lib/progress";
import { todayView, reviewSplit, weekFocus } from "./today/data";
import {
  Badge,
  ButtonLink,
  CheckIcon,
  INPUT_CLASS,
  PageMain,
  ProgressBar,
  StatusMark,
  SubjectShape,
  WavyProgress,
  buttonClass,
  type Subject,
} from "./ui";
import { SignInCard } from "./components/sign-in-card";
import { TodayCardSkeleton, TodayTopSkeleton, UpNextSkeleton } from "./components/today-skeleton";

/** Rows shown in "Up next" before "+N more". */
const UP_NEXT_VISIBLE = 5;
/** Reviews listed on the "Due for review" card. */
const REVIEW_VISIBLE = 5;

const NUMBER_WORDS: Record<number, string> = {
  0: "No",
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
};

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <PageMain title="Today" hideTitle>
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
        <div id="this-week" className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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

      <StartFocusButton variant="fab" />
    </PageMain>
  );
}

const currentWeekOf = (weekNo: number) => Math.min(Math.max(weekNo, 1), TOTAL_WEEKS);

// ---- greeting, hero card and stat cards

async function TodayTop() {
  await connection();
  if (process.env.HABIT_HOSTED !== "1") after(syncLeetCodeIfStale);
  const [v, { dueToday }, events] = await Promise.all([todayView(), reviewSplit(), xpEvents().catch(() => [])]);
  const { beforeStart, finished } = v;
  const done = v.dayTasks.filter((t) => t.status === "done").length;
  const total = v.dayTasks.length;
  const undoneCount = total - done;
  const undoneMinutes = v.dayTasks.filter((t) => t.status !== "done").reduce((acc, t) => acc + (t.minutes || 30), 0);
  const lvl = v.level;
  const toNext = Math.max(0, lvl.xpForNext - lvl.xpIntoLevel);

  const word = NUMBER_WORDS[total] ?? String(total);
  const titleText = total === 1 ? "One thing today" : `${word} things today`;

  // Hero one-liner message
  let heroMessage = "";
  if (beforeStart) {
    heroMessage = `Your plan starts on ${formatLong(v.planStart)}. You can work ahead from week focus.`;
  } else if (finished) {
    heroMessage = `You finished all ${TOTAL_WEEKS} weeks. Good luck in your interviews!`;
  } else if (total === 0) {
    heroMessage = "No scheduled tasks today. Work ahead or rest!";
  } else if (undoneCount === 0) {
    heroMessage = "All done for today! Excellent work.";
  } else if (done === 0) {
    heroMessage = `Ready to begin. ${undoneCount} ${undoneCount === 1 ? "task" : "tasks"}, about ${undoneMinutes} minutes.`;
  } else {
    heroMessage = `Nice start. ${undoneCount} left, about ${undoneMinutes} minutes.`;
  }

  // "This week": XP earned on each day Monday to Sunday, from the XP rows (progress.ts), scaled to the best day.
  const daysShort = ["M", "T", "W", "T", "F", "S", "S"];
  const monday = startOfWeek(v.today);
  const weekDates = daysShort.map((_, i) => addDays(monday, i));
  const weekXp = weekDates.map((d) => events.filter((e) => e.on === d).reduce((a, e) => a + e.xp, 0));
  const bestDay = Math.max(1, ...weekXp);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-[1_1_220px]">
          <p className="text-sm font-medium text-muted">
            {beforeStart ? "Plan not started" : finished ? "Plan finished" : `Week ${v.weekNo} of ${TOTAL_WEEKS}`}
            {" · "}
            {formatLong(v.today)}
          </p>
          <h1 className="mt-0.5 text-[28px] leading-[34px] font-semibold tracking-[-0.01em] text-foreground md:text-4xl md:leading-[44px]">{titleText}</h1>
        </div>
        <form action="/dsa" method="get" role="search" className="flex h-14 min-w-0 flex-[0_1_380px] items-center gap-3 rounded-full bg-surface-2 px-5 text-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary max-md:hidden">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <label htmlFor="today-search" className="sr-only">Search problems</label>
          <input
            id="today-search"
            type="search"
            name="q"
            placeholder="Search problems, lessons, notes"
            className="flex-1 min-w-0 border-0 bg-transparent text-foreground placeholder:text-muted outline-none text-[15px]"
          />
        </form>
      </header>

      {/* Hero card on primary-container */}
      <section aria-label="Today's plan" className="flex flex-wrap items-center gap-6 rounded-[32px] bg-primary-container p-5 text-on-primary-container md:px-8 md:py-7">
        <HeroRing done={done} total={total} />

        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
          <p className="text-sm font-medium opacity-80">Today&apos;s plan</p>
          <p className="text-xl leading-tight font-medium md:text-[26px]">{heroMessage}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StartFocusButton />
            <a
              href="#this-week"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-surface px-[22px] text-[15px] font-medium text-on-primary-container transition-opacity hover:opacity-90 dark:bg-primary/25"
            >
              See the week
            </a>
          </div>
        </div>

        {/* Desktop streak in Scallop on reward-soft */}
        <div className="gamify-only flex shrink-0 flex-col items-center gap-1 max-md:hidden">
          {/* Pale reward-soft shape with its own on-reward-soft number, plus a reward outline so the shape stays visible
              on themes whose hero container is close to reward-soft (Paper, Ember). */}
          <div className="relative size-24 grid place-items-center">
            <svg viewBox="0 0 100 100" className="size-full absolute inset-0 overflow-visible" aria-hidden="true">
              <path
                d="M50 4 61 13 75 10 80 24 94 30 90 44 98 56 87 66 88 80 74 83 66 95 52 90 38 96 30 84 16 81 15 67 4 57 12 44 8 30 22 24 27 10 41 12z"
                fill="var(--reward-soft)"
                stroke="var(--reward)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="relative z-10 text-3xl font-semibold tabular-nums" style={{ color: "var(--on-reward-soft)" }}>
              {v.streak}
            </span>
          </div>
          <span className="text-xs font-medium text-on-primary-container opacity-80">day streak</span>
        </div>
      </section>

      {/* Stat cards in auto-fill grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3 max-md:hidden">
        {/* Level card */}
        <section className="gamify-only flex flex-col justify-between gap-3 p-5 rounded-[28px] bg-surface border border-line dark:border-0">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-foreground">Level {lvl.level}</span>
            <span className="text-sm text-muted tabular-nums">
              {lvl.xpIntoLevel} / {lvl.xpForNext} XP
            </span>
          </div>
          <WavyProgress value={lvl.xpIntoLevel} max={lvl.xpForNext} label={`Progress to level ${lvl.level + 1}`} />
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{toNext} XP</span> to level {lvl.level + 1}. Two medium problems gets you there.
          </p>
        </section>

        {/* This week mini bar chart */}
        <section className="flex flex-col justify-between gap-3 p-5 rounded-[28px] bg-surface border border-line dark:border-0">
          <span className="text-[15px] font-medium text-foreground">This week</span>
          {/* Bars live in a fixed 56px area (their height is a share of the best day); labels sit below it,
              so the labels never eat into the measured height. */}
          <style>{`@keyframes zd-week-bar { from { scale: 1 0; } to { scale: 1 1; } }
.zd-week-bar { transform-origin: bottom; animation: zd-week-bar 0.36s var(--ease-spring) backwards; }`}</style>
          <div className="flex flex-col gap-1.5" role="img" aria-label={`XP this week: ${weekXp.reduce((a, b) => a + b, 0)}`}>
            <div className="flex h-14 items-end gap-2">
              {weekDates.map((date, idx) => {
                const isToday = date === v.today;
                const xp = weekXp[idx];
                const share = Math.round((xp / bestDay) * 100);
                return (
                  <div key={date} className="flex h-full flex-1 items-end" title={`${formatLong(date)}: ${xp} XP`}>
                    <span
                      className={`zd-week-bar block w-full rounded-full ${isToday ? "bg-primary" : xp > 0 ? "bg-primary-container" : "bg-surface-2"}`}
                      style={{ height: xp > 0 ? `max(10px, ${share}%)` : "6px", animationDelay: `${idx * 35}ms` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2" aria-hidden="true">
              {daysShort.map((dayLabel, idx) => (
                <span key={weekDates[idx]} className={`flex-1 text-center text-xs ${weekDates[idx] === v.today ? "font-semibold text-foreground" : "text-muted"}`}>
                  {dayLabel}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Due for review card */}
        <section className="flex flex-col justify-between gap-3 p-5 rounded-[28px] bg-surface border border-line dark:border-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Due for review</span>
            <span className="min-w-7 h-7 px-2 rounded-full bg-reward-soft text-on-reward-soft text-sm font-semibold inline-flex items-center justify-center tabular-nums">
              {dueToday.length}
            </span>
          </div>
          <p className="text-sm text-muted line-clamp-2">
            {dueToday.length === 0
              ? "All caught up! Nothing due right now."
              : `${dueToday.slice(0, 3).map((r) => r.title).join(", ")}${dueToday.length > 3 ? " and more." : "."}`}
          </p>
          <Link href="/review" className={buttonClass("tonal", "sm", "self-start")}>
            Review now
          </Link>
        </section>
      </div>

      <Suspense fallback={null}>
        <ToolsNotice />
      </Suspense>

      {v.freezeOffer.length > 0 && (
        <form action={freezeDayAction} className="gamify-only flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-line bg-surface p-5">
          <input type="hidden" name="day" value={v.freezeOffer[0]} />
          <p className="text-sm">
            You missed <strong>{formatLong(v.freezeOffer[0])}</strong>. Use this week&apos;s streak freeze to keep your streak? The day gives no XP.
          </p>
          <SubmitButton className={buttonClass("tonal", "sm")}>Freeze that day</SubmitButton>
        </form>
      )}
    </div>
  );
}

// ---- up next

type UpNextRow =
  | { kind: "link"; key: string; label: string; title: string; detail: string; href: string; edge: string; subject: Subject }
  | { kind: "task"; key: string; task: Task };

function catToSubject(cat: Category): Subject {
  if (cat === "dsa") return "dsa";
  if (cat === "sd") return "sd";
  if (cat === "beh_lld") return "lld";
  if (cat === "mock_app") return "mock";
  return "core";
}

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
      subject: "mock",
    });
  }
  if (dueToday.length > 0) {
    const kinds = Object.entries(
      dueToday.reduce<Record<string, number>>((acc, r) => ({ ...acc, [REVIEW_KIND_LABELS[r.kind]]: (acc[REVIEW_KIND_LABELS[r.kind]] ?? 0) + 1 }), {}),
    )
      .map(([label, n]) => `${n} ${label.toLowerCase()}`)
      .join(" · ");
    rows.push({
      kind: "link",
      key: "reviews",
      label: "Review",
      title: `${dueToday.length} review${dueToday.length === 1 ? "" : "s"} due today`,
      detail: kinds,
      href: "/review",
      edge: "border-l-warning",
      subject: "core",
    });
  }
  const active = !beforeStart && !finished;
  if (active) for (const t of undoneTasks) rows.push({ kind: "task", key: `task-${t.id}`, task: t });
  const open = rows.length;
  if (active) for (const t of doneTasks) rows.push({ kind: "task", key: `task-${t.id}`, task: t });

  const visible = rows.slice(0, UP_NEXT_VISIBLE);
  const more = rows.slice(UP_NEXT_VISIBLE);
  const nextWeekTask = v.weekTasks.find((t) => t.status !== "done");
  if (rows.length === 0 && !active) return null;

  return (
    <section aria-labelledby="up-next" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <h2 id="up-next" className="text-xl font-medium tracking-tight text-foreground">
            Up next
          </h2>
          <CatchUpDrawer backlog={backlog} />
        </div>
        {active && v.dayTasks.length > 0 && (
          <span className="text-sm text-muted tabular-nums">
            {doneTasks.length} of {v.dayTasks.length} done
          </span>
        )}
      </div>

      {open === 0 && (
        <div className="p-6 rounded-[28px] border border-line bg-surface space-y-2">
          <p className="flex items-center gap-2 font-medium">
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
        <div className="flex flex-col gap-2.5">
          {visible.map((r) => (
            <UpNextRowComponent key={r.key} row={r} link={link} />
          ))}

          {more.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none rounded-full px-5 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground">
                <span aria-hidden className="mr-2 inline-block transition-transform duration-180 group-open:rotate-90">
                  ›
                </span>
                +{more.length} more
              </summary>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {more.map((r) => (
                  <UpNextRowComponent key={r.key} row={r} link={link} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function SubjectIcon({ subject }: { subject: Subject }) {
  if (subject === "dsa") {
    return (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
      </svg>
    );
  }
  if (subject === "sd") {
    return (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16v12H4zM4 10h16" />
      </svg>
    );
  }
  if (subject === "lld") {
    return (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v6H4zM4 14h16v6H4z" />
    </svg>
  );
}

function UpNextRowComponent({ row, link }: { row: UpNextRow; link: (t: Task) => TaskLink | null }) {
  if (row.kind === "task") return <ExpressiveTaskRow t={row.task} link={link} />;
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-line bg-surface px-4 py-3.5 sm:gap-3.5 dark:border-0">
      <span className="size-7 shrink-0 rounded-full border-2 border-line-strong" aria-hidden="true" />
      <SubjectShape subject={row.subject}>
        <SubjectIcon subject={row.subject} />
      </SubjectShape>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">
          <Link href={row.href} className="hover:underline sm:no-underline">
            {row.title}
          </Link>
        </p>
        <p className="text-sm text-muted">
          {row.label} · {row.detail}
        </p>
      </div>
      <ButtonLink href={row.href} variant="outline" size="sm" className="max-sm:hidden">
        Open
      </ButtonLink>
    </div>
  );
}

function ExpressiveTaskRow({ t, link }: { t: Task; link: (t: Task) => TaskLink | null }) {
  const done = t.status === "done";
  const cat = (t.category in CATEGORIES ? t.category : "other") as Category;
  const subj = catToSubject(cat);
  const go = link(t);

  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-line bg-surface px-4 py-3.5 sm:gap-3.5 dark:border-0">
      <form action={toggleTaskAction} className="shrink-0">
        <input type="hidden" name="id" value={t.id} />
        <SubmitButton
          aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
          data-haptic={done ? undefined : "success"}
          className={`size-7 shrink-0 rounded-full flex items-center justify-center transition-colors duration-120 ${
            done ? "bg-primary text-on-primary font-semibold" : "border-2 border-line-strong hover:border-primary"
          }`}
        >
          {done && (
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </SubmitButton>
      </form>

      <SubjectShape subject={subj}>
        <SubjectIcon subject={subj} />
      </SubjectShape>

      <div className="min-w-0 flex-1">
        <p className={`text-base font-medium break-words ${done ? "line-through text-muted" : "text-foreground"}`}>
          {go && !done ? (
            <Link href={go.href} className="hover:underline">
              {t.title}
            </Link>
          ) : (
            t.title
          )}
        </p>
        <p className="text-sm text-muted">
          {CATEGORIES[cat].label}
          {t.minutes ? ` · ${t.minutes} min` : ""}
        </p>
      </div>

      {done ? (
        <span className="gamify-only px-3 py-1 rounded-full bg-reward-soft text-on-reward-soft text-xs font-semibold tabular-nums">
          +{t.xp} XP
        </span>
      ) : go ? (
        <ButtonLink href={go.href} variant="outline" size="sm" className="max-sm:hidden">
          Open
        </ButtonLink>
      ) : null}

      {t.templateKey === null && (
        <form action={deleteTaskAction}>
          <input type="hidden" name="id" value={t.id} />
          <SubmitButton
            aria-label={`Delete "${t.title}"`}
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
          >
            ×
          </SubmitButton>
        </form>
      )}
    </div>
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
    <details className="group overflow-hidden rounded-[28px] border border-line dark:border-0 bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-surface-2 transition-colors">
        <span aria-hidden className="inline-block text-muted transition-transform duration-180 group-open:rotate-90">
          ›
        </span>
        <span className="font-semibold text-foreground">This week&apos;s tasks</span>
        <span className="ml-auto w-40 max-sm:hidden">
          <ProgressBar value={doneCount} max={v.weekTasks.length} label="This week's tasks done" showCount />
        </span>
        <span className="text-sm text-muted tabular-nums sm:hidden">
          {doneCount} of {v.weekTasks.length}
        </span>
      </summary>
      <div className="border-t border-line p-4 space-y-3">
        <div className="flex flex-col gap-2.5">
          {v.weekTasks.map((t) => (
            <ExpressiveTaskRow key={t.id} t={t} link={link} />
          ))}
        </div>
        <form action={addTaskAction} className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Add your own task, e.g. LeetCode 560 Subarray Sum Equals K"
            aria-label="Task title"
            className={`${INPUT_CLASS} min-w-0 flex-1`}
          />
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
    <section aria-labelledby="due-review" className="rounded-[28px] border border-line dark:border-0 bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h3 id="due-review" className="text-lg font-semibold text-foreground">
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
              <Link href={r.href} prefetch={false} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{r.title}</span>
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
    <section aria-labelledby="focus-title" className="rounded-[28px] border border-line dark:border-0 bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h3 id="focus-title" className="text-lg font-semibold text-foreground">
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
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
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
              <Link href={i.href} prefetch={false} className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm hover:bg-surface-2 transition-colors">
                <StatusMark state={i.done ? "solved" : "none"} />
                <span className={`min-w-0 flex-1 truncate ${i.done ? "text-muted" : "text-foreground"}`}>{i.title}</span>
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

