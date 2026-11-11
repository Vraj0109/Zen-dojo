import { describe, expect, it } from "vitest";
import { TOOL_IDS, TOOL_LABELS, TOOL_USED_FOR, hintFor } from "./tool-hints";

describe("tool hints", () => {
  it("has a command for every tool on win32, darwin and linux (apt and dnf)", () => {
    for (const t of TOOL_IDS) {
      for (const p of ["win32", "darwin", "linux"]) expect(hintFor(t, p).command, `${t} ${p}`).toBeTruthy();
      expect(hintFor(t, "linux", "dnf").command).toContain("dnf");
      expect(hintFor(t, "linux").command).toContain("apt-get");
      expect(TOOL_LABELS[t]).toBeTruthy();
      expect(TOOL_USED_FOR[t]).toBeTruthy();
    }
  });
  it("uses winget ids on Windows", () => {
    expect(hintFor("python", "win32").command).toBe("winget install Python.Python.3.12");
    expect(hintFor("cpp", "win32").command).toContain("WinLibs");
  });
  it("points unknown platforms at the troubleshooting page", () => {
    const h = hintFor("cpp", "freebsd");
    expect(h.command).toBeNull();
    expect(h.note).toContain("troubleshooting");
  });
});
