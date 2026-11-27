import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { isAdminProof, type AdminProof } from "../auth/admin-proof";
import type { ContentDb, ContentTx } from "./client";
import { adminAudit } from "./schema";

export type AuditAction = "create" | "update" | "delete" | "restore" | "import" | "resync";

export type AuditInput = {
  action: AuditAction;
  /** "problem", "lesson", "course", "doc", or "content_item" (the user-database items of plan 0030). */
  entity: string;
  entityId: string;
  /** Full entity JSON before the change; null for create. */
  before: unknown;
  /** Full entity JSON after the change; null for delete. */
  after: unknown;
  requestId: string | null;
};

export type AuditRow = {
  id: number;
  at: number;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  requestId: string | null;
};

/**
 * Writes one audit row. Call it with the same transaction as the change, so a change never exists without its row.
 * The proof must come from an admin check; a value that is not an AdminProof throws.
 */
export async function writeAudit(tx: ContentTx, proof: AdminProof, input: AuditInput): Promise<void> {
  if (!isAdminProof(proof)) throw new Error("writeAudit needs an AdminProof from a passed admin check");
  await tx.insert(adminAudit).values({
    at: Date.now(),
    actorId: proof.userId,
    actorName: proof.name,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    beforeJson: input.before === null || input.before === undefined ? null : JSON.stringify(input.before),
    afterJson: input.after === null || input.after === undefined ? null : JSON.stringify(input.after),
    requestId: input.requestId,
  });
}

/** Newest first. `before` is a row id: only rows with a smaller id are returned (the cursor for the next page). */
export async function listAudit(
  db: ContentDb,
  q: { entity?: string; entityId?: string; actorId?: string; limit: number; before?: number },
): Promise<AuditRow[]> {
  const limit = Math.min(Math.max(1, Math.floor(q.limit)), 200);
  const where = and(
    q.entity === undefined ? undefined : eq(adminAudit.entity, q.entity),
    q.entityId === undefined ? undefined : eq(adminAudit.entityId, q.entityId),
    q.actorId === undefined ? undefined : eq(adminAudit.actorId, q.actorId),
    q.before === undefined ? undefined : lt(adminAudit.id, q.before),
  );
  const rows = await db.select().from(adminAudit).where(where).orderBy(desc(adminAudit.id)).limit(limit);
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    actorId: r.actorId,
    actorName: r.actorName,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    before: r.beforeJson === null ? null : JSON.parse(r.beforeJson),
    after: r.afterJson === null ? null : JSON.parse(r.afterJson),
    requestId: r.requestId,
  }));
}
