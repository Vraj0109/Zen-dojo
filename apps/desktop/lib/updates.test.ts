import { describe, expect, it } from "vitest";
import { backupName, backupsToPrune, isNewer, needsBackup } from "./updates.js";

describe("isNewer", () => {
  it("compares versions numerically, with or without a leading v", () => {
    expect(isNewer("v0.2.0", "0.1.0")).toBe(true);
    expect(isNewer("0.10.0", "0.9.9")).toBe(true);
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
    expect(isNewer("0.9.0", "0.10.0")).toBe(false);
    expect(isNewer("1.2", "1.2.0")).toBe(false);
  });

  it("orders prereleases before their release", () => {
    expect(isNewer("1.0.0", "1.0.0-beta.1")).toBe(true);
    expect(isNewer("1.0.0-beta.1", "1.0.0")).toBe(false);
    expect(isNewer("1.0.0-beta.2", "1.0.0-beta.1")).toBe(true);
  });
});

describe("pre-update backups", () => {
  it("backs up only when the version changed since the last run", () => {
    expect(needsBackup(null, "0.2.0")).toBe(false); // first run
    expect(needsBackup("0.2.0", "0.2.0")).toBe(false);
    expect(needsBackup("0.1.0", "0.2.0")).toBe(true);
    expect(needsBackup("0.3.0", "0.2.0")).toBe(true); // downgrade too
  });

  it("names backups by versions and time, and keeps only the newest ones", () => {
    const name = backupName("0.1.0", "0.2.0", new Date("2026-11-07T10:20:30.456Z"));
    expect(name).toBe("habit-v0.1.0-to-v0.2.0-2026-11-07T10-20-30.db");
    const names = [
      "habit-v0.1.0-to-v0.2.0-2026-11-01T10-00-00.db",
      "habit-v0.2.0-to-v0.3.0-2026-11-03T10-00-00.db",
      "habit-v0.3.0-to-v0.4.0-2026-11-05T10-00-00.db",
      "before-restore-2026-11-02.json", // not ours: never deleted
    ];
    expect(backupsToPrune(names, 2)).toEqual(["habit-v0.1.0-to-v0.2.0-2026-11-01T10-00-00.db"]);
    expect(backupsToPrune(names, 5)).toEqual([]);
  });
});
