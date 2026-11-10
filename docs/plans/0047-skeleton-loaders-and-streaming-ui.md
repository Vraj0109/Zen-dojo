# 0047: App-wide skeleton loaders & layout-shift-free streaming UI

- **Status:** implemented
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** 2 parallel agents (Antigravity 1 & 2), 2026-11-10
- **Spec:** Replaces all crude `<p className="text-muted">Loading...</p>` texts with fluid, theme-aware skeleton placeholders

## Goal

Eliminate all plain text loading indicators (`"Loading problem…"`, `"Loading today…"`, `"Loading patterns…"`, `"Loading stats…"`, etc.) across every route in Zen Dojo. Replace them with animated, dimension-accurate skeleton components that prevent Cumulative Layout Shift (CLS), maintain page structure during streaming server-side rendering (SSR), and deliver a polished, high-end desktop feel.

## Context

Currently, 15+ pages wrap async data fetching in `<Suspense fallback={<p className="text-muted">Loading...</p>}>`. During page transitions or cold navigations:
- A small text string flashes in the top corner of the screen.
- When the data finishes loading, the layout abruptly shifts and expands, causing jarring visual jumps.
- Dark and accent themes make raw loading text feel unpolished and unfinished.

By building reusable skeleton primitives (`Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonTable`) and dedicated page-level skeleton layouts, the UI maintains its geometry seamlessly while content streams in.

## Reusable Skeleton Primitives (`apps/web/app/components/skeleton.tsx`)

1. **`Skeleton`**: Base pulse block with subtle rounded corners and `bg-line/60` (shimmers nicely in dark, light, and all accent themes):
   ```tsx
   <div className={cn("animate-pulse rounded bg-line/60", className)} {...props} />
   ```
2. **`SkeletonText`**: Multi-line paragraph placeholder with random-width final line for natural paragraph simulation.
3. **`SkeletonCard`**: Card container with simulated header and body rows.
4. **`SkeletonTable`**: Configurable table skeleton with header row and striped placeholder rows.
5. **`SkeletonButton`**: Button placeholder matching Zen Dojo standard button heights (`h-8`, `h-9`).

## Page-Specific Skeleton Layouts

1. **Problem Workspace Skeleton (`apps/web/app/dsa/[id]/problem-skeleton.tsx`)**:
   - Replaces `<p className="text-muted">Loading problem…</p>` in `apps/web/app/dsa/[id]/page.tsx`.
   - Left pane: title badge skeleton, tags skeleton, 5 paragraph skeleton lines, test cases tab strip, sample input/output boxes.
   - Right pane: language selector bar skeleton, CodeMirror editor canvas skeleton with line number gutters, bottom Run/Submit bar skeleton.
2. **Today Dashboard Skeleton (`apps/web/app/components/today-skeleton.tsx`)**:
   - Replaces `<p className="text-muted">Loading today…</p>` in `apps/web/app/page.tsx`.
   - Streak banner card skeleton.
   - 4-column KPI stats grid skeleton (`Patterns`, `Solved`, `Reviews`, `Streak`).
   - Task list / Daily goal checklist skeleton with checkboxes and text bars.
3. **DSA & Roadmap Skeleton (`apps/web/app/components/roadmap-skeleton.tsx`)**:
   - Replaces `<p className="text-muted">Loading patterns…</p>` in `apps/web/app/dsa/page.tsx` and `apps/web/app/roadmap/page.tsx`.
   - Filter bar and search input skeleton.
   - Pattern accordion cards with problem count badges and progress meter skeletons.
4. **Study & Article Skeleton (`apps/web/app/components/study-skeleton.tsx`)**:
   - Replaces `<p className="text-muted">Loading…</p>` in `apps/web/app/study/[area]/[id]/page.tsx` and `apps/web/app/study/page.tsx`.
   - Course breadcrumb trail, large article title bar, author/tag pills.
   - Multi-paragraph content blocks with embedded code snippet skeleton.
   - Table of contents right-hand sidebar skeleton.
5. **Reviews & Profile Skeletons (`apps/web/app/components/profile-skeleton.tsx`)**:
   - Replaces `<p className="text-muted">Loading reviews…</p>` in `apps/web/app/review/page.tsx` and `<p className="text-muted">Loading stats…</p>` in `apps/web/app/profile/page.tsx`.
   - Spaced-repetition due queue cards and heatmaps.

## Acceptance Criteria

- [x] Zero instances of `<p className="text-muted">Loading...</p>` remain in `apps/web/app/`.
- [x] Navigating between pages displays smooth animated skeletons with zero layout jump.
- [x] All skeletons use theme variables and look crisp in both dark, light, and focus modes.
- [x] `pnpm -r typecheck` passes with zero errors.
