import "server-only";
import { eq, isNull, or } from "drizzle-orm";
import { patchEntity, revOf, TAG, tagsFor, type AssetRow, type ChangeEntry, type ContentEntity, type EntityKind, type UnitId } from "@habit/shared";
import type { ContentDb, ContentTx } from "../content-db/client";
import { setMeta, setSyncedEpoch } from "../content-db/meta";
import { courses, docs, lessons, problems } from "../content-db/schema";
import { markDeletedRows, purgeEntity, putAsset, storeEntity } from "../content-db/write";
import { loadCurrent } from "./serve";

/** One downloaded unit page, with the unit it belongs to (the server page does not carry it). */
export type UnitPage = { unit: UnitId; entities: ContentEntity[]; assets: AssetRow[] };

/** One changes page as the server sends it (see serve.ts buildChanges). */
export type ChangePage = { from: number; to: number; schema: number; changes: ChangeEntry[]; next?: number };

export type Mismatch = { entity: EntityKind; id: string; units: UnitId[] };

export type ApplyChangesResult = {
  /** Entries that were written (or were deletes). */
  applied: ChangeEntry[];
  /** Entries whose patched rev did not match: the caller downloads those units again. */
  mismatches: Mismatch[];
  /** Cache tags to expire for every entity written or removed. */
  tags: string[];
  /** True when content_version moved to the page's `to`. */
  versionAdvanced: boolean;
};

type Tx = ContentDb | ContentTx;

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/**
 * Cache tags of one entity (tags.ts). `id` is the change id: `kind:id` for a doc, the plain id otherwise. `courseIds`
 * lists every course a lesson has been in, so a lesson moved between courses expires both.
 */
function tagsOf(entity: EntityKind, id: string, courseIds: string[] = []): string[] {
  switch (entity) {
    case "problem":
      return tagsFor("problem", id);
    case "lesson":
      return uniq(courseIds).flatMap((courseId) => tagsFor("lesson", id, { courseId }));
    case "course":
      return tagsFor("course", id);
    case "doc": {
      const sep = id.indexOf(":");
      return tagsFor("doc", id.slice(sep + 1), { kind: id.slice(0, sep) });
    }
  }
}

/** The course ids a stored lesson row has (raw row, so a soft-deleted lesson still counts). */
async function storedCourseIds(tx: Tx, id: string): Promise<string[]> {
  const rows = await tx.select({ courseId: lessons.courseId }).from(lessons).where(eq(lessons.id, id));
  return rows.map((r) => r.courseId);
}

/** Stores image bytes once per id (plan 0115: an image is sent once, by its asset part or a unit page). */
async function storeAssets(tx: ContentTx, list: (AssetRow | null | undefined)[]): Promise<void> {
  for (const a of list) {
    if (!a || typeof a.base64 !== "string") continue;
    const dims = a.width !== null && a.height !== null ? { width: a.width, height: a.height } : undefined;
    await putAsset(tx, new Uint8Array(Buffer.from(a.base64, "base64")), a.mime, "sync", dims);
  }
}

/** The change id of an entity: docs are `kind:id`, everything else its id. */
function changeIdOf(e: ContentEntity): string {
  return e.kind === "doc" ? `${e.value.row.kind}:${e.value.row.id}` : e.value.row.id;
}

/** Removes every local entity of one unit (children included). Returns the tags of what was removed. */
async function purgeUnit(tx: ContentTx, unit: UnitId): Promise<string[]> {
  const tags: string[] = [];
  if (unit === "docs") {
    const rows = await tx.select({ kind: docs.kind, id: docs.id }).from(docs);
    for (const r of rows) {
      await purgeEntity(tx, "doc", `${r.kind}:${r.id}`);
      tags.push(...tagsOf("doc", `${r.kind}:${r.id}`));
    }
  } else if (unit.startsWith("course:")) {
    const courseId = unit.slice("course:".length);
    const lessonRows = await tx.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, courseId));
    for (const r of lessonRows) {
      await purgeEntity(tx, "lesson", r.id);
      tags.push(...tagsOf("lesson", r.id, [courseId]));
    }
    await purgeEntity(tx, "course", courseId);
    tags.push(...tagsOf("course", courseId));
  } else if (unit.startsWith("problems:")) {
    const pattern = unit.slice("problems:".length);
    const where = pattern === "other" ? or(isNull(problems.pattern), eq(problems.pattern, "")) : eq(problems.pattern, pattern);
    const rows = await tx.select({ id: problems.id }).from(problems).where(where);
    for (const r of rows) {
      await purgeEntity(tx, "problem", r.id);
      tags.push(...tagsOf("problem", r.id));
    }
  }
  return tags;
}

/** Removes every entity of the copy (a full resync of the whole content). Returns the tags of what was removed. */
async function purgeEverything(tx: ContentTx): Promise<string[]> {
  const tags: string[] = [];
  for (const r of await tx.select({ id: problems.id }).from(problems)) {
    await purgeEntity(tx, "problem", r.id);
    tags.push(...tagsOf("problem", r.id));
  }
  for (const r of await tx.select({ id: lessons.id, courseId: lessons.courseId }).from(lessons)) {
    await purgeEntity(tx, "lesson", r.id);
    tags.push(...tagsOf("lesson", r.id, [r.courseId]));
  }
  for (const r of await tx.select({ id: courses.id }).from(courses)) {
    await purgeEntity(tx, "course", r.id);
    tags.push(...tagsOf("course", r.id));
  }
  for (const r of await tx.select({ kind: docs.kind, id: docs.id }).from(docs)) {
    await purgeEntity(tx, "doc", `${r.kind}:${r.id}`);
    tags.push(...tagsOf("doc", `${r.kind}:${r.id}`));
  }
  return tags;
}

/**
 * Replaces every local entity of the given units with the pages (plan 0115 step 4), in one transaction. All units are
 * emptied first, then the pages are stored, so an entity that moved between two downloaded units ends in the new one.
 * `purgeAll` empties the whole copy first instead (a full resync of every unit, plan 0115 rule 6).
 * Writes no `changes` row. When `version` is given, content_version moves to it; when `epoch` is given, this copy's
 * synced_epoch becomes it. Both happen in the same transaction.
 */
export async function applyUnits(
  db: ContentDb,
  pages: UnitPage[],
  opts: { version?: number; epoch?: number; purgeAll?: boolean } = {},
): Promise<{ count: number; tags: string[] }> {
  let count = 0;
  const tags: string[] = [];
  await db.transaction(async (tx) => {
    if (opts.purgeAll) tags.push(...(await purgeEverything(tx)));
    else for (const unit of uniq(pages.map((p) => p.unit))) tags.push(...(await purgeUnit(tx, unit)));
    const now = Date.now();
    for (const page of pages) {
      await storeAssets(tx, page.assets);
      for (const e of page.entities) {
        await storeEntity(tx, e, revOf(e.value), now);
        count++;
        const id = changeIdOf(e);
        tags.push(...tagsOf(e.kind, id, e.kind === "lesson" ? [e.value.row.courseId] : []));
      }
    }
    if (opts.version !== undefined) await setMeta(tx, "content_version", String(opts.version));
    if (opts.epoch !== undefined) await setSyncedEpoch(tx, opts.epoch);
  });
  return { count, tags: uniq([...tags, TAG.content]) };
}

/**
 * Applies one changes page in one transaction (plan 0115 step 4). Each entry: a delete is a soft delete; an upsert
 * patches only its listed parts on the local copy (or takes `all`), and the patched rev must equal the entry's rev.
 * A mismatch is not written and is returned for a unit download. No `changes` rows are written.
 * content_version moves to `page.to` only when there is no mismatch and `opts.setVersion` is not false.
 */
export async function applyChanges(db: ContentDb, page: ChangePage, opts: { setVersion?: boolean } = {}): Promise<ApplyChangesResult> {
  const applied: ChangeEntry[] = [];
  const mismatches: Mismatch[] = [];
  const tags: string[] = [];

  await db.transaction(async (tx) => {
    const now = Date.now();
    for (const entry of page.changes) {
      const id = entry.id;
      const courseIds = entry.entity === "lesson" ? await storedCourseIds(tx, id) : [];

      if (entry.op === "delete") {
        await markDeletedRows(tx, entry.entity, id, entry.rev, now);
        applied.push(entry);
        tags.push(...tagsOf(entry.entity, id, courseIds));
        continue;
      }

      const data = entry.data ?? {};
      const listsAll = entry.parts.includes("all") && data.all !== undefined;
      const base = listsAll ? null : await loadCurrent(tx, entry.entity, id);
      if (!listsAll && !base) {
        mismatches.push({ entity: entry.entity, id, units: entry.units });
        continue;
      }
      const patched = listsAll ? (data.all as ContentEntity) : patchEntity(base as ContentEntity, entry.parts, data);
      if (!patched || revOf(patched.value) !== entry.rev) {
        mismatches.push({ entity: entry.entity, id, units: entry.units });
        continue;
      }

      await storeAssets(
        tx,
        entry.parts.filter((p) => p.startsWith("asset:")).map((p) => data[p] as AssetRow | null),
      );
      await storeEntity(tx, patched, entry.rev, now);
      applied.push(entry);
      const lessonCourses = patched.kind === "lesson" ? [...courseIds, patched.value.row.courseId] : courseIds;
      tags.push(...tagsOf(entry.entity, id, lessonCourses));
    }

    if (mismatches.length === 0 && opts.setVersion !== false) {
      await setMeta(tx, "content_version", String(page.to));
    }
  });

  return {
    applied,
    mismatches,
    tags: uniq(tags),
    versionAdvanced: mismatches.length === 0 && opts.setVersion !== false,
  };
}
