import * as React from "react";
import { Skeleton } from "@/app/components/skeleton";

/** Review Queue and Spaced Repetition Skeleton */
export function ReviewQueueSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading review queue">
      {/* Review Section Tabs */}
      <div className="flex gap-2 border-b border-line pb-2">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-3/4 max-w-lg" />
      </header>

      {/* "Up Next" Card */}
      <section className="space-y-4 rounded-xl border border-accent/40 bg-surface p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20 tracking-wider uppercase" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-7 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-1/2 max-w-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg ml-auto" />
        </div>
      </section>

      {/* Upcoming Review Items List */}
      <section className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line/40">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48 max-w-[40vw]" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
