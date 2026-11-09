import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { COVERED_CONFIDENCE, LESSON_EXTRA, STUDY_AREAS, getStudyArea } from "@habit/shared";
import { getAddedItems, type AddedGroup } from "@/lib/packs";
import { getStudyView, type ConceptView, type ExerciseView } from "@/lib/study";
import { PageMain, ProgressBar, Stat } from "../../ui";
import { LearnBack } from "../../section-tabs";
import { deeperIds } from "../../toc-items";
import { Confidence, fmtDate } from "../study-ui";

/** The study areas are fixed, so their pages are known at build time. */
export function generateStaticParams() {
  return STUDY_AREAS.map((a) => ({ area: a.id }));
}

export async function generateMetadata({ params }: PageProps<"/study/[area]">): Promise<Metadata> {
  const { area } = await params;
  return { title: getStudyArea(area)?.title ?? "Study" };
}

export default function StudyAreaPage({ params }: PageProps<"/study/[area]">) {
  return (
    <PageMain title="Study">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Area params={params} />
      </Suspense>
    </PageMain>
  );
}

async function Area({ params }: { params: PageProps<"/study/[area]">["params"] }) {
  const { area: areaId } = await params;
  await connection();
  const [view, added] = await Promise.all([getStudyView(areaId), getAddedItems(areaId)]);
  if (!view) notFound();
  const sectionTitles = new Set(view.sections.map((s) => s.title));
  const joined = (title: string) => added.find((g) => g.section === title)?.items ?? [];
  const separate = added.filter((g) => !sectionTitles.has(g.section));
  const { area, sections, exercises, due, totals } = view;
  const hours = Math.round((totals.minutes / 60) * 10) / 10;

  return (
    <div className="space-y-8">
      <LearnBack current={area.title} />
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{area.title}</h2>
        <p className="mt-1 text-sm text-muted">{area.intro}</p>
        <p className="mt-2 text-sm text-muted">Every concept has a lesson: open it, learn, then rate yourself.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Concepts covered" value={`${totals.covered} / ${totals.concepts}`} hint={`avg confidence ${totals.avgConfidence || "–"}/5`} />
        {area.exercises ? (
          <Stat label={area.exercises.title.replace(/^[A-Z]\.\s*/, "")} value={`${totals.practiced} / ${totals.exercises}`} hint={`${totals.sessions} sessions`} />
        ) : (
          <Stat label="Reviews due" value={String(due.concepts.length)} hint="rated below 4" />
        )}
        {area.exercises ? (
          <Stat label="Practice time" value={`${hours} h`} hint="logged" />
        ) : (
          <Stat label="Points ticked" value={`${totals.pointsChecked} / ${totals.points}`} hint="can explain" />
        )}
        <Stat label="XP" value={String(totals.xp)} hint={`${due.concepts.length + due.exercises.length} due now`} className="gamify-only" />
      </section>

      {(due.exercises.length > 0 || due.concepts.length > 0) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Due for review</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-accent bg-surface">
            {due.exercises.map((e) => (
              <ExerciseRow key={e.id} e={e} areaId={area.id} />
            ))}
            {due.concepts.map((c) => (
              <ConceptRow key={c.id} c={c} areaId={area.id} />
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
      {sections.map((s) => {
        const covered = s.concepts.filter((c) => c.confidence >= COVERED_CONFIDENCE).length;
        return (
          <section key={s.id}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {s.title}
                {s.weeks && <span className="ml-2 text-sm font-normal text-muted">weeks {s.weeks}</span>}
              </h2>
              <span className="text-sm text-muted">
                {covered}/{s.concepts.length} covered
              </span>
            </div>
            <ProgressBar value={covered} max={s.concepts.length} label={`${s.title} progress`} />
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {s.concepts.map((c) => (
                <ConceptRow key={c.id} c={c} areaId={area.id} />
              ))}
              {joined(s.title).map((i) => (
                <AddedRow key={i.packId + i.id} item={i} />
              ))}
            </ul>
          </section>
        );
      })}
      {separate.map((g) => (
        <section key={g.section}>
          <h2 className="mb-2 text-lg font-semibold">{g.section}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {g.items.map((i) => (
              <AddedRow key={i.packId + i.id} item={i} />
            ))}
          </ul>
        </section>
      ))}
      </div>

      {area.exercises && (
        <section>
          <h2 className="text-lg font-semibold">{area.exercises.title}</h2>
          <p className="mb-3 text-sm text-muted">{area.exercises.intro}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {exercises.map((e) => (
              <ExerciseRow key={e.id} e={e} areaId={area.id} />
            ))}
          </ul>
          <details className="mt-4 rounded-xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-semibold">How each practice is scored</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {area.exercises.steps.map((step) => (
                <li key={step.id}>
                  <span className="font-medium">{step.title}</span> <span className="text-muted">({step.minutes} min): {step.hint}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">
              Rate each step 1-5 after practicing. Average 4+: practice again in 30 days; 3+: 14 days; lower: 7 days.
            </p>
          </details>
        </section>
      )}
    </div>
  );
}

/** An item that an imported pack added to this area, with a small "added" tag. */
function AddedRow({ item }: { item: AddedGroup["items"][number] }) {
  return (
    <li className="hit flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <Link href={`/study/packs/${item.packId}/${item.id}`} prefetch={false} className="hit-link">
          {item.title}
        </Link>
        <p className="text-xs text-muted">
          <span className="rounded-full border border-line px-1.5">added</span> {item.type === "problem" ? "problem" : "lesson"} from {item.packTitle}
          {item.done && <span className="font-medium text-foreground"> · done</span>}
        </p>
      </div>
    </li>
  );
}

function ConceptRow({ c, areaId }: { c: ConceptView; areaId: string }) {
  const titles = LESSON_EXTRA[c.id]?.deeper.map((x) => x.title) ?? [];
  const ids = deeperIds(titles);
  return (
    <li className="hit flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <Link href={`/study/${areaId}/${c.id}`} prefetch={false} className="hit-link">
          {c.title}
        </Link>
        <p className="text-xs text-muted">
          {c.checked}/{c.points.length} points
          {c.reviewDue && <span className="font-medium text-foreground"> · review due</span>}
        </p>
        {titles.length > 0 && (
          <details className="mt-1 text-xs">
            <summary className="w-fit cursor-pointer text-muted hover:text-foreground">
              {titles.length} sub-sections
            </summary>
            <ul className="mt-1 space-y-0.5 border-l border-line pl-3">
              {titles.map((t, i) => (
                <li key={ids[i]}>
                  <Link href={`/study/${areaId}/${c.id}#${ids[i]}`} prefetch={false} className="text-muted hover:text-foreground">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <Confidence value={c.confidence} />
    </li>
  );
}

function ExerciseRow({ e, areaId }: { e: ExerciseView; areaId: string }) {
  const p = e.practice;
  return (
    <li className="hit flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <Link href={`/study/${areaId}/${e.id}`} prefetch={false} className="hit-link">
          {e.title}
        </Link>
        {e.tag && <span className="ml-1.5 rounded bg-background px-1.5 text-xs text-muted">{e.tag}</span>}
        <p className="text-xs text-muted">
          {e.focus}
          {p.state === "practiced" && (
            <span className={p.due ? "font-medium text-foreground" : ""}>
              {" "}
              · {e.sessions}× · last {fmtDate(p.lastOn)} ({p.score}/5) · {p.due ? "practice again now" : `next ${fmtDate(p.nextOn)}`}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
