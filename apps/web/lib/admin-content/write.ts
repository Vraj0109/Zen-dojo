import "server-only";
import { eq } from "drizzle-orm";
import {
  DOC_KINDS,
  type ContentEntity,
  pageTemplate,
  revOf,
  type ContentDoc,
  validatePageAgainstTemplate,
  validateProblemDraft,
  verifyEntity,
  type ContentLesson,
  type ContentPage,
  type ContentProblem,
  type ProblemDraft,
} from "@habit/shared";
import type { AdminProof } from "../auth/admin-proof";
import { fetchWithAccessToken } from "../auth/session";
import { getContentDb, getContentWriteDb } from "../content-db/client";
import { getContentVersion } from "../content-db/meta";
import { loadDoc, loadLesson, loadProblem } from "../content-db/load";
import { writeAudit } from "../content-db/audit";
import { pruneChanges, softDelete, upsertDoc, upsertLesson, upsertProblem } from "../content-db/write";
import { adminAudit } from "../content-db/schema";
import { contentOrigin } from "../content-sync/origin";
import { syncContent } from "../content-sync/sync";
import { contentTagsFor, expireContentTagsInAction } from "../content-repo/invalidate";

export type WriteResult<T = unknown> =
  | { ok: true; rev: string; version: number; tags: string[]; changed?: boolean; warnings?: string[] }
  | { ok: false; conflict: true; current: T | null; errors?: never }
  | { ok: false; errors: string[]; conflict?: false };

export function isDesktop(): boolean {
  return process.env.HABIT_DESKTOP === "1" && process.env.HABIT_HOSTED !== "1";
}

/** "What changed" and "Tell learners" from the save footer (plan 0119 step 1). */
export type SaveNote = { note?: string | null; notify?: boolean };

/** Trims the note; a notice needs a note of 1 to 140 characters. Returns an error message or the clean values. */
export function cleanSaveNote(extra: SaveNote = {}): { note: string | null; notify: boolean } | { error: string } {
  const note = typeof extra.note === "string" ? extra.note.trim() : "";
  const notify = extra.notify === true;
  if (note.length > 140) return { error: "Keep \"What changed\" to 140 characters." };
  if (notify && !note) return { error: "Say in one line what changed, for example: Added a Java solution." };
  return { note: note || null, notify };
}

/**
 * Runs the content checks (content-model/verify.ts) on one draft (plan 0117 step 2). "error" issues are things that
 * break a page or the judge and block the save; "warning" issues are completeness goals, returned with the result.
 * Today's content has zero errors (apps/web/lib/content-db/verify-seed.test.ts), so a block here is a real problem.
 */
function checkDraft(entity: ContentEntity): { errors: string[]; warnings: string[] } {
  const issues = verifyEntity(entity);
  return {
    errors: issues.filter((i) => i.level === "error").map((i) => i.message),
    warnings: issues.filter((i) => i.level !== "error").map((i) => i.message),
  };
}

export async function saveProblem(
  proof: AdminProof,
  draft: ProblemDraft,
  baseRev: string | null = null,
  extra: SaveNote = {},
): Promise<WriteResult<ContentProblem>> {
  const saveNote = cleanSaveNote(extra);
  if ("error" in saveNote) return { ok: false, errors: [saveNote.error] };
  const check = checkDraft({ kind: "problem", value: draft });
  if (check.errors.length > 0) return { ok: false, errors: check.errors };
  if (isDesktop()) {
    const origin = contentOrigin();
    const url = `${origin}/api/admin/content/problems/${encodeURIComponent(draft.row.id)}`;
    let res: Response;
    try {
      res = await fetchWithAccessToken(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, baseRev, note: saveNote.note, notify: saveNote.notify }),
      });
    } catch (e) {
      return { ok: false, errors: [(e as Error).message || "Network request failed."] };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, errors: ["Not allowed."] };
    }
    if (res.status === 409) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, conflict: true, current: json.current ?? null };
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, errors: json.errors ?? [json.error ?? `Save failed with status ${res.status}`] };
    }

    const json = (await res.json()) as { ok: true; rev: string; version: number };
    const db = await getContentDb();
    await syncContent({ db, fetch, origin, units: "all", now: Date.now() }).catch(() => {});
    const tags = expireContentTagsInAction([{ entity: "problem", id: draft.row.id }]);
    return { ok: true, rev: json.rev, version: json.version, tags, changed: true, warnings: check.warnings };
  }

  // Hosted mode
  const draftVal = validateProblemDraft(draft);
  const errors = [...(draftVal.ok ? [] : draftVal.errors)];
  const tmpl = pageTemplate("problem");
  if (tmpl) {
    const combined: ContentPage = {
      template: "problem",
      sections: [...(draft.statement?.sections ?? []), ...(draft.solution?.sections ?? [])],
    };
    errors.push(...validatePageAgainstTemplate(tmpl, combined));
  }
  if (errors.length > 0) return { ok: false, errors };

  const db = await getContentWriteDb(proof);
  const current = await loadProblem(db, draft.row.id);
  if (current) {
    const currentRev = revOf(current);
    if (baseRev !== null && baseRev !== currentRev) {
      return { ok: false, conflict: true, current };
    }
    if (currentRev === revOf(draft)) {
      const version = await getContentVersion(db);
      const tags = contentTagsFor([{ entity: "problem", id: draft.row.id }]);
      return { ok: true, rev: currentRev, version, changed: false, tags, warnings: check.warnings };
    }
  } else if (baseRev !== null) {
    return { ok: false, conflict: true, current: null };
  }

  let finalRev = "";
  let finalVersion = 0;
  await db.transaction(async (tx) => {
    const res = await upsertProblem(tx, draft, proof.userId, undefined, { note: saveNote.note, notify: saveNote.notify });
    finalRev = res.changed ? res.rev : revOf(draft);
    finalVersion = res.changed ? res.version : (await getContentVersion(tx));
    await writeAudit(tx, proof, {
      action: current ? "update" : "create",
      entity: "problem",
      entityId: draft.row.id,
      before: current,
      after: draft,
      requestId: null,
    });
  });

  await pruneChanges(db, Date.now()).catch(() => 0); // the write is committed; the next write prunes again
  const tags = contentTagsFor([{ entity: "problem", id: draft.row.id }]);
  return { ok: true, rev: finalRev, version: finalVersion, tags, changed: true, warnings: check.warnings };
}

export async function deleteProblem(
  proof: AdminProof,
  id: string,
  baseRev: string | null = null,
): Promise<WriteResult<ContentProblem>> {
  if (isDesktop()) {
    const origin = contentOrigin();
    const url = `${origin}/api/admin/content/problems/${encodeURIComponent(id)}`;
    let res: Response;
    try {
      res = await fetchWithAccessToken(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseRev }),
      });
    } catch (e) {
      return { ok: false, errors: [(e as Error).message || "Network request failed."] };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, errors: ["Not allowed."] };
    }
    if (res.status === 409) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, conflict: true, current: json.current ?? null };
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, errors: json.errors ?? [json.error ?? `Delete failed with status ${res.status}`] };
    }

    const json = (await res.json()) as { ok: true; rev: string; version: number };
    const db = await getContentDb();
    await syncContent({ db, fetch, origin, units: "all", now: Date.now() }).catch(() => {});
    const tags = expireContentTagsInAction([{ entity: "problem", id }]);
    return { ok: true, rev: json.rev, version: json.version, tags, changed: true };
  }

  const db = await getContentWriteDb(proof);
  const current = await loadProblem(db, id);
  if (!current) {
    return { ok: false, errors: ["Problem not found."] };
  }

  const currentRev = revOf(current);
  if (baseRev !== null && baseRev !== currentRev) {
    return { ok: false, conflict: true, current };
  }

  let finalRev = "";
  let finalVersion = 0;
  await db.transaction(async (tx) => {
    const res = await softDelete(tx, "problem", id, proof.userId);
    finalRev = res.changed ? res.rev : "";
    finalVersion = res.changed ? res.version : (await getContentVersion(tx));
    await writeAudit(tx, proof, {
      action: "delete",
      entity: "problem",
      entityId: id,
      before: current,
      after: null,
      requestId: null,
    });
  });

  await pruneChanges(db, Date.now()).catch(() => 0); // the write is committed; the next write prunes again
  const tags = contentTagsFor([{ entity: "problem", id }]);
  return { ok: true, rev: finalRev, version: finalVersion, tags, changed: true };
}

export async function saveLesson(
  proof: AdminProof,
  draft: ContentLesson,
  baseRev: string | null = null,
  extra: SaveNote = {},
): Promise<WriteResult<ContentLesson>> {
  const saveNote = cleanSaveNote(extra);
  if ("error" in saveNote) return { ok: false, errors: [saveNote.error] };
  const check = checkDraft({ kind: "lesson", value: draft });
  if (check.errors.length > 0) return { ok: false, errors: check.errors };
  if (isDesktop()) {
    const origin = contentOrigin();
    const url = `${origin}/api/admin/content/lessons/${encodeURIComponent(draft.row.id)}`;
    let res: Response;
    try {
      res = await fetchWithAccessToken(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, baseRev, note: saveNote.note, notify: saveNote.notify }),
      });
    } catch (e) {
      return { ok: false, errors: [(e as Error).message || "Network request failed."] };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, errors: ["Not allowed."] };
    }
    if (res.status === 409) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, conflict: true, current: json.current ?? null };
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, errors: json.errors ?? [json.error ?? `Save failed with status ${res.status}`] };
    }

    const json = (await res.json()) as { ok: true; rev: string; version: number };
    const db = await getContentDb();
    await syncContent({ db, fetch, origin, units: "all", now: Date.now() }).catch(() => {});
    const tags = expireContentTagsInAction([{ entity: "lesson", id: draft.row.id, courseId: draft.row.courseId }]);
    return { ok: true, rev: json.rev, version: json.version, tags, changed: true, warnings: check.warnings };
  }

  const errors: string[] = [];
  if (!draft.row?.id) errors.push("Lesson id is required.");
  if (!draft.row?.title) errors.push("Lesson title is required.");
  if (!draft.row?.courseId) errors.push("Lesson courseId is required.");
  const tmpl = draft.row?.template ? pageTemplate(draft.row.template) : undefined;
  if (!tmpl) {
    errors.push(`Unknown lesson template: "${draft.row?.template}"`);
  } else if (draft.page) {
    errors.push(...validatePageAgainstTemplate(tmpl, draft.page));
  }
  if (errors.length > 0) return { ok: false, errors };

  const db = await getContentWriteDb(proof);
  const current = await loadLesson(db, draft.row.id);
  if (current) {
    const currentRev = revOf(current);
    if (baseRev !== null && baseRev !== currentRev) {
      return { ok: false, conflict: true, current };
    }
    if (currentRev === revOf(draft)) {
      const version = await getContentVersion(db);
      const tags = contentTagsFor([{ entity: "lesson", id: draft.row.id, courseId: draft.row.courseId }]);
      return { ok: true, rev: currentRev, version, changed: false, tags, warnings: check.warnings };
    }
  } else if (baseRev !== null) {
    return { ok: false, conflict: true, current: null };
  }

  let finalRev = "";
  let finalVersion = 0;
  await db.transaction(async (tx) => {
    const res = await upsertLesson(tx, draft, proof.userId, undefined, { note: saveNote.note, notify: saveNote.notify });
    finalRev = res.changed ? res.rev : revOf(draft);
    finalVersion = res.changed ? res.version : (await getContentVersion(tx));
    await writeAudit(tx, proof, {
      action: current ? "update" : "create",
      entity: "lesson",
      entityId: draft.row.id,
      before: current,
      after: draft,
      requestId: null,
    });
  });

  await pruneChanges(db, Date.now()).catch(() => 0); // the write is committed; the next write prunes again
  const tags = contentTagsFor([{ entity: "lesson", id: draft.row.id, courseId: draft.row.courseId }]);
  return { ok: true, rev: finalRev, version: finalVersion, tags, changed: true, warnings: check.warnings };
}

export async function deleteLesson(
  proof: AdminProof,
  id: string,
  baseRev: string | null = null,
): Promise<WriteResult<ContentLesson>> {
  if (isDesktop()) {
    const origin = contentOrigin();
    const url = `${origin}/api/admin/content/lessons/${encodeURIComponent(id)}`;
    let res: Response;
    try {
      res = await fetchWithAccessToken(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseRev }),
      });
    } catch (e) {
      return { ok: false, errors: [(e as Error).message || "Network request failed."] };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, errors: ["Not allowed."] };
    }
    if (res.status === 409) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, conflict: true, current: json.current ?? null };
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, errors: json.errors ?? [json.error ?? `Delete failed with status ${res.status}`] };
    }

    const json = (await res.json()) as { ok: true; rev: string; version: number };
    const db = await getContentDb();
    await syncContent({ db, fetch, origin, units: "all", now: Date.now() }).catch(() => {});
    const tags = expireContentTagsInAction([{ entity: "lesson", id }]);
    return { ok: true, rev: json.rev, version: json.version, tags, changed: true };
  }

  const db = await getContentWriteDb(proof);
  const current = await loadLesson(db, id);
  if (!current) {
    return { ok: false, errors: ["Lesson not found."] };
  }

  const currentRev = revOf(current);
  if (baseRev !== null && baseRev !== currentRev) {
    return { ok: false, conflict: true, current };
  }

  let finalRev = "";
  let finalVersion = 0;
  await db.transaction(async (tx) => {
    const res = await softDelete(tx, "lesson", id, proof.userId);
    finalRev = res.changed ? res.rev : "";
    finalVersion = res.changed ? res.version : (await getContentVersion(tx));
    await writeAudit(tx, proof, {
      action: "delete",
      entity: "lesson",
      entityId: id,
      before: current,
      after: null,
      requestId: null,
    });
  });

  await pruneChanges(db, Date.now()).catch(() => 0); // the write is committed; the next write prunes again
  const tags = contentTagsFor([{ entity: "lesson", id, courseId: current.row.courseId }]);
  return { ok: true, rev: finalRev, version: finalVersion, tags, changed: true };
}

export async function restoreFromAudit(
  proof: AdminProof,
  auditId: number,
): Promise<WriteResult<unknown>> {
  if (isDesktop()) {
    const origin = contentOrigin();
    const url = `${origin}/api/admin/audit`;
    let res: Response;
    try {
      res = await fetchWithAccessToken(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      });
    } catch (e) {
      return { ok: false, errors: [(e as Error).message || "Network request failed."] };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, errors: ["Not allowed."] };
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, errors: json.errors ?? [json.error ?? `Restore failed with status ${res.status}`] };
    }

    const json = (await res.json()) as { ok: true; rev: string; version: number; tags?: string[] };
    const db = await getContentDb();
    await syncContent({ db, fetch, origin, units: "all", now: Date.now() }).catch(() => {});
    return { ok: true, rev: json.rev, version: json.version, tags: json.tags ?? [], changed: true };
  }

  const db = await getContentWriteDb(proof);
  const [row] = await db.select().from(adminAudit).where(eq(adminAudit.id, auditId));
  if (!row || !row.afterJson) {
    return { ok: false, errors: ["Audit record not found or has no content to restore."] };
  }

  const restored = JSON.parse(row.afterJson);
  let finalRev = "";
  let finalVersion = 0;
  let tags: string[] = [];

  if (row.entity === "problem") {
    const current = await loadProblem(db, row.entityId);
    await db.transaction(async (tx) => {
      const res = await upsertProblem(tx, restored as ContentProblem, proof.userId);
      finalRev = res.changed ? res.rev : revOf(restored);
      finalVersion = res.changed ? res.version : (await getContentVersion(tx));
      await writeAudit(tx, proof, {
        action: "restore",
        entity: "problem",
        entityId: row.entityId,
        before: current,
        after: restored,
        requestId: null,
      });
    });
    tags = contentTagsFor([{ entity: "problem", id: row.entityId }]);
  } else if (row.entity === "lesson") {
    const current = await loadLesson(db, row.entityId);
    await db.transaction(async (tx) => {
      const res = await upsertLesson(tx, restored as ContentLesson, proof.userId);
      finalRev = res.changed ? res.rev : revOf(restored);
      finalVersion = res.changed ? res.version : (await getContentVersion(tx));
      await writeAudit(tx, proof, {
        action: "restore",
        entity: "lesson",
        entityId: row.entityId,
        before: current,
        after: restored,
        requestId: null,
      });
    });
    tags = contentTagsFor([{ entity: "lesson", id: row.entityId, courseId: (restored as ContentLesson).row?.courseId }]);
  } else {
    return { ok: false, errors: [`Restoring entity type "${row.entity}" is not supported.`] };
  }

  await pruneChanges(db, Date.now()).catch(() => 0); // the write is committed; the next write prunes again
  return { ok: true, rev: finalRev, version: finalVersion, tags, changed: true };
}

/**
 * Saves one doc (list content such as the reading list or the quiz deck). Same rules as saveLesson: desktop forwards to
 * the hosted admin API, the hosted site checks baseRev, writes with an audit row in one transaction, then prunes.
 */
export async function saveDoc(
  proof: AdminProof,
  draft: ContentDoc,
  baseRev: string | null = null,
  extra: SaveNote = {},
): Promise<WriteResult<ContentDoc>> {
  const saveNote = cleanSaveNote(extra);
  if ("error" in saveNote) return { ok: false, errors: [saveNote.error] };
  const { kind, id } = draft.row ?? ({} as ContentDoc["row"]);
  const errors: string[] = [];
  if (!kind || !Object.hasOwn(DOC_KINDS, kind)) errors.push(`Unknown doc kind: "${kind}".`);
  if (!id) errors.push("Doc id is required.");
  if (draft.row?.body === undefined) errors.push("The doc body is empty.");
  if (errors.length > 0) return { ok: false, errors };
  const check = checkDraft({ kind: "doc", value: draft });
  if (check.errors.length > 0) return { ok: false, errors: check.errors };

  if (isDesktop()) {
    const origin = contentOrigin();
    const url = `${origin}/api/admin/content/docs/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`;
    let res: Response;
    try {
      res = await fetchWithAccessToken(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, baseRev, note: saveNote.note, notify: saveNote.notify }),
      });
    } catch (e) {
      return { ok: false, errors: [(e as Error).message || "Network request failed."] };
    }
    if (res.status === 401 || res.status === 403) return { ok: false, errors: ["Not allowed."] };
    if (res.status === 409) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, conflict: true, current: json.current ?? null };
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, errors: json.errors ?? [json.error ?? `Save failed with status ${res.status}`] };
    }
    const json = (await res.json()) as { ok: true; rev: string; version: number };
    const db = await getContentDb();
    await syncContent({ db, fetch, origin, units: "all", now: Date.now() }).catch(() => {});
    const tags = expireContentTagsInAction([{ entity: "doc", id, kind }]);
    return { ok: true, rev: json.rev, version: json.version, tags, changed: true, warnings: check.warnings };
  }

  const db = await getContentWriteDb(proof);
  const current = await loadDoc(db, kind, id);
  if (current) {
    const currentRev = revOf(current);
    if (baseRev !== null && baseRev !== currentRev) return { ok: false, conflict: true, current };
    if (currentRev === revOf(draft)) {
      return { ok: true, rev: currentRev, version: await getContentVersion(db), changed: false, tags: contentTagsFor([{ entity: "doc", id, kind }]), warnings: check.warnings };
    }
  } else if (baseRev !== null) {
    return { ok: false, conflict: true, current: null };
  }

  let finalRev = "";
  let finalVersion = 0;
  await db.transaction(async (tx) => {
    const res = await upsertDoc(tx, draft, proof.userId, undefined, { note: saveNote.note, notify: saveNote.notify });
    finalRev = res.changed ? res.rev : revOf(draft);
    finalVersion = res.changed ? res.version : await getContentVersion(tx);
    await writeAudit(tx, proof, {
      action: current ? "update" : "create",
      entity: "doc",
      entityId: `${kind}:${id}`,
      before: current,
      after: draft,
      requestId: null,
    });
  });
  await pruneChanges(db, Date.now()).catch(() => 0);
  return { ok: true, rev: finalRev, version: finalVersion, tags: contentTagsFor([{ entity: "doc", id, kind }]), changed: true, warnings: check.warnings };
}
