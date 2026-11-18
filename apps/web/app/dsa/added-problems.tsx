import Link from "next/link";
import { listAddedProblems } from "@/lib/content";
import { Difficulty, StatusMark } from "../ui";

// Problems added without a release (docs/content-editing.md, "Add one thing"), listed under the heading the item names.
// They open in the same Run / Notes workspace as every other pack problem. Shown on the /dsa list and, for items that name
// a pattern, on that pattern's page.
export async function AddedProblems({ patternId }: { patternId?: string }) {
  const problems = await listAddedProblems(patternId);
  if (problems.length === 0) return null;
  const groups = new Map<string, typeof problems>();
  for (const p of problems) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);
  return (
    <>
      {[...groups].map(([group, items]) => (
        <section key={group} className="space-y-2">
          <h2 className={patternId ? "font-semibold" : "text-lg font-semibold"}>{group}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            {items.map((p) => (
              <li key={p.id} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-120 hover:bg-surface-2">
                <Link href={p.href} className="min-w-0 truncate font-medium hover:underline">
                  {p.title}
                </Link>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  {p.difficulty && <Difficulty level={p.difficulty} />}
                  <StatusMark state={p.done ? "solved" : "none"} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
