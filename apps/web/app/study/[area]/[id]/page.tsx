import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ALL_CONCEPTS,
  ALL_EXERCISES,
  CONFIDENCE_LABELS,
  COVERED_CONFIDENCE,
  LESSON_EXTRA,
  DESIGN_DEEP,
  LLD_DEEP,
  LLD_PROJECTS,
  LESSONS,
  LLD_EXTRA,
  LLD_GUIDES,
  STUDY_AREAS,
  WALKTHROUGH_EXTRA,
  WALKTHROUGHS,
  getStudyArea,
  studyHref,
  readingMinutes,
} from "@habit/shared";
import { getDiagrams } from "@/lib/diagrams";
import { getAiSettings, getSimpleMode } from "@/lib/ui-prefs";
import { detectProviders } from "@/lib/ai/providers";
import { aiAvailable } from "@/lib/ai/guard";
import { LessonAi } from "./lesson-ai";
import { getReadingFor } from "@/lib/reading";
import { focusMinutes } from "@/lib/timer";
import { PRACTICE_LIMITS, getConceptDetail, getExerciseDetail } from "@/lib/study";
import { deletePracticeAction, logPracticeAction, saveConceptAction } from "../../../actions";
import { StartTimer } from "../../../start-timer";
import { NotesForm } from "../../../notes-form";
import { SubmitButton } from "../../../submit-button";
import { PageMain, SimpleHint } from "../../../ui";
import { ArticleLayout, ArticleSection, DeeperSections } from "../../../learn-blocks";
import { CourseOutline } from "../../../course-outline";
import { DesignDeepView } from "../../../design-deep";
import { conceptToc, designDeepToc } from "../../../toc-items";
import { DiagramsSection, FollowUps, LessonQuestions, LldGuideView, LldProjectView, ReadingSection, WalkthroughView } from "../../learn-ui";
import { StudyArticleSkeleton } from "@/app/components/study-skeleton";
import { ProjectPlayground } from "./project-playground";
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

export default function StudyItemPage({ params, searchParams }: PageProps<"/study/[area]/[id]">) {
  return (
    <PageMain title="Study">
      <Suspense fallback={<StudyArticleSkeleton />}>
        <Item params={params} searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

interface LessonLink {
  id: string;
  title: string;
  href: string;
}

function getAdjacentLessons(area: ReturnType<typeof getStudyArea> & {}, currentId: string): { prev?: LessonLink; next?: LessonLink } {
  const all: LessonLink[] = [
    ...area.sections.flatMap((s) => s.concepts.map((c) => ({ id: c.id, title: c.title, href: `/study/${area.id}/${c.id}` }))),
    ...(area.exercises?.items ?? []).map((e) => ({ id: e.id, title: e.title, href: `/study/${area.id}/${e.id}` })),
  ];
  const index = all.findIndex((item) => item.id === currentId);
  return {
    prev: index > 0 ? all[index - 1] : undefined,
    next: index >= 0 && index < all.length - 1 ? all[index + 1] : undefined,
  };
}

function LessonNav({ prev, next }: { prev?: LessonLink; next?: LessonLink }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Lesson navigation" className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background hover:text-foreground"
        >
          <span aria-hidden>←</span>
          <span className="text-left">
            <span className="block text-xs font-normal text-muted">Previous lesson</span>
            <span className="line-clamp-1">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background hover:text-foreground"
        >
          <span className="text-right">
            <span className="block text-xs font-normal text-muted">Next lesson</span>
            <span className="line-clamp-1">{next.title}</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}
    </nav>
  );
}

const field = "w-full rounded-lg border border-line bg-background px-3 py-2";

async function Item({ params, searchParams }: { params: PageProps<"/study/[area]/[id]">["params"]; searchParams: PageProps<"/study/[area]/[id]">["searchParams"] }) {
  const { area: areaId, id } = await params;
  const sp = await searchParams;
  const diagramError = typeof sp.diagramError === "string" ? sp.diagramError : undefined;
  await connection();
  const area = getStudyArea(areaId);
  const concept = ALL_CONCEPTS[id];
  const exercise = ALL_EXERCISES[id];
  if (!area || (concept?.area !== area.id && exercise?.area !== area.id)) notFound();

  const title = concept?.title ?? exercise?.title ?? "Lesson";
  const { prev, next } = getAdjacentLessons(area, id);
  const ai = aiAvailable() ? await getAiSettings() : null;
  const aiProviders = ai?.enabled ? await detectProviders() : [];

  return (
    <article className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-2 text-sm print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/study" className="text-muted hover:text-foreground">
            Study
          </Link>
          <span aria-hidden className="text-muted">
            /
          </span>
          <Link href={`/study/${area.id}`} className="text-muted hover:text-foreground">
            {area.title}
          </Link>
          <span aria-hidden className="text-muted">
            /
          </span>
          <CourseOutline areaId={area.id} currentId={id} label={title} />
        </div>
      </nav>
      {concept ? <ConceptView id={id} prev={prev} next={next} /> : <ExerciseView id={id} diagramError={diagramError} prev={prev} next={next} />}
      {ai?.enabled && <LessonAi lessonId={id} providers={aiProviders} provider={ai.provider} />}
    </article>
  );
}

async function ConceptView({ id, prev, next }: { id: string; prev?: LessonLink; next?: LessonLink }) {
  const [d0, reading, focused, simple] = await Promise.all([getConceptDetail(id), getReadingFor(id), focusMinutes(id), getSimpleMode()]);
  const d = d0!;
  const lesson = LESSONS[id];
  const extra = LESSON_EXTRA[id];
  const readMin = readingMinutes(id);
  // Read, then answer the interview questions aloud: about twice the reading time, rounded to 5.
  const studyMinutes = Math.min(60, Math.max(15, Math.ceil((readMin * 2) / 5) * 5));
  const p = d.progress;
  const checked = new Set(p?.checked ?? []);
  const confidence = p?.confidence ?? 0;

  const toc = conceptToc({
    hasOverview: !!lesson?.overview,
    deeperTitles: extra?.deeper?.map((x) => x.title) ?? [],
    hasQuestions: !!lesson && lesson.questions.length > 0,
    hasPitfalls: !!lesson?.pitfalls && lesson.pitfalls.length > 0,
    hasReading: !simple && reading.length > 0,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted">{d.concept.section}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{d.concept.title}</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Confidence value={confidence} /> {CONFIDENCE_LABELS[confidence]}
          <span>· ≈ {readMin} min read</span>
          {p?.coveredOn && <span>· covered {fmtDate(p.coveredOn, true)}</span>}
          {p && <span>· updated {fmtDate(p.updatedOn, true)}</span>}
        </p>
      </header>

      <ArticleLayout
        toc={toc}
        rail={<StartTimer itemId={id} label={d.concept.title} href={studyHref(d.concept.area, id)} defaultMinutes={studyMinutes} totalMinutes={focused} />}
      >
        {lesson?.overview && (
          <ArticleSection id="overview" title="Overview">
            <p className="leading-7">{lesson.overview}</p>
          </ArticleSection>
        )}

        <ArticleSection id="what-to-know" title="What to know">
          <ol className="space-y-4">
            {d.concept.points.map((point, i) => (
              <li key={i}>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="point"
                    value={i}
                    form="concept-form"
                    defaultChecked={checked.has(i)}
                    className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span className="font-medium">{point}</span>
                </label>
                {lesson?.explain[i] && <p className="mt-1 pl-6 text-sm leading-relaxed text-muted">{lesson.explain[i]}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">
            Read the explanation, then close it in your head: tick a point once you can explain it out loud with an example and its trade-offs.
          </p>
        </ArticleSection>

        {extra && extra.deeper && extra.deeper.length > 0 && (
          <ArticleSection id="deeper" title="Go deeper">
            <DeeperSections sections={extra.deeper} />
          </ArticleSection>
        )}

        {lesson && <LessonQuestions lesson={lesson} />}

        <ArticleSection id="your-turn" title="Your turn">
          <form id="concept-form" action={saveConceptAction} className="space-y-5">
            <input type="hidden" name="conceptId" value={id} />

            <fieldset>
              <legend className="mb-2 font-semibold">How confident are you?</legend>
              <div className="flex flex-wrap gap-2">
                {CONFIDENCE_LABELS.map((label, value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-on-accent"
                  >
                    <input type="radio" name="confidence" value={value} defaultChecked={value === confidence} className="sr-only" />
                    {value} · {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                {COVERED_CONFIDENCE}+ counts as covered<span className="gamify-only"> (+XP the first time)</span>. Anything from 1 to {COVERED_CONFIDENCE - 1} comes back for review a week later.
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
        </ArticleSection>

        {simple ? <SimpleHint /> : <ReadingSection itemId={id} items={reading} />}

        <LessonNav prev={prev} next={next} />
      </ArticleLayout>
    </div>
  );
}

async function ExerciseView({ id, diagramError, prev, next }: { id: string; diagramError?: string; prev?: LessonLink; next?: LessonLink }) {
  const [d0, reading, focused, diagrams, simple] = await Promise.all([getExerciseDetail(id), getReadingFor(id), focusMinutes(id), getDiagrams(id), getSimpleMode()]);
  const d = d0!;
  const { exercise, area, sessions, practice } = d;
  const steps = area.exercises.steps;
  const isDesign = area.id === "sd";

  const hasWalkthrough = isDesign && !!WALKTHROUGHS[id];
  const hasLldGuide = !isDesign && !!LLD_GUIDES[id];
  const designDeep = isDesign ? DESIGN_DEEP[id] : undefined;
  const hasFollowUps = isDesign && !!WALKTHROUGH_EXTRA[id]?.followUps?.length;
  const hasLldProject = !isDesign && (!!LLD_PROJECTS[id] || !!LLD_DEEP[id]);
  const hasFlow = !isDesign && !!LLD_EXTRA[id]?.flow?.length;
  const hasEdgeCases = !isDesign && !!LLD_EXTRA[id]?.edgeCases?.length;

  const toc = [
    ...(hasWalkthrough ? [{ id: "reference", title: "Reference walkthrough" }] : []),
    ...(hasLldGuide ? [{ id: "reference", title: "Reference answer" }] : []),
    ...(designDeep ? designDeepToc(designDeep) : []),
    ...(hasLldProject
      ? [
          ...(LLD_DEEP[id] ? [{ id: "walkthrough", title: "Full design walkthrough" }, { id: "lld-diagrams", title: "Diagrams" }] : []),
          ...(LLD_PROJECTS[id] ? [{ id: "java-code", title: "The full code (Java 17)" }] : []),
          ...(LLD_PROJECTS[id]?.files?.length ? [{ id: "playground-heading", title: "Playground" }] : []),
          ...(LLD_DEEP[id]?.concurrency.length ? [{ id: "concurrency", title: "Concurrency" }] : []),
        ]
      : []),
    ...(isDesign && designDeep?.code?.length ? [{ id: "playground-heading", title: "Playground" }] : []),
    ...(hasFollowUps ? [{ id: "follow-ups", title: "Follow-ups they'll ask" }] : []),
    ...(hasFlow ? [{ id: "trace", title: "Trace one use case" }] : []),
    ...(hasEdgeCases ? [{ id: "edge-cases", title: "Edge cases to name" }] : []),
    { id: "your-turn", title: "Your turn" },
    ...(!simple ? [{ id: "diagrams", title: "Your diagrams" }] : []),
    ...(!simple && reading.length > 0 ? [{ id: "reading", title: "Reading" }] : []),
  ];

  return (
    <div className="space-y-6">
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

      <ArticleLayout
        toc={toc}
        rail={<StartTimer itemId={id} label={exercise.title} href={studyHref(area.id, id)} defaultMinutes={steps.reduce((a, s) => a + s.minutes, 0)} totalMinutes={focused} />}
      >
        <p className="text-sm text-muted">
          {isDesign ? "Attempt it first (timer on), then compare with the reference." : "Write your classes first, then compare."}
        </p>

        {isDesign ? WALKTHROUGHS[id] && <WalkthroughView w={WALKTHROUGHS[id]} /> : LLD_GUIDES[id] && <LldGuideView g={LLD_GUIDES[id]} />}

        {designDeep && <DesignDeepView deep={designDeep} />}

        {isDesign && designDeep?.code && designDeep.code.length > 0 && (
          <ProjectPlayground
            projectId={`sd-${id}`}
            files={designDeep.code.map((f) => ({ name: f.name, content: f.code }))}
          />
        )}

        {!isDesign && hasLldProject && (
          <>
            <LldProjectView project={LLD_PROJECTS[id]} deep={LLD_DEEP[id]} />
            {LLD_PROJECTS[id]?.files && (
              <ProjectPlayground
                projectId={`lld-${id}`}
                files={LLD_PROJECTS[id].files.map((f) => ({ name: f.name, content: f.code }))}
              />
            )}
          </>
        )}

        {isDesign && WALKTHROUGH_EXTRA[id]?.followUps && (
          <FollowUps items={WALKTHROUGH_EXTRA[id].followUps} />
        )}

        {!isDesign && LLD_EXTRA[id] && (
          <>
            {LLD_EXTRA[id].flow && LLD_EXTRA[id].flow.length > 0 && (
              <ArticleSection id="trace" title="Trace one use case">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-7">
                  {LLD_EXTRA[id].flow.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted">Walk the interviewer through this after writing your classes.</p>
              </ArticleSection>
            )}
            {LLD_EXTRA[id].edgeCases && LLD_EXTRA[id].edgeCases.length > 0 && (
              <ArticleSection id="edge-cases" title="Edge cases to name">
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
                  {LLD_EXTRA[id].edgeCases.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </ArticleSection>
            )}
          </>
        )}

        <ArticleSection id="your-turn" title="Your turn">
          <div className="space-y-6">
            <form action={logPracticeAction} className="space-y-4 rounded-xl border border-line bg-surface p-4">
              <input type="hidden" name="itemId" value={id} />
              <h4 className="font-semibold">Log a practice<span className="gamify-only"> (+{area.exercises.xp} XP, once a day)</span></h4>
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
                <h4 className="mb-2 font-semibold">History</h4>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {sessions.map((s) => (
                    <li key={s.id} className="space-y-1 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">{fmtDate(s.practicedOn, true)}</span>
                        <span>{s.score}/5</span>
                        {s.minutes && <span className="text-muted">{s.minutes} min</span>}
                        {s.xp > 0 && <span className="gamify-only text-muted">+{s.xp} XP</span>}
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
              codePlaceholder={
                isDesign
                  ? "Optional: table schemas, API signatures, key algorithms."
                  : "Write your design as Java files and run them. Saved with this problem."
              }
              codeHelp={!isDesign ? "Write your design as Java files and run them. Saved with this problem." : undefined}
              javaProject={!isDesign}
            />
          </div>
        </ArticleSection>

        {simple ? (
          <SimpleHint />
        ) : (
          <>
            <DiagramsSection itemId={id} diagrams={diagrams} error={diagramError} />

            <ReadingSection itemId={id} items={reading} />
          </>
        )}

        <LessonNav prev={prev} next={next} />
      </ArticleLayout>
    </div>
  );
}
