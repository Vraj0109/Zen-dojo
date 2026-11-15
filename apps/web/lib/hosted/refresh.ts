import { refresh as nextRefresh } from "next/cache";
import { after } from "next/server";
import { isHosted } from "../hosted";

/** Whether this visitor has somewhere to keep settings: always on desktop, signed in on the hosted site. */
export async function hasAccountDb(): Promise<boolean> {
  if (!isHosted()) return true;
  try {
    const { getSession } = await import("../auth/session");
    return Boolean((await getSession())?.userId);
  } catch {
    return false;
  }
}

/** Plan 0075: on the hosted site, pull (throttled) before a settings read. No-op on desktop and for guests. */
export async function syncBeforeReadIfHosted(): Promise<void> {
  if (!isHosted()) return;
  try {
    const { getSession } = await import("../auth/session");
    const userId = (await getSession())?.userId;
    if (!userId) return;
    const { syncBeforeRead } = await import("./sync");
    const r = await syncBeforeRead(userId);
    if (r.state === "error") console.warn("settings read: sync before read failed");
  } catch {
    console.warn("settings read: sync before read failed");
  }
}

/**
 * Drop-in for `refresh()` in server actions. On the hosted site it also schedules a sync push after the response
 * (plan 0058 step 5). On desktop it is exactly `refresh()`.
 */
export function refresh(): void {
  nextRefresh();
  if (!isHosted()) return;
  // Read the session now, inside the request: cookies() cannot be called inside after().
  const sessionPromise = import("../auth/session").then((m) => m.getSession()).catch(() => null);
  after(async () => {
    try {
      const userId = (await sessionPromise)?.userId;
      if (!userId) return; // anonymous visitors have nothing to sync
      const { syncAfterMutation } = await import("./sync");
      await syncAfterMutation(userId);
    } catch {
      // best effort; the next request syncs again
    }
  });
}
