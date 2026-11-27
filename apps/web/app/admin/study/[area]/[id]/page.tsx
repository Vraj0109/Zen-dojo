import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getLesson, listCourses } from "@/lib/content-repo/courses";
import { getContentDb } from "@/lib/content-db/client";
import { listAudit } from "@/lib/content-db/audit";
import { LessonEditorClient } from "./lesson-editor-client";

async function LessonEditorContainer({ params }: { params: Promise<{ area: string; id: string }> | { area: string; id: string } }) {
  await connection();
  await requireAdminPage();
  const { id } = await params;

  const [lesson, courseOutlines, db] = await Promise.all([
    getLesson(id),
    listCourses(),
    getContentDb(),
  ]);

  if (!lesson) {
    notFound();
  }

  const auditRows = await listAudit(db, {
    entity: "lesson",
    entityId: id,
    limit: 50,
  });

  const courses = courseOutlines.map((c) => ({
    id: c.row.id,
    title: c.row.title,
  }));

  return (
    <LessonEditorClient
      initialLesson={lesson}
      initialAuditRows={auditRows}
      courses={courses}
    />
  );
}

async function IdTitle({ params }: { params: Promise<{ area: string; id: string }> | { area: string; id: string } }) {
  const { id } = await params;
  return <span className="font-mono text-accent text-xl">{id}</span>;
}

// Route params are request data: read only inside Suspense, so the page shell still prerenders.
export default function AdminLessonPage({
  params,
}: {
  params: Promise<{ area: string; id: string }> | { area: string; id: string };
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Edit Lesson:{" "}
          <Suspense fallback={null}>
            <IdTitle params={params} />
          </Suspense>
        </h1>
      </div>
      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <LessonEditorContainer params={params} />
      </Suspense>
    </div>
  );
}
