import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CONFIDENCE_LABELS, COVERED_CONFIDENCE, studyHref, type LldProject, type StudyArea } from "@habit/shared";
import { getDoc } from "@/lib/content-repo/docs";
import { getAllConcepts, getAllExercises, getStudyArea, getStudyAreas } from "@/lib/content-repo/lookups";
import { getDiagrams } from "@/lib/diagrams";
import { getAiSettings, getSimpleMode } from "@/lib/ui-prefs";
import { isReaderMode } from "@/lib/reader-mode";
import { isHosted } from "@/lib/hosted";
import { detectProviders } from "@/lib/ai/detect";
import { AskAiButton, LessonAi } from "./lesson-ai";
import { resolveLesson } from "@/lib/packs";
import { getReadingFor } from "@/lib/reading";
import { focusMinutes } from "@/lib/timer";
import {
  PRACTICE_LIMITS,
  asConceptShape,
  asDesignShape,
  asLldShape,
  getConceptDetail,
  getExerciseDetail,
  getLessonValue,
  readingMinutesOf,
} from "@/lib/study";
import { deletePracticeAction, logPracticeAction, saveConceptAction } from "../../../actions";
import { StartTimer } from "../../../start-timer";
import { NotesForm } from "../../../notes-form";
import { SubmitButton } from "../../../submit-button";
import { buttonClass, INPUT_CLASS, PageMain, ProgressBar, SimpleHint } from "../../../ui";
import { ArticleLayout, ArticleSection, DeeperSections, TipCallout } from "../../../learn-blocks";
import { CourseOutline } from "../../../course-outline";
import { DesignDeepView } from "../../../design-deep";
import { conceptToc, deeperIds, designDeepToc } from "../../../toc-items";
import type { TocItem } from "../../../toc";
import { DiagramsSection, FollowUps, LessonQuestions, LldGuideView, ReadingSection, WalkthroughView } from "../../learn-ui";
import { Tabs } from "../../../tabs";
import { LldCodePart, LldConcurrencyPart, LldDiagramsPart, LldWalkthroughPart } from "./lld-parts";
import { RevealCode } from "./reveal-code";
import { StudyArticleSkeleton } from "@/app/components/study-skeleton";
import { ProjectPlayground } from "./project-playground";
import { Confidence, fmtDate } from "../../study-ui";

/** Every concept and exercise is known at build time. */
export async function generateStaticParams() {
  return (await getStudyAreas()).flatMap((a) => [
    ...a.sections.flatMap((s) => s.concepts.map((c) => ({ area: a.id, id: c.id }))),
    ...(a.exercises?.items ?? []).map((e) => ({ area: a.id, id: e.id })),
  ]);
}

export async function generateMetadata({ params }: PageProps<"/study/[area]/[id]">): Promise<Metadata> {
  const { id } = await params;
  return {
    title: (await getAllConcepts())[id]?.title ?? (await getAllExercises())[id]?.title ?? "Study",
  };
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

function getAdjacentLessons(area: StudyArea, currentId: string): { prev?: LessonLink; next?: LessonLink; index: number; total: number } {
  const all: LessonLink[] = [
    ...area.sections.flatMap((s) =>
      s.concepts.map((c) => ({
        id: c.id,
        title: c.title,
        href: `/study/${area.id}/${c.id}`,
      })),
    ),
    ...(area.exercises?.items ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      href: `/study/${area.id}/${e.id}`,
    })),
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
          className="ml-auto inline-flex items-center gap-3 rounded-md border border-primary bg-surface px-4 py-3 text-sm font-medium transition-[border-color,box-shadow] duration-120 hover:border-line-strong hover:shadow-sm"
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

function buildLessonNav(area: StudyArea, currentId: string) {
  const allLessons = [
    ...area.sections.flatMap((s) =>
      s.concepts.map((c) => ({
        id: c.id,
        title: c.title,
        href: `/study/${area.id}/${c.id}`,
      })),
    ),
    ...(area.exercises?.items ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      href: `/study/${area.id}/${e.id}`,
    })),
  ];
  const curIdx = allLessons.findIndex((l) => l.id === currentId);

  // No back button here: the page already has one (the breadcrumb on lessons, the pill above the hero on projects and designs).
  return (
    <div className="space-y-2 pb-2">
      <p className="px-2 text-xs font-medium text-muted">
        {area.title} · {curIdx >= 0 ? curIdx + 1 : 1} of {allLessons.length}
      </p>
      <div className="space-y-0.5">
        {allLessons.map((l) => {
          const isNow = l.id === currentId;
          return (
            <Link
              key={l.id}
              href={l.href}
              className={`flex items-center gap-2 min-h-[36px] px-2.5 rounded-full text-xs transition-colors ${
                isNow ? "bg-primary-container text-on-primary-container font-semibold" : "text-foreground hover:bg-surface-2"
              }`}
            >
              <span className={`size-2 rounded-full shrink-0 ${isNow ? "bg-primary" : "border-2 border-line-strong"}`} />
              <span className="truncate">{l.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** A multi-line field: rounded like a card, never a pill (INPUT_CLASS is the single-line pill). */
const TEXTAREA_CLASS =
  "w-full rounded-[16px] border border-line-strong bg-surface-2 px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted " +
  "transition-colors duration-120 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/30 disabled:opacity-45";

async function Item({ params, searchParams }: { params: PageProps<"/study/[area]/[id]">["params"]; searchParams: PageProps<"/study/[area]/[id]">["searchParams"] }) {
  const { area: areaId, id } = await params;
  const sp = await searchParams;
  const diagramError = typeof sp.diagramError === "string" ? sp.diagramError : undefined;
  await connection();
  const area = await getStudyArea(areaId);
  const concept = (await getAllConcepts())[id];
  const exercise = (await getAllExercises())[id];
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
        <nav
          aria-label="Breadcrumb"
          className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3 pt-1 text-sm bg-background/95 backdrop-blur-md print:hidden"
        >
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
        <ExerciseView
          id={id}
          tab={typeof sp.tab === "string" ? sp.tab : undefined}
          diagramError={diagramError}
          prev={prev}
          next={next}
          lessonNav={lessonNav}
          askAi={ai?.enabled ? <AskAiButton /> : undefined}
        />
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
  const [d0, reading, focused, simple, stored] = await Promise.all([
    getConceptDetail(id),
    getReadingFor(id),
    focusMinutes(id),
    getSimpleMode(),
    getLessonValue(id),
  ]);
  const d = d0!;
  const concept = asConceptShape(stored);
  const lesson = (await resolveLesson(id, concept?.lesson)) ?? undefined;
  const extra = concept?.extra;
  const readMin = readingMinutesOf(concept?.lesson, extra);
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
                {COVERED_CONFIDENCE}+ counts as covered
                <span className="gamify-only"> (+XP the first time)</span>. Anything from 1 to {COVERED_CONFIDENCE - 1} comes back for review a week later.
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
                className={TEXTAREA_CLASS}
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
                  {`Next: ${next.title}`}
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

type ExTab = "walkthrough" | "diagrams" | "reference" | "edge-cases" | "deep" | "follow-ups" | "turn";

const exTab = (id: ExTab, label: string) => ({ id, label });

async function ExerciseView({
  id,
  tab: wantedTab,
  diagramError,
  prev,
  next,
  lessonNav,
  askAi,
}: {
  id: string;
  /** The `?tab=` value. */
  tab?: string;
  diagramError?: string;
  prev?: LessonLink;
  next?: LessonLink;
  lessonNav?: React.ReactNode;
  askAi?: React.ReactNode;
}) {
  const [d0, reading, focused, diagrams, simple, readOnly, stored, projectDoc] = await Promise.all([
    getExerciseDetail(id),
    getReadingFor(id),
    focusMinutes(id),
    getDiagrams(id),
    getSimpleMode(),
    isReaderMode(),
    getLessonValue(id),
    getDoc("lld-project", id),
  ]);
  const d = d0!;
  const { exercise, area, sessions, practice } = d;
  const steps = area.exercises.steps;
  const isDesign = area.id === "sd";
  const noRun = isHosted(); // hosted: Java projects cannot run, the editors show a desktop-app notice
  const totalMinutes = steps.reduce((a, s) => a + s.minutes, 0);

  const design = asDesignShape(stored);
  const lld = asLldShape(stored);
  const walkthrough = isDesign ? design?.walkthrough : undefined;
  const designDeep = isDesign ? design?.deep : undefined;
  const followUps = isDesign ? design?.extra?.followUps : undefined;
  const lldGuide = !isDesign ? lld?.guide : undefined;
  const lldProject = !isDesign ? (projectDoc?.row.body as LldProject | undefined) : undefined;
  const lldDeep = !isDesign ? lld?.deep : undefined;
  const lldExtra = !isDesign ? lld?.extra : undefined;
  const hasFlow = !!lldExtra?.flow?.length;
  const hasEdgeCases = !!lldExtra?.edgeCases?.length;
  const playgroundFiles = isDesign
    ? designDeep?.code?.map((f) => ({ name: f.name, content: f.code }))
    : lldProject?.files?.map((f) => ({ name: f.name, content: f.code }));
  const playgroundId = isDesign ? `sd-${id}` : `lld-${id}`;

  // The page sections are tabs (real links: `?tab=`, no JS needed). The first one is the default.
  const tabs = isDesign
    ? [
        ...(walkthrough ? [exTab("walkthrough", "Walkthrough")] : []),
        ...(designDeep ? [exTab("deep", "Deep dive")] : []),
        ...(followUps?.length ? [exTab("follow-ups", "Follow-ups")] : []),
        exTab("turn", "Your turn"),
      ]
    : [
        ...(lldDeep || hasFlow ? [exTab("walkthrough", "Walkthrough")] : []),
        ...(lldDeep ? [exTab("diagrams", "Diagrams")] : []),
        ...(lldGuide || lldProject ? [exTab("reference", "Reference")] : []),
        ...(hasEdgeCases ? [exTab("edge-cases", "Edge cases")] : []),
        exTab("turn", "Your turn"),
      ];
  const base = `/study/${area.id}/${id}`;
  // A failed diagram upload comes back to this page with ?diagramError: show it where the diagrams form is.
  const tab = tabs.find((t) => t.id === (diagramError ? "turn" : wantedTab))?.id ?? tabs[0].id;
  const tabHref = (t: ExTab) => (t === tabs[0].id ? base : `${base}?tab=${t}`);
  const tabItems = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    href: tabHref(t.id),
  }));
  // The step overview lives at the top of the Walkthrough tab (or the first tab when there is no walkthrough).
  const introTab = tabs.find((t) => t.id === "walkthrough")?.id ?? tabs[0].id;

  // "On this page": only the sections of the current tab.
  const playgroundToc: TocItem[] = playgroundFiles?.length ? [{ id: "playground", title: "Playground" }] : [];
  let toc: TocItem[] = [];
  if (tab === "walkthrough") {
    if (isDesign) toc = [{ id: "reference", title: "Reference walkthrough" }];
    else {
      const ids = lldDeep ? deeperIds(lldDeep.walkthrough.map((s) => s.title)) : [];
      toc = [
        ...(lldDeep
          ? [
              {
                id: "walkthrough",
                title: "Full design walkthrough",
                children: lldDeep.walkthrough.map((s, i) => ({
                  id: ids[i],
                  title: s.title,
                })),
              },
            ]
          : []),
        ...(hasFlow ? [{ id: "trace", title: "Trace one use case" }] : []),
        ...(lldDeep?.concurrency.length ? [{ id: "concurrency", title: "Concurrency" }] : []),
      ];
    }
  } else if (tab === "diagrams") toc = [{ id: "lld-diagrams", title: "Diagrams" }];
  else if (tab === "reference")
    toc = [
      ...(lldGuide ? [{ id: "reference", title: "Reference answer" }] : []),
      ...(lldProject ? [{ id: "java-code", title: "The full code (Java 17)" }] : []),
      ...playgroundToc,
    ];
  else if (tab === "edge-cases") toc = [{ id: "edge-cases", title: "Edge cases to name" }];
  else if (tab === "deep") toc = [...(designDeep ? designDeepToc(designDeep) : []), ...playgroundToc];
  else if (tab === "follow-ups") toc = [{ id: "follow-ups", title: "Follow-ups they'll ask" }];
  else
    toc = [
      { id: "your-turn", title: "Your turn" },
      ...(!simple ? [{ id: "diagrams", title: "Your diagrams" }] : []),
      ...(!simple && reading.length > 0 ? [{ id: "reading", title: "Reading" }] : []),
    ];

  if (tab === introTab)
    toc = [
      {
        id: "steps",
        title: isDesign ? "Interview steps" : "How to work through it",
      },
      ...toc,
    ];

  // The practice status is one compact chip in the hero.
  const practiceDue = practice.state !== "new" && practice.due;
  const practiceLine =
    practice.state === "new"
      ? "Not practiced yet"
      : `Practiced ${sessions.length}× · last ${practice.score}/5 · ${practice.due ? "due now" : `next on ${fmtDate(practice.nextOn, true)}`}`;

  const exerciseCount = area.exercises.items.length;
  const exerciseNo = Math.max(1, area.exercises.items.findIndex((e) => e.id === id) + 1);

  // SD: a step is done when the last logged practice scored it 4 or 5; the first one that isn't is "now".
  const lastScores = sessions[0]?.scores ?? {};
  const firstOpen = steps.findIndex((s) => (lastScores[s.id] ?? 0) < 4);
  const sdStepState = steps.map((s, i): "done" | "now" | "todo" => ((lastScores[s.id] ?? 0) >= 4 ? "done" : i === firstOpen ? "now" : "todo"));

  const playground = playgroundFiles?.length ? (
    <ArticleSection id="playground" title="Playground">
      <RevealCode title="Open the playground" note="It starts with the reference classes. Try it yourself first." lazy>
        <ProjectPlayground projectId={playgroundId} files={playgroundFiles} readOnly={readOnly} noRun={noRun} />
      </RevealCode>
    </ArticleSection>
  ) : null;

  const referenceMaterial =
    !isDesign && (lldProject || lldDeep || exercise)
      ? {
          requirements: {
            title: exercise.title ?? "Requirements",
            prompt: lldGuide?.requirements?.length ? "• " + lldGuide.requirements.join("\n• ") : exercise.focus,
          },
          walkthrough: lldDeep?.walkthrough.map((sec) => ({
            title: sec.title,
            body: sec.body,
            code: sec.code,
          })),
          diagrams: lldDeep
            ? [
                ...(lldDeep.classDiagram
                  ? [
                      {
                        title: "Class diagram",
                        source: lldDeep.classDiagram,
                        caption: "Class diagram",
                      },
                    ]
                  : []),
                ...(lldDeep.sequenceDiagram
                  ? [
                      {
                        title: "Sequence diagram",
                        source: lldDeep.sequenceDiagram,
                        caption: "Main flow",
                      },
                    ]
                  : []),
                ...(lldDeep.stateDiagram
                  ? [
                      {
                        title: "State diagram",
                        source: lldDeep.stateDiagram,
                        caption: "State diagram",
                      },
                    ]
                  : []),
                ...(lldDeep.extraDiagrams ?? []).map((diag) => ({
                  title: diag.title,
                  source: diag.source,
                  caption: diag.caption,
                })),
              ]
            : [],
          referenceFiles: lldProject ? [...lldProject.files, ...(lldProject.tests ?? [])] : [],
        }
      : undefined;

  // The step overview sits at the top of the first content tab (Walkthrough), not above the tab strip.
  // Column counts follow the reading column's own width (container queries), never an orphan row: four steps go 1, then
  // 2x2, then one row of 4; the SD callouts (2 trade-offs + estimates) go 1, 2, then one row.
  const stepCols = steps.length === 4 ? "grid-cols-1 @min-[380px]:grid-cols-2 @min-[600px]:grid-cols-4" : "grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]";
  const calloutCount = walkthrough ? Math.min(walkthrough.tradeoffs.length, 2) + (walkthrough.estimates.length > 0 ? 1 : 0) : 0;
  const calloutCols = calloutCount === 3 ? "grid-cols-1 @min-[600px]:grid-cols-3" : calloutCount === 2 ? "grid-cols-1 @min-[480px]:grid-cols-2" : "grid-cols-1";
  const stepsSection = (
    <ArticleSection id="steps" title={isDesign ? "Interview steps" : "How to work through it"}>
      {isDesign ? (
        <div className="space-y-4">
          {/* Ticks come from the last logged practice: a step scored 4 or 5 counts as done. */}
          <div className="space-y-2">
            <ol aria-label="Interview steps" className="flex flex-wrap gap-2">
              {steps.map((s, sIdx) => {
                const state = sdStepState[sIdx];
                return (
                  <li
                    key={s.id}
                    aria-current={state === "now" ? "step" : undefined}
                    title={`${s.minutes} min · ${s.hint}`}
                    className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full pl-1.5 pr-4 text-sm font-medium ${
                      state === "now" ? "bg-cat-sd text-on-cat-sd" : state === "done" ? "bg-surface-2 text-foreground" : "bg-surface-2 text-muted"
                    }`}
                  >
                    <span
                      className={`flex size-8 items-center justify-center rounded-full text-[13px] font-semibold ${
                        state === "now" ? "bg-on-cat-sd text-cat-sd" : state === "done" ? "bg-primary text-on-primary" : "border-2 border-line-strong"
                      }`}
                    >
                      {state === "done" ? (
                        <svg
                          aria-label="Done"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
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
              {sessions.length > 0 ? "Ticks show the steps you scored 4 or 5 in your last practice." : "Log a practice in Your turn to tick steps off."}
            </p>
          </div>

          {walkthrough && (walkthrough.tradeoffs.length > 0 || walkthrough.estimates.length > 0) && (
            <div className="@container">
              <div className={`grid gap-3 ${calloutCols}`}>
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
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">Write your classes first, then compare with the reference.</p>
          <div className="@container">
            <ol className={`grid gap-3 ${stepCols}`}>
              {steps.map((s, idx) => (
                <li key={s.id} className="flex flex-col gap-2 rounded-[24px] bg-surface-2 p-4">
                  <span
                    aria-hidden="true"
                    className={`flex size-9 items-center justify-center bg-cat-lld font-semibold text-on-cat-lld ${["rounded-full", "rounded-[12px]", "rounded-[18px_6px]", "rounded-[6px_18px]"][idx % 4]}`}
                  >
                    {idx + 1}
                  </span>
                  <h3 className="text-[17px] font-medium text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{s.hint}</p>
                  <p className="mt-auto pt-1 text-xs text-muted">{s.minutes} min</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </ArticleSection>
  );
  return (
    <div className="space-y-6">
      {/* The one back control on projects and designs (lessons have the breadcrumb). The lesson list has none. */}
      <Link
        href={`/study/${area.id}`}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface pl-2.5 pr-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 dark:border-0 dark:bg-surface-2 dark:hover:bg-line print:hidden"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        {area.title}
      </Link>

      {!isDesign ? (
        <section className="flex flex-wrap items-center gap-6 rounded-[32px] bg-cat-lld p-5 text-on-cat-lld sm:px-8 sm:py-7">
          <div className="min-w-0 flex-[1_1_280px]">
            <p className="text-sm font-medium opacity-80">
              Project {exerciseNo} of {exerciseCount} · about {totalMinutes} min
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{exercise.title}</h1>
            <p className="mt-2 max-w-[60ch] text-[15px] opacity-85">{exercise.focus}. Design it yourself, then compare.</p>
            <p className="mt-4">
              <span
                title={practice.state === "new" ? `Set a ${totalMinutes}-minute timer, do it aloud, then log it in Your turn.` : undefined}
                className={`inline-flex min-h-8 items-center rounded-full px-3.5 text-[13px] font-medium ${practiceDue ? "bg-on-cat-lld text-cat-lld" : "bg-on-cat-lld/15 text-on-cat-lld"}`}
              >
                {practiceLine}
              </span>
            </p>
          </div>
          <Link
            href={`${tabHref("turn")}#classes-${id.replace(/[^A-Za-z0-9_-]/g, "-")}`}
            className="flex items-center gap-3.5 rounded-[24px] bg-on-cat-lld px-5 py-4 text-cat-lld shadow-sm transition-opacity hover:opacity-90"
          >
            <svg
              aria-hidden="true"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
            </svg>
            <span>
              <span className="block text-[17px] font-medium leading-tight">Write your classes</span>
              <span className="block text-[13px] opacity-85">Opens the full-screen editor</span>
            </span>
          </Link>
        </section>
      ) : (
        <section className="flex flex-wrap items-center gap-6 rounded-[32px] bg-cat-sd p-5 text-on-cat-sd sm:px-8 sm:py-7">
          <div className="min-w-0 flex-[1_1_280px]">
            <p className="text-sm font-medium opacity-80">
              Design {exerciseNo} of {exerciseCount} · {totalMinutes}-minute interview
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{exercise.title}</h1>
            <p className="mt-2 max-w-[60ch] text-[15px] opacity-85">{exercise.focus}</p>
            <p className="mt-4">
              <span
                title={practice.state === "new" ? `Set a ${totalMinutes}-minute timer, do it aloud, then log it in Your turn.` : undefined}
                className={`inline-flex min-h-8 items-center rounded-full px-3.5 text-[13px] font-medium ${practiceDue ? "bg-on-cat-sd text-cat-sd" : "bg-on-cat-sd/15 text-on-cat-sd"}`}
              >
                {practiceLine}
              </span>
            </p>
          </div>
          <Link
            href={`${tabHref("turn")}#your-turn`}
            className="inline-flex h-12 items-center rounded-full bg-on-cat-sd px-6 text-[15px] font-medium text-cat-sd transition-opacity hover:opacity-90"
          >
            Practice it · {totalMinutes} min
          </Link>
        </section>
      )}

      <ArticleLayout
        toc={toc}
        lessonNav={lessonNav}
        askAi={askAi}
        tabs={tabItems.length > 1 ? <Tabs tabs={tabItems} active={tab} label="Page sections" /> : undefined}
        rail={<StartTimer itemId={id} label={exercise.title} href={studyHref(area.id, id)} defaultMinutes={totalMinutes} totalMinutes={focused} />}
      >
        {tab === introTab && stepsSection}

        {tab !== "turn" && tab !== introTab && (
          <p className="text-sm text-muted">{isDesign ? "Attempt it first (timer on), then compare with the reference." : "Write your classes first, then compare."}</p>
        )}

        {tab === "walkthrough" && (
          <>
            {isDesign && walkthrough && <WalkthroughView w={walkthrough} />}
            {lldDeep && <LldWalkthroughPart deep={lldDeep} />}
            {hasFlow && lldExtra?.flow && (
              <ArticleSection id="trace" title="Trace one use case">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-7">
                  {lldExtra.flow.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted">Walk the interviewer through this after writing your classes.</p>
              </ArticleSection>
            )}
            {lldDeep && <LldConcurrencyPart deep={lldDeep} />}
          </>
        )}

        {tab === "diagrams" && lldDeep && <LldDiagramsPart deep={lldDeep} />}

        {tab === "reference" && (
          <>
            {lldGuide && <LldGuideView g={lldGuide} />}
            {lldProject && <LldCodePart project={lldProject} />}
            {playground}
          </>
        )}

        {tab === "edge-cases" && lldExtra?.edgeCases && (
          <ArticleSection id="edge-cases" title="Edge cases to name">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
              {lldExtra.edgeCases.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </ArticleSection>
        )}

        {tab === "deep" && designDeep && (
          <>
            <DesignDeepView deep={designDeep} />
            {playground}
          </>
        )}

        {tab === "follow-ups" && followUps && <FollowUps items={followUps} />}

        {tab === "turn" && (
          <>
            <ArticleSection id="your-turn" title="Your turn">
              <div className="space-y-6">
                <form action={logPracticeAction} className="space-y-4 rounded-[24px] border border-line bg-surface p-5 dark:border-0">
                  <input type="hidden" name="itemId" value={id} />
                  <h3 className="font-semibold">
                    Log a practice
                    <span className="gamify-only"> (+{area.exercises.xp} XP, once a day)</span>
                  </h3>
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
                  <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <div>
                      <label htmlFor="practice-minutes" className="mb-1 block text-xs font-medium text-muted">
                        Minutes
                      </label>
                      <input id="practice-minutes" name="minutes" type="number" min={1} max={PRACTICE_LIMITS.minutes} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label htmlFor="practice-link" className="mb-1 block text-xs font-medium text-muted">
                        {isDesign ? "Diagram or recording link (optional)" : "Code or gist link (optional)"}
                      </label>
                      <input id="practice-link" name="link" type="url" maxLength={PRACTICE_LIMITS.link} placeholder="https://" className={INPUT_CLASS} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="practice-notes" className="block text-xs font-medium text-muted">
                      Practice notes
                    </label>
                    <p id="practice-notes-hint" className="mb-1 text-xs text-muted">
                      What went well, what you missed, what to fix next time.
                    </p>
                    <textarea
                      id="practice-notes"
                      name="notes"
                      rows={3}
                      maxLength={PRACTICE_LIMITS.notes}
                      aria-describedby="practice-notes-hint"
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <SubmitButton className={buttonClass("primary")}>Log practice</SubmitButton>
                    <span className="text-xs text-muted">Score at least one step (1 = missed it, 5 = interview-ready).</span>
                  </div>
                </form>

                {sessions.length > 0 && (
                  <section>
                    <h3 className="mb-2 font-semibold">History</h3>
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
                    isDesign ? "Optional: table schemas, API signatures, key algorithms." : "Write your design as Java files and run them. Saved with this problem."
                  }
                  codeHelp={!isDesign ? "Write your design as Java files and run them. Saved with this problem." : undefined}
                  javaProject={!isDesign}
                  readOnly={readOnly}
                  noRun={noRun}
                  reference={referenceMaterial}
                />
              </div>
            </ArticleSection>

            {isDesign && (
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                {next && (
                  <Link href={next.href} className={buttonClass("primary", "md")}>
                    {`Next: ${next.title}`}
                  </Link>
                )}
                <Link href="/study/diagrams" className={buttonClass("tonal", "md")}>
                  Draw it in Diagrams
                </Link>
              </div>
            )}

            {simple ? (
              <SimpleHint />
            ) : (
              <>
                <DiagramsSection itemId={id} diagrams={diagrams} error={diagramError} />

                <ReadingSection itemId={id} items={reading} />
              </>
            )}
          </>
        )}

        <LessonNav prev={prev} next={next} />
      </ArticleLayout>
    </div>
  );
}
