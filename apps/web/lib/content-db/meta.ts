import "server-only";
import { eq } from "drizzle-orm";
import type { ContentDb, ContentTx } from "./client";
import { contentMeta } from "./schema";

type Queryable = ContentDb | ContentTx;

/** Reads one `content_meta` value, or null. */
export async function getMeta(db: Queryable, key: string): Promise<string | null> {
  const [row] = await db.select({ v: contentMeta.v }).from(contentMeta).where(eq(contentMeta.k, key));
  return row ? row.v : null;
}

/** Writes one `content_meta` value (insert or replace). */
export async function setMeta(tx: ContentTx, key: string, value: string): Promise<void> {
  await tx
    .insert(contentMeta)
    .values({ k: key, v: value })
    .onConflictDoUpdate({ target: contentMeta.k, set: { v: value } });
}

/** The highest change version so far (`content_meta.content_version`). Clients compare it to know what to fetch. */
export async function getContentVersion(db: Queryable): Promise<number> {
  return Number((await getMeta(db, "content_version")) ?? 0);
}

/** The shape version of the content (`content_meta.schema_version`), see CONTENT_SCHEMA_VERSION. */
export async function getSchemaVersion(db: Queryable): Promise<number> {
  return Number((await getMeta(db, "schema_version")) ?? 0);
}

/** The content epoch (`content_meta.content_epoch`, plan 0115 rule 6). Starts at 1; a full resync raises it. */
export async function getContentEpoch(db: Queryable): Promise<number> {
  return Number((await getMeta(db, "content_epoch")) ?? 1);
}

/** Sets the content epoch on the hosted or local source database (resync and import only). */
export async function setContentEpoch(tx: ContentTx, epoch: number): Promise<void> {
  await setMeta(tx, "content_epoch", String(epoch));
}

/**
 * The epoch of this copy's last full download (`content_meta.synced_epoch`, client side). Null when the copy never had
 * one, for example a database created by hand; the sync then treats it as "unknown" and downloads everything.
 */
export async function getSyncedEpoch(db: Queryable): Promise<number | null> {
  const v = await getMeta(db, "synced_epoch");
  return v === null ? null : Number(v);
}

/** Stores the epoch of the full download this copy holds (client side). */
export async function setSyncedEpoch(tx: ContentTx, epoch: number): Promise<void> {
  await setMeta(tx, "synced_epoch", String(epoch));
}
