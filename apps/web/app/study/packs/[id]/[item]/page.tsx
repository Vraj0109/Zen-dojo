import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { inlineParts, packItems, packProblemSpec, parseMarkdown } from "@habit/shared";
import { getPack, getPackProgress } from "@/lib/packs";
import { togglePackItemAction } from "../../../../actions";
import { Diagram } from "../../../../diagram";
import { JudgeWorkspace } from "../../../../judge-workspace";
import { CodeBlock } from "../../../../learn-blocks";
import { ProblemDescription, ProblemHelp, startersFor } from "../../../../problem-workspace";
import { SubmitButton } from "../../../../submit-button";
import { PageMain } from "../../../../ui";

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === "bold" ? (
          <strong key={i}>{p.text}</strong>
        ) : p.kind === "code" ? (
          <code key={i} className="rounded bg-background px-1 py-0.5 font-mono text-[0.9em]">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function PackMarkdown({ source }: { source: string }) {
  return (
    <div data-focus-reading className="space-y-4 leading-7">
      {parseMarkdown(source).map((b, i) => {
        switch (b.type) {
          case "h":
            return b.level === 2 ? (
              <h2 key={i} className="pt-2 text-xl font-semibold">
                <Inline text={b.text} />
              </h2>
            ) : (
              <h3 key={i} className="pt-1 text-lg font-semibold">
                <Inline text={b.text} />
              </h3>
            );
          case "p":
            return (
              <p key={i}>
                <Inline text={b.text} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = b.type === "ol" ? "ol" : "ul";
            return (
              <List key={i} className={`${b.type === "ol" ? "list-decimal" : "list-disc"} space-y-1 pl-6`}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline text={it} />
                  </li>
                ))}
              </List>
            );
          }
          case "code":
            if (b.lang.trim().toLowerCase() === "mermaid") {
              return <Diagram key={i} source={b.text} />;
            }
            return <CodeBlock key={i} code={b.text} lang={b.lang || undefined} />;
        }
      })}
    </div>
  );
}

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
        <PackMarkdown source={item.markdown} />
      </article>
    );
  }

  if (item.type === "patch") {
    return (
      <article className="max-w-4xl space-y-6">
        {header}
        <div className="space-y-4 leading-7">
          <p>{item.replace.overview}</p>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Key concepts</h3>
            <ul className="list-disc space-y-1 pl-6">
              {item.replace.explain.map((exp, i) => (
                <li key={i}>{exp}</li>
              ))}
            </ul>
          </div>
          {item.replace.questions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Interview questions</h3>
              <ul className="list-disc space-y-1 pl-6">
                {item.replace.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {item.replace.pitfalls && item.replace.pitfalls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Common pitfalls</h3>
              <ul className="list-disc space-y-1 pl-6">
                {item.replace.pitfalls.map((pit, i) => (
                  <li key={i}>{pit}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
