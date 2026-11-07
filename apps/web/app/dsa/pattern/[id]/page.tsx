import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_PATTERNS, DSA_GROUPS, PATTERN_GUIDES } from "@habit/shared";
import "katex/dist/katex.min.css";
import { cpAlgoCount, getCpAlgoArticles } from "@/lib/cp-algorithms";
import { getDsaView } from "@/lib/dsa";
import { getSimpleMode } from "@/lib/ui-prefs";
import { focusMinutes, patternTimerId } from "@/lib/timer";
import { StartTimer } from "../../../start-timer";
import { ArticleLayout, ArticleSection, CodeBlock } from "../../../learn-blocks";
import { Tabs } from "../../../tabs";
import { PageMain, ProgressBar, SimpleHint } from "../../../ui";
import { CheatSheet, ProblemRow } from "../../problem-ui";

/** One page per pattern, known at build time. */
export function generateStaticParams() {
  return ALL_PATTERNS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/dsa/pattern/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: ALL_PATTERNS.find((p) => p.id === id)?.name ?? "Pattern" };
}

/** Learn and Practice always; Reference (cp-algorithms articles) only for patterns that have some. */
function tabsFor(patternId: string) {
  const refs = cpAlgoCount(patternId);
  return [
    { id: "learn", label: "Learn" },
    { id: "practice", label: "Practice" },
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
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
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
  const group = DSA_GROUPS.find((g) => g.patterns.some((p) => p.id === id))!;
  const idx = ALL_PATTERNS.indexOf(pattern);
  const prev = ALL_PATTERNS[idx - 1];
  const next = ALL_PATTERNS[idx + 1];

  const tabs = tabsFor(id);
  const requested = typeof sp?.tab === "string" ? sp.tab : "learn";
  const currentTab = tabs.some((t) => t.id === requested) ? requested : "learn";

  const toc = [
    { id: "idea", title: "The idea" },
    { id: "spot", title: "How to spot it" },
    { id: "apply", title: "How to apply it" },
    { id: "template", title: "Template" },
    { id: "variations", title: "Variations" },
    { id: "pitfalls", title: "Pitfalls" },
  ];

  return (
    <article className="min-w-0 space-y-6">
      <Link href={`/dsa?group=${group.id}#p-${id}`} className="inline-block text-sm text-muted hover:text-foreground">
        ← {group.title}
      </Link>
      <header className="space-y-1">
        <p className="text-sm text-muted">DSA pattern · {group.title}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{pattern.name}</h2>
        <p className="text-sm text-muted">Recognize by: {pattern.recognize}</p>
      </header>

      <Tabs
        tabs={tabs}
        active={currentTab}
        hrefFor={(t) => (t === "learn" ? `/dsa/pattern/${id}` : `/dsa/pattern/${id}?tab=${t}`)}
        label="Pattern sections"
      />

      {currentTab === "learn" && (
        /* Plan 0007 will replace the guide body below */
        <ArticleLayout toc={toc}>
          <ArticleSection id="idea" title="The idea">
            <p className="leading-7">{guide.idea}</p>
          </ArticleSection>

          <ArticleSection id="spot" title="How to spot it">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
              {guide.signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </ArticleSection>

          <ArticleSection id="apply" title="How to apply it">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-7">
              {guide.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </ArticleSection>

          <ArticleSection id="template" title="Template (C++)">
            <div className="space-y-2">
              <p className="text-xs text-muted">{guide.complexity}</p>
              <CodeBlock code={guide.template} />
              <p className="text-xs text-muted">Type it out from memory once, then save your own version in the cheat sheet.</p>
            </div>
          </ArticleSection>

          <ArticleSection id="variations" title="Variations">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
              {guide.variations.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </ArticleSection>

          <ArticleSection id="pitfalls" title="Pitfalls">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
              {guide.pitfalls.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </ArticleSection>
        </ArticleLayout>
      )}

      {currentTab === "reference" && <Reference id={id} />}

      {currentTab === "practice" && (
        <Suspense fallback={<p className="text-sm text-muted">Loading your progress…</p>}>
          <Practice id={id} />
        </Suspense>
      )}

      <nav aria-label="Other patterns" className="flex flex-wrap justify-between gap-2 border-t border-line pt-6 text-sm">
        {prev ? (
          <Link
            href={`/dsa/pattern/${prev.id}${currentTab === "practice" ? "?tab=practice" : ""}`}
            className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface"
          >
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/dsa/pattern/${next.id}${currentTab === "practice" ? "?tab=practice" : ""}`}
            className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface"
          >
            {next.name} →
          </Link>
        )}
      </nav>
    </article>
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

async function Practice({ id }: { id: string }) {
  await connection();
  const [view, minutes, simple] = await Promise.all([getDsaView(), focusMinutes(patternTimerId(id)), getSimpleMode()]);
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-semibold">Practice</h3>
            <span className="text-sm text-muted">
              {p.solved}/{p.target} solved
            </span>
          </div>
          <ProgressBar value={p.solved} max={p.target} label={`${p.name} progress`} />
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {p.items.map((item) => (
              <ProblemRow key={item.id} p={item} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Easy to hard. Solve, then re-solve cold two weeks later.</p>
        </section>
        {simple ? <SimpleHint /> : <CheatSheet p={p} />}
      </div>
      <aside className="xl:sticky xl:top-6 self-start">
        <StartTimer itemId={patternTimerId(id)} label={p.name} href={`/dsa/pattern/${id}`} defaultMinutes={25} totalMinutes={minutes} />
      </aside>
    </div>
  );
}
