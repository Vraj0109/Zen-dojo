import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { lessonToShape, type PatternArticle } from "@habit/shared";
import { getAllPatterns, getDsaGroups } from "@/lib/content-repo/lookups";
import { getLesson } from "@/lib/content-repo/courses";
import "katex/dist/katex.min.css";
import { cpAlgoCount, getCpAlgoArticles } from "@/lib/cp-algorithms";
import { getDsaView } from "@/lib/dsa";
import { getSimpleMode } from "@/lib/ui-prefs";
import { Code } from "../../../code";
import { Diagram } from "../../../diagram";
import { ArticleLayout, ArticleSection } from "../../../learn-blocks";
import { CheatSheet, ProblemCard } from "../../problem-ui";
import { StudyArticleSkeleton } from "@/app/components/study-skeleton";
import { Skeleton } from "@/app/components/skeleton";
import { buttonClass } from "../../../ui";
import { patternNeighbours } from "@/lib/pattern-nav";
import { LessonEnd } from "./lesson-end";
import { PatternTabs } from "./pattern-tabs";
import { TabPanel } from "../../../tab-panel";

/** One page per pattern, known at build time. */
export async function generateStaticParams() {
  const patterns = await getAllPatterns();
  return patterns.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/dsa/pattern/[id]">): Promise<Metadata> {
  const { id } = await params;
  const patterns = await getAllPatterns();
  return { title: patterns.find((p) => p.id === id)?.name ?? "Pattern" };
}

/** Learn (when a full article exists), Practice and My template always; Reference (cp-algorithms articles) only for patterns that have some. */
function tabsFor(patternId: string, hasArticle: boolean, refs: number, problemCount = 0) {
  return [
    ...(hasArticle ? [{ id: "learn", label: "Learn" }] : []),
    { id: "practice", label: problemCount > 0 ? `Practice · ${problemCount}` : "Practice" },
    { id: "template", label: "My template" },
    ...(refs > 0 ? [{ id: "reference", label: "Reference", count: refs }] : []),
  ];
}

export default async function PatternPage({
  params,
  searchParams,
}: PageProps<"/dsa/pattern/[id]">) {
  const { id } = await params;
  const patterns = await getAllPatterns();
  const pattern = patterns.find((p) => p.id === id);
  if (!pattern) notFound();

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1680px] px-4 pt-4 pb-10 sm:px-6 md:px-8 md:pt-6">
      <Suspense fallback={<StudyArticleSkeleton />}>
        <PatternView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PatternView({
  params,
  searchParams,
}: {
  params: PageProps<"/dsa/pattern/[id]">["params"];
  searchParams: PageProps<"/dsa/pattern/[id]">["searchParams"];
}) {
  // Request-time page (cacheComponents): connection() before reading searchParams, and the code highlighting below.
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const [patterns, dsaGroups, guideLesson, articleLesson, nav, refs] = await Promise.all([
    getAllPatterns(),
    getDsaGroups(),
    getLesson(`pattern-${id}`),
    getLesson(`article-${id}`),
    patternNeighbours(id),
    cpAlgoCount(id),
  ]);
  const pattern = patterns.find((p) => p.id === id);
  if (!pattern || !guideLesson) notFound();
  const article = articleLesson ? (lessonToShape(articleLesson) as { article: PatternArticle }).article : undefined;
  const group = nav?.group ?? dsaGroups.find((g) => g.patterns.some((p) => p.id === id))!;
  const prev = nav?.prev;
  const next = nav?.next;

  const tabs = tabsFor(id, Boolean(article), refs, pattern.problems.length);
  const defaultTab = article ? "learn" : "practice";
  const requested = typeof sp?.tab === "string" ? sp.tab : defaultTab;
  const currentTab = tabs.some((t) => t.id === requested) ? requested : defaultTab;

  return (
    <article className="flex min-w-0 flex-col gap-4">
      {/* Breadcrumb pill */}
      <Link
        href={`/dsa?group=${group.id}#g-${group.id}`}
        className="sticky top-2 z-20 shadow-xs backdrop-blur-md inline-flex max-w-full self-start items-center gap-1.5 min-h-10 py-1 pr-3.5 pl-2 rounded-full bg-surface-2/95 text-foreground text-sm font-medium hover:bg-line transition-colors"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        {group.title}
      </Link>

      {/* Hero card on primary-container */}
      <header className="flex items-center justify-between gap-5 flex-wrap p-5 sm:px-7 sm:py-6 rounded-[32px] bg-primary-container text-on-primary-container">
        <div className="min-w-0 flex-[1_1_260px]">
          <h1 className="text-[26px] sm:text-[34px] font-semibold leading-tight [overflow-wrap:anywhere]">{pattern.name}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed opacity-85">Spot it when {pattern.recognize}</p>
        </div>
        <Suspense fallback={<div className="size-[88px] rounded-full bg-primary/20 animate-pulse shrink-0" />}>
          <PatternProgressRing id={id} />
        </Suspense>
      </header>

      {/* Segmented tabs */}
      <PatternTabs id={id} tabs={tabs} currentTab={currentTab} />

      <TabPanel tab={currentTab} order={tabs.map((t) => t.id)} className="min-w-0 flex flex-col gap-4">
        {currentTab === "learn" && article && <ArticleView article={article} />}

        {currentTab === "reference" && <Reference id={id} />}

        {currentTab === "practice" && (
          <Suspense
            fallback={
              <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
                <Skeleton className="h-5 w-40" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            }
          >
            <Practice id={id} />
          </Suspense>
        )}

        {currentTab === "template" && (
          <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
            <Template id={id} />
          </Suspense>
        )}

        {currentTab === "learn" && article && nav && (
          <LessonEnd
            id={id}
            name={pattern.name}
            problemCount={pattern.problems.length}
            group={{ id: group.id, title: group.title }}
            nextGroup={nav.isLastInGroup && nav.nextGroup ? { id: nav.nextGroup.id, title: nav.nextGroup.title } : undefined}
          />
        )}
      </TabPanel>

      {/* Next pattern card at the end */}
      {next && (
        <Link
          href={`/dsa/pattern/${next.id}`}
          className="flex items-center justify-between gap-3 px-5.5 py-4.5 rounded-[28px] bg-surface-2 text-foreground hover:bg-line transition-colors"
        >
          <span>
            <span className="text-sm text-muted block">Next pattern</span>
            <span className="text-lg font-medium">{next.name}</span>
          </span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}

      {/* Previous / next pattern links */}
      <nav aria-label="Other patterns" className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-sm">
        {prev ? (
          <Link
            href={`/dsa/pattern/${prev.id}${currentTab === "practice" ? "?tab=practice" : ""}`}
            className="rounded-xl border border-line dark:border-0 bg-surface px-4 py-2.5 transition-colors hover:bg-surface-2 max-md:min-h-11 max-md:flex-1"
          >
            <span className="block text-xs text-muted">Previous pattern</span>
            <span className="font-medium">{prev.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/dsa/pattern/${next.id}${currentTab === "practice" ? "?tab=practice" : ""}`}
            className="rounded-xl border border-line dark:border-0 bg-surface px-4 py-2.5 text-right transition-colors hover:bg-surface-2 max-md:min-h-11 max-md:flex-1"
          >
            <span className="block text-xs text-muted">Next pattern</span>
            <span className="font-medium text-primary">{next.name}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

/** Progress ring in hero */
async function PatternProgressRing({ id }: { id: string }) {
  await connection();
  const view = await getDsaView();
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  const solved = p.solved;
  const total = p.items.length;
  const len = total > 0 ? Math.round((solved / total) * 239) : 0;

  return (
    <div className="relative size-[88px] shrink-0 text-on-primary-container">
      <svg role="img" aria-label={`${solved} of ${total} solved`} width="88" height="88" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="12" className="opacity-25" />
        {len > 0 && (
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${len} 239`}
            transform="rotate(-90 50 50)"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums">
        {solved}/{total}
      </span>
    </div>
  );
}

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A full pattern article: intro, then each section with its paragraphs and code. */
function ArticleView({ article }: { article: PatternArticle }) {
  const toc = article.sections.map((s) => ({ id: slug(s.title), title: s.title }));
  return (
    <ArticleLayout toc={toc}>
      <p className="text-lg leading-8">{article.intro}</p>
      {article.sections.map((s) => (
        <ArticleSection key={s.title} id={slug(s.title)} title={s.title}>
          <div className="space-y-4">
            {s.body.split("\n\n").map((para, i) => (
              <p key={i} className="leading-7 whitespace-pre-line">
                {para}
              </p>
            ))}
            {s.diagram && <Diagram source={s.diagram} caption={s.diagramCaption} />}
            {s.code && <Code code={s.code} lang={s.lang ?? "C++"} />}
          </div>
        </ArticleSection>
      ))}
    </ArticleLayout>
  );
}

/** cp-algorithms articles for this pattern: full text with proofs, variants and code (CC BY-SA 4.0). */
async function Reference({ id }: { id: string }) {
  const articles = await getCpAlgoArticles(id);
  if (articles.length === 0) return <p className="text-sm text-muted">No reference articles for this pattern.</p>;
  const toc = articles.map((a, i) => ({ id: `ref-${i}`, title: a.title }));
  return (
    <ArticleLayout toc={toc}>
      {articles.map((a, i) => (
        <ArticleSection key={a.path} id={`ref-${i}`} title={a.title}>
          <p className="mb-4 text-xs leading-relaxed text-muted">
            From <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">cp-algorithms</a> by
            cp-algorithms contributors, CC BY-SA 4.0 (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">license</a>).
            Converted to HTML; text unchanged.
          </p>
          <div className="cp-prose" dangerouslySetInnerHTML={{ __html: a.html }} />
        </ArticleSection>
      ))}
    </ArticleLayout>
  );
}

async function Template({ id }: { id: string }) {
  await connection();
  const [view, simple] = await Promise.all([getDsaView(), getSimpleMode()]);
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  if (simple) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Your template and how you spot this pattern. Write it from memory, then compare with the lesson.</p>
      <CheatSheet p={p} />
    </div>
  );
}

async function Practice({ id }: { id: string }) {
  await connection();
  const [view, simple, articleLesson] = await Promise.all([getDsaView(), getSimpleMode(), getLesson(`article-${id}`)]);
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  const nextId = p.items.find((i) => i.status.state === "unsolved")?.id;
  const hasArticle = Boolean(articleLesson);

  return (
    <div className="flex gap-5 flex-wrap items-start">
      {/* Problems column */}
      <section aria-label="Problems" className="flex-[999_1_420px] min-w-0 flex flex-col gap-2.5">
        {p.items.map((item) => (
          <ProblemCard key={item.id} p={item} next={item.id === nextId} />
        ))}
      </section>

      {/* Cheat sheet aside */}
      {!simple && (
        <aside
          aria-label="Cheat sheet"
          className="flex-[1_1_300px] min-w-0 p-5 rounded-[28px] bg-surface border border-line dark:border-0 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-medium text-foreground">Your template</span>
            {p.note?.template && <span className="text-xs text-success font-medium">Saved</span>}
          </div>
          {p.note?.template ? (
            <pre className="p-3.5 rounded-2xl bg-surface-2 font-mono text-[13px] leading-5 overflow-x-auto text-foreground">
              {p.note.template}
            </pre>
          ) : null}
          <p className="text-sm text-muted">{p.note?.recognize || p.recognize}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href={`/dsa/pattern/${id}?tab=template`}
              className={buttonClass("tonal", "sm")}
            >
              {p.note?.template ? "Edit template" : "Write template"}
            </Link>
            {hasArticle && (
              <Link
                href={`/dsa/pattern/${id}?tab=learn`}
                className={buttonClass("quiet", "sm")}
              >
                Read the guide
              </Link>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
