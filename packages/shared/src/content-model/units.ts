// Download and follow units for content entities (plan 0115 "Download units"). Pure.
//
// problem -> problems:<pattern> (problems:other when there is no pattern); lesson -> course:<courseId>;
// course -> course:<id>; doc -> docs.

import type { ContentEntity, UnitId } from "./types";

export function unitsFor(entity: ContentEntity): UnitId[] {
  switch (entity.kind) {
    case "problem":
      return [`problems:${entity.value.row.pattern || "other"}`];
    case "lesson":
      return [`course:${entity.value.row.courseId}`];
    case "course":
      return [`course:${entity.value.row.id}`];
    case "doc":
      return ["docs"];
  }
}

/** Units touched by a change: the units of the old and the new version, so a move notifies both sides. */
export function unitsForChange(before: ContentEntity | null, after: ContentEntity | null): UnitId[] {
  const all = [...(before ? unitsFor(before) : []), ...(after ? unitsFor(after) : [])];
  return [...new Set(all)];
}
