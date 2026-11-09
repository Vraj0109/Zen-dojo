import Link from "next/link";
import { COVERED_CONFIDENCE, LESSON_EXTRA } from "@habit/shared";
import { getStudyView } from "@/lib/study";
import { courseOutline } from "./toc-items";

/** Tiny marker for a covered lesson (no symbols or emoji; the text is for screen readers). */
function CoveredDot() {
  return (
    <span aria-hidden={false} className="inline-block size-2 shrink-0 rounded-full bg-accent" title="Covered">
      <span className="sr-only">covered</span>
    </span>
  );
}

/**
 * Whole-course lesson quick-picker rendered as a compact dropdown popover in the header breadcrumb.
 * Displays sections, lessons, exercises, and covered/unstudied progress indicators.
 */
export async function CourseOutline({
  areaId,
  currentId,
  label,
  className = "",
}: {
  areaId: string;
  currentId?: string;
  label?: string;
  className?: string;
}) {
  const view = await getStudyView(areaId);
  if (!view) return null;
  const tree = courseOutline({
    areaId,
    currentId,
    sections: view.sections,
    coveredAt: COVERED_CONFIDENCE,
    deeper: (id) => LESSON_EXTRA[id]?.deeper.map((s) => s.title) ?? [],
  });

  const totalConcepts = tree.reduce((acc, s) => acc + s.lessons.length, 0);
  const coveredConcepts = tree.reduce((acc, s) => acc + s.lessons.filter((l) => l.covered).length, 0);
  const totalExercises = view.exercises?.length ?? 0;
  const coveredExercises = view.exercises?.filter((e) => e.sessions > 0).length ?? 0;
  const totalItems = totalConcepts + totalExercises;
  const coveredItems = coveredConcepts + coveredExercises;

  return (
    <details className={`relative inline-block ${className}`}>
      <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background">
        <span className="max-w-[200px] truncate sm:max-w-xs md:max-w-sm">{label ?? "Course outline"}</span>
        <span aria-hidden className="text-[10px] text-muted">▼</span>
      </summary>
      <div className="anim-pop absolute left-0 z-30 mt-1.5 max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{view.area.title}</p>
          <span className="text-xs text-muted">
            {coveredItems}/{totalItems} covered
          </span>
        </div>
        <nav aria-label={`${view.area.title} outline`} className="space-y-2">
          {tree.map((s) => (
            <details key={s.id} open={s.open} className="group">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground">
                {s.title}
              </summary>
              <ul className="mt-1 space-y-0.5">
                {s.lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={l.href}
                      prefetch={false}
                      aria-current={l.current ? "page" : undefined}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                        l.current ? "bg-accent/10 font-medium text-foreground" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {l.covered ? <CoveredDot /> : <span className="size-2 shrink-0 rounded-full border border-line" />}
                      <span className="min-w-0 truncate">{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          {view.exercises && view.exercises.length > 0 && (
            <details open={view.exercises.some((e) => e.id === currentId)} className="group">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground">
                {view.area.exercises?.title ?? "Practice exercises"}
              </summary>
              <ul className="mt-1 space-y-0.5">
                {view.exercises.map((e) => {
                  const isCurrent = e.id === currentId;
                  const isCovered = e.sessions > 0;
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/study/${areaId}/${e.id}`}
                        prefetch={false}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                          isCurrent ? "bg-accent/10 font-medium text-foreground" : "text-muted hover:text-foreground"
                        }`}
                      >
                        {isCovered ? <CoveredDot /> : <span className="size-2 shrink-0 rounded-full border border-line" />}
                        <span className="min-w-0 truncate">{e.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </nav>
      </div>
    </details>
  );
}
