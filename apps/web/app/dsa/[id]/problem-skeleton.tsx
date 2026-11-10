import { Skeleton, SkeletonButton, SkeletonText } from "../../components/skeleton";

/**
 * Split-pane problem workspace skeleton matching the layout of the problem judge workspace.
 */
export function ProblemWorkspaceSkeleton() {
  return (
    <article
      aria-busy="true"
      aria-label="Loading problem workspace"
      className="space-y-4"
    >
      {/* Problem Header Skeleton */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-2">
          {/* Title */}
          <Skeleton className="h-7 w-64 sm:w-80" />
          {/* Why this one / context */}
          <Skeleton className="h-4 w-96 max-w-full" />
          {/* Tags & difficulty badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      </header>

      {/* Split-pane Workspace Skeleton */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 min-h-[34rem] h-[calc(100dvh-15rem)] max-h-[52rem]">
        {/* Left Pane: Problem Description & Test Cases */}
        <section
          aria-label="Loading problem description"
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface lg:col-span-5"
        >
          {/* Left Pane Header: Tabs */}
          <div className="flex h-8 shrink-0 items-center gap-3 border-b border-line bg-background/60 px-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Left Pane Content */}
          <div className="flex-1 space-y-5 overflow-hidden p-4">
            {/* 5 description lines */}
            <div className="space-y-2.5">
              <SkeletonText lines={5} />
            </div>

            {/* Constraints */}
            <div className="space-y-2 pt-1">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-1.5 pl-4">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3.5 w-56" />
                <Skeleton className="h-3.5 w-40" />
              </div>
            </div>

            {/* Test Case Tabs Strip */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b border-line pb-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>

              {/* Sample input / output boxes */}
              <div className="space-y-2.5">
                <div className="rounded-lg border border-line bg-background p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-background p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Pane: Code Editor & Action Bar */}
        <section
          aria-label="Loading code editor"
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface lg:col-span-7"
        >
          {/* Right Pane Header: Language Selector & Actions */}
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-line bg-background/60 px-3">
            <div className="flex items-center gap-2">
              {/* Language Selector Dropdown */}
              <Skeleton className="h-5 w-24 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="size-5 rounded" />
            </div>
          </div>

          {/* Simulated Code Canvas with Line Numbers Gutter */}
          <div className="flex flex-1 overflow-hidden bg-background">
            {/* Line Numbers Gutter */}
            <div
              aria-hidden="true"
              className="flex w-10 shrink-0 flex-col border-r border-line/60 bg-surface/30 py-3 pr-2 text-right font-mono text-xs text-muted/30 select-none space-y-2.5"
            >
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-3.5 leading-none">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Canvas Placeholder Lines */}
            <div className="flex-1 space-y-2.5 p-3 font-mono">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-3.5 w-60 ml-4" />
              <Skeleton className="h-3.5 w-48 ml-8" />
              <Skeleton className="h-3.5 w-72 ml-8" />
              <Skeleton className="h-3.5 w-64 ml-12" />
              <Skeleton className="h-3.5 w-52 ml-12" />
              <Skeleton className="h-3.5 w-36 ml-16" />
              <Skeleton className="h-3.5 w-20 ml-12" />
              <Skeleton className="h-3.5 w-48 ml-12" />
              <Skeleton className="h-3.5 w-16 ml-8" />
              <Skeleton className="h-3.5 w-32 ml-8" />
              <Skeleton className="h-3.5 w-12 ml-4" />
              <Skeleton className="h-3.5 w-8" />
            </div>
          </div>

          {/* Bottom Run / Submit Bar */}
          <div className="flex h-12 shrink-0 items-center justify-between border-t border-line bg-surface px-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonButton size="sm" className="w-16" />
              <Skeleton className="h-8 w-20 rounded-md bg-accent/40 animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export default ProblemWorkspaceSkeleton;
