import "server-only";
import {
  CONTENT_SCHEMA_VERSION,
  packItems,
  packProblemSpec,
  problemFromSpec,
  validatePack,
  type ContentEntity,
  type ContentSnapshot,
  type EntityKind,
  type ProblemSpec,
} from "@habit/shared";
import { bumpContentEpoch } from "../content-sync/resync";
import type { ContentDb, ContentTx } from "./client";
import { adminAudit } from "./schema";
import { putAsset, upsertCourse, upsertDoc, upsertLesson, upsertProblem, type WriteResult } from "./write";

/** The actor written to `changes.actor` by an import (plan 0117 step 3). */
export const IMPORT_ACTOR = "import";
/** The actor written to `admin_audit.actor_id` by an import: the owner's CLI, no signed-in admin (plan 0117 step 3). */
export const IMPORT_AUDIT_ACTOR = "owner";
/** Entities per transaction. */
const BATCH = 50;

export interface ImportOptions {
  /** Epoch ms for the audit rows and the epoch bump. Defaults to now. */
  now?: number;
}

export interface ImportReport {
  entities: number;
  changed: number;
  unchanged: number;
  changedByKind: Record<EntityKind, number>;
  assets: number;
  epoch: { from: number; to: number };
}

/**
 * Writes every entity of a snapshot into the content database through the write helpers (actor "import"). Each entity
 * whose rev changes gets one `admin_audit` row (action "import", actor "owner"); an unchanged entity writes nothing and
 * gets no row. Images are stored first. Entities are upserted only: nothing missing from the snapshot is removed.
 *
 * The content epoch is raised by one at the end, once per call (bumpContentEpoch), even when nothing changed. So a
 * repeated import of the same snapshot changes no entity but still moves the epoch by one.
 */
export async function importSnapshot(db: ContentDb, snapshot: ContentSnapshot, opts: ImportOptions = {}): Promise<ImportReport> {
  if (snapshot.schema > CONTENT_SCHEMA_VERSION) {
    throw new Error(`snapshot schema ${snapshot.schema} is newer than this app (${CONTENT_SCHEMA_VERSION})`);
  }
  const now = opts.now ?? Date.now();

  if (snapshot.assets.length > 0) {
    await db.transaction(async (tx) => {
      for (const a of snapshot.assets) {
        const dims = a.width !== null && a.height !== null ? { width: a.width, height: a.height } : undefined;
        await putAsset(tx, new Uint8Array(Buffer.from(a.base64, "base64")), a.mime, IMPORT_ACTOR, dims);
      }
    });
  }

  const report: ImportReport = {
    entities: snapshot.entities.length,
    changed: 0,
    unchanged: 0,
    changedByKind: { course: 0, lesson: 0, problem: 0, doc: 0 },
    assets: snapshot.assets.length,
    epoch: { from: 0, to: 0 },
  };

  for (let i = 0; i < snapshot.entities.length; i += BATCH) {
    const slice = snapshot.entities.slice(i, i + BATCH);
    const results: { kind: EntityKind; id: string; result: WriteResult }[] = [];
    await db.transaction(async (tx) => {
      for (const e of slice) {
        const id = entityId(e);
        const result = await upsertEntity(tx, e);
        results.push({ kind: e.kind, id, result });
        if (result.changed) {
          await tx.insert(adminAudit).values({
            at: now,
            actorId: IMPORT_AUDIT_ACTOR,
            actorName: IMPORT_AUDIT_ACTOR,
            action: "import",
            entity: e.kind,
            entityId: id,
            beforeJson: null,
            afterJson: JSON.stringify({ rev: result.rev, version: result.version }),
            requestId: null,
          });
        }
      }
    });
    for (const r of results) {
      if (r.result.changed) {
        report.changed++;
        report.changedByKind[r.kind]++;
      } else {
        report.unchanged++;
      }
    }
  }

  const bumped = await bumpContentEpoch(db, now);
  report.epoch = bumped;
  return report;
}

/** The id stored in the change and the audit row: the doc's `kind:id`, otherwise the plain id. */
function entityId(e: ContentEntity): string {
  return e.kind === "doc" ? `${e.value.row.kind}:${e.value.row.id}` : e.value.row.id;
}

function upsertEntity(tx: ContentTx, e: ContentEntity): Promise<WriteResult> {
  switch (e.kind) {
    case "course":
      return upsertCourse(tx, e.value, IMPORT_ACTOR);
    case "lesson":
      return upsertLesson(tx, e.value, IMPORT_ACTOR);
    case "problem":
      return upsertProblem(tx, e.value, IMPORT_ACTOR);
    case "doc":
      return upsertDoc(tx, e.value, IMPORT_ACTOR);
  }
}

export interface PackSnapshot {
  snapshot: ContentSnapshot;
  /** Things in the pack that are not imported (lessons and patches for now). */
  warnings: string[];
}

/**
 * A content pack (docs/content-packs.md) as a snapshot of problems. Throws with the pack's errors when it is not valid.
 * Lessons and patches are not converted yet: they are listed in `warnings` and left out.
 */
export function packToSnapshot(input: unknown): PackSnapshot {
  const checked = validatePack(input);
  if (!checked.ok) throw new Error(`invalid pack: ${checked.errors.join("; ")}`);
  const { pack } = checked;
  const warnings = [...checked.warnings];
  const entities: ContentEntity[] = [];

  for (const item of packItems(pack)) {
    if (item.type === "problem") {
      const spec = {
        ...packProblemSpec(item, pack.id),
        ...(item.difficulty ? { difficulty: item.difficulty } : {}),
        ...(item.patterns?.[0] ? { pattern: item.patterns[0] } : {}),
      } as ProblemSpec;
      entities.push({ kind: "problem", value: problemFromSpec(spec, {}) });
    } else {
      warnings.push(`${item.type} "${item.id}" is not imported: pack lessons and patches are not converted yet`);
    }
  }

  return {
    snapshot: { schema: CONTENT_SCHEMA_VERSION, version: 0, entities, assets: [] },
    warnings,
  };
}

/** Imports a content pack (JSON value) as problems. Same rules as `importSnapshot`. */
export async function importPack(db: ContentDb, packJson: unknown, opts: ImportOptions = {}): Promise<ImportReport & { warnings: string[] }> {
  const { snapshot, warnings } = packToSnapshot(packJson);
  const report = await importSnapshot(db, snapshot, opts);
  return { ...report, warnings };
}
