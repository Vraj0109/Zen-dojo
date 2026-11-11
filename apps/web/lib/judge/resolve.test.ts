import type { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { nodeCommand, pythonCommand, resolveTool } from "./resolve";

type Spawn = typeof spawnSync;
type Reply = { status?: number | null; stdout?: string; stderr?: string; error?: Error };

/** A fake machine: each "file args" key answers like the program would. Unknown programs are missing (ENOENT). */
function fakeSpawn(table: Record<string, Reply>, calls: string[] = []): Spawn {
  return ((file: string, args: string[] = []) => {
    const key = [file, ...args].join(" ");
    calls.push(key);
    const r = table[key];
    if (!r) return { error: Object.assign(new Error(`spawn ${file} ENOENT`), { code: "ENOENT" }), status: null, stdout: "", stderr: "" };
    return { status: "status" in r ? r.status : 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
  }) as unknown as Spawn;
}

const STORE_STUB = "Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut from Settings.";

describe("finding Python", () => {
  it("uses python3 first on Linux and macOS", () => {
    const calls: string[] = [];
    const sp = fakeSpawn({ "python3 --version": { stdout: "Python 3.12.1\n" }, "python --version": { stdout: "Python 3.9.0\n" } }, calls);
    const p = pythonCommand({ env: {}, platform: "linux", spawnSync: sp });
    expect(p).toMatchObject({ found: true, file: "python3", args: [], version: "3.12.1" });
    expect(calls).toEqual(["python3 --version"]);
  });

  it("uses the py launcher first on Windows, passing -3 as its own argument", () => {
    const sp = fakeSpawn({ "py -3 --version": { stdout: "Python 3.11.4\n" } });
    expect(pythonCommand({ env: {}, platform: "win32", spawnSync: sp })).toMatchObject({ found: true, file: "py", args: ["-3"] });
  });

  it("falls through to python when the first candidate is missing", () => {
    const sp = fakeSpawn({ "python --version": { stdout: "Python 3.10.0\n" } });
    expect(pythonCommand({ env: {}, platform: "win32", spawnSync: sp })).toMatchObject({ found: true, file: "python", args: [] });
    expect(pythonCommand({ env: {}, platform: "linux", spawnSync: sp })).toMatchObject({ found: true, file: "python" });
  });

  it("rejects the Microsoft Store stub (exit code 9009 or its message)", () => {
    const byCode = fakeSpawn({ "python --version": { status: 9009, stderr: "" } });
    expect(pythonCommand({ env: {}, platform: "win32", spawnSync: byCode }).found).toBe(false);
    const byText = fakeSpawn({ "py -3 --version": { status: 0, stdout: STORE_STUB }, "python --version": { status: 0, stdout: STORE_STUB } });
    expect(pythonCommand({ env: {}, platform: "win32", spawnSync: byText }).found).toBe(false);
  });

  it("rejects Python 2", () => {
    const sp = fakeSpawn({ "python3 --version": { stderr: "Python 2.7.18\n" }, "python --version": { stderr: "Python 2.7.18\n" } });
    expect(pythonCommand({ env: {}, platform: "linux", spawnSync: sp }).found).toBe(false);
  });

  it("reads a version printed on standard error (older Pythons)", () => {
    const sp = fakeSpawn({ "python3 --version": { stderr: "Python 3.8.10\n" } });
    expect(pythonCommand({ env: {}, platform: "linux", spawnSync: sp })).toMatchObject({ found: true, version: "3.8.10" });
  });

  it("lets HABIT_PYTHON win over everything", () => {
    const calls: string[] = [];
    const sp = fakeSpawn({ "/opt/py/bin/python --version": { stdout: "Python 3.13.0\n" }, "python3 --version": { stdout: "Python 3.9.0\n" } }, calls);
    const p = pythonCommand({ env: { HABIT_PYTHON: "/opt/py/bin/python" }, platform: "linux", spawnSync: sp });
    expect(p).toMatchObject({ found: true, file: "/opt/py/bin/python", args: [] });
    expect(calls).toEqual(["/opt/py/bin/python --version"]);
  });

  it("does not replace a broken HABIT_PYTHON with another Python", () => {
    const sp = fakeSpawn({ "python3 --version": { stdout: "Python 3.9.0\n" } });
    const p = pythonCommand({ env: { HABIT_PYTHON: "/nope/python" }, platform: "linux", spawnSync: sp });
    expect(p.found).toBe(false);
    expect(p.file).toBe("/nope/python");
  });

  it("reports found: false when nothing works, naming the first candidate", () => {
    const sp = fakeSpawn({});
    expect(pythonCommand({ env: {}, platform: "linux", spawnSync: sp })).toMatchObject({ found: false, file: "python3" });
    expect(pythonCommand({ env: {}, platform: "win32", spawnSync: sp })).toMatchObject({ found: false, file: "py", args: ["-3"] });
  });

  it("resolveTool never throws and returns plain command parts", () => {
    const sp = fakeSpawn({});
    expect(resolveTool("python", { env: {}, platform: "linux", spawnSync: sp })).toEqual({ file: "python3", args: [] });
    const real = resolveTool("python");
    expect(typeof real.file).toBe("string");
    expect(Array.isArray(real.args)).toBe(true);
  });
});

describe("the other tools", () => {
  it("resolveTool honours the HABIT_* variables and falls back to PATH names", () => {
    const keep = { ...process.env };
    try {
      delete process.env.HABIT_GPP;
      process.env.HABIT_JAVAC = "/jdk/bin/javac";
      delete process.env.HABIT_JAVA;
      expect(resolveTool("cpp")).toEqual({ file: "g++", args: [] });
      expect(resolveTool("javac")).toEqual({ file: "/jdk/bin/javac", args: [] });
      expect(resolveTool("java")).toEqual({ file: "java", args: [] });
    } finally {
      process.env = keep;
    }
  });
});

describe("Node for JavaScript problems", () => {
  it("uses HABIT_NODE when set, even inside Electron", () => {
    expect(nodeCommand({ env: { HABIT_NODE: "/n/node" }, electron: true })).toEqual({ file: "/n/node", args: [] });
  });

  it("uses the running Node outside Electron", () => {
    expect(nodeCommand({ env: {}, electron: false, execPath: "/usr/bin/node" })).toEqual({ file: "/usr/bin/node", args: [] });
  });

  it("inside Electron runs the app itself as Node, with the flag only in the child's environment", () => {
    const sp = fakeSpawn({ "C:/App/app.exe -e process.exit(0)": {} });
    const c = nodeCommand({ env: {}, electron: true, execPath: "C:/App/app.exe", spawnSync: sp });
    expect(c).toEqual({ file: "C:/App/app.exe", args: [], env: { ELECTRON_RUN_AS_NODE: "1" } });
  });

  it("falls back to node on PATH when the app cannot start as Node (missing or blocked)", () => {
    const missing = fakeSpawn({});
    expect(nodeCommand({ env: {}, electron: true, execPath: "C:/App/app.exe", spawnSync: missing })).toEqual({ file: "node", args: [] });
    const blocked = fakeSpawn({ "C:/App/app.exe -e process.exit(0)": { status: null, error: Object.assign(new Error("spawn EPERM"), { code: "EPERM" }) } });
    expect(nodeCommand({ env: {}, electron: true, execPath: "C:/App/app.exe", spawnSync: blocked })).toEqual({ file: "node", args: [] });
  });

  it("resolveTool('node') matches nodeCommand", () => {
    expect(resolveTool("node", { env: {}, electron: false, execPath: "/x/node" })).toEqual({ file: "/x/node", args: [] });
  });
});
