import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAG } from "@habit/shared";
import { getContentDb } from "../content-db/client";
import { getContentEpoch, getContentVersion, getSchemaVersion } from "../content-db/meta";

export type ContentVersion = { version: number; schema: number; epoch: number };

/**
 * The content version (every write adds one), the shape version and the content epoch (plan 0115 rule 6: a full
 * resync raises it). Expired by every content change made through the app. `pnpm content:resync` and other owner
 * commands write the database from outside Next and cannot expire this tag, so the entry also lives at most a minute:
 * a resync reaches every client within about a minute plus the 30 s HTTP max-age. One tiny read per minute.
 */
export async function getContentVersionCached(): Promise<ContentVersion> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.contentVersion);
  cacheLife({ stale: 30, revalidate: 60, expire: 120 });
  const db = await getContentDb();
  return {
    version: await getContentVersion(db),
    schema: await getSchemaVersion(db),
    epoch: await getContentEpoch(db),
  };
}
