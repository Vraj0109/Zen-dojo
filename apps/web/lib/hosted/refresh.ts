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
  after(async () => {
    try {
      const { getSession } = await import("../auth/session");
      const userId = (await getSession())?.userId;
      if (!userId) return;
      const { syncAfterMutation } = await import("./sync");
      await syncAfterMutation(userId);
    } catch {
      // best effort; the next request syncs again
    }
  });
}
