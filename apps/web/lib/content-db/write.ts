import "server-only";
import { and, desc, eq, lt, lte, sql } from "drizzle-orm";
import {
  diffParts,
  revOf,
  sha256Hex,
  unitsForChange,
  type AssetRow,
  type ContentCourse,
  type ContentDoc,
  type ContentEntity,
  type ContentLesson,
  type ContentProblem,
  type EntityKind,
  type PartId,
  type SectionRow,
  type UnitId,
} from "@habit/shared";
import type { ContentDb, ContentTx } from "./client";
import { loadCourse, loadDoc, loadLesson, loadProblem } from "./load";
import { setMeta } from "./meta";
import { assets, blockCode, blocks, changes, courses, docs, hints, lessons, pageSections, problems, testCases } from "./schema";

/** `changed: false` when the stored rev already equals the new one: nothing was written, no `changes` row. */
export type WriteResult = { changed: false } | { changed: true; version: number; rev: string };

export type WriteExtra = {
  /** Shown in the update notice (plan 0119). */
  note?: string | null;
  notify?: boolean;
  /** Extra units to list on the change, besides the old and new units of the entity. */
  units?: UnitId[];
};

export type AssetMime = AssetRow["mime"];

const ASSET_MAX_BYTES = 1024 * 1024;
const ASSET_MIMES: AssetMime[] = ["image/png", "image/jpeg", "image/webp"];
const ROW_CHUNK = 40;

/** Changes kept no matter how old (plan 0115 versioning rule 3): the newest rows. */
export const CHANGE_KEEP_ROWS = 5000;
/** Changes younger than this are always kept (90 days). */
export const CHANGE_KEEP_MS = 90 * 24 * 60 * 60 * 1000;

// Units of a stored row, read from the raw row (the row may be soft-deleted, so the loaders would return null).
// Same rules as units.ts `unitsFor`.
function unitsForProblemRow(pattern: string | null): UnitId[] {
  return [`problems:${pattern || "other"}`];
}
function unitsForLessonRow(courseId: string): UnitId[] {
  return [`course:${courseId}`];
}
function unitsForCourseRow(id: string): UnitId[] {
  return [`course:${id}`];
}
function unitsForDocRow(): UnitId[] {
  return ["docs"];
}
function unionUnits(...lists: UnitId[][]): UnitId[] {
  return [...new Set(lists.flat())];
}

function chunks<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function checkParts(parts: PartId[]): void {
  if (parts.length === 0) throw new Error("a change needs at least one part");
}

function checkSections(sections: SectionRow[], slot: string, owner: string): void {
  for (const s of sections) {
    if (s.slot !== slot) throw new Error(`${owner}: section ${s.id} has slot "${s.slot}" but is in the "${slot}" page`);
  }
}

/** Shape rules that would otherwise write a page that does not round-trip. Throws on the first problem. */
export function checkEntityShape(entity: ContentEntity): void {
  switch (entity.kind) {
    case "problem": {
      const p = entity.value;
      const id = p.row.id;
      if (p.statement.template !== "problem" || p.solution.template !== "problem") {
        throw new Error(`problem ${id}: both pages must use the "problem" template`);
      }
      checkSections(p.statement.sections, "statement", `problem ${id}`);
      checkSections(p.solution.sections, "solution", `problem ${id}`);
      return;
    }
    case "lesson": {
      const l = entity.value;
      if (l.page.template !== l.row.template) {
        throw new Error(`lesson ${l.row.id}: page template "${l.page.template}" differs from the row's "${l.row.template}"`);
      }
      return;
    }
    default:
      return;
  }
}

/**
 * The parts and units for one change. Explicit `parts` win; otherwise `diffParts(before, after)` (an empty diff
 * falls back to "all"). Units are the stored row's units (so a soft-deleted row keeps its old unit) plus the units of
 * both versions plus the caller's extra units.
 */
function planChange(
  before: ContentEntity | null,
  after: ContentEntity | null,
  parts: PartId[] | undefined,
  extra: WriteExtra,
  storedUnits: UnitId[],
): { parts: PartId[]; units: UnitId[] } {
  const chosen = parts ?? (diffParts(before, after).length > 0 ? diffParts(before, after) : ["all"]);
  checkParts(chosen);
  return { parts: chosen, units: unionUnits(storedUnits, unitsForChange(before, after), extra.units ?? []) };
}

/** Appends one `changes` row and moves `content_version` and `updated_at` to it. Returns the new version. */
async function recordChange(
  tx: ContentTx,
  c: { entity: EntityKind; entityId: string; op: "upsert" | "delete"; actor: string; parts: PartId[]; units: UnitId[]; rev: string; extra: WriteExtra; now: number },
): Promise<number> {
  checkParts(c.parts);
  const [row] = await tx
    .insert(changes)
    .values({
      entity: c.entity,
      entityId: c.entityId,
      op: c.op,
      at: c.now,
      actor: c.actor,
      partsJson: JSON.stringify(c.parts),
      unitsJson: JSON.stringify(c.units),
      rev: c.rev,
      note: c.extra.note ?? null,
      notify: c.extra.notify ? 1 : 0,
    })
    .returning({ version: changes.version });
  await setMeta(tx, "content_version", String(row.version));
  await setMeta(tx, "updated_at", String(c.now));
  return row.version;
}

/** Removes a section's children (blocks, code) and the sections of one owner. */
async function deleteSections(tx: ContentTx, ownerKind: string, ownerId: string): Promise<void> {
  await tx.run(
    sql`DELETE FROM block_code WHERE block_id IN (SELECT b.id FROM blocks b JOIN page_sections s ON s.id = b.section_id WHERE s.owner_kind = ${ownerKind} AND s.owner_id = ${ownerId})`,
  );
  await tx.run(
    sql`DELETE FROM blocks WHERE section_id IN (SELECT id FROM page_sections WHERE owner_kind = ${ownerKind} AND owner_id = ${ownerId})`,
  );
  await tx.run(sql`DELETE FROM page_sections WHERE owner_kind = ${ownerKind} AND owner_id = ${ownerId}`);
}

/** Inserts sections with their blocks and code. `ord` values are stored as given. */
async function insertSections(tx: ContentTx, ownerKind: string, ownerId: string, sections: SectionRow[]): Promise<void> {
  const sectionRows: (typeof pageSections.$inferInsert)[] = [];
  const blockRows: (typeof blocks.$inferInsert)[] = [];
  const codeRows: (typeof blockCode.$inferInsert)[] = [];
  for (const s of sections) {
    sectionRows.push({ id: s.id, ownerKind, ownerId, slot: s.slot, ord: s.ord, title: s.title });
    for (const b of s.blocks) {
      blockRows.push({
        id: b.id,
        sectionId: s.id,
        ord: b.ord,
        type: b.type,
        body: b.body,
        caption: b.caption,
        variant: b.variant,
        label: b.label,
        timeComplexity: b.timeComplexity,
        spaceComplexity: b.spaceComplexity,
        assetId: b.assetId,
      });
      let i = 0;
      for (const [lang, code] of Object.entries(b.code)) {
        if (code === undefined) continue;
        codeRows.push({ blockId: b.id, lang, ord: i++, code });
      }
    }
  }
  for (const c of chunks(sectionRows, ROW_CHUNK)) await tx.insert(pageSections).values(c);
  for (const c of chunks(blockRows, ROW_CHUNK)) await tx.insert(blocks).values(c);
  for (const c of chunks(codeRows, ROW_CHUNK)) await tx.insert(blockCode).values(c);
}

/**
 * Writes a problem's rows (row, test cases, hints, pages) with the given rev. No `changes` row and no audit row: this
 * is the storage step shared by the admin write helpers and the offline sync (plan 0115 step 4).
 */
export async function storeProblemRows(tx: ContentTx, p: ContentProblem, rev: string, now: number): Promise<void> {
  const id = p.row.id;
  const row = p.row;
  const values: typeof problems.$inferInsert = {
    id,
    source: row.source,
    title: row.title,
    difficulty: row.difficulty,
    pattern: row.pattern,
    url: row.url,
    kind: row.kind,
    constraintsJson: JSON.stringify(row.constraints),
    inputFormatMd: row.inputFormatMd,
    outputFormatMd: row.outputFormatMd,
    fnJson: JSON.stringify(row.fn),
    designJson: row.design === null ? null : JSON.stringify(row.design),
    unordered: row.unordered ? 1 : 0,
    complexity: row.complexity,
    extraJson: JSON.stringify(row.extra),
    rev,
    updatedAt: now,
    deleted: 0,
  };
  await tx.insert(problems).values(values).onConflictDoUpdate({ target: problems.id, set: values });
  await tx.delete(testCases).where(eq(testCases.problemId, id));
  await tx.delete(hints).where(eq(hints.problemId, id));
  await deleteSections(tx, "problem", id);

  const caseRows = p.cases.map((c) => ({
    problemId: id,
    ord: c.ord,
    role: c.role,
    inputJson: JSON.stringify(c.input),
    outputJson: JSON.stringify(c.output ?? null),
    explanationMd: c.explanationMd,
  }));
  for (const c of chunks(caseRows, ROW_CHUNK)) await tx.insert(testCases).values(c);
  const hintRows = p.hints.map((h) => ({ problemId: id, ord: h.ord, bodyMd: h.bodyMd }));
  for (const c of chunks(hintRows, ROW_CHUNK)) await tx.insert(hints).values(c);
  await insertSections(tx, "problem", id, [...p.statement.sections, ...p.solution.sections]);
}

/** Writes a lesson's rows (row and page) with the given rev. No change row, no audit row. */
export async function storeLessonRows(tx: ContentTx, l: ContentLesson, rev: string, now: number): Promise<void> {
  const id = l.row.id;
  const values: typeof lessons.$inferInsert = {
    id,
    courseId: l.row.courseId,
    ord: l.row.ord,
    title: l.row.title,
    template: l.row.template,
    metaJson: JSON.stringify(l.row.meta),
    rev,
    updatedAt: now,
    deleted: 0,
  };
  await tx.insert(lessons).values(values).onConflictDoUpdate({ target: lessons.id, set: values });
  await deleteSections(tx, "lesson", id);
  await insertSections(tx, "lesson", id, l.page.sections);
}

/** Writes a course row with the given rev. No change row, no audit row. */
export async function storeCourseRows(tx: ContentTx, c: ContentCourse, rev: string, now: number): Promise<void> {
  const values: typeof courses.$inferInsert = {
    id: c.row.id,
    area: c.row.area,
    title: c.row.title,
    summaryMd: c.row.summaryMd,
    ord: c.row.ord,
    dataJson: JSON.stringify(c.row.data),
    rev,
    updatedAt: now,
    deleted: 0,
  };
  await tx.insert(courses).values(values).onConflictDoUpdate({ target: courses.id, set: values });
}

/** Writes a doc row with the given rev. No change row, no audit row. */
export async function storeDocRows(tx: ContentTx, d: ContentDoc, rev: string, now: number): Promise<void> {
  const { kind, id } = d.row;
  const values: typeof docs.$inferInsert = { kind, id, bodyJson: JSON.stringify(d.row.body), rev, updatedAt: now, deleted: 0 };
  await tx.insert(docs).values(values).onConflictDoUpdate({ target: [docs.kind, docs.id], set: values });
}

/**
 * Writes any entity's rows with the given rev (no change row, no audit row). Doc ids are `kind:id`. Checks the shape first.
 */
export async function storeEntity(tx: ContentTx, entity: ContentEntity, rev: string, now: number = Date.now()): Promise<void> {
  checkEntityShape(entity);
  switch (entity.kind) {
    case "problem":
      return storeProblemRows(tx, entity.value, rev, now);
    case "lesson":
      return storeLessonRows(tx, entity.value, rev, now);
    case "course":
      return storeCourseRows(tx, entity.value, rev, now);
    case "doc":
      return storeDocRows(tx, entity.value, rev, now);
  }
}

/**
 * Marks an entity's rows deleted with the given rev (no change row, no audit row). Returns false when the row is missing
 * or already deleted. For a doc, `id` is `kind:id`.
 */
export async function markDeletedRows(tx: ContentTx, entity: EntityKind, id: string, rev: string, now: number): Promise<boolean> {
  if (entity === "problem") {
    const [s] = await tx.select({ deleted: problems.deleted }).from(problems).where(eq(problems.id, id));
    if (!s || s.deleted) return false;
    await tx.update(problems).set({ deleted: 1, rev, updatedAt: now }).where(eq(problems.id, id));
  } else if (entity === "lesson") {
    const [s] = await tx.select({ deleted: lessons.deleted }).from(lessons).where(eq(lessons.id, id));
    if (!s || s.deleted) return false;
    await tx.update(lessons).set({ deleted: 1, rev, updatedAt: now }).where(eq(lessons.id, id));
  } else if (entity === "course") {
    const [s] = await tx.select({ deleted: courses.deleted }).from(courses).where(eq(courses.id, id));
    if (!s || s.deleted) return false;
    await tx.update(courses).set({ deleted: 1, rev, updatedAt: now }).where(eq(courses.id, id));
  } else {
    const { kind, docId } = splitDocId(id);
    const [s] = await tx.select({ deleted: docs.deleted }).from(docs).where(and(eq(docs.kind, kind), eq(docs.id, docId)));
    if (!s || s.deleted) return false;
    await tx.update(docs).set({ deleted: 1, rev, updatedAt: now }).where(and(eq(docs.kind, kind), eq(docs.id, docId)));
  }
  return true;
}

/**
 * Removes an entity's rows completely, children included (no change row). Used by the offline sync when a unit is
 * replaced (plan 0115 step 4). For a doc, `id` is `kind:id`.
 */
export async function purgeEntity(tx: ContentTx, entity: EntityKind, id: string): Promise<void> {
  if (entity === "problem") {
    await tx.delete(testCases).where(eq(testCases.problemId, id));
    await tx.delete(hints).where(eq(hints.problemId, id));
    await deleteSections(tx, "problem", id);
    await tx.delete(problems).where(eq(problems.id, id));
  } else if (entity === "lesson") {
    await deleteSections(tx, "lesson", id);
    await tx.delete(lessons).where(eq(lessons.id, id));
  } else if (entity === "course") {
    await tx.delete(courses).where(eq(courses.id, id));
  } else {
    const { kind, docId } = splitDocId(id);
    await tx.delete(docs).where(and(eq(docs.kind, kind), eq(docs.id, docId)));
  }
}

function splitDocId(id: string): { kind: string; docId: string } {
  const sep = id.indexOf(":");
  if (sep < 0) throw new Error(`doc id must be "kind:id", got "${id}"`);
  return { kind: id.slice(0, sep), docId: id.slice(sep + 1) };
}

/**
 * Writes a problem (row, test cases, hints, statement and solution pages) if its rev changed. `parts` says what changed
 * (plan 0115). When it is not passed, the parts are `diffParts(before, after)` and the units come from both versions.
 * The caller owns the transaction.
 */
export async function upsertProblem(tx: ContentTx, p: ContentProblem, actor: string, parts?: PartId[], extra: WriteExtra = {}): Promise<WriteResult> {
  const id = p.row.id;
  checkEntityShape({ kind: "problem", value: p });

  const rev = revOf(p);
  const [stored] = await tx.select({ rev: problems.rev, pattern: problems.pattern }).from(problems).where(eq(problems.id, id));
  if (stored && stored.rev === rev) return { changed: false };

  const before = await loadProblem(tx, id);
  const plan = planChange(
    before ? { kind: "problem", value: before } : null,
    { kind: "problem", value: p },
    parts,
    extra,
    stored ? unitsForProblemRow(stored.pattern) : [],
  );

  const now = Date.now();
  await storeProblemRows(tx, p, rev, now);
  const version = await recordChange(tx, { entity: "problem", entityId: id, op: "upsert", actor, parts: plan.parts, units: plan.units, rev, extra, now });
  return { changed: true, version, rev };
}

/** Writes a lesson (row and its page) if its rev changed. Parts and units as for `upsertProblem`. */
export async function upsertLesson(tx: ContentTx, l: ContentLesson, actor: string, parts?: PartId[], extra: WriteExtra = {}): Promise<WriteResult> {
  const id = l.row.id;
  checkEntityShape({ kind: "lesson", value: l });

  const rev = revOf(l);
  const [stored] = await tx.select({ rev: lessons.rev, courseId: lessons.courseId }).from(lessons).where(eq(lessons.id, id));
  if (stored && stored.rev === rev) return { changed: false };

  const before = await loadLesson(tx, id);
  const plan = planChange(
    before ? { kind: "lesson", value: before } : null,
    { kind: "lesson", value: l },
    parts,
    extra,
    stored ? unitsForLessonRow(stored.courseId) : [],
  );

  const now = Date.now();
  await storeLessonRows(tx, l, rev, now);
  const version = await recordChange(tx, { entity: "lesson", entityId: id, op: "upsert", actor, parts: plan.parts, units: plan.units, rev, extra, now });
  return { changed: true, version, rev };
}

/** Writes a course row if its rev changed. Parts and units as for `upsertProblem`. */
export async function upsertCourse(tx: ContentTx, c: ContentCourse, actor: string, parts?: PartId[], extra: WriteExtra = {}): Promise<WriteResult> {
  const id = c.row.id;
  const rev = revOf(c);
  const [stored] = await tx.select({ rev: courses.rev }).from(courses).where(eq(courses.id, id));
  if (stored && stored.rev === rev) return { changed: false };

  const before = await loadCourse(tx, id);
  const plan = planChange(before ? { kind: "course", value: before } : null, { kind: "course", value: c }, parts, extra, unitsForCourseRow(id));

  const now = Date.now();
  await storeCourseRows(tx, c, rev, now);
  const version = await recordChange(tx, { entity: "course", entityId: id, op: "upsert", actor, parts: plan.parts, units: plan.units, rev, extra, now });
  return { changed: true, version, rev };
}

/** Writes a doc (list-like data, plan 0112 `docs`) if its rev changed. The change's entity id is `kind:id`. */
export async function upsertDoc(tx: ContentTx, d: ContentDoc, actor: string, parts?: PartId[], extra: WriteExtra = {}): Promise<WriteResult> {
  const { kind, id } = d.row;
  const entityId = `${kind}:${id}`;
  const rev = revOf(d);
  const [stored] = await tx.select({ rev: docs.rev }).from(docs).where(and(eq(docs.kind, kind), eq(docs.id, id)));
  if (stored && stored.rev === rev) return { changed: false };

  const before = await loadDoc(tx, kind, id);
  const plan = planChange(before ? { kind: "doc", value: before } : null, { kind: "doc", value: d }, parts, extra, unitsForDocRow());

  const now = Date.now();
  await storeDocRows(tx, d, rev, now);
  const version = await recordChange(tx, { entity: "doc", entityId, op: "upsert", actor, parts: plan.parts, units: plan.units, rev, extra, now });
  return { changed: true, version, rev };
}

/**
 * Soft-deletes an entity: sets `deleted = 1`, keeps its rows (so a restore is a normal upsert) and writes an `op: "delete"`
 * change. For a doc, `id` is `kind:id`. Returns `changed: false` when the entity is missing or already deleted.
 */
export async function softDelete(tx: ContentTx, entity: EntityKind, id: string, actor: string, extra: WriteExtra = {}): Promise<WriteResult> {
  const now = Date.now();
  let units: UnitId[];

  if (entity === "problem") {
    const [s] = await tx.select({ deleted: problems.deleted, pattern: problems.pattern }).from(problems).where(eq(problems.id, id));
    if (!s || s.deleted) return { changed: false };
    units = unitsForProblemRow(s.pattern);
  } else if (entity === "lesson") {
    const [s] = await tx.select({ deleted: lessons.deleted, courseId: lessons.courseId }).from(lessons).where(eq(lessons.id, id));
    if (!s || s.deleted) return { changed: false };
    units = unitsForLessonRow(s.courseId);
  } else if (entity === "course") {
    const [s] = await tx.select({ deleted: courses.deleted }).from(courses).where(eq(courses.id, id));
    if (!s || s.deleted) return { changed: false };
    units = unitsForCourseRow(id);
  } else {
    const { kind, docId } = splitDocId(id);
    const [s] = await tx.select({ deleted: docs.deleted }).from(docs).where(and(eq(docs.kind, kind), eq(docs.id, docId)));
    if (!s || s.deleted) return { changed: false };
    units = unitsForDocRow();
  }

  const rev = revOf({ entity, id, deleted: true });
  await markDeletedRows(tx, entity, id, rev, now);
  const version = await recordChange(tx, {
    entity,
    entityId: id,
    op: "delete",
    actor,
    parts: ["all"],
    units: unionUnits(units, extra.units ?? []),
    rev,
    extra,
    now,
  });
  return { changed: true, version, rev };
}

/**
 * Stores an image once, keyed by the SHA-256 of its bytes (same bytes → same row). Assets are not entities: they get no
 * `changes` row of their own; the change of the entity that uses them lists `asset:<id>`.
 */
export async function putAsset(
  tx: ContentTx,
  bytes: Uint8Array,
  mime: AssetMime,
  actor: string,
  dims?: { width: number; height: number },
): Promise<{ id: string; created: boolean }> {
  if (!ASSET_MIMES.includes(mime)) throw new Error(`image type ${mime} is not allowed (no SVG: use a Mermaid diagram)`);
  if (bytes.byteLength > ASSET_MAX_BYTES) throw new Error("image is larger than 1 MB");
  const id = sha256Hex(bytes);
  const [existing] = await tx.select({ id: assets.id }).from(assets).where(eq(assets.id, id));
  if (existing) return { id, created: false };
  await tx.insert(assets).values({
    id,
    mime,
    bytes: Buffer.from(bytes),
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    createdAt: Date.now(),
    createdBy: actor,
  });
  return { id, created: true };
}

/**
 * Deletes `changes` rows that are both older than 90 days and outside the newest 5,000 (plan 0115 versioning rule 3):
 * a row is kept when either rule keeps it. Returns the number of rows removed. Runs on the caller's connection or
 * transaction.
 */
export async function pruneChanges(db: ContentDb | ContentTx, now: number): Promise<number> {
  const [edge] = await db
    .select({ version: changes.version })
    .from(changes)
    .orderBy(desc(changes.version))
    .limit(1)
    .offset(CHANGE_KEEP_ROWS);
  if (!edge) return 0;
  const removed = await db
    .delete(changes)
    .where(and(lt(changes.at, now - CHANGE_KEEP_MS), lte(changes.version, edge.version)))
    .run();
  return removed.rowsAffected;
}
