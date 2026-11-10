import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_EXERCISES, studyHref } from "@habit/shared";
import { getDiagrams } from "@/lib/diagrams";
import { LearnBack } from "../../section-tabs";
import { PageMain } from "../../ui";
import { StudyAreaSkeleton } from "@/app/components/study-skeleton";

export const metadata: Metadata = { title: "Your diagrams" };

export default function DiagramsPage() {
  return (
    <PageMain title="Your diagrams">
      <LearnBack current="Diagrams" />
      <Suspense fallback={<StudyAreaSkeleton />}>
        <Gallery />
      </Suspense>
    </PageMain>
  );
}

async function Gallery() {
  await connection();
  const all = await getDiagrams();
  const byItem = new Map<string, typeof all>();
  for (const d of all) byItem.set(d.itemId, [...(byItem.get(d.itemId) ?? []), d]);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Your diagrams</h2>
        <p className="mt-1 text-sm text-muted">
          Every diagram you saved from design and LLD practice, for the roadmap&apos;s last week: skim your notes and your own diagrams. Add
          diagrams from each design&apos;s page.
        </p>
      </header>
      {all.length === 0 && (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm">
          No diagrams yet. After practicing a design, save a screenshot of your whiteboard or your Excalidraw link on that design&apos;s page.{" "}
          <Link href="/study/sd" className="font-medium underline">
            Go to system design
          </Link>
        </p>
      )}
      {[...byItem.entries()].map(([itemId, list]) => {
        const ex = ALL_EXERCISES[itemId];
        return (
          <section key={itemId}>
            <h3 className="mb-2 font-semibold">
              {ex ? (
                <Link href={studyHref(ex.area, itemId)} className="hover:underline">
                  {ex.title}
                </Link>
              ) : (
                itemId
              )}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((d) => (
                <li key={d.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                  {d.hasImage && (
                    <a href={`/api/diagrams/${d.id}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/diagrams/${d.id}`} alt={d.title || "Diagram"} loading="lazy" className="h-52 w-full bg-white object-contain" />
                    </a>
                  )}
                  <div className="flex items-center gap-2 p-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{d.title || "Untitled"}</span>
                    <span className="text-xs text-muted">{d.createdOn}</span>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline">
                        Open ↗
                      </a>
                    )}
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
