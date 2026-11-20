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
import { isReaderMode } from "@/lib/reader-mode";
import { isHosted } from "@/lib/hosted";
import { detectProviders } from "@/lib/ai/detect";
import { AskAiButton, LessonAi } from "./lesson-ai";
import { resolveLesson } from "@/lib/packs";
import { getReadingFor } from "@/lib/reading";
import { focusMinutes } from "@/lib/timer";
import { PRACTICE_LIMITS, getConceptDetail, getExerciseDetail } from "@/lib/study";
import { deletePracticeAction, logPracticeAction, saveConceptAction } from "../../../actions";
import { StartTimer } from "../../../start-timer";
import { NotesForm } from "../../../notes-form";
import { SubmitButton } from "../../../submit-button";
import { buttonClass, INPUT_CLASS, PageMain, ProgressBar, SimpleHint } from "../../../ui";
import { ArticleLayout, ArticleSection, DeeperSections, TipCallout } from "../../../learn-blocks";
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
    <PageMain title="Study" hideTitle wide>
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

function getAdjacentLessons(area: ReturnType<typeof getStudyArea> & {}, currentId: string): { prev?: LessonLink; next?: LessonLink; index: number; total: number } {
  const all: LessonLink[] = [
    ...area.sections.flatMap((s) => s.concepts.map((c) => ({ id: c.id, title: c.title, href: `/study/${area.id}/${c.id}` }))),
    ...(area.exercises?.items ?? []).map((e) => ({ id: e.id, title: e.title, href: `/study/${area.id}/${e.id}` })),
  ];
  const index = all.findIndex((item) => item.id === currentId);
  return {
    prev: index > 0 ? all[index - 1] : undefined,
    next: index >= 0 && index < all.length - 1 ? all[index + 1] : undefined,
    index,
    total: all.length,
  };
}

function LessonNav({ prev, next }: { prev?: LessonLink; next?: LessonLink }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Lesson navigation" className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="inline-flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm font-medium transition-[border-color,box-shadow] duration-120 hover:border-line-strong hover:shadow-sm"
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
          className="ml-auto inline-flex items-center gap-3 rounded-md border border-line border-l-[3px] border-l-primary bg-surface px-4 py-3 text-sm font-medium transition-[border-color,box-shadow] duration-120 hover:border-line-strong hover:shadow-sm"
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

function buildLessonNav(area: ReturnType<typeof getStudyArea> & {}, currentId: string) {
  const allLessons = [
    ...area.sections.flatMap((s) => s.concepts.map((c) => ({ id: c.id, title: c.title, href: `/study/${area.id}/${c.id}` }))),
    ...(area.exercises?.items ?? []).map((e) => ({ id: e.id, title: e.title, href: `/study/${area.id}/${e.id}` })),
  ];
  const curIdx = allLessons.findIndex((l) => l.id === currentId);

  return (
    <div className="space-y-3">
      <Link
        href={`/study/${area.id}`}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-surface-2 text-foreground text-xs font-medium hover:bg-surface-3 transition-colors"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        {area.title}
      </Link>
      <p className="px-2 text-xs font-medium text-muted">
        Lessons · {curIdx >= 0 ? curIdx + 1 : 1} of {allLessons.length}
      </p>
      <div className="space-y-0.5">
        {allLessons.map((l) => {
          const isNow = l.id === currentId;
          return (
            <Link
              key={l.id}
              href={l.href}
              className={`flex items-center gap-2 min-h-[36px] px-2.5 rounded-full text-xs transition-colors ${
                isNow
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-foreground hover:bg-surface-2"
              }`}
            >
              <span
                className={`size-2 rounded-full shrink-0 ${
                  isNow ? "bg-primary" : "border-2 border-line-strong"
                }`}
              />
              <span className="truncate">{l.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const field = `${INPUT_CLASS} h-auto py-2`;

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
  const { prev, next, index, total } = getAdjacentLessons(area, id);
  const lessonNav = buildLessonNav(area, id);
  const ai = process.env.HABIT_HOSTED === "1" ? ({ enabled: true, provider: "byok" } as unknown as Awaited<ReturnType<typeof getAiSettings>>) : await getAiSettings();
  const aiProviders = ai?.enabled ? await detectProviders() : [];

  return (
    <article className="space-y-6">
      {/* Concept lessons get the breadcrumb bar; LLD and SD exercises show a back pill above their hero instead. */}
      {concept && (
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3 text-sm print:hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link href="/study" className="text-muted hover:text-foreground">
            Learn
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
        {index >= 0 && total > 0 && (
          <div className="flex w-full items-center gap-3 sm:w-56">
            <ProgressBar value={index + 1} max={total} label={`Lesson ${index + 1} of ${total} in ${area.title}`} />
            <span className="shrink-0 text-xs text-muted tabular-nums">
              Lesson {index + 1} of {total}
            </span>
          </div>
        )}
      </nav>
      )}
      {concept ? (
        <ConceptView id={id} prev={prev} next={next} lessonNav={lessonNav} askAi={ai?.enabled ? <AskAiButton /> : undefined} />
      ) : (
        <ExerciseView id={id} diagramError={diagramError} prev={prev} next={next} lessonNav={lessonNav} askAi={ai?.enabled ? <AskAiButton /> : undefined} />
      )}
      {ai?.enabled && <LessonAi lessonId={id} providers={aiProviders} provider={ai.provider} />}
    </article>
  );
}

async function ConceptView({
  id,
  prev,
  next,
  lessonNav,
  askAi,
}: {
  id: string;
  prev?: LessonLink;
  next?: LessonLink;
  lessonNav?: React.ReactNode;
  askAi?: React.ReactNode;
}) {
  const [d0, reading, focused, simple] = await Promise.all([getConceptDetail(id), getReadingFor(id), focusMinutes(id), getSimpleMode()]);
  const d = d0!;
  const lesson = (await resolveLesson(id, LESSONS[id])) ?? undefined;
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
      <ArticleLayout
        toc={toc}
        lessonNav={lessonNav}
        askAi={askAi}
        rail={<StartTimer itemId={id} label={d.concept.title} href={studyHref(d.concept.area, id)} defaultMinutes={studyMinutes} totalMinutes={focused} />}
      >
        <header className="space-y-2">
          <span className="self-start inline-flex items-center px-3 py-1 rounded-full bg-primary-soft text-on-primary-soft text-xs font-medium">
            {d.concept.section} · {readMin} min
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{d.concept.title}</h1>
          <p id={lesson?.overview ? "overview" : undefined} className="max-w-[68ch] scroll-mt-6 text-base leading-relaxed text-muted sm:text-lg">
            {lesson?.overview ?? d.concept.points[0]}
          </p>
          <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted">
            <Confidence value={confidence} /> {CONFIDENCE_LABELS[confidence]}
            <span>· ≈ {readMin} min read</span>
            {p?.coveredOn && <span>· covered {fmtDate(p.coveredOn, true)}</span>}
            {p && <span>· updated {fmtDate(p.updatedOn, true)}</span>}
          </p>
        </header>


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
                    className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="font-medium">{point}</span>
                </label>
                {lesson?.explain[i] && <p className="mt-1 pl-6 text-sm leading-relaxed text-muted">{lesson.explain[i]}</p>}
              </li>
            ))}
          </ol>
          {lesson?.pitfalls?.[0] && (
            <TipCallout title="Interview tip" className="mt-4">
              {lesson.pitfalls[0]}
            </TipCallout>
          )}
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
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm transition-colors duration-120 hover:bg-surface-2 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
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
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <SubmitButton className={buttonClass("primary")}>Save notes</SubmitButton>
              <button
                type="submit"
                name="confidence"
                value={4}
                data-haptic="success"
                className="h-10 px-5 rounded-full bg-primary text-on-primary font-medium text-sm transition-colors hover:bg-primary-hover cursor-pointer"
              >
                Mark as learned · +20 XP
              </button>
              {next && (
                <Link
                  href={next.href}
                  className="inline-flex items-center h-10 px-5 rounded-full bg-primary-container text-on-primary-container font-medium text-sm transition-opacity hover:opacity-90"
                >
                  Next: {next.title}
                </Link>
              )}
            </div>
          </form>
        </ArticleSection>

        {simple ? <SimpleHint /> : <ReadingSection itemId={id} items={reading} />}

        <LessonNav prev={prev} next={next} />
      </ArticleLayout>
    </div>
  );
}

async function ExerciseView({
  id,
  diagramError,
  prev,
  next,
  lessonNav,
  askAi,
}: {
  id: string;
  diagramError?: string;
  prev?: LessonLink;
  next?: LessonLink;
  lessonNav?: React.ReactNode;
  askAi?: React.ReactNode;
}) {
  const [d0, reading, focused, diagrams, simple, readOnly] = await Promise.all([getExerciseDetail(id), getReadingFor(id), focusMinutes(id), getDiagrams(id), getSimpleMode(), isReaderMode()]);
  const d = d0!;
  const { exercise, area, sessions, practice } = d;
  const steps = area.exercises.steps;
  const isDesign = area.id === "sd";
  const noRun = isHosted(); // hosted: Java projects cannot run, the editors show a desktop-app notice

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

  const exerciseCount = area.exercises.items.length;
  const exerciseNo = Math.max(1, area.exercises.items.findIndex((e) => e.id === id) + 1);
  const totalMinutes = steps.reduce((a, s) => a + s.minutes, 0);
  const walkthrough = isDesign ? WALKTHROUGHS[id] : undefined;

  // LLD: jump links to the sections that exist on this page.
  const tocIds = new Set(toc.map((t) => t.id));
  const lldJumps = isDesign
    ? []
    : [
        { label: "Walkthrough", id: "walkthrough" },
        { label: "Diagrams", id: "lld-diagrams" },
        { label: "Reference", id: hasLldGuide ? "reference" : "java-code" },
        { label: "Edge cases", id: "edge-cases" },
        { label: "Your turn", id: "your-turn" },
      ]
        .filter((j) => tocIds.has(j.id))
        .map((j) => ({ label: j.label, href: `#${j.id}` }));

  // SD: a step is done when the last logged practice scored it 4 or 5; the first one that isn't is "now".
  const lastScores = sessions[0]?.scores ?? {};
  const firstOpen = steps.findIndex((s) => (lastScores[s.id] ?? 0) < 4);
  const sdStepState = steps.map((s, i): "done" | "now" | "todo" =>
    (lastScores[s.id] ?? 0) >= 4 ? "done" : i === firstOpen ? "now" : "todo",
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/study/${area.id}`}
        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface-2 pl-2.5 pr-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-3 print:hidden"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        {area.title}
      </Link>

      {!isDesign ? (
        <div className="space-y-4">
          <section className="flex flex-wrap items-center gap-5 rounded-[32px] bg-cat-lld p-5 text-on-cat-lld sm:px-8 sm:py-7">
            <div className="min-w-0 flex-[1_1_280px]">
              <p className="text-sm font-medium opacity-80">
                Project {exerciseNo} of {exerciseCount} · about {totalMinutes} min
              </p>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{exercise.title}</h1>
              <p className="mt-1.5 max-w-[60ch] text-[15px] opacity-85">{exercise.focus}. Design it yourself, then compare.</p>
            </div>
            <a
              href={`#classes-${id.replace(/[^A-Za-z0-9_-]/g, "-")}`}
              className="flex items-center gap-3.5 rounded-[24px] bg-on-cat-lld px-5 py-4 text-cat-lld shadow-sm transition-opacity hover:opacity-90"
            >
              <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
              </svg>
              <span>
                <span className="block text-[17px] font-medium leading-tight">Write your classes</span>
                <span className="block text-[13px] opacity-85">Opens the full-screen editor</span>
              </span>
            </a>
          </section>

          {/* Jump links to the sections below, as a segmented row (scrolls sideways inside itself on a phone). */}
          {lldJumps.length > 0 && (
            <nav aria-label="Sections" className="max-w-full self-start overflow-x-auto [scrollbar-width:none] print:hidden">
              <ul className="inline-flex gap-1 rounded-full bg-surface-2 p-1">
                {lldJumps.map((j) => (
                  <li key={j.href}>
                    <a
                      href={j.href}
                      className="inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                    >
                      {j.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3">
            {steps.map((s, idx) => (
              <section key={s.id} className="flex flex-col gap-2.5 rounded-[28px] border border-line bg-surface p-5 dark:border-0">
                <span
                  aria-hidden="true"
                  className={`flex size-9 items-center justify-center bg-cat-lld font-semibold text-on-cat-lld ${["rounded-full", "rounded-[12px]", "rounded-[18px_6px]", "rounded-[6px_18px]"][idx % 4]}`}
                >
                  {idx + 1}
                </span>
                <h2 className="text-[17px] font-medium text-foreground">{s.title}</h2>
                <p className="text-sm leading-relaxed text-muted">{s.hint}</p>
                <p className="mt-auto text-xs text-muted">{s.minutes} min</p>
              </section>
            ))}
          </div>

          {LLD_PROJECTS[id]?.files && (
            <section className="flex flex-col gap-3 rounded-[28px] border border-line bg-surface p-5 dark:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[17px] font-medium text-foreground">Reference answer · {LLD_PROJECTS[id].files.length} Java files</h2>
                <a href="#java-code" className={buttonClass("tonal", "sm")}>
                  Reveal after you try
                </a>
              </div>
              <ul className="flex flex-wrap gap-2">
                {LLD_PROJECTS[id].files.slice(0, 8).map((f) => (
                  <li key={f.name} className="max-w-full truncate rounded-[10px] bg-surface-2 px-3 py-1.5 font-mono text-[13px] text-foreground">
                    {f.name.replace(/^.*\//, "")}
                  </li>
                ))}
                {LLD_PROJECTS[id].files.length > 8 && (
                  <li className="rounded-[10px] bg-surface-2 px-3 py-1.5 text-[13px] text-muted">+{LLD_PROJECTS[id].files.length - 8} more</li>
                )}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <section className="flex flex-wrap items-center gap-4 rounded-[32px] bg-cat-sd p-5 text-on-cat-sd sm:px-8 sm:py-7">
            <div className="min-w-0 flex-[1_1_280px]">
              <p className="text-sm font-medium opacity-80">
                Design {exerciseNo} of {exerciseCount} · {totalMinutes}-minute interview
              </p>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{exercise.title}</h1>
              <p className="mt-1.5 max-w-[60ch] text-[15px] opacity-85">{exercise.focus}</p>
            </div>
            <a
              href="#your-turn"
              className="inline-flex h-12 items-center rounded-full bg-on-cat-sd px-6 text-[15px] font-medium text-cat-sd transition-opacity hover:opacity-90"
            >
              Practice it · {totalMinutes} min
            </a>
          </section>

          {/* The interview steps. Ticks come from the last logged practice: a step scored 4 or 5 counts as done. */}
          <div className="space-y-2">
            <ol aria-label="Interview steps" className="flex flex-wrap gap-1.5">
              {steps.map((s, sIdx) => {
                const state = sdStepState[sIdx];
                return (
                  <li
                    key={s.id}
                    aria-current={state === "now" ? "step" : undefined}
                    title={`${s.minutes} min · ${s.hint}`}
                    className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full pl-1.5 pr-4 text-sm font-medium ${
                      state === "now" ? "bg-cat-sd text-on-cat-sd" : state === "done" ? "bg-surface-2 text-foreground" : "text-muted"
                    }`}
                  >
                    <span
                      className={`flex size-8 items-center justify-center rounded-full text-[13px] font-semibold ${
                        state === "now"
                          ? "bg-on-cat-sd text-cat-sd"
                          : state === "done"
                            ? "bg-primary text-on-primary"
                            : "border-2 border-line-strong"
                      }`}
                    >
                      {state === "done" ? (
                        <svg aria-label="Done" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        sIdx + 1
                      )}
                    </span>
                    {s.title}
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-muted">
              {sessions.length > 0 ? "Ticks show the steps you scored 4 or 5 in your last practice." : "Log a practice below to tick steps off."}
            </p>
          </div>

          {walkthrough && (walkthrough.tradeoffs.length > 0 || walkthrough.estimates.length > 0) && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
              {walkthrough.tradeoffs.slice(0, 2).map((t, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-[24px] bg-reward-soft px-5 py-4 text-sm leading-relaxed text-on-reward-soft">
                  <span className="font-semibold">Trade-off</span>
                  <span>{t}</span>
                </div>
              ))}
              {walkthrough.estimates.length > 0 && (
                <div className="flex flex-col gap-1 rounded-[24px] bg-primary-soft px-5 py-4 text-sm leading-relaxed text-on-primary-soft">
                  <span className="font-semibold">Back of the envelope</span>
                  <ul className="space-y-1">
                    {walkthrough.estimates.slice(0, 3).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <section className={`rounded-[24px] px-5 py-4 text-sm ${practice.state !== "new" && practice.due ? "bg-reward-soft text-on-reward-soft" : "border border-line bg-surface dark:border-0"}`}>
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
        lessonNav={lessonNav}
        askAi={askAi}
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
            readOnly={readOnly}
            noRun={noRun}
          />
        )}

        {!isDesign && hasLldProject && (
          <>
            <LldProjectView project={LLD_PROJECTS[id]} deep={LLD_DEEP[id]} />
            {LLD_PROJECTS[id]?.files && (
              <ProjectPlayground
                projectId={`lld-${id}`}
                files={LLD_PROJECTS[id].files.map((f) => ({ name: f.name, content: f.code }))}
                readOnly={readOnly}
                noRun={noRun}
              />
            )}
          </>
        )}

        {isDesign && WALKTHROUGH_EXTRA[id]?.followUps && (
          <FollowUps items={WALKTHROUGH_EXTRA[id].followUps} />
        )}

        {isDesign && (
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-line">
            {next && (
              <Link href={next.href} className={buttonClass("primary", "md")}>
                Next: {next.title}
              </Link>
            )}
            <Link href="/study/diagrams" className={buttonClass("tonal", "md")}>
              Draw it in Diagrams
            </Link>
          </div>
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
            <form action={logPracticeAction} className="space-y-4 rounded-[24px] border border-line bg-surface p-5 dark:border-0">
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
                    <select id={`score-${step.id}`} name={`score:${step.id}`} defaultValue="" className={`${INPUT_CLASS} w-16`}>
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
                <input name="minutes" type="number" min={1} max={PRACTICE_LIMITS.minutes} placeholder="Minutes" aria-label="Minutes" className={`${INPUT_CLASS} w-28`} />
                <input
                  name="link"
                  type="url"
                  maxLength={PRACTICE_LIMITS.link}
                  placeholder={isDesign ? "Diagram or recording link (optional)" : "Code or gist link (optional)"}
                  aria-label="Link"
                  className={`${INPUT_CLASS} min-w-0 flex-1`}
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
                <SubmitButton className={buttonClass("primary")}>Log practice</SubmitButton>
                <span className="text-xs text-muted">Score at least one step (1 = missed it, 5 = interview-ready).</span>
              </div>
            </form>

            {sessions.length > 0 && (
              <section>
                <h4 className="mb-2 font-semibold">History</h4>
                <ul className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface dark:border-0">
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

            {(() => {
              const referenceMaterial = !isDesign && (LLD_PROJECTS[id] || LLD_DEEP[id] || ALL_EXERCISES[id]) ? {
              requirements: {
                title: ALL_EXERCISES[id]?.title ?? "Requirements",
                prompt: LLD_GUIDES[id]?.requirements?.length ? "• " + LLD_GUIDES[id].requirements.join("\n• ") : ALL_EXERCISES[id]?.focus,
              },
              walkthrough: LLD_DEEP[id]?.walkthrough.map((sec) => ({
                title: sec.title,
                body: sec.body,
                code: sec.code,
              })),
              diagrams: LLD_DEEP[id] ? [
                ...(LLD_DEEP[id].classDiagram ? [{ title: "Class diagram", source: LLD_DEEP[id].classDiagram, caption: "Class diagram" }] : []),
                ...(LLD_DEEP[id].sequenceDiagram ? [{ title: "Sequence diagram", source: LLD_DEEP[id].sequenceDiagram, caption: "Main flow" }] : []),
                ...(LLD_DEEP[id].stateDiagram ? [{ title: "State diagram", source: LLD_DEEP[id].stateDiagram, caption: "State diagram" }] : []),
                ...(LLD_DEEP[id].extraDiagrams ?? []).map((diag) => ({ title: diag.title, source: diag.source, caption: diag.caption })),
              ] : [],
              referenceFiles: LLD_PROJECTS[id] ? [...LLD_PROJECTS[id].files, ...(LLD_PROJECTS[id].tests ?? [])] : [],
            } : undefined;

            return (
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
                readOnly={readOnly}
                noRun={noRun}
                reference={referenceMaterial}
              />
            );
          })()}
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
