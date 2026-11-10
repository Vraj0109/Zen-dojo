import { Skeleton, SkeletonButton } from "./skeleton";

/**
 * Skeleton placeholder matching the layout of the Today page (apps/web/app/page.tsx).
 * Includes header with KPI chips, streak banner, 4-stat KPI grid, and daily tasks checklist.
 */
export function TodaySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading today's dashboard"
      className="space-y-6"
    >
      {/* Header with Date and Quick Chips */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          {/* Week tracker */}
          <Skeleton className="h-4 w-28" />
          {/* Today Date */}
          <Skeleton className="h-8 w-64 sm:w-80" />
        </div>

        {/* Header chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Streak Chip */}
          <div className="rounded-xl border border-line bg-surface px-3 py-2 space-y-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Today XP Chip */}
          <div className="rounded-xl border border-line bg-surface px-3 py-2 space-y-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-14" />
          </div>
          {/* Level Chip */}
          <div className="rounded-xl border border-line bg-surface px-3 py-2 space-y-1">
            <Skeleton className="h-3 w-10" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-2 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Streak Banner / Alert Placeholder */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-64 sm:w-96 max-w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <SkeletonButton size="sm" className="w-28" />
      </div>

      {/* 4-Stat KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
          <Skeleton className="h-3 w-14 uppercase" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
          <Skeleton className="h-3 w-16 uppercase" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
          <Skeleton className="h-3 w-12 uppercase" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
          <Skeleton className="h-3 w-16 uppercase" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Daily Tasks / Goal Checklist Skeleton ("Up Next") */}
      <section
        aria-label="Loading tasks"
        className="overflow-hidden rounded-xl border border-line bg-surface"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-2.5 w-28 rounded-full sm:block" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Task Rows Checklist */}
        <ul className="divide-y divide-line">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3 p-4">
              {/* Checkbox */}
              <Skeleton className="size-6 shrink-0 rounded-md border-2 border-line/60 bg-transparent" />
              {/* Task Details */}
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton
                  className={`h-4 ${
                    i === 0
                      ? "w-3/4 sm:w-1/2"
                      : i === 1
                        ? "w-4/5 sm:w-3/5"
                        : i === 2
                          ? "w-2/3 sm:w-2/5"
                          : "w-1/2 sm:w-1/3"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-3 w-16 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
              {/* Action Button */}
              <Skeleton className="hidden h-8 w-24 rounded-lg sm:block" />
            </li>
          ))}
        </ul>
      </section>

      {/* Fold / Accordion Placeholder */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export default TodaySkeleton;
