import { refresh as nextRefresh } from "next/cache";
import { after } from "next/server";
import { isHosted } from "../hosted";

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
