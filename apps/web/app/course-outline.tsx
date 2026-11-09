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
 * The whole area as a tree: section > lesson > sub-sections. The current lesson is open and shows its sub-sections as
 * links; every other lesson is one click away. Real links, so it works with the keyboard and without JavaScript.
 */
export async function CourseOutline({ areaId, currentId }: { areaId: string; currentId?: string }) {
  const view = await getStudyView(areaId);
  if (!view) return null;
  const tree = courseOutline({
    areaId,
    currentId,
    sections: view.sections,
    coveredAt: COVERED_CONFIDENCE,
    deeper: (id) => LESSON_EXTRA[id]?.deeper.map((s) => s.title) ?? [],
  });
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm" open={false}>
      <summary className="cursor-pointer font-medium text-muted hover:text-foreground">Course outline</summary>
      <nav aria-label={`${view.area.title} outline`} className="mt-2 max-h-[55vh] space-y-2 overflow-y-auto border-t border-line pt-2">
        {tree.map((s) => (
          <details key={s.id} open={s.open} className="group">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground">{s.title}</summary>
            <ul className="mt-1 space-y-0.5">
              {s.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={l.href}
                    prefetch={false}
                    aria-current={l.current ? "page" : undefined}
                    className={`flex items-center gap-2 rounded px-2 py-1 ${l.current ? "bg-accent/10 font-medium text-foreground" : "text-muted hover:text-foreground"}`}
                  >
                    {l.covered ? <CoveredDot /> : <span className="size-2 shrink-0" />}
                    <span className="min-w-0">{l.title}</span>
                  </Link>
                  {l.current && l.children.length > 0 && (
                    <ul className="ml-4 border-l border-line">
                      {l.children.map((c) => (
                        <li key={c.id}>
                          <a href={`#${c.id}`} className="block rounded-r px-3 py-0.5 text-[13px] text-muted hover:text-foreground">
                            {c.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </nav>
    </details>
  );
}
