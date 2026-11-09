import { describe, expect, it } from "vitest";
import { blockedBannerMessage, isBlockedRunMessage, isBlockedSpawnError, pickFallbackLanguage } from "./blocked";

describe("a program the OS refuses to start", () => {
  it("is told apart from a missing tool", () => {
    expect(isBlockedSpawnError(Object.assign(new Error("spawn UNKNOWN"), { code: "UNKNOWN" }))).toBe(true);
    expect(isBlockedSpawnError(new Error("spawn EPERM"))).toBe(true);
    expect(isBlockedSpawnError(Object.assign(new Error("spawn g++ ENOENT"), { code: "ENOENT" }))).toBe(false);
    expect(isBlockedSpawnError(null)).toBe(false);
  });

  it("identifies blocked unavailable messages", () => {
    expect(
      isBlockedRunMessage(
        "The operating system refused to start the program that g++ built from your code. On Windows this is usually Smart App Control..."
      )
    ).toBe(true);
    expect(isBlockedRunMessage("g++ was not found. Install a C++ compiler")).toBe(false);
    expect(isBlockedRunMessage(null)).toBe(false);
    expect(isBlockedRunMessage(undefined)).toBe(false);
    expect(isBlockedRunMessage("")).toBe(false);
  });

  it("picks fallback language correctly", () => {
    expect(pickFallbackLanguage("cpp", true)).toBe("java");
    expect(pickFallbackLanguage("cpp", false)).toBe("javascript");
    expect(pickFallbackLanguage("java", true)).toBe("javascript");
  });

  it("produces an informative banner message", () => {
    const javaMsg = blockedBannerMessage("java");
    expect(javaMsg).toContain("Smart App Control");
    expect(javaMsg).toContain("Java");
    expect(javaMsg).toContain("signed runtimes");

    const jsMsg = blockedBannerMessage("javascript");
    expect(jsMsg).toContain("JavaScript");
  });
});
