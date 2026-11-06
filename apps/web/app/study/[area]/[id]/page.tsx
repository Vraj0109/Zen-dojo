import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_CONCEPTS, ALL_EXERCISES, CONFIDENCE_LABELS, COVERED_CONFIDENCE, STUDY_AREAS, getStudyArea } from "@habit/shared";
import { PRACTICE_LIMITS, getConceptDetail, getExerciseDetail } from "@/lib/study";
import { deletePracticeAction, logPracticeAction, saveConceptAction } from "../../../actions";
import { NotesForm } from "../../../notes-form";
import { SubmitButton } from "../../../submit-button";
import { PageMain } from "../../../ui";
import { Confidence, fmtDate } from "../../study-ui";

/** Every concept and exercise is known at build time. */
export function generateStaticParams() {
  return STUDY_AREAS.flatMap((a) => [
    ...a.sections.flatMap((s) => s.concepts.map((c) => ({ area: a.id, id: c.id }))),
    ...(a.exercises?.items ?? []).map((e) => ({ area: a.id, id: e.id })),
  ]);
}

export async function generateMetadata({ params }: PageProps<"/study/[area]/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: ALL_CONCEPTS[id]?.title ?? ALL_EXERCISES[id]?.title ?? "Study" };
}

export default function StudyItemPage({ params }: PageProps<"/study/[area]/[id]">) {
  return (
    <PageMain title="Study" narrow>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Item params={params} />
      </Suspense>
    </PageMain>
  );
}

const field = "w-full rounded-lg border border-line bg-background px-3 py-2";

async function Item({ params }: { params: PageProps<"/study/[area]/[id]">["params"] }) {
  const { area: areaId, id } = await params;
  await connection();
  const area = getStudyArea(areaId);
  const concept = ALL_CONCEPTS[id];
  const exercise = ALL_EXERCISES[id];
  if (!area || (concept?.area !== area.id && exercise?.area !== area.id)) notFound();

  return (
    <article className="space-y-6">
      <Link href={`/study/${area.id}`} className="inline-block text-sm text-muted hover:text-foreground">
        ← {area.title}
      </Link>
      {concept ? <ConceptView id={id} /> : <ExerciseView id={id} />}
    </article>
  );
}

async function ConceptView({ id }: { id: string }) {
  const d = (await getConceptDetail(id))!;
  const p = d.progress;
  const checked = new Set(p?.checked ?? []);
  const confidence = p?.confidence ?? 0;

  return (
    <>
      <header className="space-y-1">
        <p className="text-sm text-muted">{d.concept.section}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{d.concept.title}</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Confidence value={confidence} /> {CONFIDENCE_LABELS[confidence]}
          {p?.coveredOn && <span>· covered {fmtDate(p.coveredOn, true)}</span>}
          {p && <span>· updated {fmtDate(p.updatedOn, true)}</span>}
        </p>
      </header>

      <form action={saveConceptAction} className="space-y-5">
        <input type="hidden" name="conceptId" value={id} />
        <fieldset className="rounded-xl border border-line bg-surface p-4">
          <legend className="px-1 font-semibold">What to know</legend>
          <ul className="space-y-2">
            {d.concept.points.map((point, i) => (
              <li key={i}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="point" value={i} defaultChecked={checked.has(i)} className="mt-1 size-4 accent-[var(--color-accent)]" />
                  <span>{point}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Tick a point when you can explain it out loud with an example and its trade-offs.</p>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold">How confident are you?</legend>
          <div className="flex flex-wrap gap-2">
            {CONFIDENCE_LABELS.map((label, value) => (
              <label key={value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-on-accent">
                <input type="radio" name="confidence" value={value} defaultChecked={value === confidence} className="sr-only" />
                {value} · {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {COVERED_CONFIDENCE}+ counts as covered (+XP the first time). Anything from 1 to {COVERED_CONFIDENCE - 1} comes back for review a week later.
          </p>
        </fieldset>

        <div>
          <label htmlFor="notes" className="mb-1 block font-semibold">
            Your notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={10}
            maxLength={20000}
            defaultValue={p?.notes ?? ""}
            placeholder={"Key ideas in your own words, a diagram link, numbers to remember, where it showed up in a design…"}
            className={field}
          />
        </div>
        <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Save</SubmitButton>
      </form>
    </>
  );
}

async function ExerciseView({ id }: { id: string }) {
  const d = (await getExerciseDetail(id))!;
  const { exercise, area, sessions, practice } = d;
  const steps = area.exercises.steps;
  const isDesign = area.id === "sd";

  return (
    <>
      <header className="space-y-1">
        <p className="text-sm text-muted">{area.exercises.title}</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {exercise.title}
          {exercise.tag && <span className="ml-2 rounded bg-surface px-2 align-middle text-sm font-normal text-muted">{exercise.tag}</span>}
        </h2>
        <p className="text-sm text-muted">Focus: {exercise.focus}</p>
      </header>

      <section className="rounded-xl border border-line bg-surface p-4 text-sm">
        {practice.state === "new" ? (
          <p>Not practiced yet. Set a {steps.reduce((a, s) => a + s.minutes, 0)}-minute timer, do it aloud, then log it below.</p>
        ) : (
          <p>
            Practiced {sessions.length}× · last {fmtDate(practice.lastOn, true)} scoring {practice.score}/5 ·{" "}
            <span className={practice.due ? "font-semibold" : ""}>
              {practice.due ? "due for another practice now" : `practice again on ${fmtDate(practice.nextOn, true)}`}
            </span>
          </p>
        )}
      </section>

      <form action={logPracticeAction} className="space-y-4 rounded-xl border border-line bg-surface p-4">
        <input type="hidden" name="itemId" value={id} />
        <h3 className="font-semibold">Log a practice (+{area.exercises.xp} XP, once a day)</h3>
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={`score-${step.id}`} className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{step.title}</span>
                <span className="block text-xs text-muted">
                  {step.minutes} min · {step.hint}
                </span>
              </label>
              <select id={`score-${step.id}`} name={`score:${step.id}`} defaultValue="" className="rounded-lg border border-line bg-background px-2 py-1 text-sm">
                <option value="">–</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input name="minutes" type="number" min={1} max={PRACTICE_LIMITS.minutes} placeholder="Minutes" aria-label="Minutes" className="w-28 rounded-lg border border-line bg-background px-3 py-2" />
          <input
            name="link"
            type="url"
            maxLength={PRACTICE_LIMITS.link}
            placeholder={isDesign ? "Diagram or recording link (optional)" : "Code or gist link (optional)"}
            aria-label="Link"
            className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2"
          />
        </div>
        <textarea
          name="notes"
          rows={3}
          maxLength={PRACTICE_LIMITS.notes}
          placeholder="What went well, what you missed, what to fix next time"
          aria-label="Practice notes"
          className={field}
        />
        <div className="flex items-center gap-3">
          <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">Log practice</SubmitButton>
          <span className="text-xs text-muted">Score at least one step (1 = missed it, 5 = interview-ready).</span>
        </div>
      </form>

      {sessions.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">History</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {sessions.map((s) => (
              <li key={s.id} className="space-y-1 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{fmtDate(s.practicedOn, true)}</span>
                  <span>{s.score}/5</span>
                  {s.minutes && <span className="text-muted">{s.minutes} min</span>}
                  {s.xp > 0 && <span className="text-muted">+{s.xp} XP</span>}
                  {s.link && (
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground">
                      link ↗
                    </a>
                  )}
                  <form action={deletePracticeAction} className="ml-auto">
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton aria-label={`Delete practice from ${s.practicedOn}`} className="text-xs text-muted hover:text-foreground">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
                <p className="text-xs text-muted">
                  {steps
                    .filter((step) => s.scores[step.id])
                    .map((step) => `${step.title} ${s.scores[step.id]}`)
                    .join(" · ")}
                </p>
                {s.notes && <p className="whitespace-pre-wrap">{s.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <NotesForm
        id={id}
        note={d.note}
        notesLabel="Your design notes"
        notesPlaceholder={
          isDesign
            ? "Requirements:\nEstimates:\nAPI / data model:\nHigh-level design:\nDeep dives:\nFailure modes:\nTrade-offs I'd mention:"
            : "Requirements:\nEntities and relationships:\nPatterns used:\nConcurrency:\nExtensions:"
        }
        codeLabel={isDesign ? "Schema, API or pseudo-code" : "Your classes"}
        codePlaceholder={isDesign ? "Optional: table schemas, API signatures, key algorithms." : "The class design you wrote. Re-write it from scratch when you practice again, then compare."}
      />
    </>
  );
}
