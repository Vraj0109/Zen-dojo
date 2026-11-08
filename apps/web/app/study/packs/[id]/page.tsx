import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { packItems } from "@habit/shared";
import { getPack, getPackProgress } from "@/lib/packs";
import { removePackAction } from "../../../actions";
import { LearnBack } from "../../../section-tabs";
import { SubmitButton } from "../../../submit-button";
import { PageMain, ProgressBar } from "../../../ui";

export const metadata: Metadata = { title: "Imported course" };

export default function PackPage({ params }: PageProps<"/study/packs/[id]">) {
  return (
    <PageMain title="Imported course">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Pack params={params} />
      </Suspense>
    </PageMain>
  );
}

async function Pack({ params }: { params: PageProps<"/study/packs/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const pack = await getPack(id);
  if (!pack) notFound();
  const done = await getPackProgress(id);
  const items = packItems(pack);
  const finished = items.filter((i) => done.has(i.id)).length;

  return (
    <div className="space-y-6">
      <LearnBack current={pack.title} />
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">{pack.title}</h2>
        {pack.description && <p className="max-w-3xl text-muted">{pack.description}</p>}
        <div className="max-w-md space-y-1">
          <ProgressBar value={finished} max={items.length} label={`${pack.title} progress`} />
          <p className="text-xs text-muted">
            {finished} of {items.length} done
          </p>
        </div>
      </header>
      {pack.sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h3 className="font-semibold">{s.title}</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {s.items.map((it) => (
              <li key={it.id} className="hit flex items-center gap-3 px-4 py-2.5 text-sm">
                <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full border ${done.has(it.id) ? "border-accent bg-accent text-on-accent" : "border-line text-transparent"}`}>
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                </span>
                <Link href={`/study/packs/${id}/${it.id}`} prefetch={false} className="hit-link min-w-0 flex-1 truncate">
                  {it.title}
                </Link>
                <span className="shrink-0 text-xs text-muted">{it.type === "problem" ? `Problem${it.difficulty ? " · " + it.difficulty : ""}` : "Lesson"}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <form action={removePackAction} className="pt-4">
        <input type="hidden" name="id" value={id} />
        <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:bg-background hover:text-foreground">Remove this course and its progress</SubmitButton>
      </form>
    </div>
  );
}
