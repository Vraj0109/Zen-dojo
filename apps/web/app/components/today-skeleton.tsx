import { LateSkeleton, Skeleton } from "./skeleton";

// Placeholders for the Today page's streamed sections (apps/web/app/page.tsx). Each one stays invisible for the first
// second, so a fast load never flashes them.

/** Greeting line and the progress row (daily goal, XP, streak). */
export function TodayTopSkeleton() {
  return (
    <LateSkeleton label="Loading today" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex min-w-56 flex-1 items-center gap-4 rounded-md border border-line bg-surface p-5">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </LateSkeleton>
  );
}

/** The "Up next" list. */
export function UpNextSkeleton() {
  return (
    <LateSkeleton label="Loading up next" className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <ul className="divide-y divide-line">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="size-5 shrink-0 rounded-sm" />
            <div className="flex-1 space-y-2">
              <Skeleton className={`h-4 ${["w-1/2", "w-3/5", "w-2/5", "w-1/3"][i]}`} />
              <Skeleton className="h-3 w-32" />
            </div>
          </li>
        ))}
      </ul>
    </LateSkeleton>
  );
}

/** A card with a title and a few rows ("This week's focus", "Due for review"). */
export function TodayCardSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <LateSkeleton label={label} className="space-y-3 rounded-md border border-line bg-surface p-5">
      <Skeleton className="h-5 w-36" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 2 ? "w-2/3" : "w-4/5"}`} />
      ))}
    </LateSkeleton>
  );
}
