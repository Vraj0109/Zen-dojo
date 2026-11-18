import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CATEGORIES, TOTAL_WEEKS, daysBetween, type Category } from "@habit/shared";
import { getBacklogView } from "@/lib/tasks";
import type { Task } from "@/lib/schema";
import { skipPlanWeekAction, toggleTaskAction } from "../actions";
import { SubmitButton } from "../submit-button";
import { buttonClass, PageMain, ProgressBar } from "../ui";

export const metadata: Metadata = { title: "Backlog" };

export default function BacklogPage() {
  return (
    <PageMain title="Backlog">
      <Suspense fallback={<p className="text-muted">Loading...</p>}>
        <Backlog />
      </Suspense>
    </PageMain>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon 9 Nov" for a local YYYY-MM-DD string (no UTC math). */
function planned(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${DAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
}

function ago(date: string, today: string): string {
  const n = daysBetween(date, today);
  return n <= 0 ? "today" : n === 1 ? "1 day ago" : `${n} days ago`;
}

async function Backlog() {
  await connection();
  const v = await getBacklogView();
  const overdueCount = v.overdue.reduce((n, g) => n + g.tasks.length, 0) + (v.goalsOverdue ? v.goals.length : 0);
  const behind = overdueCount === 0;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Backlog</h2>
          <span className="text-sm text-muted">
            {v.position.finished
              ? "Plan complete"
              : `Week ${v.position.cursor} of ${TOTAL_WEEKS} · ${v.position.weeksLeft} ${v.position.weeksLeft === 1 ? "week" : "weeks"} left`}
          </span>
        </div>
        <ProgressBar value={v.doneCount} max={Math.max(v.totalCount, 1)} label="This week's tasks done" showCount />
        <p className="mt-2 text-xs text-muted">
          {v.doneCount} of {v.totalCount} tasks of this plan week are done. Finish them all and the plan moves to the next week.{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Back to Today
          </Link>
        </p>
      </section>

      <section aria-labelledby="overdue-h" className={`overflow-hidden rounded-md border bg-surface ${v.overdue.length ? "border-warning" : "border-line"}`}>
        <h2 id="overdue-h" className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 font-semibold">
          Planned for earlier days
          {overdueCount > 0 && <span className="text-sm font-medium text-warning tabular-nums">{overdueCount}</span>}
        </h2>
        {v.overdue.length === 0 ? (
          <p className="p-4 text-muted">{behind ? "Nothing behind. Good." : "Nothing from earlier days."}</p>
        ) : (
          v.overdue.map((g) => (
            <div key={g.date}>
              <p className="border-b border-line bg-surface-2 px-4 py-2 text-xs font-medium text-muted">
                Planned {planned(g.date)}, {ago(g.date, v.today)}
              </p>
              <TaskList tasks={g.tasks} />
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="goals-h" className="overflow-hidden rounded-md border border-line bg-surface">
        <h2 id="goals-h" className="border-b border-line px-4 py-3 font-semibold">
          Weekly goals
        </h2>
        {v.goals.length === 0 ? <p className="p-4 text-muted">All goals for this week are done.</p> : <TaskList tasks={v.goals} />}
      </section>

      <section aria-labelledby="ahead-h" className="overflow-hidden rounded-md border border-line bg-surface">
        <h2 id="ahead-h" className="border-b border-line px-4 py-3 font-semibold">
          Rest of this week
        </h2>
        {v.upcoming.length === 0 ? (
          <p className="p-4 text-muted">No days left in this week.</p>
        ) : (
          v.upcoming.map((g) => (
            <div key={g.date}>
              <p className="border-b border-line bg-surface-2 px-4 py-2 text-xs font-medium text-muted">Planned {planned(g.date)}. You can work ahead.</p>
              <TaskList tasks={g.tasks} />
            </div>
          ))
        )}
      </section>

      {!v.position.finished && (
        <section className="rounded-md border border-line bg-surface p-5">
          <h2 className="font-semibold">Skip the rest of this week</h2>
          <p className="mt-1 text-sm text-muted">
            This deletes every task of week {v.position.cursor} that is not done and starts week{" "}
            {v.position.cursor < TOTAL_WEEKS ? v.position.cursor + 1 : "after the last"} today. Done tasks stay. It cannot be undone.
          </p>
          <form action={skipPlanWeekAction} className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirm" className="size-4 accent-[var(--danger)]" />I understand, skip this week
            </label>
            <SubmitButton className={buttonClass("danger", "md")}>Skip the rest of this week</SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => {
        const done = t.status === "done";
        const cat = (t.category in CATEGORIES ? t.category : "other") as Category;
        return (
          <li key={t.id} className="flex items-start gap-3 px-4 py-3 transition-colors duration-120 hover:bg-surface-2">
            <form action={toggleTaskAction} className="pt-0.5">
              <input type="hidden" name="id" value={t.id} />
              <SubmitButton
                aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                  done ? "border-primary bg-primary text-on-primary" : "border-line-strong hover:border-primary"
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
              <p className="mt-1 text-xs text-muted">
                {CATEGORIES[cat].label}
                {t.minutes ? ` · ${t.minutes} min` : ""}
                <span className="gamify-only"> · +{t.xp} XP</span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
