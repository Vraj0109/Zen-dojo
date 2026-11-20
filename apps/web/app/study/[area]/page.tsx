import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { COVERED_CONFIDENCE, LESSON_EXTRA, STUDY_AREAS, getStudyArea } from "@habit/shared";
import { getAddedItems, type AddedGroup } from "@/lib/packs";
import { getStudyView, type ConceptView, type ExerciseView } from "@/lib/study";
import { Badge, PageMain, ProgressBar, StatusMark } from "../../ui";
import { LearnBack } from "../../section-tabs";
import { Tabs } from "../../tabs";
import { deeperIds } from "../../toc-items";
import { Confidence, fmtDate } from "../study-ui";
import { TabPanel } from "../../tab-panel";
import { StudyAreaSkeleton } from "@/app/components/study-skeleton";

/** The study areas are fixed, so their pages are known at build time. */
export function generateStaticParams() {
  return STUDY_AREAS.map((a) => ({ area: a.id }));
}

export async function generateMetadata({ params }: PageProps<"/study/[area]">): Promise<Metadata> {
  const { area } = await params;
  return { title: getStudyArea(area)?.title ?? "Study" };
}

export default function StudyAreaPage({ params, searchParams }: PageProps<"/study/[area]">) {
  return (
    <PageMain title="Study" hideTitle>
      <Suspense fallback={<StudyAreaSkeleton />}>
        <Area params={params} searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

type Tone = { bg: string; node: string; shape: string; icon: React.ReactNode };

/** Subject tone for the hero, the selected tab and the done steps. Same colours as the course cards on the Learn hub. */
function areaTone(id: string): Tone {
  const svg = (d: string) => (
    <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
  switch (id) {
    case "lld":
      return { bg: "bg-cat-lld text-on-cat-lld", node: "bg-on-cat-lld text-cat-lld", shape: "rounded-[28px_10px]", icon: svg("M12 3 3 8l9 5 9-5zM3 13l9 5 9-5") };
    case "sd":
      return { bg: "bg-cat-sd text-on-cat-sd", node: "bg-on-cat-sd text-cat-sd", shape: "rounded-full", icon: svg("M4 6h16v12H4zM4 10h16") };
    case "core":
      return { bg: "bg-reward-soft text-on-reward-soft", node: "bg-on-reward-soft text-reward-soft", shape: "rounded-[10px_28px]", icon: svg("M4 4h16v6H4zM4 14h16v6H4z") };
    case "dsa":
      return { bg: "bg-cat-dsa text-on-cat-dsa", node: "bg-on-cat-dsa text-cat-dsa", shape: "rounded-2xl", icon: svg("m8 6-6 6 6 6M16 6l6 6-6 6") };
    default:
      return { bg: "bg-primary-soft text-on-primary-soft", node: "bg-on-primary-soft text-primary-soft", shape: "rounded-2xl", icon: svg("M12 3 3 8l9 5 9-5zM3 13l9 5 9-5") };
  }
}

type CourseTab = "about" | "learn" | "projects";

async function Area({
  params,
  searchParams,
}: {
  params: PageProps<"/study/[area]">["params"];
  searchParams: PageProps<"/study/[area]">["searchParams"];
}) {
  await connection();
  const [{ area: areaId }, sp] = await Promise.all([params, searchParams]);
  const [view, added] = await Promise.all([getStudyView(areaId), getAddedItems(areaId)]);
  if (!view) notFound();
  const sectionTitles = new Set(view.sections.map((s) => s.title));
  const joined = (title: string) => added.find((g) => g.section === title)?.items ?? [];
  const separate = added.filter((g) => !sectionTitles.has(g.section));
  const { area, sections, exercises, due, totals } = view;
  const hours = Math.round((totals.minutes / 60) * 10) / 10;
  const dueCount = due.concepts.length + due.exercises.length;
  const tone = areaTone(area.id);
  const projectsLabel = area.id === "lld" ? "Projects" : area.id === "sd" ? "Designs" : "Practice";

  const wanted = typeof sp.tab === "string" ? sp.tab : "learn";
  const tab: CourseTab = wanted === "about" || (wanted === "projects" && area.exercises) ? wanted : "learn";
  const base = `/study/${area.id}`;
  const tabs: { id: CourseTab; label: string; href: string }[] = [
    { id: "about", label: "About", href: `${base}?tab=about` },
    { id: "learn", label: `Learn · ${totals.concepts}`, href: base },
    ...(area.exercises ? [{ id: "projects" as const, label: `${projectsLabel} · ${totals.exercises}`, href: `${base}?tab=projects` }] : []),
  ];

  // The next lesson: the first concept not yet covered, in course order. When every lesson is covered, the next
  // exercise that was never practised.
  const nextConcept = sections.flatMap((s) => s.concepts).find((c) => c.confidence < COVERED_CONFIDENCE);
  const nextExercise = nextConcept ? undefined : exercises.find((e) => e.practice.state === "new");
  const nextId = nextConcept?.id;
  const cont = nextConcept ?? nextExercise;

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <LearnBack current={area.title} />

      <section className={`flex flex-wrap items-center gap-5 rounded-[32px] p-5 sm:px-8 sm:py-7 ${tone.bg}`}>
        <span aria-hidden="true" className={`hidden size-[72px] shrink-0 items-center justify-center bg-black/10 sm:flex dark:bg-white/10 ${tone.shape}`}>
          {tone.icon}
        </span>
        <div className="min-w-0 flex-[1_1_260px]">
          <h1 className="text-[26px] font-semibold leading-tight sm:text-[34px]">{area.title}</h1>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed opacity-85">{area.intro}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-[13px] font-medium">
            <li className="rounded-full bg-white/65 px-3 py-1.5 dark:bg-black/30">
              {totals.covered} of {totals.concepts} done
            </li>
            {hours > 0 && <li className="rounded-full bg-white/65 px-3 py-1.5 dark:bg-black/30">{hours} h practised</li>}
            {dueCount > 0 && (
              <li className="rounded-full bg-white/65 px-3 py-1.5 dark:bg-black/30">
                {dueCount} review{dueCount === 1 ? "" : "s"} due
              </li>
            )}
          </ul>
        </div>
        {cont && (
          <Link
            href={`${base}/${cont.id}`}
            className={`inline-flex h-12 max-w-full items-center rounded-full px-[22px] text-[15px] font-medium transition-opacity hover:opacity-90 ${tone.node}`}
          >
            <span className="truncate">
              {totals.covered === 0 && nextConcept ? "Start" : "Continue"}: {cont.title}
            </span>
          </Link>
        )}
      </section>

      <Tabs
        tabs={tabs}
        active={tab}
        hrefFor={(id) => tabs.find((t) => t.id === id)?.href ?? base}
        label="Course sections"
      />

      <TabPanel tab={tab} order={tabs.map((t) => t.id)} className="w-full space-y-8">

      {tab === "learn" && (
        <>
          {dueCount > 0 && (
            <section aria-labelledby="due" className="space-y-3">
              <h2 id="due" className="text-lg font-medium text-foreground">
                Due for review
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-[28px] border border-line bg-surface px-2 dark:border-0">
                {due.exercises.map((e) => (
                  <ExerciseRow key={e.id} e={e} areaId={area.id} />
                ))}
                {due.concepts.map((c) => (
                  <ConceptRow key={c.id} c={c} areaId={area.id} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="path" className="space-y-3">
            <h2 id="path" className="sr-only">
              Course path
            </h2>
            <ol className="flex flex-col">
              {sections.flatMap((s, si) =>
                s.concepts.map((c, ci) => {
                  const n = sections.slice(0, si).reduce((a, x) => a + x.concepts.length, 0) + ci + 1;
                  const isLast = n === totals.concepts;
                  const done = c.confidence >= COVERED_CONFIDENCE;
                  const now = c.id === nextId;
                  return (
                    <li key={c.id} className="flex gap-3 sm:gap-4">
                      <div className="flex w-11 shrink-0 flex-col items-center">
                        <span
                          className={`flex size-11 items-center justify-center rounded-full text-[15px] font-semibold ${
                            done ? tone.node : now ? "bg-primary text-on-primary ring-[6px] ring-primary-container" : "bg-surface-2 text-muted"
                          }`}
                        >
                          {done ? (
                            <svg aria-label="Done" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : (
                            n
                          )}
                        </span>
                        {!isLast && <span aria-hidden="true" className={`my-1 min-h-4 w-1 flex-1 rounded-full ${done ? tone.node : "bg-line"}`} />}
                      </div>
                      <Link
                        href={`${base}/${c.id}`}
                        prefetch={false}
                        aria-current={now ? "step" : undefined}
                        className={`mb-3 flex min-w-0 flex-1 items-center gap-3 rounded-[24px] px-4 py-3.5 transition-colors sm:px-5 ${
                          now ? "bg-primary-container text-on-primary-container" : "border border-line bg-surface hover:bg-surface-2 dark:border-0"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block text-base ${now ? "font-semibold" : "font-medium"}`}>{c.title}</span>
                          <span className="mt-0.5 block text-sm opacity-80">
                            {s.title} · {c.checked} of {c.points.length} points
                            {c.reviewDue && " · review due"}
                          </span>
                        </span>
                        {now && (
                          <span className="hidden shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary sm:inline">
                            {totals.covered === 0 ? "Start" : "Continue"}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                }),
              )}
            </ol>
          </section>

          {added.length > 0 && (
            <section aria-labelledby="added" className="space-y-3">
              <h2 id="added" className="text-lg font-medium text-foreground">
                Added from your packs
              </h2>
              {added.map((g) => (
                <div key={g.section} className="rounded-[28px] border border-line bg-surface p-5 dark:border-0">
                  <h3 className="mb-1 font-medium text-foreground">{g.section}</h3>
                  <ul className="-mx-2 divide-y divide-line">
                    {g.items.map((i) => (
                      <AddedRow key={i.packId + i.id} item={i} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {tab === "about" && (
        <section aria-labelledby="about" className="space-y-4">
          <h2 id="about" className="text-xl font-medium text-foreground">
            What this course covers
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-3">
            {sections.map((s) => {
              const covered = s.concepts.filter((c) => c.confidence >= COVERED_CONFIDENCE).length;
              return (
                <section key={s.id} className="space-y-3 rounded-[28px] border border-line bg-surface p-5 sm:p-6 dark:border-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-lg font-medium text-foreground">
                      {s.title}
                      {s.weeks && <span className="ml-2 text-sm font-normal text-muted">weeks {s.weeks}</span>}
                    </h3>
                    <span className="text-sm text-muted">
                      {covered} of {s.concepts.length} covered
                    </span>
                  </div>
                  <ProgressBar value={covered} max={s.concepts.length} label={`${s.title} progress`} />
                  <ul className="-mx-2 divide-y divide-line">
                    {s.concepts.map((c) => (
                      <ConceptRow key={c.id} c={c} areaId={area.id} next={c.id === nextId} />
                    ))}
                    {joined(s.title).map((i) => (
                      <AddedRow key={i.packId + i.id} item={i} />
                    ))}
                  </ul>
                </section>
              );
            })}
            {separate.map((g) => (
              <section key={g.section} className="rounded-[28px] border border-line bg-surface p-5 sm:p-6 dark:border-0">
                <h3 className="mb-2 text-lg font-medium text-foreground">{g.section}</h3>
                <ul className="-mx-2 divide-y divide-line">
                  {g.items.map((i) => (
                    <AddedRow key={i.packId + i.id} item={i} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {area.exercises && <ScoringNote steps={area.exercises.steps} />}
        </section>
      )}

      {tab === "projects" && area.exercises && (
        <section aria-labelledby="projects" className="space-y-4">
          <div>
            <h2 id="projects" className="text-xl font-medium text-foreground">
              {area.exercises.title}
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm text-muted">{area.exercises.intro}</p>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
            {exercises.map((e, i) => (
              <li key={e.id}>
                <ExerciseCard e={e} n={i + 1} areaId={area.id} tone={tone} />
              </li>
            ))}
          </ol>
          <ScoringNote steps={area.exercises.steps} />
        </section>
      )}
      </TabPanel>
    </div>
  );
}

function ScoringNote({ steps }: { steps: { id: string; title: string; minutes: number; hint: string }[] }) {
  return (
    <details className="rounded-[24px] border border-line bg-surface p-4 px-5 dark:border-0">
      <summary className="cursor-pointer font-medium text-foreground">How each practice is scored</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted">
        {steps.map((step) => (
          <li key={step.id}>
            <span className="font-medium text-foreground">{step.title}</span> ({step.minutes} min): {step.hint}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">Rate each step 1-5 after practicing. Average 4+: practice again in 30 days; 3+: 14 days; lower: 7 days.</p>
    </details>
  );
}

/** One LLD project or SD design on the Projects tab. */
function ExerciseCard({ e, n, areaId, tone }: { e: ExerciseView; n: number; areaId: string; tone: Tone }) {
  const p = e.practice;
  const due = p.state === "practiced" && p.due;
  return (
    <Link
      href={`/study/${areaId}/${e.id}`}
      prefetch={false}
      className={`flex h-full flex-col gap-2 rounded-[24px] p-5 transition-colors ${
        due ? "bg-reward-soft text-on-reward-soft" : "border border-line bg-surface hover:bg-surface-2 dark:border-0"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-[12px] text-sm font-semibold ${p.state === "new" ? "bg-surface-2 text-muted" : tone.node}`}>{n}</span>
        {e.tag && <span className="text-xs text-muted">{e.tag}</span>}
      </span>
      <span className="text-[17px] font-medium leading-snug">{e.title}</span>
      <span className="text-sm leading-relaxed opacity-80">{e.focus}</span>
      <span className="mt-auto pt-1 text-xs font-medium opacity-80">
        {p.state === "practiced"
          ? `${e.sessions}× · last ${fmtDate(p.lastOn)} (${p.score}/5) · ${p.due ? "practice again now" : `next ${fmtDate(p.nextOn)}`}`
          : "Not practised yet"}
      </span>
    </Link>
  );
}

/** An item that an imported pack added to this area, with a small "added" tag. */
function AddedRow({ item }: { item: AddedGroup["items"][number] }) {
  return (
    <li className="hit flex items-center gap-3 px-2 py-2">
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

function ConceptRow({ c, areaId, next = false }: { c: ConceptView; areaId: string; next?: boolean }) {
  const titles = LESSON_EXTRA[c.id]?.deeper.map((x) => x.title) ?? [];
  const ids = deeperIds(titles);
  const covered = c.confidence >= COVERED_CONFIDENCE;
  return (
    <li className={`hit flex items-center gap-3 rounded-sm px-2 py-2 ${next ? "bg-primary-soft" : ""}`}>
      <StatusMark state={covered ? "solved" : c.reviewDue ? "resolve" : "none"} />
      <div className="min-w-0 flex-1">
        <Link href={`/study/${areaId}/${c.id}`} prefetch={false} className={`hit-link ${covered ? "" : "font-medium"}`}>
          {c.title}
        </Link>
        {next && (
          <span className="ml-2">
            <Badge tone="primary">Next</Badge>
          </span>
        )}
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
        {e.tag && <span className="ml-1.5 rounded-sm bg-surface-2 px-1.5 text-xs text-muted">{e.tag}</span>}
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
