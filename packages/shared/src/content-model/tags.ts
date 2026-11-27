// Cache tags for content (plan 0114 "Cache tags"). Pure, so the browser can use the same table. The server calls
// these tags to expire cached reads after a write.

import type { EntityKind } from "./types";

export const TAG = {
  content: "content",
  contentVersion: "content-version",
  problems: "problems",
  problem: (id: string) => `problem:${id}`,
  courses: "courses",
  course: (id: string) => `course:${id}`,
  lesson: (id: string) => `lesson:${id}`,
  docs: (kind: string) => `docs:${kind}`,
  doc: (kind: string, id: string) => `doc:${kind}:${id}`,
} as const;

/**
 * Tags to expire for a change to one entity. A lesson needs its courseId and a doc needs its kind; call once per
 * course when a lesson moves (old and new course). Throws when a required field is missing, so no tag is silently
 * skipped.
 */
export function tagsFor(entity: EntityKind, id: string, extra: { courseId?: string; kind?: string } = {}): string[] {
  switch (entity) {
    case "problem":
      return [TAG.problem(id), TAG.problems, TAG.contentVersion];
    case "lesson":
      if (!extra.courseId) throw new Error(`tagsFor: lesson ${id} needs courseId`);
      return [TAG.lesson(id), TAG.course(extra.courseId), TAG.courses, TAG.contentVersion];
    case "course":
      return [TAG.course(id), TAG.courses, TAG.contentVersion];
    case "doc":
      if (!extra.kind) throw new Error(`tagsFor: doc ${id} needs kind`);
      return [TAG.doc(extra.kind, id), TAG.docs(extra.kind), TAG.contentVersion];
  }
}
