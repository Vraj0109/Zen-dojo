import * as React from "react";
import { Skeleton } from "@/app/components/skeleton";

/** Profile stats, level progress, KPIs, and heatmap skeleton (matches profile/page.tsx) */
export function ProfileStatsSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading profile stats">
      {/* Level + Stats Hero Card */}
      <section className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-5 md:flex-row md:items-center">
        {/* Avatar / Level Indicator */}
        <div className="flex items-center gap-4 md:w-80 md:shrink-0">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>

        {/* 4-Stat Grid */}
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3.5 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* Heatmap / Activity matrix placeholder */}
      <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-2">
          {[...Array(350)].map((_, i) => (
            <Skeleton key={i} className="size-3 rounded-xs" />
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-line/40 text-xs">
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-12" />
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="size-3 rounded-xs" />
              ))}
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </section>

      {/* Categories & Badges Grid */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Badges showcase */}
        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-2">
                <Skeleton className="size-12 rounded-full" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Settings form rows, toggle switches, and card skeleton (matches profile/settings/page.tsx) */
export function ProfileSettingsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 space-y-4" role="status" aria-label="Loading settings">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3.5 w-4/5 max-w-md" />
      </div>

      <div className="divide-y divide-line/40 border-t border-line/40 pt-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 max-w-[50vw]" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
