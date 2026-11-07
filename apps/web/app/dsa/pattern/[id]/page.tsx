import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_PATTERNS, DSA_GROUPS, PATTERN_GUIDES } from "@habit/shared";
import { getDsaView } from "@/lib/dsa";
import { focusMinutes, patternTimerId } from "@/lib/timer";
import { FocusTimer } from "../../../focus-timer";
import { BulletCard, CodeBlock, RecapCard } from "../../../learn-blocks";
import { PageMain, ProgressBar } from "../../../ui";
import { CheatSheet, ProblemRow } from "../../problem-ui";

/** One page per pattern, known at build time. */
export function generateStaticParams() {
  return ALL_PATTERNS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/dsa/pattern/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: ALL_PATTERNS.find((p) => p.id === id)?.name ?? "Pattern" };
}

export default async function PatternPage({ params }: PageProps<"/dsa/pattern/[id]">) {
  const { id } = await params;
  const pattern = ALL_PATTERNS.find((p) => p.id === id);
  const guide = PATTERN_GUIDES[id];
  if (!pattern || !guide) notFound();
  const group = DSA_GROUPS.find((g) => g.patterns.some((p) => p.id === id))!;
  const idx = ALL_PATTERNS.indexOf(pattern);
  const prev = ALL_PATTERNS[idx - 1];
  const next = ALL_PATTERNS[idx + 1];

  return (
    <PageMain title={pattern.name}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="min-w-0 space-y-6">
          <Link href={`/dsa?group=${group.id}#p-${id}`} className="inline-block text-sm text-muted hover:text-foreground">
            ← {group.title}
          </Link>
          <header className="space-y-1">
            <p className="text-sm text-muted">DSA pattern · {group.title}</p>
            <h2 className="text-2xl font-semibold tracking-tight">{pattern.name}</h2>
            <p className="text-sm text-muted">Recognize by: {pattern.recognize}</p>
          </header>

          <section className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 font-semibold">💡 The idea</h3>
            <p className="leading-relaxed">{guide.idea}</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <BulletCard title="🔎 How to spot it" items={guide.signals} />
            <BulletCard title="🪜 How to apply it" items={guide.steps} ordered />
          </div>

          <section className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">🧩 Template (C++)</h3>
              <p className="text-xs text-muted">{guide.complexity}</p>
            </div>
            <CodeBlock code={guide.template} />
            <p className="text-xs text-muted">Type it out from memory once, then save your own version in the cheat sheet below.</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <BulletCard title="🔀 Variations" items={guide.variations} />
            <BulletCard title="⚠️ Pitfalls" items={guide.pitfalls} />
          </div>

          <nav aria-label="Other patterns" className="flex flex-wrap justify-between gap-2 text-sm">
            {prev ? (
              <Link href={`/dsa/pattern/${prev.id}`} className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface">
                ← {prev.name}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/dsa/pattern/${next.id}`} className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface">
                {next.name} →
              </Link>
            )}
          </nav>
        </article>

        <aside className="space-y-4">
          <RecapCard items={guide.recap} />
          <Suspense fallback={<p className="text-sm text-muted">Loading your progress…</p>}>
            <Practice id={id} />
          </Suspense>
        </aside>
      </div>
    </PageMain>
  );
}

async function Practice({ id }: { id: string }) {
  await connection();
  const [view, minutes] = await Promise.all([getDsaView(), focusMinutes(patternTimerId(id))]);
  const p = view.groups.flatMap((g) => g.patterns).find((x) => x.id === id);
  if (!p) return null;
  return (
    <>
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
      <CheatSheet p={p} />
      <FocusTimer itemId={patternTimerId(id)} defaultMinutes={25} presets={[15, 25, 45]} totalMinutes={minutes} />
    </>
  );
}
