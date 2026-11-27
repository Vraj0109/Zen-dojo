import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { TAG, type ContentLesson, type CourseRow, type LessonRow, type TemplateId } from "@habit/shared";
import { getContentDb } from "../content-db/client";
import { loadCourse, loadLesson } from "../content-db/load";
import { courses, lessons } from "../content-db/schema";

/** A course with the summaries of its lessons (no lesson pages). */
export type CourseOutline = { row: CourseRow; lessons: LessonRow[] };

type LessonDbRow = typeof lessons.$inferSelect;
type CourseDbRow = typeof courses.$inferSelect;

function lessonRow(r: LessonDbRow): LessonRow {
  return {
    id: r.id,
    courseId: r.courseId,
    ord: r.ord,
    title: r.title,
    template: r.template as TemplateId,
    meta: JSON.parse(r.metaJson) as Record<string, unknown>,
  };
}

function courseRow(r: CourseDbRow): CourseRow {
  return {
    id: r.id,
    area: r.area,
    title: r.title,
    summaryMd: r.summaryMd,
    ord: r.ord,
    data: JSON.parse(r.dataJson) as Record<string, unknown>,
  };
}

/** Every live course with its lesson summaries, in course order. */
export async function listCourses(): Promise<CourseOutline[]> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.courses);
  cacheLife("max");
  const db = await getContentDb();
  const courseRows = await db.select().from(courses).where(eq(courses.deleted, 0)).orderBy(asc(courses.ord), asc(courses.id));
  const lessonRows = await db.select().from(lessons).where(eq(lessons.deleted, 0)).orderBy(asc(lessons.ord), asc(lessons.id));
  const byCourse = new Map<string, LessonRow[]>();
  for (const l of lessonRows) {
    const list = byCourse.get(l.courseId) ?? [];
    list.push(lessonRow(l));
    byCourse.set(l.courseId, list);
  }
  return courseRows.map((c) => ({ row: courseRow(c), lessons: byCourse.get(c.id) ?? [] }));
}

/** One course with its lesson summaries, or null when missing or soft-deleted. */
export async function getCourse(id: string): Promise<CourseOutline | null> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.course(id));
  cacheLife("max");
  const db = await getContentDb();
  const course = await loadCourse(db, id);
  if (!course) return null;
  const lessonRows = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.courseId, id), eq(lessons.deleted, 0)))
    .orderBy(asc(lessons.ord), asc(lessons.id));
  return { row: course.row, lessons: lessonRows.map(lessonRow) };
}

/** One lesson with its page, or null when missing or soft-deleted. */
export async function getLesson(id: string): Promise<ContentLesson | null> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.lesson(id));
  cacheLife("max");
  return loadLesson(await getContentDb(), id);
}
