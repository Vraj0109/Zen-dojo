import { describe, expect, it } from "vitest";
import { AI_INSTALL, OS_IDS, installCommands, toOsId } from "./ai-install";

describe("ai install hints", () => {
  it("has at least one command for every tool on every system", () => {
    for (const item of AI_INSTALL) for (const os of OS_IDS) expect(installCommands(item, os).length, `${item.id} on ${os}`).toBeGreaterThan(0);
  });

  it("uses https for every docs link and has no empty commands", () => {
    for (const item of AI_INSTALL) {
      expect(item.docsUrl.startsWith("https://")).toBe(true);
      for (const os of OS_IDS) for (const c of installCommands(item, os)) expect(c.command.trim().length).toBeGreaterThan(3);
    }
  });

  it("covers the chat's tools", () => {
    const ids = AI_INSTALL.map((i) => i.providerId).filter(Boolean);
    expect(ids).toEqual(expect.arrayContaining(["claude", "gemini", "codex", "ollama"]));
  });

  it("maps a platform name to a system", () => {
    expect(toOsId("win32")).toBe("win32");
    expect(toOsId("darwin")).toBe("darwin");
    expect(toOsId("linux")).toBe("linux");
    expect(toOsId("freebsd")).toBe("linux");
    expect(toOsId(undefined)).toBe("linux");
  });
});
