import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  COMPLEXITY_TABLE,
  CONFIDENCE_LABELS,
  COVERED_CONFIDENCE,
  KEY_NUMBERS,
  LAST_DAYS_PLAN,
  LLD_GUIDES,
  STUDY_AREAS,
  pickCard,
  quizCards,
  seededRandom,
  toLocalDate,
  type StudyAreaId,
} from "@habit/shared";
import { getCountdown, getReviseAreas, getRevisePatterns, getWeakSpots, weakConceptIds, type ReviseConcept, type ReviseExercise } from "@/lib/revise";
import { setInterviewDateAction } from "../actions";
import { CodeBlock } from "../learn-blocks";
import { Confidence } from "../study/study-ui";
import { SubmitButton } from "../submit-button";
import { PageMain } from "../ui";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Quick revise" };

const TABS = [
  { id: "plan", label: "🎯 Plan & weak spots" },
  { id: "dsa", label: "DSA" },
  { id: "sd", label: "System design" },
  { id: "lld", label: "LLD" },
  { id: "core", label: "Core CS" },
  { id: "numbers", label: "Numbers & frameworks" },
  { id: "quiz", label: "🃏 Quiz" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default function RevisePage({ searchParams }: PageProps<"/revise">) {
  return (
    <PageMain title="Quick revise">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Quick revise</h2>
          <p className="text-sm text-muted">Everything worth remembering on one page, for the days before an interview.</p>
        </div>
        <PrintButton />
      </header>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Revise searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

async function Revise({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  await connection();
  const tab: Tab = TABS.some((t) => t.id === str(sp.tab)) ? (str(sp.tab) as Tab) : "plan";
  const weak = str(sp.weak) === "1";

  return (
    <div className="space-y-6">
      <nav aria-label="Revise sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 print:hidden">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/revise?tab=${t.id}${weak && t.id !== "plan" ? "&weak=1" : ""}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
              tab === t.id ? "bg-accent text-on-accent" : "border border-line text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "plan" && <PlanTab />}
      {tab === "dsa" && <DsaTab weak={weak} />}
      {(tab === "sd" || tab === "lld" || tab === "core") && <AreaTab area={tab} weak={weak} />}
      {tab === "numbers" && <NumbersTab />}
      {tab === "quiz" && <QuizTab sp={sp} />}
    </div>
  );
}

function WeakToggle({ tab, weak }: { tab: Tab; weak: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
      <span className="text-muted">Show:</span>
      <Link href={`/revise?tab=${tab}`} className={`rounded-lg px-3 py-1 ${!weak ? "bg-surface font-medium" : "text-muted hover:text-foreground"}`}>
        Everything
      </Link>
      <Link href={`/revise?tab=${tab}&weak=1`} className={`rounded-lg px-3 py-1 ${weak ? "bg-surface font-medium" : "text-muted hover:text-foreground"}`}>
        Only my weak spots
      </Link>
    </div>
  );
}

function Recap({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 space-y-0.5 text-sm">
      {items.map((i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="text-accent">▸</span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Plan

async function PlanTab() {
  const [countdown, weak] = await Promise.all([getCountdown(), getWeakSpots()]);
  const today = toLocalDate();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Interview date</h3>
          {countdown ? (
            <p className="mt-1 text-lg">
              {countdown.daysLeft > 1 && (
                <>
                  <strong>{countdown.daysLeft} days</strong> to go ({countdown.date})
                </>
              )}
              {countdown.daysLeft === 1 && <strong>Tomorrow</strong>}
              {countdown.daysLeft === 0 && <strong>Today. You&apos;ve got this.</strong>}
              {countdown.daysLeft < 0 && <span className="text-muted">That date has passed. Set the next one.</span>}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Set it to get a countdown here and on Today, and the plan for each of the last days.</p>
          )}
          <form action={setInterviewDateAction} className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
            <input
              type="date"
              name="interviewDate"
              min={today}
              defaultValue={countdown?.date ?? ""}
              required
              aria-label="Interview date"
              className="rounded-lg border border-line bg-background px-3 py-1.5"
            />
            <SubmitButton className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent">Save</SubmitButton>
          </form>
          {countdown && (
            <form action={setInterviewDateAction} className="mt-2 print:hidden">
              <input type="hidden" name="clear" value="1" />
              <SubmitButton className="text-xs text-muted hover:text-foreground">Clear date</SubmitButton>
            </form>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">The last days</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {LAST_DAYS_PLAN.map((p) => {
              const now = countdown?.phase?.id === p.id;
              return (
                <div key={p.id} className={`rounded-xl border bg-surface p-4 ${now ? "border-accent" : "border-line"}`}>
                  <p className="font-medium">
                    {p.title}
                    {now && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-on-accent">now</span>}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {p.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">Concepts below Solid ({weak.concepts.length})</h3>
          {weak.concepts.length === 0 ? (
            <p className="text-sm text-muted">Every concept is rated Solid or better.</p>
          ) : (
            <ul className="grid gap-2 lg:grid-cols-2">
              {weak.concepts.slice(0, 24).map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                  <Confidence value={c.confidence} />
                  <Link href={`/study/${c.area}/${c.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {c.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">{CONFIDENCE_LABELS[c.confidence]}</span>
                </li>
              ))}
            </ul>
          )}
          {weak.concepts.length > 24 && (
            <p className="text-xs text-muted">
              …and {weak.concepts.length - 24} more. The area tabs with <em>Only my weak spots</em> list them all.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="mb-2 font-semibold">🧗 Stuck list ({weak.stuck.length})</h3>
          {weak.stuck.length === 0 ? (
            <p className="text-sm text-muted">Nothing on it.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {weak.stuck.slice(0, 15).map((s) => (
                <li key={s.id}>
                  <Link href={`/dsa/${encodeURIComponent(s.id)}`} className="font-medium hover:underline">
                    {s.title}
                  </Link>
                  {s.count > 1 && <span className="text-xs text-muted"> · {s.count}×</span>}
                  {s.reason && <span className="block text-xs text-muted">{s.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="mb-2 font-semibold">DSA patterns to firm up ({weak.patterns.length})</h3>
          <ul className="space-y-1 text-sm">
            {weak.patterns.slice(0, 12).map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-2">
                <Link href={`/dsa/pattern/${p.id}`} className="min-w-0 truncate hover:underline">
                  {p.name}
                </Link>
                <span className="shrink-0 text-xs text-muted">
                  {p.solved}/{p.target}
                  {p.stuck > 0 && ` · ${p.stuck} stuck`}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="mb-2 font-semibold">Designs to practise again ({weak.exercises.length})</h3>
          <ul className="space-y-1 text-sm">
            {weak.exercises.slice(0, 12).map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-2">
                <Link href={`/study/${e.area}/${e.id}`} className="min-w-0 truncate hover:underline">
                  {e.title}
                </Link>
                <span className="shrink-0 text-xs text-muted">{e.lastScore === null ? "not practised" : `last ${e.lastScore}/5`}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- DSA

async function DsaTab({ weak }: { weak: boolean }) {
  const patterns = (await getRevisePatterns()).filter((p) => !weak || p.solved < p.target || p.stuck > 0);
  const groups = [...new Set(patterns.map((p) => p.group))];
  return (
    <div className="space-y-6">
      <WeakToggle tab="dsa" weak={weak} />
      {patterns.length === 0 && <p className="text-sm text-muted">No weak patterns. Nice.</p>}
      {groups.map((g) => (
        <section key={g} className="space-y-2 break-inside-avoid">
          <h3 className="font-semibold">{g}</h3>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {patterns
              .filter((p) => p.group === g)
              .map((p) => (
                <div key={p.id} className="break-inside-avoid rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/dsa/pattern/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">
                      {p.solved}/{p.target}
                      {p.stuck > 0 && ` · 🧗 ${p.stuck}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted">Spot it: {p.recognize}</p>
                  <Recap items={p.recap} />
                  {p.template && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-muted">Your template ({p.language || "code"})</summary>
                      <div className="mt-1">
                        <CodeBlock code={p.template} maxHeight="max-h-64" />
                      </div>
                    </details>
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- SD / LLD / Core

async function AreaTab({ area, weak }: { area: StudyAreaId; weak: boolean }) {
  const a = (await getReviseAreas()).find((x) => x.id === area)!;
  const concepts = a.concepts.filter((c) => !weak || c.confidence < COVERED_CONFIDENCE);
  const exercises = a.exercises.filter((e) => !weak || e.lastScore === null || e.lastScore <= 3);
  const sections = [...new Set(concepts.map((c) => c.section))];
  const exTitle = STUDY_AREAS.find((x) => x.id === area)!.exercises?.title;

  return (
    <div className="space-y-6">
      <WeakToggle tab={area} weak={weak} />
      {sections.map((s) => (
        <section key={s} className="space-y-2">
          <h3 className="font-semibold">{s}</h3>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {concepts
              .filter((c) => c.section === s)
              .map((c) => (
                <ConceptCard key={c.id} c={c} area={area} />
              ))}
          </div>
        </section>
      ))}
      {exercises.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">{exTitle}</h3>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {exercises.map((e) => (
              <ExerciseCard key={e.id} e={e} area={area} />
            ))}
          </div>
        </section>
      )}
      {concepts.length === 0 && exercises.length === 0 && <p className="text-sm text-muted">No weak spots here.</p>}
    </div>
  );
}

function ConceptCard({ c, area }: { c: ReviseConcept; area: StudyAreaId }) {
  return (
    <div className="break-inside-avoid rounded-xl border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <Link href={`/study/${area}/${c.id}`} className="font-medium hover:underline">
          {c.title}
        </Link>
        <span className="shrink-0" title={CONFIDENCE_LABELS[c.confidence]}>
          <Confidence value={c.confidence} />
        </span>
      </div>
      <Recap items={c.recap} />
    </div>
  );
}

function ExerciseCard({ e, area }: { e: ReviseExercise; area: StudyAreaId }) {
  const lld = LLD_GUIDES[e.id];
  return (
    <div className="break-inside-avoid rounded-xl border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <Link href={`/study/${area}/${e.id}`} className="font-medium hover:underline">
          {e.title}
        </Link>
        <span className="shrink-0 text-xs text-muted">{e.lastScore === null ? "not practised" : `last ${e.lastScore}/5`}</span>
      </div>
      <Recap items={e.recap} />
      {lld && <p className="mt-1 text-xs text-muted">Patterns: {lld.patterns.join("; ")}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Numbers

function NumbersTab() {
  const sd = STUDY_AREAS.find((a) => a.id === "sd")!.exercises!.steps;
  const lld = STUDY_AREAS.find((a) => a.id === "lld")!.exercises!.steps;
  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {KEY_NUMBERS.map((t) => (
        <section key={t.title} className="break-inside-avoid rounded-xl border border-line bg-surface p-4">
          <h3 className="mb-2 font-semibold">{t.title}</h3>
          <table className="w-full text-sm">
            <tbody>
              {t.rows.map(([k, v]) => (
                <tr key={k} className="border-t border-line first:border-0">
                  <td className="py-1 pr-3 text-muted">{k}</td>
                  <td className="py-1 text-right font-medium">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section className="break-inside-avoid rounded-xl border border-line bg-surface p-4">
        <h3 className="mb-2 font-semibold">Big-O you should never have to think about</h3>
        <table className="w-full text-sm">
          <tbody>
            {COMPLEXITY_TABLE.map(([k, v]) => (
              <tr key={k} className="border-t border-line first:border-0">
                <td className="py-1 pr-3 text-muted">{k}</td>
                <td className="py-1 text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Framework title="System design: 45 minutes" steps={sd} />
      <Framework title="LLD: 45 minutes" steps={lld} />
      <section className="break-inside-avoid rounded-xl border border-line bg-surface p-4">
        <h3 className="mb-2 font-semibold">Coding round loop</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Restate the problem, ask about input size, duplicates, negatives, empty input.</li>
          <li>Work one example by hand.</li>
          <li>State the brute force and its complexity.</li>
          <li>Find the pattern (constraints tell you the target complexity) and explain the better approach.</li>
          <li>Code it cleanly, naming things well, talking as you go.</li>
          <li>Test: walk the example, then edge cases; fix bugs calmly.</li>
          <li>State final time and space complexity; mention follow-ups.</li>
        </ol>
      </section>
    </div>
  );
}

function Framework({ title, steps }: { title: string; steps: { id: string; title: string; minutes: number; hint: string }[] }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-line bg-surface p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ol className="space-y-1.5 text-sm">
        {steps.map((s, i) => (
          <li key={s.id}>
            <span className="font-medium">
              {i + 1}. {s.title}
            </span>{" "}
            <span className="text-xs text-muted">({s.minutes} min)</span>
            <span className="block text-xs text-muted">{s.hint}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- Quiz

const QUIZ_AREAS = [
  { id: "all", label: "Everything" },
  { id: "sd", label: "System design" },
  { id: "lld", label: "LLD" },
  { id: "core", label: "Core CS" },
] as const;

async function QuizTab({ sp }: { sp: SP }) {
  const areaParam = str(sp.area);
  const area = (QUIZ_AREAS.some((a) => a.id === areaParam) ? areaParam : "all") as StudyAreaId | "all";
  const weak = str(sp.weak) === "1";
  const prev = Number(str(sp.prev));
  const step = Math.max(0, Number(str(sp.s)) || 0);
  const only = weak ? await weakConceptIds() : undefined;
  const cards = quizCards(area, only);
  // Shuffled per day: the same step shows the same card today, a different one tomorrow.
  const card = pickCard(cards, seededRandom(`${toLocalDate()}:${area}:${weak}:${step}`), Number.isInteger(prev) ? prev : undefined);
  const qs = (extra: string) => `/revise?tab=quiz&area=${area}${weak ? "&weak=1" : ""}${extra}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
        {QUIZ_AREAS.map((a) => (
          <Link
            key={a.id}
            href={`/revise?tab=quiz&area=${a.id}${weak ? "&weak=1" : ""}`}
            className={`rounded-lg px-3 py-1 ${area === a.id ? "bg-surface font-medium" : "text-muted hover:text-foreground"}`}
          >
            {a.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Link href={`/revise?tab=quiz&area=${area}${weak ? "" : "&weak=1"}`} className={`rounded-lg px-3 py-1 ${weak ? "bg-surface font-medium" : "text-muted hover:text-foreground"}`}>
          {weak ? "✓ " : ""}Weak concepts only
        </Link>
        <span className="ml-auto text-xs text-muted">{cards.length} cards</span>
      </div>

      {!card ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-center text-muted">No cards for this filter.</p>
      ) : (
        <article className="rounded-xl border border-line bg-surface p-6">
          <p className="text-xs text-muted">
            {card.itemTitle} · {STUDY_AREAS.find((a) => a.id === card.area)?.title}
          </p>
          <h3 className="mt-2 text-xl font-semibold leading-snug">{card.question}</h3>
          <p className="mt-2 text-sm text-muted">Answer out loud (aim for under 2 minutes), then check yourself.</p>
          <details className="group mt-4 rounded-lg border border-line bg-background/40">
            <summary className="cursor-pointer list-none px-4 py-2 font-medium">
              <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
              Reveal
            </summary>
            <div className="space-y-3 border-t border-line p-4">
              {card.answer && <p className="leading-relaxed">{card.answer}</p>}
              {card.points.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted">Points to have hit</p>
                  <Recap items={card.points} />
                </div>
              )}
              <Link href={`/study/${card.area}/${card.itemId}`} className="inline-block text-sm font-medium text-accent hover:underline">
                Open the full lesson →
              </Link>
            </div>
          </details>
          <div className="mt-5 flex justify-end">
            <Link href={qs(`&s=${step + 1}&prev=${card.n}`)} className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">
              Next card →
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}
