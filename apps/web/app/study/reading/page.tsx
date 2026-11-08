import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_CONCEPTS, ALL_EXERCISES, READING_KINDS, studyHref } from "@habit/shared";
import { getReadingList } from "@/lib/reading";
import { toggleReadingAction } from "../../actions";
import { SubmitButton } from "../../submit-button";
import { LearnBack } from "../../section-tabs";
import { PageMain } from "../../ui";

export const metadata: Metadata = { title: "Reading list" };

export default function ReadingPage() {
  return (
    <PageMain title="Reading list">
      <LearnBack current="Reading list" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Reading />
      </Suspense>
    </PageMain>
  );
}

const itemLink = (id: string) => {
  const c = ALL_CONCEPTS[id];
  const e = ALL_EXERCISES[id];
  const area = c?.area ?? e?.area;
  return area ? { href: studyHref(area, id), title: c?.title ?? e!.title } : null;
};

const ORDER = ["book", "paper", "article", "docs", "course", "custom"] as const;
const GROUP_TITLE: Record<(typeof ORDER)[number], string> = {
  book: "Books",
  paper: "Papers",
  article: "Articles",
  docs: "Docs and references",
  course: "Courses",
  custom: "Your links",
};

async function Reading() {
  await connection();
  const list = await getReadingList();
  const done = list.filter((r) => r.done).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reading list</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Papers, books and engineering posts behind the system design, LLD and core CS concepts. Each one also appears on the concept or design
            pages it explains. Start with DDIA and the Dynamo, Kafka and Raft material.
          </p>
        </div>
        <p className="text-sm text-muted">
          {done} / {list.length} read
        </p>
      </header>

      {ORDER.map((kind) => {
        const group = list.filter((r) => r.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind}>
            <h3 className="mb-2 text-lg font-semibold">{GROUP_TITLE[kind]}</h3>
            <ul className="grid gap-2 lg:grid-cols-2">
              {group.map((r) => (
                <li key={r.id} className={`flex items-start gap-3 rounded-xl border border-line bg-surface p-3 ${r.done ? "opacity-75" : ""}`}>
                  <form action={toggleReadingAction} className="pt-0.5">
                    <input type="hidden" name="readingId" value={r.id} />
                    <input type="hidden" name="done" value={r.done ? "0" : "1"} />
                    <SubmitButton
                      aria-label={r.done ? `Mark "${r.title}" unread` : `Mark "${r.title}" read`}
                      className={`flex size-5 items-center justify-center rounded border text-xs ${r.done ? "border-accent bg-accent text-on-accent" : "border-line"}`}
                    >
                      {r.done && (
                        <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m3.5 8.5 3 3 6-7" />
                        </svg>
                      )}
                    </SubmitButton>
                  </form>
                  <div className="min-w-0 flex-1 text-sm">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {r.title} ↗
                    </a>
                    <p className="text-xs text-muted">{r.kind === "custom" ? "Added by you" : `${READING_KINDS[r.kind]} · ${r.by}`}</p>
                    {r.why && <p className="mt-1">{r.why}</p>}
                    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                      {r.items
                        .map(itemLink)
                        .filter((x) => x !== null)
                        .map((x) => (
                          <Link key={x.href} href={x.href} className="text-muted hover:text-foreground hover:underline">
                            {x.title}
                          </Link>
                        ))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
