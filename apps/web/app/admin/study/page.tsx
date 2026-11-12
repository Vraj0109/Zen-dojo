import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LESSONS, LESSON_EXTRA, LLD_GUIDES, STUDY_AREAS, WALKTHROUGHS } from "@habit/shared";
import { requireAdmin } from "@/lib/auth/session";
import { lessonSource } from "@/lib/ai/lesson";

interface Row {
  id: string;
  title: string;
  kind: "Concept" | "Exercise";
  section: string;
  hasBody: boolean;
  deeper: number;
  chars: number;
}

function row(id: string, title: string, kind: Row["kind"], section: string): Row {
  return {
    id,
    title,
    kind,
    section,
    hasBody: Boolean(LESSONS[id] || WALKTHROUGHS[id] || LLD_GUIDES[id]),
    deeper: LESSON_EXTRA[id]?.deeper.length ?? 0,
    chars: lessonSource(id)?.material.length ?? 0,
  };
}

const th = "px-4 py-2";

async function StudyTables() {
  await connection();
  await requireAdmin();

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Pick a Concept to edit its lesson text. Saved edits replace the built-in text for learners without a release. Exercises (system designs, LLD) stay read-only here.
      </p>
      {STUDY_AREAS.map((area) => {
        const rows: Row[] = [
          ...area.sections.flatMap((s) => s.concepts.map((c) => row(c.id, c.title, "Concept", s.title))),
          ...(area.exercises?.items ?? []).map((e) => row(e.id, e.title, "Exercise", area.exercises?.title ?? "Exercises")),
        ];
        const missing = rows.filter((r) => !r.hasBody).length;
        return (
          <section key={area.id} aria-labelledby={`area-${area.id}`} className="space-y-2">
            <h2 id={`area-${area.id}`} className="text-lg font-semibold tracking-tight">
              {area.title}
            </h2>
            <p className="text-sm text-muted">
              {rows.length} items{missing > 0 ? `, ${missing} without a lesson body` : ", all with a lesson body"}.
            </p>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className={th}>Title</th>
                    <th scope="col" className={th}>Id</th>
                    <th scope="col" className={th}>Type</th>
                    <th scope="col" className={th}>Section</th>
                    <th scope="col" className={th}>Lesson body</th>
                    <th scope="col" className={`${th} text-right`}>Deeper sections</th>
                    <th scope="col" className={`${th} text-right`}>Characters</th>
                    <th scope="col" className={`${th} text-right`}>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 font-medium">{r.title}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted">{r.id}</td>
                      <td className="px-4 py-2">{r.kind}</td>
                      <td className="px-4 py-2 text-muted">{r.section}</td>
                      <td className="px-4 py-2">{r.hasBody ? "Yes" : <span className="text-muted">No</span>}</td>
                      <td className="px-4 py-2 text-right">{r.deeper}</td>
                      <td className="px-4 py-2 text-right">{r.chars.toLocaleString("en-US")}</td>
                      <td className="px-4 py-2 text-right">
                        {r.kind === "Concept" && (
                          <Link href={`/admin/study/${area.id}/${r.id}`} className="mr-3 text-accent hover:underline">Edit</Link>
                        )}
                        <Link href={`/study/${area.id}/${r.id}`} className="text-accent hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function AdminStudyPage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Study content</h1>
      <Suspense fallback={<div className="h-64 rounded-xl border border-line bg-surface" />}>
        <StudyTables />
      </Suspense>
    </main>
  );
}
