import type { ReactNode } from "react";
import type { ContentPage as ContentPageData, ProblemSpec } from "@habit/shared";
import { getSolutionPage } from "@/lib/content-repo/problems";
import { ContentPage } from "./content-page";

interface WalkthroughItem {
  md: string;
  optimal?: string;
  reviewed?: boolean;
}

export interface ProblemSolutionProps {
  spec?: ProblemSpec;
  solutionPage?: ContentPageData | null;
  problemId?: string;
  complexity?: string;
  interview?: WalkthroughItem;
  approachSlots?: Record<string, ReactNode>;
}

export async function ProblemSolution({
  spec,
  solutionPage,
  problemId,
  complexity,
  interview,
}: ProblemSolutionProps) {
  const id = problemId ?? spec?.id;
  const page: ContentPageData | null =
    solutionPage !== undefined
      ? solutionPage
      : id
        ? await getSolutionPage(id)
        : null;

  const complexityBadge =
    complexity ??
    interview?.optimal ??
    spec?.solution?.complexity ??
    (page?.sections.flatMap((s) => s.blocks).find((b) => b.variant === "optimal")?.timeComplexity ?? undefined);

  const sections = (page?.sections ?? []).filter((s) => s.title);

  return (
    <div data-focus-reading className="space-y-4">
      <details className="group rounded-lg border border-line bg-surface p-4" open={false}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 font-medium">
          <span className="flex items-center gap-2">
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Try it yourself first
          </span>
          {complexityBadge && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-muted">
              {complexityBadge}
            </span>
          )}
        </summary>

        <div className="mt-4 border-t border-line pt-4 space-y-6">
          {sections.length > 0 && (
            <nav aria-label="Section outline" className="flex flex-wrap gap-1.5 pb-2 border-b border-line">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#s-${s.id}`}
                  className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-foreground hover:bg-surface-3 transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          )}
          {page ? (
            <>
              <ContentPage page={page} template="problem" />
              {sections.length === 0 && spec?.solution?.complexity && (
                <p className="text-sm">
                  <span className="font-medium">Complexity:</span> {spec.solution.complexity}
                </p>
              )}
            </>
          ) : spec ? (
            <div className="space-y-4">
              {spec.solution.idea.map((para, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {para}
                </p>
              ))}
              {spec.solution.complexity && (
                <p className="text-sm">
                  <span className="font-medium">Complexity:</span> {spec.solution.complexity}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">No solution available yet.</p>
          )}
        </div>
      </details>
    </div>
  );
}
