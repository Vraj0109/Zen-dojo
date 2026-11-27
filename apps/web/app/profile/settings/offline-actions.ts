"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/schema";
import { getContentDb } from "@/lib/content-db/client";
import { getContentVersion, getMeta } from "@/lib/content-db/meta";
import { syncContent, SYNC_META } from "@/lib/content-sync/sync";
import { contentOrigin } from "@/lib/content-sync/origin";
import { listUnits } from "@/lib/content-sync/serve";
import { getFollowMute } from "@/lib/content-follow";

const AUTO_UPDATE_KEY = "content_auto_update";
const NOTIFICATIONS_KEY = "content_system_notifications";

export async function getDesktopContentSettings() {
  const [userDb, contentDb] = await Promise.all([getDb(), getContentDb()]);

  // Follow/Mute live in one store (lib/content-follow.ts, plan 0119), the same one the desktop sync route reads.
  const [autoUpdateRow, notifsRow, prefs, units, version, checkedAt, status, lastError] =
    await Promise.all([
      userDb.query.settings.findFirst({ where: eq(settings.key, AUTO_UPDATE_KEY) }),
      userDb.query.settings.findFirst({ where: eq(settings.key, NOTIFICATIONS_KEY) }),
      getFollowMute(userDb),
      listUnits(contentDb).catch(() => []),
      getContentVersion(contentDb),
      getMeta(contentDb, SYNC_META.checkedAt),
      getMeta(contentDb, SYNC_META.status),
      getMeta(contentDb, SYNC_META.error),
    ]);

  return {
    version,
    checkedAt: checkedAt ? Number(checkedAt) : null,
    status: status || "up-to-date",
    lastError: lastError || null,
    autoUpdate: autoUpdateRow ? autoUpdateRow.value !== "0" : true,
    systemNotifications: notifsRow ? notifsRow.value !== "0" : true,
    followUnits: prefs.follow,
    muteUnits: prefs.mute,
    units,
    follow: prefs.follow,
    mute: prefs.mute,
  };
}

export async function checkForUpdatesDesktopAction(): Promise<{
  ok: boolean;
  message: string;
  applied?: number;
  version?: number;
}> {
  try {
    const db = await getContentDb();
    const result = await syncContent({
      db,
      fetch,
      origin: contentOrigin(),
      units: "all",
      now: Date.now(),
    });

    if (result.status === "app-too-old") {
      return { ok: false, message: "New content needs a newer app version." };
    }
    if (result.status === "offline") {
      return { ok: false, message: "Offline: could not connect to server." };
    }
    if (result.status === "error") {
      return { ok: false, message: result.error || "Update check failed." };
    }

    revalidatePath("/profile/settings");
    return {
      ok: true,
      message: result.applied > 0 ? `Updated ${result.applied} items.` : "You're up to date.",
      applied: result.applied,
      version: result.version,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function setAutoUpdateAction(enabled: boolean): Promise<void> {
  const db = await getDb();
  const value = enabled ? "1" : "0";
  await db
    .insert(settings)
    .values({ key: AUTO_UPDATE_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  revalidatePath("/profile/settings");
}

export async function setSystemNotificationsAction(enabled: boolean): Promise<void> {
  const db = await getDb();
  const value = enabled ? "1" : "0";
  await db
    .insert(settings)
    .values({ key: NOTIFICATIONS_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  revalidatePath("/profile/settings");
}

