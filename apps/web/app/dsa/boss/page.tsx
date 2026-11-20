import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PROBLEMS } from "@habit/shared";
import { BOSS_MINUTES, BOSS_RESULTS, getBossView } from "@/lib/boss";
import { BOSS_ITEM, focusMinutes } from "@/lib/timer";
import { saveBossFightAction } from "../../actions";
import { StartTimer } from "../../start-timer";
import { SubmitButton } from "../../submit-button";
import { buttonClass, EmptyState, INPUT_CLASS, StatusMark } from "../../ui";

export const metadata: Metadata = { title: "Boss battle" };

export default function BossPage({ searchParams }: PageProps<"/dsa/boss">) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-4 px-4 pt-4 pb-10 sm:px-6 md:px-8 md:pt-6">
      <Link
        href="/dsa"
        className="inline-flex self-start items-center gap-1.5 min-h-10 pr-3.5 pl-2 rounded-full bg-surface-2 text-foreground text-sm font-medium hover:bg-line transition-colors"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Practice
      </Link>
      <Suspense fallback={<p className="text-muted">Picking problems…</p>}>
        <Boss searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

async function Boss({ searchParams }: { searchParams: PageProps<"/dsa/boss">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const reroll = Math.max(0, Math.min(1000, Number(Array.isArray(params.r) ? params.r[0] : params.r) || 0));
  const [v, focused] = await Promise.all([getBossView(reroll), focusMinutes(BOSS_ITEM)]);

  const bestMinutes = v.history.filter((h) => h.minutes).map((h) => h.minutes!).sort((a, b) => a - b)[0];
  const bestText = bestMinutes ? `Your best so far: ${bestMinutes} minutes.` : "";

  // Count cleared in today's fight
  const clearedCount = v.foughtToday
    ? v.foughtToday.results.filter((r) => r.result === "solved").length
    : 0;

  return (
    <div className="flex min-w-0 flex-col gap-[18px]">
      {/* Hero on reward-soft */}
      <section className="flex items-center justify-between gap-5 flex-wrap p-5 sm:px-8 sm:py-7 rounded-[32px] bg-reward-soft text-on-reward-soft">
        <div className="min-w-0 flex-[1_1_280px]">
          <p className="text-sm font-medium opacity-85">Week {v.weekNo} boss</p>
          <h1 className="mt-1.5 text-2xl sm:text-[32px] font-semibold leading-tight">
            {v.picks.length === 3 ? "Three problems. One hour. No hints." : "Two problems. Two hours. No hints."}
          </h1>
          <p className="mt-2 text-[15px] opacity-85 leading-relaxed">
            Clear all problems for the Week {v.weekNo} badge and 150 XP. {bestText}
          </p>
        </div>
        <div className="rounded-[24px] bg-on-reward-soft text-reward-soft px-6 py-3.5 flex flex-col items-center shrink-0">
          <span className="text-[13px] opacity-80">time limit</span>
          <span className="font-mono text-4xl sm:text-[40px] font-medium tracking-tight mt-0.5">
            {BOSS_MINUTES}:00
          </span>
        </div>
      </section>

      {v.foughtToday && (
        <p role="status" className="flex items-center gap-2 rounded-[24px] border border-success bg-success/10 p-4 text-sm text-foreground">
          <StatusMark state="solved" />
          <span>
            Fought today:{" "}
            {v.foughtToday.results.map((r) => `${PROBLEMS[r.problemId]?.title ?? r.problemId} (${BOSS_RESULTS[r.result as keyof typeof BOSS_RESULTS] ?? r.result})`).join(", ")}
            {v.foughtToday.minutes ? ` in ${v.foughtToday.minutes} min` : ""}. Another round is optional.
          </span>
        </p>
      )}

      {v.picks.length === 0 ? (
        <EmptyState message="No unsolved mediums or hards left. Use re-solves instead." action={{ label: "Open re-solves", href: "/dsa?tab=resolve" }} />
      ) : (
        <div className="flex min-w-0 flex-col gap-[18px]">
          {/* Three round cards in an auto-fill grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
            {v.picks.map(({ problem: p, pattern }, i) => {
              const resultRow = v.foughtToday?.results.find((r) => r.problemId === p.id);
              const isCleared = resultRow?.result === "solved";
              const isFirstUnsolved = !isCleared && v.picks.slice(0, i).every((prev) => v.foughtToday?.results.find((r) => r.problemId === prev.problem.id)?.result === "solved");
              const isCurrent = !v.foughtToday ? i === 0 : isFirstUnsolved;

              return (
                <section
                  key={p.id}
                  className={`flex min-w-0 flex-col gap-2.5 p-5 rounded-[28px] transition-colors ${
                    isCurrent
                      ? "bg-primary-container text-on-primary-container"
                      : isCleared
                      ? "bg-surface border border-line dark:border-0 text-foreground"
                      : "bg-surface border border-line dark:border-0 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`h-7 px-3 rounded-full text-[13px] font-semibold inline-flex items-center ${
                        isCleared
                          ? "bg-primary text-on-primary"
                          : isCurrent
                          ? "bg-reward-soft text-on-reward-soft"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      {isCleared ? "Cleared" : isCurrent ? "In progress" : `Round ${i + 1}`}
                    </span>
                    <span className={`text-[13px] ${isCurrent ? "opacity-85" : "text-muted"}`}>
                      {p.difficulty ? p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1) : ""}
                    </span>
                  </div>

                  <p className="text-lg font-medium leading-snug mt-1 truncate">
                    {p.number ? `${p.number}. ` : ""}{p.title}
                  </p>
                  <p className={`text-sm ${isCurrent ? "opacity-85" : "text-muted"}`}>{pattern}</p>

                  <div className="mt-auto pt-3 flex flex-wrap gap-2">
                    {isCurrent ? (
                      <Link
                        href={`/dsa/${encodeURIComponent(p.id)}`}
                        className={buttonClass("primary", "sm", "h-11 px-5.5")}
                      >
                        Continue
                      </Link>
                    ) : (
                      <>
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClass("quiet", "sm", "bg-surface-2 text-foreground")}
                          >
                            LeetCode ↗
                          </a>
                        )}
                        <Link
                          href={`/dsa/${encodeURIComponent(p.id)}`}
                          className={buttonClass("quiet", "sm", "bg-surface-2 text-foreground")}
                        >
                          Notes
                        </Link>
                      </>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Reward row with the scalloped week badge */}
          <section className="flex items-center gap-4 px-5 py-4 rounded-[28px] bg-surface border border-line dark:border-0">
            <svg role="img" aria-label={`Week ${v.weekNo} badge`} width="64" height="64" viewBox="0 0 100 100" className="shrink-0">
              <path
                d="M50 4 61 13 75 10 80 24 94 30 90 44 98 56 87 66 88 80 74 83 66 95 52 90 38 96 30 84 16 81 15 67 4 57 12 44 8 30 22 24 27 10 41 12z"
                fill="var(--reward-soft)"
              />
              <text x="50" y="60" textAnchor="middle" fontFamily="inherit" fontSize="28" fontWeight="600" fill="var(--on-reward-soft)">
                {v.weekNo}
              </text>
            </svg>
            <div>
              <p className="text-base font-medium text-foreground">Week {v.weekNo} badge, waiting for you</p>
              <p className="text-sm text-muted">{clearedCount} of {v.picks.length} cleared</p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Link
              href={`/dsa/boss?r=${reroll + 1}`}
              className={buttonClass("outline", "sm")}
            >
              Different problems
            </Link>
            <StartTimer itemId={BOSS_ITEM} label="Boss fight" href="/dsa/boss" defaultMinutes={BOSS_MINUTES} totalMinutes={focused} />
          </div>

          {/* Form to submit result */}
          <form action={saveBossFightAction} className="space-y-4 rounded-[28px] border border-line dark:border-0 bg-surface p-5">
            <h3 className="font-semibold text-base text-foreground">How did it go?</h3>
            {v.picks.map(({ problem: p }) => (
              <fieldset key={p.id}>
                <input type="hidden" name="problemId" value={p.id} />
                <legend className="mb-1.5 text-sm font-medium text-foreground">{p.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BOSS_RESULTS).map(([k, label]) => (
                    <label
                      key={k}
                      className="flex min-h-10 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-sm transition-colors duration-120 hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:font-medium has-[:checked]:text-primary"
                    >
                      <input type="radio" name={`result:${p.id}`} value={k} required className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <input
                name="minutes"
                type="number"
                min={1}
                max={600}
                placeholder="Minutes used"
                aria-label="Minutes used"
                className={`${INPUT_CLASS} w-36 max-w-full`}
              />
              <input
                name="notes"
                maxLength={5000}
                placeholder="What slowed you down?"
                aria-label="Notes"
                className={`${INPUT_CLASS} min-w-0 flex-1`}
              />
            </div>
            <SubmitButton className={buttonClass("primary", "md")}>Save result</SubmitButton>
            <p className="text-xs text-muted">Saving also ticks today&apos;s &quot;Boss fight&quot; task if it&apos;s on your plan.</p>
          </form>
        </div>
      )}

      {/* Past fights history */}
      {v.history.length > 0 && (
        <section className="space-y-3 pt-2">
          <h3 className="font-semibold text-base text-foreground">Past fights</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-[24px] border border-line dark:border-0 bg-surface text-sm">
            {v.history.map((h) => (
              <li key={h.id} className="px-4.5 py-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{fmt(h.foughtOn)}</span>
                  {h.minutes ? <span className="text-muted text-xs">· {h.minutes} min</span> : null}
                </div>
                <span className="block text-muted text-xs leading-relaxed">
                  {h.results
                    .map((r) => `${PROBLEMS[r.problemId]?.title ?? r.problemId}: ${BOSS_RESULTS[r.result as keyof typeof BOSS_RESULTS] ?? r.result}`)
                    .join(" · ")}
                </span>
                {h.notes && <span className="block text-foreground text-xs mt-0.5">{h.notes}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
