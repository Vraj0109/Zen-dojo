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
import { Badge, buttonClass, Difficulty, EmptyState, INPUT_CLASS, PageMain, StatusMark } from "../../ui";

export const metadata: Metadata = { title: "Boss battle" };

export default function BossPage({ searchParams }: PageProps<"/dsa/boss">) {
  return (
    <PageMain title="Boss battle">
      <Link href="/dsa" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← Practice
      </Link>
      <Suspense fallback={<p className="text-muted">Picking problems…</p>}>
        <Boss searchParams={searchParams} />
      </Suspense>
    </PageMain>
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight">Boss battle</h2>
        <p className="max-w-[68ch] text-sm text-muted">
          Two problems, {BOSS_MINUTES / 60} hours, no hints, like a real onsite. Picked from{" "}
          {v.source === "weak" ? `your weakest patterns up to week ${v.weekNo}` : "all unsolved mediums and hards"}. Solves count as normal solves;
          hints and misses go on your stuck list.
        </p>
      </header>

      {v.foughtToday && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-success bg-success/10 p-4 text-sm">
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
          <ol className="grid gap-3 sm:grid-cols-2">
            {v.picks.map(({ problem: p, pattern }, i) => (
              <li key={p.id} className="rounded-md border border-line border-l-[3px] border-l-cat-dsa bg-surface p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge>Problem {i + 1}</Badge>
                  <Difficulty level={p.difficulty} />
                </div>
                <p className="mt-3 text-lg font-semibold">{p.number ? `${p.number}. ` : ""}{p.title}</p>
                <p className="text-sm text-muted">{pattern}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                      Open on LeetCode ↗
                    </a>
                  )}
                  <Link href={`/dsa/${encodeURIComponent(p.id)}`} className={buttonClass("quiet", "sm")}>
                    Notes page
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <Link href={`/dsa/boss?r=${reroll + 1}`} className={buttonClass("quiet", "sm")}>
            Different problems
          </Link>

          <form action={saveBossFightAction} className="space-y-4 rounded-md border border-line bg-surface p-5">
            <h3 className="font-semibold">How did it go?</h3>
            {v.picks.map(({ problem: p }) => (
              <fieldset key={p.id}>
                <input type="hidden" name="problemId" value={p.id} />
                <legend className="mb-1 text-sm font-medium">{p.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BOSS_RESULTS).map(([k, label]) => (
                    <label
                      key={k}
                      className="flex min-h-9 cursor-pointer items-center rounded-full border border-line-strong px-3 text-sm transition-colors duration-120 hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:font-medium has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
                    >
                      <input type="radio" name={`result:${p.id}`} value={k} required className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-2">
              <input name="minutes" type="number" min={1} max={600} placeholder="Minutes used" aria-label="Minutes used" className={`${INPUT_CLASS} w-36`} />
              <input name="notes" maxLength={5000} placeholder="What slowed you down?" aria-label="Notes" className={`${INPUT_CLASS} min-w-0 flex-1`} />
            </div>
            <SubmitButton className={buttonClass("primary", "md")}>Save result</SubmitButton>
            <p className="text-xs text-muted">Saving also ticks today&apos;s &quot;Boss fight&quot; task if it&apos;s on your plan.</p>
          </form>
          </div>
          <aside className="self-start lg:sticky lg:top-6">
            <StartTimer itemId={BOSS_ITEM} label="Boss fight" href="/dsa/boss" defaultMinutes={BOSS_MINUTES} totalMinutes={focused} />
          </aside>
        </div>
      )}

      {v.history.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Past fights</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface text-sm">
            {v.history.map((h) => (
              <li key={h.id} className="px-4 py-3">
                <span className="font-medium">{fmt(h.foughtOn)}</span>
                {h.minutes ? <span className="text-muted"> · {h.minutes} min</span> : null}
                <span className="block text-muted">
                  {h.results
                    .map((r) => `${PROBLEMS[r.problemId]?.title ?? r.problemId}: ${BOSS_RESULTS[r.result as keyof typeof BOSS_RESULTS] ?? r.result}`)
                    .join(" · ")}
                </span>
                {h.notes && <span className="block">{h.notes}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
