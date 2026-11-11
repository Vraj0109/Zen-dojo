import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultExec, execWithTimeout, detectTools, resetToolsCache, type ExecFn } from "./tools";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  resetToolsCache();
});

const byId = (list: Awaited<ReturnType<typeof detectTools>>, id: string) => list.find((t) => t.id === id)!;

describe("detectTools", () => {
  it("reports found tools with a parsed version", async () => {
    process.env.HABIT_PYTHON = process.execPath; // a real program, but its output is not "Python 3", so it counts as missing
    const exec: ExecFn = async (file, args) => {
      if (file === "g++") return { ok: true, output: "g++ (Rev1, Built by MSYS2) 13.2.0\nCopyright" };
      if (file === "javac") return { ok: true, output: "javac 17.0.9" };
      if (file === "java") return { ok: true, output: 'openjdk version "17.0.9"' };
      return { ok: true, output: args.join(" ") + " v20.11.0" };
    };
    delete process.env.HABIT_GPP;
    delete process.env.HABIT_JAVAC;
    delete process.env.HABIT_JAVA;
    delete process.env.HABIT_NODE;
    const list = await detectTools({ exec, platform: "win32" });
    expect(list.map((t) => t.id)).toEqual(["cpp", "java", "javascript", "python"]);
    expect(byId(list, "cpp")).toMatchObject({ found: true, version: "13.2.0" });
    expect(byId(list, "java")).toMatchObject({ found: true, version: "17.0.9" });
    expect(byId(list, "javascript").found).toBe(true);
    expect(byId(list, "cpp").hint.command).toContain("winget install");
  });

  it("reports a tool as missing when the program cannot start, and when Java has only one half", async () => {
    const exec: ExecFn = async (file) => ({ ok: file !== "g++" && file !== "java", output: "javac 17.0.9" });
    const list = await detectTools({ exec, platform: "linux", pkgManager: "dnf" });
    expect(byId(list, "cpp")).toMatchObject({ found: false, version: null });
    expect(byId(list, "java")).toMatchObject({ found: false, version: null });
    expect(byId(list, "cpp").hint.command).toContain("dnf");
  });

  it("never throws even when the runner throws", async () => {
    const exec: ExecFn = async () => {
      throw new Error("boom");
    };
    const list = await detectTools({ exec, platform: "darwin" });
    expect(list.every((t) => t.id === "python" || t.found === false)).toBe(true);
  });

  it("uses HABIT_GPP: a path that does not exist is missing (real spawn)", async () => {
    process.env.HABIT_GPP = "C:\definitely\not\here\g++.exe";
    const list = await detectTools({ platform: "win32" });
    expect(byId(list, "cpp").found).toBe(false);
  });
});

describe("defaultExec", () => {
  it("returns ok false for a missing program and reads output of a real one", async () => {
    expect((await defaultExec("definitely-not-a-program-xyz", ["--version"])).ok).toBe(false);
    const r = await defaultExec(process.execPath, ["--version"]);
    expect(r.ok).toBe(true);
    expect(r.output).toMatch(/v\d+\./);
  });

  it("gives up on a program that runs too long", async () => {
    const started = Date.now();
    const r = await execWithTimeout(300)(process.execPath, ["-e", "setTimeout(() => {}, 20000)"]);
    expect(r.ok).toBe(false);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

describe("detectTools cache", () => {
  it("remembers the answer for the real machine, until reset or asked fresh", async () => {
    process.env.HABIT_GPP = "definitely-not-a-program-xyz";
    const first = detectTools();
    expect(detectTools()).toBe(first);
    resetToolsCache();
    const second = detectTools();
    expect(second).not.toBe(first);
    expect(detectTools({ fresh: true })).not.toBe(second);
    await Promise.all([first, second]);
  });

  it("does not cache calls that bring their own runner", async () => {
    const exec: ExecFn = async () => ({ ok: true, output: "1.2.3" });
    const a = detectTools({ exec, platform: "linux" });
    expect(detectTools({ exec, platform: "linux" })).not.toBe(a);
    await a;
  });

  it("reports where each program comes from", async () => {
    process.env.HABIT_GPP = "my-gpp";
    const exec: ExecFn = async () => ({ ok: true, output: "1.2.3" });
    const list = await detectTools({ exec, platform: "linux" });
    expect(byId(list, "cpp").source).toBe("override");
    expect(byId(list, "java").source).toBe("system");
  });
});
