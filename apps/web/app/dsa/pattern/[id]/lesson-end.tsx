import Link from "next/link";
import { buttonClass } from "../../../ui";

/** End of a pattern lesson: open its Practice list, or go back to (or on to) a group. Static data only. */
export function LessonEnd({
  id,
  name,
  problemCount,
  group,
  nextGroup,
}: {
  id: string;
  name: string;
  problemCount: number;
  group: { id: string; title: string };
  nextGroup?: { id: string; title: string };
}) {
  return (
    <section aria-labelledby="lesson-end-heading" className="space-y-3 rounded-md border border-line bg-surface p-5">
      <h3 id="lesson-end-heading" className="font-semibold">
        Ready to practice?
      </h3>
      <p className="text-sm text-muted">
        {problemCount} problem{problemCount === 1 ? "" : "s"} for {name}, easy to hard.
      </p>
      {/* No scroll={false}: the Practice tab must open at the top of the page. */}
      <Link
        href={`/dsa/pattern/${id}?tab=practice`}
        className={buttonClass("primary", "md", "max-md:min-h-11 max-md:w-full")}
      >
        Practice {name}
      </Link>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href={`/dsa?group=${group.id}#p-${id}`} className="text-muted hover:text-foreground max-md:min-h-11 max-md:inline-flex max-md:items-center">
          Back to {group.title}
        </Link>
        {nextGroup && (
          <Link
            href={`/dsa?group=${nextGroup.id}#g-${nextGroup.id}`}
            className="text-muted hover:text-foreground max-md:min-h-11 max-md:inline-flex max-md:items-center"
          >
            Next group: {nextGroup.title}
          </Link>
        )}
      </div>
    </section>
  );
}
