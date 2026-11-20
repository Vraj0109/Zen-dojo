import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_CONCEPTS, ALL_EXERCISES, READING_KINDS, studyHref, weekFocus } from "@habit/shared";
import { getReadingList } from "@/lib/reading";
import { getPlanPosition } from "@/lib/tasks";
import { toggleReadingAction } from "../../actions";
import { SubmitButton } from "../../submit-button";
import { LearnBack } from "../../section-tabs";
import { buttonClass, PageMain, ProgressBar } from "../../ui";
import { StudyAreaSkeleton } from "@/app/components/study-skeleton";

export const metadata: Metadata = { title: "Reading list" };

export default function ReadingPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  return (
    <PageMain title="Reading list" hideTitle>
      <LearnBack current="Reading list" />
      <Suspense fallback={<StudyAreaSkeleton />}>
        <Reading searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

const itemLink = (id: string) => {
  const c = ALL_CONCEPTS[id];
  const e = ALL_EXERCISES[id];
  const area = c?.area ?? e?.area;
  return area ? { href: studyHref(area, id), title: c?.title ?? e!.title, area } : null;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "week", label: "This week" },
  { id: "books", label: "Books" },
  { id: "papers", label: "Papers" },
  { id: "posts", label: "Posts" },
  { id: "read", label: "Read" },
] as const;

/** Cover colour and type pill in the subject tone of the first topic the reading goes with. */
function getTone(area?: string) {
  switch (area) {
    case "sd":
      return { cover: "bg-cat-sd", badge: "bg-on-cat-sd text-cat-sd" };
    case "lld":
      return { cover: "bg-cat-lld", badge: "bg-on-cat-lld text-cat-lld" };
    case "dsa":
      return { cover: "bg-cat-dsa", badge: "bg-on-cat-dsa text-cat-dsa" };
    case "core":
      return { cover: "bg-reward-soft", badge: "bg-on-reward-soft text-reward-soft" };
    default:
      return { cover: "bg-primary-soft", badge: "bg-primary text-on-primary" };
  }
}

async function Reading({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await connection();
  const sp = await searchParams;
  const currentFilter = FILTERS.some((f) => f.id === sp.filter) ? sp.filter! : "all";
  const [list, pos] = await Promise.all([getReadingList(), getPlanPosition()]);
  const doneCount = list.filter((r) => r.done).length;
  // "This week": readings that go with this plan week's system design and low-level design topics.
  const focus = weekFocus(pos.cursor);
  const thisWeek = new Set([...focus.sd, ...focus.lld]);

  const filtered = list.filter((r) => {
    if (currentFilter === "read") return r.done;
    if (currentFilter === "books") return r.kind === "book";
    if (currentFilter === "papers") return r.kind === "paper";
    if (currentFilter === "posts") return r.kind === "article" || r.kind === "docs" || r.kind === "custom";
    if (currentFilter === "week") return r.items.some((id) => thisWeek.has(id));
    return true;
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">Reading list</h1>
          <p className="mt-1 text-sm text-muted">
            {doneCount} of {list.length} read · picked for what you are studying
          </p>
        </div>
        <div className="w-full sm:w-64">
          <ProgressBar value={doneCount} max={list.length} label="Readings done" showCount />
        </div>
      </header>

      <nav aria-label="Filter readings">
        <ul className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = currentFilter === f.id;
            return (
              <li key={f.id}>
                <Link
                  href={f.id === "all" ? "/study/reading" : `/study/reading?filter=${f.id}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-medium transition-colors ${
                    active ? "bg-primary-soft text-on-primary-soft" : "border border-line-strong text-foreground hover:bg-surface-2"
                  }`}
                >
                  {f.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {filtered.length === 0 ? (
        <p className="rounded-[24px] border border-line bg-surface p-5 text-sm text-muted dark:border-0">
          {currentFilter === "week"
            ? `Nothing on the list goes with week ${pos.cursor}'s topics.`
            : currentFilter === "read"
              ? "You haven't marked anything as read yet."
              : "Nothing here yet."}{" "}
          <Link href="/study/reading" className="font-medium text-foreground underline hover:text-primary">
            Show all readings
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
          {filtered.map((r) => {
            const links = r.items.map(itemLink).filter((x): x is NonNullable<typeof x> => x !== null);
            const firstTopic = links[0];
            const tone = getTone(firstTopic?.area);

            return (
              <li
                key={r.id}
                className={`flex min-h-[260px] flex-col gap-2 rounded-[28px] border border-line bg-surface p-3.5 dark:border-0 ${r.done ? "opacity-75" : ""}`}
              >
                <div className={`flex h-24 items-end rounded-[20px] p-2.5 ${tone.cover}`}>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                    {r.kind === "custom" ? "Your link" : (READING_KINDS[r.kind] ?? r.kind)}
                  </span>
                </div>
                <h2 className="line-clamp-2 px-1 text-base font-medium leading-snug">{r.title}</h2>
                <p className="px-1 text-[13px] text-muted">
                  {firstTopic ? (
                    <>
                      With{" "}
                      <Link href={firstTopic.href} className="hover:text-foreground hover:underline">
                        {firstTopic.title}
                      </Link>
                      {r.by && ` · ${r.by}`}
                    </>
                  ) : r.kind === "custom" ? (
                    "Added by you"
                  ) : (
                    r.by
                  )}
                </p>
                {r.why && <p className="line-clamp-2 px-1 text-[13px] text-muted">{r.why}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                    Open<span className="sr-only"> {r.title} (opens in a new tab)</span>
                  </a>
                  <form action={toggleReadingAction}>
                    <input type="hidden" name="readingId" value={r.id} />
                    <input type="hidden" name="done" value={r.done ? "0" : "1"} />
                    <SubmitButton
                      aria-pressed={r.done}
                      title={r.done ? "Mark as not read" : undefined}
                      className={buttonClass(r.done ? "primary" : "tonal", "sm")}
                    >
                      {r.done ? "Read" : "Mark read"}
                    </SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
