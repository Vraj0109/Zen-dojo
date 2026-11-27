import "server-only";
import { eq } from "drizzle-orm";
import { getContentDb } from "../content-db/client";
import { assets } from "../content-db/schema";

export type AssetFile = { id: string; mime: string; bytes: Uint8Array<ArrayBuffer> };

/**
 * One stored image, or null. Not cached in memory: an asset is at most 1 MB and its id is its SHA-256, so browsers and
 * the CDN keep it for a year (immutable). That is the cache that matters.
 */
export async function getAssetFile(id: string): Promise<AssetFile | null> {
  const [row] = await (await getContentDb()).select().from(assets).where(eq(assets.id, id));
  if (!row) return null;
  return { id: row.id, mime: row.mime, bytes: new Uint8Array(row.bytes) };
}
