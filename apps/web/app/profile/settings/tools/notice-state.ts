import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/schema";

/** Device-specific (tools differ per computer), so this key is on the sync denylist in lib/sync-triggers.ts. */
export const TOOLS_NOTICE_KEY = "tools_notice_dismissed";

export async function isToolsNoticeDismissed(): Promise<boolean> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(settings.key, TOOLS_NOTICE_KEY) });
  return row?.value === "1";
}

export async function dismissToolsNotice(): Promise<void> {
  const db = await getDb();
  await db.insert(settings).values({ key: TOOLS_NOTICE_KEY, value: "1" }).onConflictDoUpdate({ target: settings.key, set: { value: "1" } });
}
