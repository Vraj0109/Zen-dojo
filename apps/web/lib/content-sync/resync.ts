import "server-only";
import type { ContentDb } from "../content-db/client";
import { getContentEpoch, setContentEpoch } from "../content-db/meta";
import { adminAudit } from "../content-db/schema";

/** The actor written to admin_audit by the owner's CLI (no signed-in admin is involved). */
export const RESYNC_ACTOR = "owner";

export type ResyncResult = { from: number; to: number };

/**
 * Raises the content epoch by one (plan 0115 rule 6) and writes one admin_audit row, action "resync", in the same
 * transaction. Every copy then downloads its followed units again. Used by `pnpm content:resync` after a restore, a
 * re-seed or a repair made directly in the database.
 */
export async function bumpContentEpoch(db: ContentDb, now: number): Promise<ResyncResult> {
  return db.transaction(async (tx) => {
    const from = await getContentEpoch(tx);
    const to = from + 1;
    await setContentEpoch(tx, to);
    await tx.insert(adminAudit).values({
      at: now,
      actorId: RESYNC_ACTOR,
      actorName: RESYNC_ACTOR,
      action: "resync",
      entity: "content",
      entityId: "content_epoch",
      beforeJson: JSON.stringify({ epoch: from }),
      afterJson: JSON.stringify({ epoch: to }),
      requestId: null,
    });
    return { from, to };
  });
}
