import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { listCourses } from "@/lib/content-repo/courses";

const th = "px-4 py-2.5 text-left text-xs uppercase tracking-wide text-muted font-medium";

async function StudyCoursesTable() {
  await connection();
  await requireAdminPage();

  const courses = await listCourses();

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted">
        All courses and concept lessons from the content database. Click &ldquo;Edit&rdquo; to modify lessons, slots, code blocks, diagrams, and section order.
      </p>

      {courses.map(({ row: course, lessons }) => (
        <section key={course.id} aria-labelledby={`course-${course.id}`} className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 id={`course-${course.id}`} className="text-lg font-semibold tracking-tight text-foreground">
                {course.title}
              </h2>
              <span className="text-xs font-mono text-muted">Course ID: {course.id} · Area: {course.area}</span>
            </div>
            <span className="text-xs text-muted font-medium">
              {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-surface/60">
                  <th scope="col" className={th}>#</th>
                  <th scope="col" className={th}>Title</th>
                  <th scope="col" className={th}>Lesson ID</th>
                  <th scope="col" className={th}>Template</th>
                  <th scope="col" className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lessons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted">
                      No lessons in this course yet.
                    </td>
                  </tr>
                ) : (
                  lessons.map((lesson, idx) => (
                    <tr key={lesson.id} className="hover:bg-surface/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-muted w-12">{lesson.ord ?? idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <Link
                          href={`/admin/study/${course.id}/${lesson.id}`}
                          className="hover:underline text-accent"
                        >
                          {lesson.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted">{lesson.id}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                          {lesson.template}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/study/${course.id}/${lesson.id}`}
                          className="mr-2 rounded border border-line bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-surface-2 font-medium"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/study/${course.area}/${lesson.id}`}
                          className="text-xs text-muted hover:text-foreground hover:underline"
                        >
                          View public
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AdminStudyPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Study Content</h1>
          <p className="text-xs text-muted">Manage system design, core CS, LLD, and algorithms lessons.</p>
        </div>
        <Link
          href="/admin/study/new"
          className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white shadow hover:bg-accent/90"
        >
          + New lesson
        </Link>
      </div>
      <Suspense fallback={<div className="h-96 rounded-xl border border-line bg-surface animate-pulse" />}>
        <StudyCoursesTable />
      </Suspense>
    </div>
  );
}
