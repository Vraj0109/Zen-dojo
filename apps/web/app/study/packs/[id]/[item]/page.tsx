import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { packItems, packProblemSpec } from "@habit/shared";
import { getPack, getPackProgress } from "@/lib/packs";
import { togglePackItemAction } from "../../../../actions";
import { JudgeWorkspace } from "../../../../judge-workspace";
import { Markdown } from "../../../../markdown";
import { ProblemDescription, ProblemHelp, startersFor } from "../../../../problem-workspace";
import { SubmitButton } from "../../../../submit-button";
import { PageMain } from "../../../../ui";

export const metadata: Metadata = { title: "Imported course" };

export default function PackItemPage({ params }: PageProps<"/study/packs/[id]/[item]">) {
  return (
    <PageMain title="Imported item" full>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Item params={params} />
      </Suspense>
    </PageMain>
  );
}

async function Item({ params }: { params: PageProps<"/study/packs/[id]/[item]">["params"] }) {
  await connection();
  const { id, item: itemId } = await params;
  const pack = await getPack(id);
  const item = pack && packItems(pack).find((i) => i.id === itemId);
  if (!pack || !item) notFound();
  const isDone = (await getPackProgress(id)).has(itemId);
  const all = packItems(pack);
  const index = all.findIndex((i) => i.id === itemId);
  const next = all[index + 1];

  const toggle = (
    <form action={togglePackItemAction}>
      <input type="hidden" name="pack" value={id} />
      <input type="hidden" name="item" value={itemId} />
      <input type="hidden" name="done" value={isDone ? "0" : "1"} />
      <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">
        {isDone ? "Mark not done" : item.type === "problem" ? "Mark solved" : "Mark read"}
      </SubmitButton>
    </form>
  );

  const header = (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href={`/study/packs/${id}`} className="text-sm text-muted hover:text-foreground">
          ← {pack.title}
        </Link>
        <h2 className="mt-1 text-2xl font-semibold">{item.title}</h2>
        {item.type === "problem" && item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
            Original problem ↗
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {toggle}
        {next && (
          <Link href={`/study/packs/${id}/${next.id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">
            Next: {next.title} →
          </Link>
        )}
      </div>
    </header>
  );

  if (item.type === "lesson") {
    return (
      <article className="max-w-4xl space-y-6">
        {header}
        <Markdown source={item.markdown} />
      </article>
    );
  }

  const spec = packProblemSpec(item, id);
  return (
    <article className="judged space-y-3">
      {header}
      <JudgeWorkspace
        id={spec.id}
        templates={startersFor(spec)}
        tabs={[
          { id: "description", label: "Description", node: <ProblemDescription spec={spec} /> },
          ...(spec.hints.length > 0 || spec.solution.idea.length > 0 ? [{ id: "help", label: "Hints", node: <ProblemHelp spec={spec} /> }] : []),
        ]}
      />
    </article>
  );
}
