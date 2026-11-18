import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_PATTERNS, DSA_GROUPS, PATTERN_ARTICLES, PATTERN_GUIDES, type PatternArticle } from "@habit/shared";
import "katex/dist/katex.min.css";
import { cpAlgoCount, getCpAlgoArticles } from "@/lib/cp-algorithms";
import { getDsaView } from "@/lib/dsa";
import { getSimpleMode } from "@/lib/ui-prefs";
import { focusMinutes, patternTimerId } from "@/lib/timer";
import { StartTimer } from "../../../start-timer";
import { Code } from "../../../code";
import { Diagram } from "../../../diagram";
import { ArticleLayout, ArticleSection } from "../../../learn-blocks";
import { Tabs } from "../../../tabs";
import { Badge, buttonClass, PageMain, ProgressBar, SimpleHint } from "../../../ui";
import { AddedProblems } from "../../added-problems";
import { CheatSheet, ProblemCard } from "../../problem-ui";
import { StudyArticleSkeleton } from "@/app/components/study-skeleton";
import { Skeleton } from "@/app/components/skeleton";
import { patternNeighbours } from "@/lib/pattern-nav";
import { LessonEnd } from "./lesson-end";

/** One page per pattern, known at build time. */
export function generateStaticParams() {
  return ALL_PATTERNS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/dsa/pattern/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: ALL_PATTERNS.find((p) => p.id === id)?.name ?? "Pattern" };
}

/** Learn (when a full article exists), Practice and My template always; Reference (cp-algorithms articles) only for patterns that have some. */
function tabsFor(patternId: string) {
  const hasArticle = Boolean(PATTERN_ARTICLES[patternId]);
  const refs = cpAlgoCount(patternId);
  return [
    ...(hasArticle ? [{ id: "learn", label: "Learn" }] : []),
    { id: "practice", label: "Practice" },
    { id: "template", label: "My template" },
    ...(refs > 0 ? [{ id: "reference", label: "Reference", count: refs }] : []),
  ];
}

export default async function PatternPage({
  params,
  searchParams,
}: PageProps<"/dsa/pattern/[id]">) {
  const { id } = await params;
  const pattern = ALL_PATTERNS.find((p) => p.id === id);
  if (!pattern) notFound();

  return (
    <PageMain title={pattern.name}>
      <Suspense fallback={<StudyArticleSkeleton />}>
        <PatternView params={params} searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

async function PatternView({
  params,
  searchParams,
}: {
  params: PageProps<"/dsa/pattern/[id]">["params"];
  searchParams: PageProps<"/dsa/pattern/[id]">["searchParams"];
}) {
  const { id } = await params;
  const sp = await searchParams;
  const pattern = ALL_PATTERNS.find((p) => p.id === id);
  const guide = PATTERN_GUIDES[id];
  if (!pattern || !guide) notFound();
  const article = PATTERN_ARTICLES[id];
  const nav = patternNeighbours(id);
  const group = nav?.group ?? DSA_GROUPS.find((g) => g.patterns.some((p) => p.id === id))!;
  const prev = nav?.prev;
  const next = nav?.next;

  const tabs = tabsFor(id);
  const defaultTab = article ? "learn" : "practice";
  const requested = typeof sp?.tab === "string" ? sp.tab : defaultTab;
  const currentTab = tabs.some((t) => t.id === requested) ? requested : defaultTab;

  return (
    <article className="min-w-0 space-y-6">
      <header className="space-y-3">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/dsa" className="hover:text-foreground">
            Practice
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href={`/dsa?group=${group.id}#p-${id}`} className="hover:text-foreground">
            {group.title}
          </Link>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-3xl font-semibold tracking-tight">{pattern.name}</h2>
            <p className="max-w-[68ch] text-sm text-muted">Recognize by: {pattern.recognize}</p>
          </div>
          <div className="w-full sm:w-64">
            <Suspense fallback={<Skeleton className="h-5 w-full" />}>
              <HeaderProgress id={id} />
            </Suspense>
          </div>
        </div>
      </header>

      <Tabs
        tabs={tabs}
        active={currentTab}
        hrefFor={(t) => (t === "learn" ? `/dsa/pattern/${id}` : `/dsa/pattern/${id}?tab=${t}`)}
        label="Pattern sections"
      />

      {currentTab === "learn" && article && <ArticleView article={article} />}

      {currentTab === "reference" && <Reference id={id} />}

      {currentTab === "practice" && (
        <Suspense
          fallback={
            <div className="space-y-4 rounded-md border border-line bg-surface p-4">
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
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-md" />}>
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

      {currentTab === "practice" && article && (
        <p className="text-sm">
          <Link href={`/dsa/pattern/${id}`} className="text-muted underline-offset-2 hover:text-foreground hover:underline">
            Back to the lesson
          </Link>
        </p>
      )}

      <nav aria-label="Other patterns" className="flex flex-wrap justify-between gap-2 border-t border-line pt-6 text-sm">
        {prev ? (
          <Link
            href={`/dsa/pattern/${prev.id}${currentTab === "practice" ? "?tab=practice" : ""}`}
            className="rounded-md border border-line bg-surface px-4 py-2.5 transition-[border-color,box-shadow] duration-120 hover:border-line-strong hover:shadow-sm max-md:min-h-11 max-md:flex-1"
          >
            <span className="block text-xs text-muted">Previous pattern</span>
            <span className="font-medium">{prev.name}</span>
            {nav?.prevGroup && <span className="block text-xs text-muted">{nav.prevGroup.title}</span>}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/dsa/pattern/${next.id}${currentTab === "practice" ? "?tab=practice" : ""}`}
            className="rounded-md border border-line bg-surface px-4 py-2.5 text-right transition-[border-color,box-shadow] duration-120 hover:border-line-strong hover:shadow-sm max-md:min-h-11 max-md:flex-1"
          >
            <span className="block text-xs text-muted">Next pattern</span>
            <span className="font-medium text-primary">{next.name}</span>
            {nav?.nextPatternGroup && <span className="block text-xs text-muted">{nav.nextPatternGroup.title}</span>}
          </Link>
        )}
      </nav>
    </article>
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
          {/* Imported at build time from the cp-algorithms repo; scripts are stripped by the importer and code is coloured by our highlighter. */}
          <div className="cp-prose" dangerouslySetInnerHTML={{ __html: a.html }} />
        </ArticleSection>
      ))}
    </ArticleLayout>
  );
}

/** Solved count for the header; loads on its own so the static header paints first. */
async function HeaderProgress({ id }: { id: string }) {
  await connection();
  const view = await getDsaView();
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  return <ProgressBar value={p.solved} max={p.target} label={`${p.name}: problems solved`} showCount />;
}

async function Template({ id }: { id: string }) {
  await connection();
  const [view, simple] = await Promise.all([getDsaView(), getSimpleMode()]);
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  if (simple) return <SimpleHint />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Your template and how you spot this pattern. Write it from memory, then compare with the lesson.</p>
      <CheatSheet p={p} />
    </div>
  );
}

async function Practice({ id }: { id: string }) {
  await connection();
  const [view, minutes, simple] = await Promise.all([getDsaView(), focusMinutes(patternTimerId(id)), getSimpleMode()]);
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  const nextId = p.items.find((i) => i.status.state === "unsolved")?.id;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <section className="space-y-3" aria-labelledby="practice-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="practice-heading" className="font-semibold">
              Problems
            </h3>
            <span className="text-sm text-muted">Easy to hard. Solve, then re-solve cold two weeks later.</span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {p.items.map((item) => (
              <ProblemCard key={item.id} p={item} next={item.id === nextId} />
            ))}
          </ul>
        </section>
        <AddedProblems patternId={id} />
      </div>
      <aside className="space-y-4 self-start xl:sticky xl:top-6">
        <StartTimer itemId={patternTimerId(id)} label={p.name} href={`/dsa/pattern/${id}`} defaultMinutes={25} totalMinutes={minutes} />
        {!simple && (
          <section className="space-y-3 rounded-md border border-line bg-surface p-4 text-sm" aria-labelledby="cheat-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="cheat-heading" className="font-semibold">
                Cheat sheet
              </h3>
              {p.note?.template ? <Badge tone="success">Saved</Badge> : <Badge>Empty</Badge>}
            </div>
            <p className="text-muted">{p.note?.recognize || p.recognize}</p>
            {p.note?.template && <Code code={p.note.template} lang={p.note.language} maxHeight="14rem" />}
            <Link href={`/dsa/pattern/${id}?tab=template`} className={buttonClass("secondary", "sm")}>
              {p.note?.template ? "Edit my template" : "Write my template"}
            </Link>
          </section>
        )}
        {simple && <SimpleHint />}
      </aside>
    </div>
  );
}
