import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { tagsFor, type EntityKind } from "@habit/shared";

/** One saved entity, as the 0112 write helpers report it. `courseId` for lessons, `kind` for docs. */
export type ContentChange = { entity: EntityKind; id: string; courseId?: string; kind?: string };

/** The unique cache tags for a list of changes (tagsFor per change). Throws when a lesson or doc lacks its extra field. */
export function contentTagsFor(changes: ContentChange[]): string[] {
  const tags = new Set<string>();
  for (const c of changes) {
    for (const t of tagsFor(c.entity, c.id, { courseId: c.courseId, kind: c.kind })) tags.add(t);
  }
  return [...tags];
}

/**
 * After a content write made by a server action: the next read sees the change at once (read-your-own-writes).
 * Only server actions may call updateTag.
 */
export function expireContentTagsInAction(changes: ContentChange[]): string[] {
  const tags = contentTagsFor(changes);
  for (const t of tags) updateTag(t);
  return tags;
}

/**
 * After a content write made outside a server action (route handler, sync job, desktop update): expire at once with
 * { expire: 0 }, so no stale copy is served.
 */
export function expireContentTagsInRoute(changes: ContentChange[]): string[] {
  const tags = contentTagsFor(changes);
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return tags;
}
