import { spawnSync } from "node:child_process";
import path from "node:path";
import { managedProgram } from "../tools/manifest";

// Where each tool the judge needs is. One place, so the judge, the Java project runner and the first-run tools check
// all agree. This file imports nothing from the app on purpose.
//
// Order: an explicit override (HABIT_GPP, HABIT_JAVAC, HABIT_JAVA, HABIT_NODE, HABIT_PYTHON), then a tool the app downloaded
// (plan 0064: HABIT_TOOLS_DIR/manifest.json, ignored when disabled or the files are gone), then the program on PATH.

export type ToolId = "cpp" | "javac" | "java" | "node" | "python";
export interface ToolCommand {
  file: string;
  args: string[];
  env?: Record<string, string>;
}

/** What the lookups can be given instead of the real machine (tests). */
export interface ResolveDeps {
  env?: Record<string, string | undefined>;
  platform?: string;
  /** Set when running inside Electron (process.versions.electron) */
  electron?: boolean;
  execPath?: string;
  spawnSync?: typeof spawnSync;
}

export type ToolSource = "override" | "managed" | "system";

/** Which downloadable tool and program each override variable stands for. */
const MANAGED_FOR: Record<string, { id: "cpp" | "java"; program: string }> = {
  HABIT_GPP: { id: "cpp", program: "g++" },
  HABIT_JAVAC: { id: "java", program: "javac" },
  HABIT_JAVA: { id: "java", program: "java" },
};

/**
 * The program to start: the override variable, else the downloaded one, else the fallback name looked up on PATH.
 * The downloaded Windows C++ compiler needs its own folder on PATH so the programs it builds find their runtime DLLs;
 * that folder is added to this process's PATH (once) the first time it is used.
 */
export function tool(envName: string, fallback: string, env: Record<string, string | undefined> = process.env, platform: string = process.platform): string {
  if (env[envName]) return env[envName] as string;
  const m = MANAGED_FOR[envName];
  const managed = m ? managedProgram(m.id, m.program, env, platform) : null;
  if (managed) {
    if (m.id === "cpp" && platform === "win32" && env === process.env) {
      const bin = path.dirname(managed);
      const parts = (process.env.PATH ?? "").split(path.delimiter);
      if (!parts.includes(bin)) process.env.PATH = [bin, ...parts].join(path.delimiter);
    }
    return managed;
  }
  return fallback;
}

/** Where a tool comes from right now, for the Tools page ("Using: downloaded Java 17"). */
export function resolveToolSource(id: ToolId, deps: ResolveDeps = {}): ToolSource {
  const env = deps.env ?? process.env;
  const platform = deps.platform ?? process.platform;
  const names: Record<ToolId, string> = { cpp: "HABIT_GPP", javac: "HABIT_JAVAC", java: "HABIT_JAVA", node: "HABIT_NODE", python: "HABIT_PYTHON" };
  if (env[names[id]]) return "override";
  if (id === "cpp" && managedProgram("cpp", "g++", env, platform)) return "managed";
  if ((id === "java" || id === "javac") && managedProgram("java", id, env, platform)) return "managed";
  if (id === "python" && managedProgram("python", platform === "win32" ? "python" : "python3", env, platform)) return "managed";
  return "system";
}

export type PythonLookup = ToolCommand & { found: boolean; version?: string };

const PROBE_MS = 3000;

/**
 * Asks a candidate for its version. Python 3 counts; Python 2 does not. The Microsoft Store stub (a fake python.exe
 * that opens the Store, exit code 9009 or the text "Python was not found") counts as missing.
 */
function probePython(cmd: ToolCommand, run: typeof spawnSync): string | null {
  try {
    const r = run(cmd.file, [...cmd.args, "--version"], { encoding: "utf8", timeout: PROBE_MS, windowsHide: true });
    if (r.error || r.status !== 0) return null;
    const text = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    if (/Python was not found/i.test(text)) return null;
    const m = /Python (3\.\d+(?:\.\d+)?)/.exec(text);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const pythonCache = new Map<string, PythonLookup>();

/** Finds Python 3. `found` is false when none works; `file` then still names the first candidate so messages can use it. */
export function pythonCommand(deps: ResolveDeps = {}): PythonLookup {
  const env = deps.env ?? process.env;
  const platform = deps.platform ?? process.platform;
  const run = deps.spawnSync ?? spawnSync;
  const cacheable = !deps.env && !deps.platform && !deps.spawnSync;
  const managed = env.HABIT_PYTHON ? null : managedProgram("python", platform === "win32" ? "python" : "python3", env, platform);
  const key = `${env.HABIT_PYTHON ?? ""}|${managed ?? ""}|${env.PATH ?? env.Path ?? ""}`;
  if (cacheable) {
    const hit = pythonCache.get(key);
    if (hit) return hit;
  }
  let result: PythonLookup;
  if (env.HABIT_PYTHON) {
    // An explicit choice wins, and is not silently replaced by another Python when it does not work.
    const cmd: ToolCommand = { file: env.HABIT_PYTHON, args: [] };
    const version = probePython(cmd, run);
    result = { ...cmd, found: version !== null, ...(version ? { version } : {}) };
  } else {
    const candidates: ToolCommand[] = [
      ...(managed ? [{ file: managed, args: [] }] : []),
      ...(platform === "win32"
        ? [{ file: "py", args: ["-3"] }, { file: "python", args: [] }]
        : [{ file: "python3", args: [] }, { file: "python", args: [] }]),
    ];
    result = { ...candidates[0], found: false };
    for (const c of candidates) {
      const version = probePython(c, run);
      if (version) {
        result = { ...c, found: true, version };
        break;
      }
    }
  }
  // Only a found Python is remembered, so installing Python is noticed on the next Run.
  if (cacheable && result.found) pythonCache.set(key, result);
  return result;
}

const nodeCache = new Map<string, ToolCommand>();

/**
 * How to start Node for JavaScript problems. HABIT_NODE wins. Inside the desktop app with no HABIT_NODE the app's own
 * runtime does the job (ELECTRON_RUN_AS_NODE, set only in the child's environment), so no Node install is needed; if
 * that cannot start (missing or blocked), `node` on PATH is used. Elsewhere the running Node is used.
 */
export function nodeCommand(deps: ResolveDeps = {}): ToolCommand {
  const env = deps.env ?? process.env;
  const electron = deps.electron ?? Boolean(process.versions.electron);
  const execPath = deps.execPath ?? process.execPath;
  if (env.HABIT_NODE) return { file: env.HABIT_NODE, args: [] };
  if (!electron) return { file: execPath, args: [] };
  const cacheable = !deps.env && deps.electron === undefined && !deps.spawnSync;
  if (cacheable) {
    const hit = nodeCache.get(execPath);
    if (hit) return hit;
  }
  const run = deps.spawnSync ?? spawnSync;
  const own: ToolCommand = { file: execPath, args: [], env: { ELECTRON_RUN_AS_NODE: "1" } };
  let works = false;
  try {
    const r = run(own.file, ["-e", "process.exit(0)"], { env: { ...env, ELECTRON_RUN_AS_NODE: "1" } as unknown as NodeJS.ProcessEnv, timeout: PROBE_MS, windowsHide: true });
    works = !r.error && r.status === 0;
  } catch {
    works = false;
  }
  const result: ToolCommand = works ? own : { file: "node", args: [] };
  if (cacheable) nodeCache.set(execPath, result);
  return result;
}

/** Where a tool is. Never throws; the file may not exist (starting it then fails as "missing"). */
export function resolveTool(id: ToolId, deps: ResolveDeps = {}): ToolCommand {
  switch (id) {
    case "cpp":
      return { file: tool("HABIT_GPP", "g++", deps.env, deps.platform), args: [] };
    case "javac":
      return { file: tool("HABIT_JAVAC", "javac", deps.env, deps.platform), args: [] };
    case "java":
      return { file: tool("HABIT_JAVA", "java", deps.env, deps.platform), args: [] };
    case "node":
      return nodeCommand(deps);
    case "python": {
      const { file, args, env } = pythonCommand(deps);
      return { file, args, ...(env ? { env } : {}) };
    }
  }
}
