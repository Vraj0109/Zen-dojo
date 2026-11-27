"use server";

import { revalidatePath } from "next/cache";
import { getUnreadNoticeCount, markAllNoticesRead, markNoticeRead } from "@/lib/content-notices";

export async function getUnreadNoticeCountAction(): Promise<number> {
  try {
    return await getUnreadNoticeCount();
  } catch {
    return 0;
  }
}

export async function markAllReadAction(): Promise<void> {
  try {
    await markAllNoticesRead();
    revalidatePath("/whats-new");
  } catch {
    // best-effort
  }
}

export async function markOneReadAction(id: number): Promise<void> {
  try {
    await markNoticeRead(id);
    revalidatePath("/whats-new");
  } catch {
    // best-effort
  }
}
