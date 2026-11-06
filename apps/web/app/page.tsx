import { Suspense } from "react";
import { connection } from "next/server";
import { CATEGORIES, TOTAL_WEEKS, formatLong, type Category } from "@habit/shared";
import Link from "next/link";
import { getResolveDueCount } from "@/lib/dsa";
import { getTodayView } from "@/lib/tasks";
import type { Task } from "@/lib/schema";
import { addTaskAction, deleteTaskAction, setPlanStartAction, toggleTaskAction } from "./actions";
import { SubmitButton } from "./submit-button";
import { Stat } from "./ui";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="sr-only">Today</h1>
      <Suspense fallback={<p className="text-muted">Loading today…</p>}>
        <Today />
      </Suspense>
    </main>
  );
}

async function Today() {
  // Today's date and the database are per-request; render at request time.
  await connection();
  const [v, resolveDue] = await Promise.all([getTodayView(), getResolveDueCount()]);
  const beforeStart = v.weekNo < 1;
  const finished = v.weekNo > TOTAL_WEEKS;
  const doneToday = v.dayTasks.filter((t) => t.status === "done").length;
  const pct = v.level.xpForNext ? Math.round((v.level.xpIntoLevel / v.level.xpForNext) * 100) : 0;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Week" value={beforeStart ? "—" : finished ? "Done" : `${v.weekNo} / ${TOTAL_WEEKS}`} />
        <Stat label="Streak" value={`🔥 ${v.streak} day${v.streak === 1 ? "" : "s"}`} />
        <Stat label="Today" value={`+${v.todayXp} XP`} />
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Level</p>
          <p className="mt-1 text-lg font-semibold">
            {v.level.tier} · {v.level.level}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-label={`${pct}% to next level`}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {v.totalXp} XP · {v.level.xpForNext - v.level.xpIntoLevel} to next
          </p>
        </div>
      </section>

      {resolveDue > 0 && (
        <Link
          href="/dsa"
          className="block rounded-xl border border-accent bg-surface p-4 font-medium hover:bg-background"
        >
          🔁 {resolveDue} problem{resolveDue === 1 ? " is" : "s are"} due for a re-solve →
        </Link>
      )}

      {beforeStart && (
        <p className="rounded-xl border border-line bg-surface p-4">
          Your plan starts on <strong>{formatLong(v.planStart)}</strong>. Change the start date below to begin now.
        </p>
      )}
      {finished && (
        <p className="rounded-xl border border-line bg-surface p-4">
          🎉 You finished all {TOTAL_WEEKS} weeks. Good luck in the interviews!
        </p>
      )}

      {!beforeStart && !finished && (
        <>
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{formatLong(v.today)}</h2>
              <span className="text-sm text-muted">
                {doneToday} / {v.dayTasks.length} done
              </span>
            </div>
            <TaskList tasks={v.dayTasks} />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Week {v.weekNo} goals</h2>
            <TaskList tasks={v.weekTasks} />
          </section>
        </>
      )}

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 font-semibold">Add a task</h2>
        <form action={addTaskAction} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="title"
            required
            maxLength={200}
            placeholder="e.g. LeetCode 560 Subarray Sum Equals K"
            className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2"
          />
          <select name="category" className="rounded-lg border border-line bg-background px-3 py-2" defaultValue="dsa">
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
          <select name="scope" className="rounded-lg border border-line bg-background px-3 py-2" defaultValue="day">
            <option value="day">Today</option>
            <option value="week">This week</option>
          </select>
          <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Add</SubmitButton>
        </form>
      </section>

      <section className="text-sm text-muted">
        <form action={setPlanStartAction} className="flex flex-wrap items-center gap-2">
          <label htmlFor="planStart">Plan start (weeks run Monday–Sunday)</label>
          <input
            id="planStart"
            type="date"
            name="planStart"
            defaultValue={v.planStart}
            className="rounded-lg border border-line bg-background px-2 py-1 text-foreground"
          />
          <SubmitButton className="rounded-lg border border-line px-3 py-1 text-foreground">Save</SubmitButton>
        </form>
      </section>
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

function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return <p className="text-muted">Nothing here yet.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {tasks.map((t) => {
        const done = t.status === "done";
        const cat = (t.category in CATEGORIES ? t.category : "other") as Category;
        return (
          <li key={t.id} className="flex items-center gap-3 p-3">
            <form action={toggleTaskAction}>
              <input type="hidden" name="id" value={t.id} />
              <SubmitButton
                aria-label={done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                  done ? "border-accent bg-accent text-on-accent" : "border-line"
                }`}
              >
                {done ? "✓" : ""}
              </SubmitButton>
            </form>
            <div className="min-w-0 flex-1">
              <p className={done ? "text-muted line-through" : ""}>{t.title}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <span className={`inline-block size-2 rounded-full ${CATEGORY_STYLES[cat]}`} />
                {CATEGORIES[cat].label}
                {t.minutes ? ` · ${t.minutes} min` : ""}
              </p>
            </div>
            <span className={`text-sm font-medium ${done ? "text-accent" : "text-muted"}`}>+{t.xp} XP</span>
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
