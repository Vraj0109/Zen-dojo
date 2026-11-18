import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CONCEPT_REVIEW_DAYS, CONFIDENCE_LABELS, COVERED_CONFIDENCE } from "@habit/shared";
import { REVIEW_KIND_LABELS, applySkips, getReviewQueue, splitReviewQueue, type ReviewItem } from "@/lib/review";
import { clearStruggleAction, logStruggleAction, markSolvedAction, rateConceptAction } from "../actions";
import { ReviewTabs } from "../section-tabs";
import { SubmitButton } from "../submit-button";
import { EmptyState, PageMain, buttonClass } from "../ui";
import { ReviewQueueSkeleton } from "@/app/components/review-skeleton";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage({ searchParams }: PageProps<"/review">) {
  return (
    <PageMain title="Review" narrow>
      <Suspense fallback={<ReviewQueueSkeleton />}>
        <Review searchParams={searchParams} />
      </Suspense>
    </PageMain>
  );
}

const KIND_LABEL: Record<ReviewItem["kind"], string> = { struggle: "Stuck", resolve: "Re-solve", concept: "Concept", exercise: "Practice" };
const keyOf = (i: ReviewItem) => `${i.kind}:${i.id}`;
const itemHref = (i: ReviewItem) => (i.kind === "struggle" ? `${i.href}?tab=stuck#stuck` : i.href);

async function Review({ searchParams }: { searchParams: PageProps<"/review">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const skipped = (Array.isArray(params.skip) ? params.skip[0] : params.skip ?? "").split(",").filter(Boolean).slice(0, 200);
  const queue = await getReviewQueue();
  const { dueToday, backlog } = splitReviewQueue(queue);
  const items = applySkips(dueToday, skipped);
  const [next, ...rest] = items;
  const skipHref = (i: ReviewItem) => `/review?skip=${encodeURIComponent([...skipped.filter((s) => s !== keyOf(i)), keyOf(i)].join(","))}`;

  return (
    <div className="space-y-6">
      <ReviewTabs active="review" due={items.length} />
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Review</h2>
        <p className="mt-1 text-sm text-muted">
          Everything due today in one place: problems you got stuck on, 14-day re-solves, concepts you rated below Solid, and designs due for
          another practice. Do them cold, without looking at your notes first.
        </p>
      </header>

      {!next ? (
        <EmptyState message="Nothing due. Come back tomorrow, or pick up today's plan." action={{ label: "Open Today", href: "/" }} />
      ) : (
        <>
          <section aria-label="Up next" className="overflow-hidden rounded-lg border border-line-strong bg-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-5 py-2.5 text-xs text-muted">
              <span className="font-medium">
                {REVIEW_KIND_LABELS[next.kind]}
              </span>
              <span>
                1 of {items.length} due today
              </span>
            </div>
            <div className="px-5 py-8 text-center sm:px-10">
              <h3 className="text-2xl font-semibold tracking-tight">
                <Link href={itemHref(next)} className="hover:underline">
                  {next.title}
                </Link>
              </h3>
              {next.detail && <p className="mt-1 text-sm text-muted">{next.detail}</p>}
              <p className="mx-auto mt-4 max-w-prose text-sm">{instruction(next)}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line px-5 py-4">
              <Actions item={next} big />
            </div>
            <div className="border-t border-line px-5 py-2.5 text-center">
              <Link href={skipHref(next)} className="text-sm text-muted hover:text-foreground">
                Skip for now
              </Link>
            </div>
          </section>

          {rest.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold">Also due</h3>
              <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                {rest.map((i) => (
                  <li key={keyOf(i)} className="hit flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                    <span className="text-xs text-muted w-16 shrink-0">{KIND_LABEL[i.kind]}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={itemHref(i)} className="hit-link font-medium">
                        {i.title}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {REVIEW_KIND_LABELS[i.kind]}
                        {i.detail && ` · ${i.detail}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Actions item={i} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {backlog.length > 0 && (
            <section className="mt-8">
              <details className="group rounded-md border border-line bg-surface p-5">
                <summary className="flex cursor-pointer items-center justify-between font-semibold">
                  <span>Catch-up backlog ({backlog.length} more)</span>
                  <span className="text-xs text-muted transition-transform group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-2 text-xs text-muted">
                  Overflow items from past days. Work through these at your own pace without streak stress.
                </p>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-background">
                  {backlog.map((i) => (
                    <li key={keyOf(i)} className="hit flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                      <span className="w-16 shrink-0 text-xs text-muted">{KIND_LABEL[i.kind]}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={itemHref(i)} className="hit-link font-medium">
                          {i.title}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {REVIEW_KIND_LABELS[i.kind]}
                          {i.detail && ` · ${i.detail}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Actions item={i} />
                      </div>
                    </li>
                  ))}
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

/** The four ratings the flashcard offers, and when the concept comes back after each (study.ts rules). */
const RATINGS = [2, 3, 4, 5] as const;
const nextInterval = (n: number) => (n >= COVERED_CONFIDENCE ? "Leaves the queue" : `Back in ${CONCEPT_REVIEW_DAYS} days`);

function Actions({ item, big = false }: { item: ReviewItem; big?: boolean }) {
  const primary = buttonClass("primary", big ? "md" : "sm");
  const secondary = buttonClass("secondary", big ? "md" : "sm");
  switch (item.kind) {
    case "struggle":
      return (
        <>
          <form action={clearStruggleAction}>
            <input type="hidden" name="problemId" value={item.id} />
            <SubmitButton className={primary}>Solved it cold</SubmitButton>
          </form>
          <form action={logStruggleAction}>
            <input type="hidden" name="problemId" value={item.id} />
            <input type="hidden" name="kind" value="failed" />
            <input type="hidden" name="reason" value={item.struggle.reason} />
            <SubmitButton className={secondary}>Still stuck</SubmitButton>
          </form>
        </>
      );
    case "resolve":
      return (
        <>
          <form action={markSolvedAction}>
            <input type="hidden" name="problemId" value={item.id} />
            <SubmitButton className={primary}>Re-solved</SubmitButton>
          </form>
          <form action={logStruggleAction}>
            <input type="hidden" name="problemId" value={item.id} />
            <input type="hidden" name="kind" value="hint" />
            <input type="hidden" name="reason" value="Forgot it at the 14-day re-solve" />
            <SubmitButton className={secondary}>Needed help</SubmitButton>
          </form>
        </>
      );
    case "concept":
      if (big)
        return (
          <form action={rateConceptAction} className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            <input type="hidden" name="conceptId" value={item.id} />
            {RATINGS.map((n) => (
              <SubmitButton
                key={n}
                name="confidence"
                value={String(n)}
                className={`flex flex-col items-center gap-0.5 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors duration-120 ${
                  n >= COVERED_CONFIDENCE ? "border-primary bg-primary-soft text-primary hover:bg-primary hover:text-on-primary" : "border-line-strong bg-surface hover:bg-surface-2"
                }`}
              >
                {CONFIDENCE_LABELS[n]}
                <span className="text-xs font-normal opacity-80">{nextInterval(n)}</span>
              </SubmitButton>
            ))}
          </form>
        );
      return (
        <form action={rateConceptAction} className="flex flex-wrap items-center gap-1">
          <input type="hidden" name="conceptId" value={item.id} />
          {big && <span className="mr-1 text-sm text-muted">Rate now:</span>}
          {[1, 2, 3, 4, 5].map((n) => (
            <SubmitButton
              key={n}
              name="confidence"
              value={String(n)}
              title={CONFIDENCE_LABELS[n]}
              className={`${n >= 4 ? primary : secondary} ${big ? "" : "px-2"}`}
            >
              {big ? `${n} · ${CONFIDENCE_LABELS[n]}` : n}
            </SubmitButton>
          ))}
        </form>
      );
    case "exercise":
      return (
        <Link href={item.href} className={primary}>
          Practice now →
        </Link>
      );
  }
}
