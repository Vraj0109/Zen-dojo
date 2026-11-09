import { describe, expect, it } from "vitest";
import { isBlockedSpawnError } from "./run";

describe("a program the OS refuses to start", () => {
  it("is told apart from a missing tool", () => {
    expect(isBlockedSpawnError(Object.assign(new Error("spawn UNKNOWN"), { code: "UNKNOWN" }))).toBe(true);
    expect(isBlockedSpawnError(new Error("spawn EPERM"))).toBe(true);
    expect(isBlockedSpawnError(Object.assign(new Error("spawn g++ ENOENT"), { code: "ENOENT" }))).toBe(false);
    expect(isBlockedSpawnError(null)).toBe(false);
  });
});
