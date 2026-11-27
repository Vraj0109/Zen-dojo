import { connection } from "next/server";
import { Suspense } from "react";
import { pageTemplate, type ContentLesson } from "@habit/shared";
import { requireAdminPage } from "@/lib/auth/admin";
import { listCourses } from "@/lib/content-repo/courses";
import { LessonEditorClient } from "../[area]/[id]/lesson-editor-client";

function createEmptyLesson(courseId: string): ContentLesson {
  const tmpl = pageTemplate("concept");
  return {
    row: {
      id: "",
      courseId: courseId || "core-cs",
      ord: 0,
      title: "",
      template: "concept",
      meta: { points: [] },
    },
    page: {
      template: "concept",
      sections: tmpl.slots.map((s, idx) => ({
        id: `sec-${s.key}`,
        slot: s.key,
        ord: idx,
        title: null,
        blocks: [
          {
            id: `blk-${s.key}-1`,
            ord: 0,
            type: "markdown",
            body: `Content for ${s.heading}...`,
            caption: null,
            variant: null,
            label: null,
            timeComplexity: null,
            spaceComplexity: null,
            assetId: null,
            code: {},
          },
        ],
      })),
    },
  };
}

async function NewLessonContainer() {
  await connection();
  await requireAdminPage();

  const courseOutlines = await listCourses();
  const courses = courseOutlines.map((c) => ({
    id: c.row.id,
    title: c.row.title,
  }));
  const emptyLesson = createEmptyLesson(courses[0]?.id ?? "core-cs");

  return (
    <LessonEditorClient
      initialLesson={emptyLesson}
      initialAuditRows={[]}
      courses={courses}
    />
  );
}

export default function NewLessonPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create New Lesson</h1>
      </div>
      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <NewLessonContainer />
      </Suspense>
    </div>
  );
}
