import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { settings } from "./schema";

// Interface preferences kept in the settings table.

const SIMPLE_KEY = "simple_mode";

/** Simple mode hides power tools (boss fight, cheat sheets, diagrams, reading list, stuck history). On unless switched off. */
export async function getSimpleMode(): Promise<boolean> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, SIMPLE_KEY) });
  return row?.value !== "off";
}

export async function setSimpleMode(on: boolean): Promise<void> {
  const db = await getDb();
  const value = on ? "on" : "off";
  await db.insert(settings).values({ key: SIMPLE_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
