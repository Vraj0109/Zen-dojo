import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PROBLEMS } from "@habit/shared";
import { BOSS_MINUTES, BOSS_RESULTS, getBossView } from "@/lib/boss";
import { BOSS_ITEM, focusMinutes } from "@/lib/timer";
import { saveBossFightAction } from "../../actions";
import { FocusTimer } from "../../focus-timer";
import { SubmitButton } from "../../submit-button";
import { PageMain } from "../../ui";

export const metadata: Metadata = { title: "Boss fight" };

export default function BossPage({ searchParams }: PageProps<"/dsa/boss">) {
  return (
    <PageMain title="Boss fight" narrow>
      <Link href="/dsa" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← DSA
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

const DIFF = { easy: "text-cat-dsa", medium: "text-cat-beh", hard: "text-cat-mock" } as const;

async function Boss({ searchParams }: { searchParams: PageProps<"/dsa/boss">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const reroll = Math.max(0, Math.min(1000, Number(Array.isArray(params.r) ? params.r[0] : params.r) || 0));
  const [v, focused] = await Promise.all([getBossView(reroll), focusMinutes(BOSS_ITEM)]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">⚔️ Boss fight</h2>
        <p className="mt-1 text-sm text-muted">
          Two problems, {BOSS_MINUTES / 60} hours, no hints, like a real onsite. Picked from{" "}
          {v.source === "weak" ? `your weakest patterns up to week ${v.weekNo}` : "all unsolved mediums and hards"}. Solves count as normal solves;
          hints and misses go on your stuck list.
        </p>
      </header>

      {v.foughtToday && (
        <p role="status" className="rounded-xl border border-accent bg-surface p-4 text-sm">
          ✓ Fought today:{" "}
          {v.foughtToday.results.map((r) => `${PROBLEMS[r.problemId]?.title ?? r.problemId} (${BOSS_RESULTS[r.result as keyof typeof BOSS_RESULTS] ?? r.result})`).join(", ")}
          {v.foughtToday.minutes ? ` in ${v.foughtToday.minutes} min` : ""}. Another round is optional.
        </p>
      )}

      {v.picks.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4">No unsolved mediums or hards left. Impressive. Use re-solves instead.</p>
      ) : (
        <>
          <ol className="grid gap-3 sm:grid-cols-2">
            {v.picks.map(({ problem: p, pattern }, i) => (
              <li key={p.id} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs text-muted">Problem {i + 1} · {pattern}</p>
                <p className="mt-1 font-semibold">{p.number ? `${p.number}. ` : ""}{p.title}</p>
                <p className={`text-sm font-medium capitalize ${p.difficulty ? DIFF[p.difficulty] : ""}`}>{p.difficulty}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      Open on LeetCode ↗
                    </a>
                  )}
                  <Link href={`/dsa/${encodeURIComponent(p.id)}`} className="text-muted hover:text-foreground">
                    Notes page
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <Link href={`/dsa/boss?r=${reroll + 1}`} className="inline-block text-sm text-muted hover:text-foreground">
            ↻ Different problems
          </Link>

          <FocusTimer itemId={BOSS_ITEM} defaultMinutes={BOSS_MINUTES} presets={[60, 90, 120]} totalMinutes={focused} />

          <form action={saveBossFightAction} className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <h3 className="font-semibold">How did it go?</h3>
            {v.picks.map(({ problem: p }) => (
              <fieldset key={p.id}>
                <input type="hidden" name="problemId" value={p.id} />
                <legend className="mb-1 text-sm font-medium">{p.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BOSS_RESULTS).map(([k, label]) => (
                    <label
                      key={k}
                      className="flex cursor-pointer items-center rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-on-accent"
                    >
                      <input type="radio" name={`result:${p.id}`} value={k} required className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-2">
              <input name="minutes" type="number" min={1} max={600} placeholder="Minutes used" aria-label="Minutes used" className="w-36 rounded-lg border border-line bg-background px-3 py-2" />
              <input name="notes" maxLength={5000} placeholder="What slowed you down?" aria-label="Notes" className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2" />
            </div>
            <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Save result</SubmitButton>
            <p className="text-xs text-muted">Saving also ticks today&apos;s &quot;Boss fight&quot; task if it&apos;s on your plan.</p>
          </form>
        </>
      )}

      {v.history.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Past fights</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface text-sm">
            {v.history.map((h) => (
              <li key={h.id} className="px-4 py-2">
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
