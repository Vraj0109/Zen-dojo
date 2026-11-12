import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ALL_CONCEPTS, LESSONS } from "@habit/shared";
import { requireAdmin } from "@/lib/auth/session";
import { getItem } from "@/lib/content";
import { resolveLesson } from "@/lib/packs";
import { LessonEditor } from "./lesson-editor";

async function Editor({ params }: { params: PageProps<"/admin/study/[area]/[id]">["params"] }) {
  await connection();
  await requireAdmin();
  const { area, id } = await params;
  const concept = Object.hasOwn(ALL_CONCEPTS, id) ? ALL_CONCEPTS[id] : undefined;
  if (!concept || concept.area !== area) notFound();
  const stored = await getItem(`patch:${id}`);
  const lesson = await resolveLesson(id, LESSONS[id]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {concept.section}. Saving stores a replacement of this lesson text; the built-in lesson is never changed.{" "}
        <Link href={`/study/${area}/${id}`} className="text-accent hover:underline">View as learner</Link>
      </p>
      <LessonEditor
        initial={{
          concept: id,
          overview: lesson?.overview ?? "",
          points: concept.points,
          explain: lesson?.explain ?? [],
          questions: lesson?.questions ?? [],
          pitfalls: lesson?.pitfalls ?? [],
          patched: stored !== null,
        }}
      />
    </div>
  );
}

export default function AdminLessonPage({ params }: PageProps<"/admin/study/[area]/[id]">) {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit lesson</h1>
      <Suspense fallback={<div className="h-64 rounded-xl border border-line bg-surface" />}>
        <Editor params={params} />
      </Suspense>
    </main>
  );
}
