import * as React from "react";
import { Skeleton } from "@/app/components/skeleton";

/** Full-fidelity Study Article skeleton (matches study/[area]/[id] and dsa/pattern/[id] learn views) */
export function StudyArticleSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading study article">
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
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
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

          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
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
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4 font-mono">
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
          <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
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
    <div className="space-y-8" role="status" aria-label="Loading learn hub">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </header>

      {/* "Continue where you left off" card */}
      <section className="rounded-xl border border-accent/40 bg-surface p-5 space-y-3">
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
            <div key={i} className="rounded-xl border border-line bg-surface p-5 space-y-4">
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

/** Study Area skeleton (matches apps/web/app/study/[area]/page.tsx) */
export function StudyAreaSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading study area">
      {/* Back button */}
      <Skeleton className="h-4 w-28" />

      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </header>

      {/* 4-Stat KPI Grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </section>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-12" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>

      {/* Sections and Concepts List */}
      <div className="space-y-6">
        {[...Array(3)].map((_, sIndex) => (
          <section key={sIndex} className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/40 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="divide-y divide-line/40 px-4">
              {[...Array(4)].map((_, cIndex) => (
                <div key={cIndex} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-3.5 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
