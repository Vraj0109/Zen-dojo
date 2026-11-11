import { describe, expect, it } from "vitest";
import { MANAGED_TOOL_IDS, PLATFORM_KEYS, TOOL_CATALOG, allowedHosts, catalogEntry, formatBytes, platformKey, sizeCap, verifyPlan } from "./tool-catalog";

describe("tool catalogue", () => {
  const all = MANAGED_TOOL_IDS.flatMap((id) => PLATFORM_KEYS.flatMap((p) => (TOOL_CATALOG[id][p] ? [[`${id} ${p}`, TOOL_CATALOG[id][p]!] as const] : [])));

  it("has Java and Python for every platform and C++ for Windows", () => {
    for (const p of PLATFORM_KEYS) {
      expect(TOOL_CATALOG.java[p], `java ${p}`).toBeDefined();
      expect(TOOL_CATALOG.python[p], `python ${p}`).toBeDefined();
    }
    expect(TOOL_CATALOG.cpp["win32-x64"]).toBeDefined();
    expect(TOOL_CATALOG.cpp["linux-x64"]).toBeUndefined();
    expect(TOOL_CATALOG.cpp["darwin-arm64"]).toBeUndefined();
  });

  it.each(all)("%s is well formed", (_name, entry) => {
    expect(verifyPlan(entry)).toEqual([]);
    expect(new URL(entry.url).protocol).toBe("https:");
    expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.bytes).toBeGreaterThan(0);
    expect(entry.archive).toMatch(/^(zip|tar\.gz|tar\.xz)$/);
  });

  it("rejects bad entries", () => {
    const good = TOOL_CATALOG.java["win32-x64"]!;
    expect(verifyPlan({ ...good, url: "http://github.com/x.zip" })).not.toEqual([]);
    expect(verifyPlan({ ...good, sha256: "abc" })).not.toEqual([]);
    expect(verifyPlan({ ...good, bytes: 0 })).not.toEqual([]);
    expect(verifyPlan({ ...good, binDir: "../bin" })).not.toEqual([]);
    expect(verifyPlan({ ...good, url: "https://github.com/x/releases/latest/download/a.zip" })).not.toEqual([]);
  });

  it("maps platforms, hosts and caps", () => {
    expect(platformKey("win32", "x64")).toBe("win32-x64");
    expect(platformKey("freebsd", "x64")).toBeNull();
    expect(catalogEntry("cpp", platformKey("linux", "x64"))).toBeNull();
    const e = TOOL_CATALOG.python["linux-x64"]!;
    expect(allowedHosts(e)).toContain("github.com");
    expect(allowedHosts(e)).toContain("objects.githubusercontent.com");
    expect(sizeCap(e)).toBe(Math.ceil(e.bytes * 1.05));
    expect(formatBytes(191117380)).toBe("182 MB");
  });
});
