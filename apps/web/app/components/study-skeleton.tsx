import * as React from "react";
import { Skeleton } from "@/app/components/skeleton";

/** Full-fidelity Study Article skeleton (matches study/[area]/[id] and dsa/pattern/[id] learn views) */
export function StudyArticleSkeleton() {
  return (
    <div className="anim-late space-y-6" role="status" aria-label="Loading study article">
      {/* Breadcrumb row */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <span className="text-muted/40">/</span>
        <Skeleton className="h-4 w-24" />
        <span className="text-muted/40">/</span>
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Main split grid: Article body + Table of Contents sidebar */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        {/* Right aside / Table of Contents (order-1 on mobile, sticky on xl) */}
        <aside className="order-1 space-y-4 xl:order-2 xl:sticky xl:top-6 xl:self-start">
          <div className="space-y-3 rounded-md border border-line bg-surface p-4">
            <Skeleton className="h-3 w-24 tracking-wider uppercase" />
            <div className="space-y-2.5 pt-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-40 pl-3" />
              <Skeleton className="h-3.5 w-28 pl-3" />
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-44 pl-3" />
              <Skeleton className="h-3.5 w-30" />
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-line bg-surface p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </aside>

        {/* Article content (order-2 on mobile, left column on xl) */}
        <div className="order-2 min-w-0 space-y-8 xl:order-1">
          {/* Header */}
          <header className="space-y-3">
            <Skeleton className="h-8 w-3/4 max-w-lg" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </header>

          {/* Section 1: Introduction text block */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Embedded Code Snippet Skeleton */}
          <div className="space-y-3 rounded-md border border-line bg-surface p-4 font-mono">
            <div className="flex items-center justify-between border-b border-line/40 pb-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
            <div className="space-y-2 pt-1 text-sm">
              <Skeleton className="h-3.5 w-48" />
              <div className="pl-4 space-y-2">
                <Skeleton className="h-3.5 w-64" />
                <div className="pl-4 space-y-2">
                  <Skeleton className="h-3.5 w-56" />
                  <Skeleton className="h-3.5 w-72" />
                </div>
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          </div>

          {/* Section 2: Deep dive / trade-offs */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Section 3: Interactive Practice / Self-Rate card */}
          <div className="rounded-md border border-line bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-3/4" />
            <div className="flex gap-2 pt-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-14 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Study Hub skeleton (matches apps/web/app/study/page.tsx) */
export function StudyHubSkeleton() {
  return (
    <div className="anim-late space-y-8" role="status" aria-label="Loading learn hub">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </header>

      {/* "Continue where you left off" card */}
      <section className="rounded-md border border-accent/40 bg-surface p-5 space-y-3">
        <Skeleton className="h-3 w-40 tracking-wider uppercase" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </section>

      {/* Course Cards Grid */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-md border border-line bg-surface p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex items-center justify-between text-xs pt-1 border-t border-line/40">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Study Area skeleton (matches apps/web/app/study/[area]/page.tsx: hero, three tabs, course path stepper) */
export function StudyAreaSkeleton() {
  return (
    <div className="anim-late mx-auto w-full max-w-[1240px] space-y-5" role="status" aria-label="Loading course">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />

      {/* Subject hero: rounded-[32px] block with title, intro, chips and the continue button */}
      <section className="flex flex-wrap items-center gap-5 rounded-[32px] bg-surface-2 p-5 sm:px-8 sm:py-7">
        <Skeleton className="hidden size-[72px] shrink-0 rounded-[28px] sm:block" />
        <div className="min-w-0 flex-[1_1_260px] space-y-3">
          <Skeleton className="h-8 w-3/5 max-w-sm sm:h-9" />
          <Skeleton className="h-4 w-full max-w-[70ch]" />
          <Skeleton className="h-4 w-4/5 max-w-[70ch]" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-56 max-w-full rounded-full" />
      </section>

      {/* Tabs: three pills in a track (About, Learn, Projects) */}
      <div className="inline-flex max-w-full gap-1 rounded-full border border-line p-1">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* Course path: vertical stepper, circle + rounded row per lesson */}
      <div className="flex flex-col pt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-3 sm:gap-4">
            <div className="flex w-11 shrink-0 flex-col items-center">
              <Skeleton className="size-11 rounded-full" />
              {i < 5 && <Skeleton className="my-1 min-h-4 w-1 flex-1 rounded-full" />}
            </div>
            <div className="mb-3 flex min-w-0 flex-1 items-center gap-3 rounded-[24px] border border-line bg-surface px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
