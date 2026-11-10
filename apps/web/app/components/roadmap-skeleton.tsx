import * as React from "react";
import { Skeleton } from "@/app/components/skeleton";

export function DsaRoadmapSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading roadmap content">
      {/* 4-Stat KPI Grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4 space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </section>

      {/* Subtext info */}
      <Skeleton className="-mt-3 h-3.5 w-80 max-w-full" />

      {/* Navigation tabs */}
      <div className="flex gap-2 border-b border-line pb-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Main split grid */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {/* Section header & filters */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <div className="space-y-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* Pattern cards accordion */}
          <div className="space-y-4">
            {[...Array(4)].map((_, cardIndex) => (
              <div key={cardIndex} className="overflow-hidden rounded-xl border border-line bg-surface">
                {/* Pattern Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/40 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-2 w-24 rounded-full" />
                  </div>
                </div>

                {/* Problem Rows */}
                <div className="divide-y divide-line/40 px-4">
                  {[...Array(3)].map((_, rowIndex) => (
                    <div key={rowIndex} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-52 max-w-[50vw]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-md" />
                        <Skeleton className="h-5 w-14 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar cheat sheet / sync card */}
        <aside className="space-y-6">
          <div className="space-y-4 rounded-xl border border-line bg-surface p-5">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-4/6" />
            </div>
            <div className="space-y-2 pt-2 border-t border-line/40">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Roadmap 16-week timeline skeleton view */
export function RoadmapSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading roadmap timeline">
      {/* 16-week plan banner card */}
      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Skeleton className="h-3 w-72 max-w-full" />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-3">
          <Skeleton className="h-3.5 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
        </div>
      </section>

      {/* Week cards grid */}
      <ol className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <li key={i} className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-2 pt-1">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <div className="flex gap-3 border-t border-line/40 pt-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
