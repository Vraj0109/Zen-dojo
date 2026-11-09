"use server";

import { revalidatePath } from "next/cache";
import {
  checkFeedUpdates,
  installFeedPack,
  resetLessonPatch,
  restoreLessonPatch,
  setFeedUrl,
  type FeedComparisonItem,
} from "@/lib/packs";

export async function saveFeedUrlAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const url = String(formData.get("url") ?? "").trim();
  await setFeedUrl(url);
  revalidatePath("/profile/settings");
  return { ok: true, message: url ? "Feed address saved." : "Feed address cleared." };
}

export type FeedCheckResult = { ok: true; items: FeedComparisonItem[] } | { ok: false; error: string };

export async function checkFeedUpdatesAction(feedUrl?: string): Promise<FeedCheckResult> {
  return await checkFeedUpdates(feedUrl || undefined);
}

export async function installFeedPackAction(entry: { url: string; sha256?: string }): Promise<{ ok: boolean; message: string }> {
  const r = await installFeedPack(entry);
  revalidatePath("/profile/settings");
  revalidatePath("/study");
  if (!r.ok) {
    return { ok: false, message: r.errors.join(" | ") };
  }
  return { ok: true, message: r.replaced ? "Pack updated successfully." : "Pack installed successfully." };
}

export async function resetPatchAction(formData: FormData): Promise<void> {
  const concept = String(formData.get("concept") ?? "");
  if (concept) {
    await resetLessonPatch(concept);
    revalidatePath("/profile/settings");
    revalidatePath("/study");
  }
}

export async function restorePatchAction(formData: FormData): Promise<void> {
  const concept = String(formData.get("concept") ?? "");
  if (concept) {
    await restoreLessonPatch(concept);
    revalidatePath("/profile/settings");
    revalidatePath("/study");
  }
}
