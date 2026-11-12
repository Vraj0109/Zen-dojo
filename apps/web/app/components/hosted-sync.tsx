import { connection } from "next/server";
import { isHosted } from "@/lib/hosted";

/** Plan 0058: mount once in the root layout inside <Suspense>. Syncs the signed-in hosted user (throttled). */
export async function HostedSyncOnRequest() {
  if (!isHosted()) return null;
  await connection();
  const { getSession } = await import("@/lib/auth/session");
  const userId = (await getSession())?.userId;
  if (userId) {
    const { syncOnRequest } = await import("@/lib/hosted/sync");
    await syncOnRequest(userId);
  }
  return null;
}
