import "server-only";
import { desc, eq } from "drizzle-orm";
import { ALL_CONCEPTS, ALL_EXERCISES, READING, readingFor, toLocalDate, type Reading } from "@habit/shared";
import { getDb } from "./db";
import { readingCustom, readingProgress } from "./schema";

// Reading list progress (built-in entries and your own links).

export const READING_LIMITS = { title: 200, url: 500 } as const;

export interface ReadingView extends Omit<Reading, "items" | "kind" | "by" | "why"> {
  kind: Reading["kind"] | "custom";
  by: string;
  why: string;
  items: string[];
  done: boolean;
  doneOn: string | null;
  /** Custom entries can be deleted */
  customId?: number;
}

const isStudyItem = (id: string) => id in ALL_CONCEPTS || id in ALL_EXERCISES;
export const customReadingId = (id: number) => `custom-${id}`;

async function progressMap() {
  const db = await getDb();
  return new Map((await db.select().from(readingProgress)).map((p) => [p.readingId, p]));
}

function withProgress(list: Reading[], progress: Awaited<ReturnType<typeof progressMap>>): ReadingView[] {
  return list.map((x) => ({ ...x, done: !!progress.get(x.id)?.doneOn, doneOn: progress.get(x.id)?.doneOn ?? null }));
}

async function customFor(itemId?: string): Promise<ReadingView[]> {
  const db = await getDb();
  const rows = itemId
    ? await db.select().from(readingCustom).where(eq(readingCustom.itemId, itemId)).orderBy(desc(readingCustom.id))
    : await db.select().from(readingCustom).orderBy(desc(readingCustom.id));
  const progress = await progressMap();
  return rows.map((c) => ({
    id: customReadingId(c.id),
    customId: c.id,
    title: c.title,
    url: c.url,
    kind: "custom" as const,
    by: "Added by you",
    why: "",
    items: [c.itemId],
    done: !!progress.get(customReadingId(c.id))?.doneOn,
    doneOn: progress.get(customReadingId(c.id))?.doneOn ?? null,
  }));
}

/** Built-in and custom readings for one concept or design. */
export async function getReadingFor(itemId: string): Promise<ReadingView[]> {
  const [progress, custom] = await Promise.all([progressMap(), customFor(itemId)]);
  return [...withProgress(readingFor(itemId), progress), ...custom];
}

/** The whole list, for the reading page. */
export async function getReadingList(): Promise<ReadingView[]> {
  const [progress, custom] = await Promise.all([progressMap(), customFor()]);
  return [...withProgress(READING, progress), ...custom];
}

async function knownReadingId(id: string): Promise<boolean> {
  if (READING.some((x) => x.id === id)) return true;
  const m = /^custom-(\d+)$/.exec(id);
  if (!m) return false;
  const db = await getDb();
  return !!(await db.query.readingCustom.findFirst({ where: eq(readingCustom.id, Number(m[1])) }));
}

export async function setReadingDone(readingId: string, done: boolean) {
  if (!(await knownReadingId(readingId))) return;
  const db = await getDb();
  const doneOn = done ? toLocalDate() : null;
  await db.insert(readingProgress).values({ readingId, doneOn }).onConflictDoUpdate({ target: readingProgress.readingId, set: { doneOn } });
}

export async function addCustomReading(itemId: string, title: string, url: string): Promise<boolean> {
  const u = url.trim();
  if (!isStudyItem(itemId) || !/^https?:\/\/\S+$/i.test(u) || u.length > READING_LIMITS.url) return false;
  const t = title.trim().slice(0, READING_LIMITS.title) || u;
  const db = await getDb();
  await db.insert(readingCustom).values({ itemId, title: t, url: u, addedOn: toLocalDate() });
  return true;
}

export async function deleteCustomReading(id: number) {
  const db = await getDb();
  await db.delete(readingCustom).where(eq(readingCustom.id, id));
  await db.delete(readingProgress).where(eq(readingProgress.readingId, customReadingId(id)));
}
