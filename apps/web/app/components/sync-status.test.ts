import { describe, expect, it } from "vitest";
import { shownStatus } from "./sync-status";

describe("shownStatus", () => {
  it("shows only syncing while a manual sync is pending, whatever the status", () => {
    for (const s of ["synced", "idle", "offline", "error", "syncing"] as const) {
      expect(shownStatus(s, true)).toBe("syncing");
    }
  });
  it("passes the status through when nothing is pending", () => {
    for (const s of ["idle", "synced", "offline", "error", "syncing", "signed-out"] as const) {
      expect(shownStatus(s, false)).toBe(s);
    }
  });
});
