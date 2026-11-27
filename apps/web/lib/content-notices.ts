import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Notice } from "@habit/shared";
import { getDb } from "./db";
import { contentNotices, type ContentNoticeRow } from "./schema";

export const MAX_NOTICES_KEPT = 200;

type DbHandle = Awaited<ReturnType<typeof getDb>>;

/**
 * Records notices resulting from a sync into the local user database (plan 0119 step 3).
 * Keeps at most MAX_NOTICES_KEPT (200) newest rows.
 */
export async function recordNotices(notices: Notice[], dbInstance?: DbHandle): Promise<number> {
  if (notices.length === 0) return 0;
  const d = dbInstance ?? (await getDb());
  let count = 0;

  for (const n of notices) {
    let id = n.id;
    if (!id || id <= 0) {
      const maxRow = await d.select({ max: sql<number>`MAX(${contentNotices.id})` }).from(contentNotices);
      id = (maxRow[0]?.max ?? 0) + 1;
    }

    await d
      .insert(contentNotices)
      .values({
        id,
        unit: n.unit,
        unitTitle: n.unitTitle || "",
        entity: n.entity,
        entityId: n.entityId,
        sectionId: n.sectionId ?? null,
        title: n.title,
        note: n.note,
        at: n.at || Date.now(),
        readAt: null,
      })
      .onConflictDoUpdate({
        target: contentNotices.id,
        set: {
          unit: n.unit,
          unitTitle: n.unitTitle || "",
          entity: n.entity,
          entityId: n.entityId,
          sectionId: n.sectionId ?? null,
          title: n.title,
          note: n.note,
          at: n.at || Date.now(),
        },
      });
    count++;
  }

  // Cap at MAX_NOTICES_KEPT newest
  await d.$client.execute(`
    DELETE FROM content_notices
    WHERE id NOT IN (
      SELECT id FROM content_notices
      ORDER BY at DESC, id DESC
      LIMIT ${MAX_NOTICES_KEPT}
    )
  `);

  return count;
}

/** Lists notices, newest first. */
export async function listNotices(
  opts?: { limit?: number; unreadOnly?: boolean },
  dbInstance?: DbHandle,
): Promise<ContentNoticeRow[]> {
  const d = dbInstance ?? (await getDb());
  if (opts?.unreadOnly) {
    const q = d
      .select()
      .from(contentNotices)
      .where(isNull(contentNotices.readAt))
      .orderBy(desc(contentNotices.at), desc(contentNotices.id));
    if (opts.limit) return q.limit(opts.limit);
    return q;
  }
  const q = d
    .select()
    .from(contentNotices)
    .orderBy(desc(contentNotices.at), desc(contentNotices.id));
  if (opts?.limit) return q.limit(opts.limit);
  return q;
}

/** Lists only unread notices, newest first. */
export async function listUnreadNotices(dbInstance?: DbHandle): Promise<ContentNoticeRow[]> {
  return listNotices({ unreadOnly: true }, dbInstance);
}

/** Count of unread notices for the nav bell badge. */
export async function getUnreadNoticeCount(dbInstance?: DbHandle): Promise<number> {
  const d = dbInstance ?? (await getDb());
  const rows = await d
    .select({ count: sql<number>`count(*)` })
    .from(contentNotices)
    .where(isNull(contentNotices.readAt));
  return Number(rows[0]?.count ?? 0);
}

/** Marks one notice as read. */
export async function markNoticeRead(id: number, dbInstance?: DbHandle): Promise<void> {
  const d = dbInstance ?? (await getDb());
  await d
    .update(contentNotices)
    .set({ readAt: new Date().toISOString() })
    .where(eq(contentNotices.id, id));
}

/** Marks all unread notices as read. */
export async function markAllNoticesRead(dbInstance?: DbHandle): Promise<void> {
  const d = dbInstance ?? (await getDb());
  await d
    .update(contentNotices)
    .set({ readAt: new Date().toISOString() })
    .where(isNull(contentNotices.readAt));
}

/** Marks notices for an entity (and optional section) as read. */
export async function markNoticesForEntityRead(
  entity: string,
  entityId: string,
  sectionId?: string | null,
  dbInstance?: DbHandle,
): Promise<void> {
  const d = dbInstance ?? (await getDb());
  const conditions = [
    eq(contentNotices.entity, entity),
    eq(contentNotices.entityId, entityId),
    isNull(contentNotices.readAt),
  ];
  if (sectionId) {
    conditions.push(eq(contentNotices.sectionId, sectionId));
  }
  await d
    .update(contentNotices)
    .set({ readAt: new Date().toISOString() })
    .where(and(...conditions));
}

/** Returns recent (or unread) notices for an entity/section to display "Updated" pills. */
export async function getRecentNoticesForSection(
  entity: string,
  entityId: string,
  days = 7,
  dbInstance?: DbHandle,
): Promise<ContentNoticeRow[]> {
  const d = dbInstance ?? (await getDb());
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d
    .select()
    .from(contentNotices)
    .where(
      and(
        eq(contentNotices.entity, entity),
        eq(contentNotices.entityId, entityId),
        sql`(${contentNotices.at} >= ${cutoff} OR ${contentNotices.readAt} IS NULL)`,
      ),
    )
    .orderBy(desc(contentNotices.at));
}
