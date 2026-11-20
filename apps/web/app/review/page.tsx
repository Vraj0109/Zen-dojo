import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { STUDY_AREAS, toLocalDate } from "@habit/shared";
import { applySkips, getReviewQueue, splitReviewQueue, type ReviewItem } from "@/lib/review";
import { getProgress } from "@/lib/progress";
import { ReviewTabs } from "../section-tabs";
import { EmptyState, PageMain, SubjectShape, type Subject } from "../ui";
import { ReviewQueueSkeleton } from "@/app/components/review-skeleton";
import { ReviewCard } from "./review-card";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage({ searchParams }: PageProps<"/review">) {
  return (
    <PageMain title="Review" hideTitle>
      <Suspense fallback={<ReviewQueueSkeleton />}>
        <Review searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

const KIND_LABEL: Record<ReviewItem["kind"], string> = {
  struggle: "Stuck",
  resolve: "Re-solve",
  concept: "Concept",
  exercise: "Practice",
};
const keyOf = (i: ReviewItem) => `${i.kind}:${i.id}`;
const itemHref = (i: ReviewItem) => (i.kind === "struggle" ? `${i.href}?tab=stuck#stuck` : i.href);

function itemSubject(item: ReviewItem): Subject {
  if (item.kind === "struggle" || item.kind === "resolve") return "dsa";
  if (item.kind === "concept" || item.kind === "exercise") {
    if (item.area === "sd") return "sd";
    if (item.area === "lld") return "lld";
    if (item.area === "core") return "core";
  }
  return "dsa";
}

const SUBJECT_LABEL: Record<Subject, string> = {
  dsa: "DSA",
  sd: "System design",
  lld: "LLD",
  core: "Core CS",
  beh: "Behavioural",
  mock: "Mock",
};

const SUBJECT_TONE: Record<Subject, string> = {
  dsa: "bg-cat-dsa text-on-cat-dsa",
  sd: "bg-cat-sd text-on-cat-sd",
  lld: "bg-cat-lld text-on-cat-lld",
  core: "bg-cat-core text-on-cat-core",
  beh: "bg-cat-beh text-on-cat-beh",
  mock: "bg-cat-mock text-on-cat-mock",
};

async function Review({ searchParams }: { searchParams: PageProps<"/review">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const skipped = (Array.isArray(params.skip) ? params.skip[0] : params.skip ?? "").split(",").filter(Boolean).slice(0, 200);
  const queue = await getReviewQueue();
  const { dueToday, backlog } = splitReviewQueue(queue);
  const items = applySkips(dueToday, skipped);
  const [next, ...rest] = items;
  const skipHref = (i: ReviewItem) => `/review?skip=${encodeURIComponent([...skipped.filter((s) => s !== keyOf(i)), keyOf(i)].join(","))}`;

  const today = toLocalDate();
  const progress = await getProgress(today);
  const streak = progress.streak;

  const currentSubject = next ? itemSubject(next) : "dsa";
  let conceptPoints: string[] | undefined;
  if (next && next.kind === "concept") {
    const area = STUDY_AREAS.find((a) => a.id === next.area);
    for (const s of area?.sections ?? []) {
      const c = s.concepts.find((x) => x.id === next.id);
      if (c) {
        conceptPoints = c.points;
        break;
      }
    }
  }

  const estMinutes = Math.max(3, items.length * 2);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">Review</h1>
          <p className="mt-1 text-sm text-muted">
            {next ? `Card 1 of ${items.length} · about ${estMinutes} minutes` : "Nothing due right now"}
          </p>
        </div>
        {next && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {items.slice(0, 10).map((_, i) => (
              <span key={i} className={`h-2.5 rounded-full ${i === 0 ? "w-6 bg-primary" : "w-2.5 bg-line-strong"}`} />
            ))}
            {items.length > 10 && <span className="ml-1 text-xs text-muted">+{items.length - 10}</span>}
          </div>
        )}
      </header>

      <ReviewTabs active="review" due={items.length} />

      {!next ? (
        <EmptyState message="Nothing due. Come back tomorrow, or pick up today's plan." action={{ label: "Open Today", href: "/" }} />
      ) : (
        <>
          {/* Card stack + Aside */}
          <div className="flex flex-wrap items-start gap-6">
            {/* The main card with stack behind */}
            <div className="min-w-0 flex-[999_1_420px]">
              <ReviewCard
                item={next}
                index={1}
                total={items.length}
                skipHref={skipHref(next)}
                itemHref={itemHref(next)}
                subjectLabel={SUBJECT_LABEL[currentSubject]}
                subjectClass={SUBJECT_TONE[currentSubject]}
                instruction={instruction(next)}
                points={conceptPoints}
              />
            </div>

            {/* Aside: Up next & streak card */}
            <aside aria-label="Next in the queue" className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
              <span className="text-base font-medium">Up next</span>
              {rest.length === 0 ? (
                <div className="rounded-[20px] border border-line bg-surface p-4 text-sm text-muted dark:border-0">
                  No other cards due today. Finish this one to clear the queue.
                </div>
              ) : (
                rest.slice(0, 4).map((u) => {
                  const subj = itemSubject(u);
                  return (
                    <div
                      key={keyOf(u)}
                      className="flex items-center gap-3 rounded-[20px] border border-line bg-surface px-3.5 py-3 dark:border-0"
                    >
                      <SubjectShape subject={subj} className="!size-8 !text-xs !rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <Link href={itemHref(u)} className="block text-[15px] hover:underline">
                          {u.title}
                        </Link>
                      </div>
                      <span className="text-xs text-muted shrink-0">{KIND_LABEL[u.kind]}</span>
                    </div>
                  );
                })
              )}

              <div className="gamify-only mt-1 rounded-[20px] bg-reward-soft p-4 text-sm font-medium text-on-reward-soft">
                {streak > 0 ? `Finish the queue to keep your ${streak}-day streak going.` : "Finish the queue to start a streak today."}
              </div>
            </aside>
          </div>

          {/* Catch-up backlog if any */}
          {backlog.length > 0 && (
            <section className="mt-8">
              <details className="group rounded-[24px] border border-line bg-surface p-5 dark:border-0">
                <summary className="flex cursor-pointer items-center justify-between font-medium">
                  <span>Catch-up backlog ({backlog.length} more)</span>
                  <span className="text-xs text-muted transition-transform group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-2 text-sm text-muted">
                  Overflow items from past days. Work through these at your own pace without streak stress.
                </p>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-background">
                  {backlog.map((i) => {
                    const subj = itemSubject(i);
                    return (
                      <li key={keyOf(i)} className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
                        <SubjectShape subject={subj} className="!size-7 !text-xs !rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <Link href={itemHref(i)} className="text-sm font-medium hover:underline">
                            {i.title}
                          </Link>
                          <p className="truncate text-xs text-muted">{i.detail}</p>
                        </div>
                        <span className="text-xs text-muted">{KIND_LABEL[i.kind]}</span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function instruction(i: ReviewItem): string {
  switch (i.kind) {
    case "struggle":
      return "Solve it from scratch on LeetCode with a timer. If you get it without help, clear it; if not, it comes back in 3 days.";
    case "resolve":
      return "Two weeks since you solved it. Solve it again cold, then compare with your saved code.";
    case "concept":
      return "Explain it out loud in 2 minutes (open the lesson if you're stuck), then rate yourself honestly.";
    case "exercise":
      return "Set the timer and do the full design aloud, then log the practice with your step scores.";
  }
}
