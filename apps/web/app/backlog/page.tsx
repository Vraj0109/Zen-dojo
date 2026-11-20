import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { CATEGORIES, TOTAL_WEEKS, addDays, daysBetween, toLocalDate, type Category } from "@habit/shared";
import { getBacklogView, setPlanStart } from "@/lib/tasks";
import { getDb } from "@/lib/db";
import { tasks as tasksTable, type Task } from "@/lib/schema";
import { skipPlanWeekAction, toggleTaskAction } from "../actions";
import { SubmitButton } from "../submit-button";
import { PageMain, SubjectShape, buttonClass, type Subject } from "../ui";

export const metadata: Metadata = { title: "Backlog" };

export default function BacklogPage() {
  return (
    <PageMain title="Backlog" hideTitle>
      <Suspense fallback={<p className="text-muted">Loading backlog...</p>}>
        <Backlog />
      </Suspense>
    </PageMain>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function planned(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${DAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
}

function ago(date: string, today: string): string {
  const n = daysBetween(date, today);
  return n <= 0 ? "today" : n === 1 ? "1 day ago" : `${n} days ago`;
}

function categoryToSubject(category: string): Subject {
  if (category === "dsa") return "dsa";
  if (category === "system-design" || category === "sd") return "sd";
  if (category === "lld") return "lld";
  if (category === "core" || category === "core-cs") return "core";
  if (category === "behavioural" || category === "beh") return "beh";
  return "dsa";
}

async function doTodayAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("taskId"));
  if (!id) return;
  const db = await getDb();
  await db.update(tasksTable).set({ date: toLocalDate() }).where(eq(tasksTable.id, id));
  revalidatePath("/backlog");
  revalidatePath("/");
}

async function addTwoToTodayAction(formData: FormData) {
  "use server";
  const rawIds = formData.get("taskIds");
  if (!rawIds || typeof rawIds !== "string") return;
  const ids = rawIds.split(",").map(Number).filter(Boolean);
  if (!ids.length) return;
  const db = await getDb();
  await db.update(tasksTable).set({ date: toLocalDate() }).where(inArray(tasksTable.id, ids.slice(0, 2)));
  revalidatePath("/backlog");
  revalidatePath("/");
}

async function shiftPlanWeekAction() {
  "use server";
  const v = await getBacklogView();
  if (v.position.finished) return;
  // Shift plan start date forward by 7 days
  const newStart = addDays(v.position.start, 7);
  await setPlanStart(newStart);
  revalidatePath("/backlog");
  revalidatePath("/");
  revalidatePath("/roadmap");
}

async function Backlog() {
  await connection();
  const v = await getBacklogView();
  const overdueCount = v.overdue.reduce((n, g) => n + g.tasks.length, 0) + (v.goalsOverdue ? v.goals.length : 0);

  // Collect overdue task IDs for the "Add 2 to today" action
  const allOverdueTasks: Task[] = [];
  for (const g of v.overdue) {
    allOverdueTasks.push(...g.tasks.filter((t) => t.status !== "done"));
  }
  if (v.goalsOverdue) {
    allOverdueTasks.push(...v.goals.filter((t) => t.status !== "done"));
  }
  const topTwoIds = allOverdueTasks.slice(0, 2).map((t) => t.id).join(",");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">Backlog</h1>
          <p className="mt-1 text-sm text-muted">
            {overdueCount > 0 ? `${overdueCount} ${overdueCount === 1 ? "task" : "tasks"} from past days.` : "No overdue tasks."} Skipping never costs XP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!v.position.finished && (
            <form action={shiftPlanWeekAction}>
              <SubmitButton className={buttonClass("outline", "sm", "h-11 px-5")}>
                Shift the plan a week
              </SubmitButton>
            </form>
          )}
          {allOverdueTasks.length > 0 && (
            <form action={addTwoToTodayAction}>
              <input type="hidden" name="taskIds" value={topTwoIds} />
              <SubmitButton className={buttonClass("primary", "sm", "h-11 px-5")}>
                Add 2 to today
              </SubmitButton>
            </form>
          )}
        </div>
      </header>

      {/* Overdue Groups by date / week */}
      {v.overdue.length === 0 && !v.goalsOverdue ? (
        <div className="rounded-[24px] border border-line bg-surface p-8 text-center text-muted dark:border-0">
          <p className="text-lg font-medium text-foreground">Nothing in the backlog</p>
          <p className="mt-1 text-sm">Every past task is done or skipped.</p>
          <div className="mt-4">
            <Link href="/" className={buttonClass("primary", "sm", "h-11 px-6")}>
              Back to Today
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {v.overdue.map((g) => (
            <section key={g.date} className="flex flex-col gap-2.5">
              <span className="self-start rounded-full bg-surface-2 px-3.5 py-1.5 text-[13px] font-semibold text-foreground">
                Planned {planned(g.date)} · {ago(g.date, v.today)}
              </span>
              <div className="space-y-2">
                {g.tasks.map((t) => (
                  <BacklogRow key={t.id} task={t} today={v.today} />
                ))}
              </div>
            </section>
          ))}

          {v.goalsOverdue && v.goals.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <span className="self-start rounded-full bg-surface-2 px-3.5 py-1.5 text-[13px] font-semibold text-foreground">
                Weekly goals (overdue)
              </span>
              <div className="space-y-2">
                {v.goals.map((t) => (
                  <BacklogRow key={t.id} task={t} today={v.today} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Upcoming tasks in this week (optional work ahead) */}
      {v.upcoming.length > 0 && (
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-medium tracking-tight">Rest of this week</h2>
          <div className="space-y-6">
            {v.upcoming.map((g) => (
              <div key={g.date} className="flex flex-col gap-2.5">
                <span className="self-start rounded-full bg-surface-2 px-3.5 py-1.5 text-[13px] font-semibold text-foreground">
                  Planned {planned(g.date)}
                </span>
                <div className="space-y-2">
                  {g.tasks.map((t) => (
                    <BacklogRow key={t.id} task={t} today={v.today} isUpcoming />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skip week option */}
      {!v.position.finished && (
        <section className="mt-8 rounded-[24px] border border-line bg-surface p-6 dark:border-0">
          <h2 className="text-lg font-semibold">Skip the rest of this week</h2>
          <p className="mt-1 text-sm text-muted">
            This deletes every uncompleted task of week {v.position.cursor} and advances to week{" "}
            {v.position.cursor < TOTAL_WEEKS ? v.position.cursor + 1 : "complete"}. Completed tasks stay.
          </p>
          <form action={skipPlanWeekAction} className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="confirm" className="size-4 accent-primary" />
              <span>I understand, skip this week</span>
            </label>
            <SubmitButton className={buttonClass("outline", "sm")}>
              Skip week
            </SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}

function BacklogRow({ task, today, isUpcoming }: { task: Task; today: string; isUpcoming?: boolean }) {
  const done = task.status === "done";
  const cat = (task.category in CATEGORIES ? task.category : "other") as Category;
  const subj = categoryToSubject(task.category);

  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-line bg-surface py-3 pr-3 pl-1.5 transition-colors hover:border-line-strong dark:border-0 sm:gap-3.5 sm:pr-4">
      <form action={toggleTaskAction} className="shrink-0">
        <input type="hidden" name="id" value={task.id} />
        <button
          type="submit"
          aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
          className="group grid size-10 place-items-center rounded-full"
        >
          <span
            className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors ${
              done ? "border-primary bg-primary text-on-primary" : "border-line-strong group-hover:border-primary"
            }`}
          >
            {done && (
              <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3.5 8.5 3 3 6-7" />
              </svg>
            )}
          </span>
        </button>
      </form>

      <SubjectShape subject={subj} className="!size-10 @max-[440px]:hidden" />

      <div className="min-w-0 flex-1">
        <p className={`text-base font-medium leading-snug ${done ? "line-through text-muted" : ""}`}>
          {task.title}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {CATEGORIES[cat]?.label ?? task.category}
          {task.minutes ? ` · ${task.minutes} min` : ""}
          {task.date && !isUpcoming ? ` · ${ago(task.date, today)}` : ""}
          <span className="gamify-only"> · +{task.xp} XP</span>
        </p>
      </div>

      {!done && (
        <form action={doTodayAction} className="shrink-0">
          <input type="hidden" name="taskId" value={task.id} />
          <SubmitButton className={buttonClass("tonal", "sm")}>
            Do today
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
