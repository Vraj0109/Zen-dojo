import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { TAG, type ContentDoc, type DocRow } from "@habit/shared";
import { getContentDb } from "../content-db/client";
import { loadDoc } from "../content-db/load";
import { docs } from "../content-db/schema";

/** Every live doc of one kind (the whole body of each is included). */
export async function listDocs(kind: string): Promise<DocRow[]> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.docs(kind));
  cacheLife("max");
  const db = await getContentDb();
  const rows = await db
    .select()
    .from(docs)
    .where(and(eq(docs.kind, kind), eq(docs.deleted, 0)))
    .orderBy(asc(docs.id));
  return rows.map((r) => ({ kind: r.kind, id: r.id, body: JSON.parse(r.bodyJson) as unknown }));
}

/** One doc, or null when missing or soft-deleted. */
export async function getDoc(kind: string, id: string): Promise<ContentDoc | null> {
  "use cache: remote";
  cacheTag(TAG.content, TAG.doc(kind, id));
  cacheLife("max");
  return loadDoc(await getContentDb(), kind, id);
}
