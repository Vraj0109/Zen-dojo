import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ManagedToolId } from "@habit/shared";

// What the app has downloaded (plan 0064). Sync and free of app imports so the judge's resolver can read it.
// Layout: <HABIT_TOOLS_DIR>/manifest.json and <HABIT_TOOLS_DIR>/<tool>/<version>/...

export interface ManifestTool {
  version: string;
  /** Install folder relative to the tools folder, forward slashes: "java/17.0.21+9" */
  dir: string;
  /** Folder with the programs, relative to `dir` */
  binDir: string;
  installedAt: string;
  /** Set by the user to keep the download but use the system's tool instead */
  disabled?: boolean;
}
export interface Manifest {
  tools: Partial<Record<ManagedToolId, ManifestTool>>;
}

type Env = Record<string, string | undefined>;

/** The tools folder: HABIT_TOOLS_DIR, or a folder under the temp directory when the app did not set it. */
export function toolsDir(env: Env = process.env): string {
  return env.HABIT_TOOLS_DIR || path.join(os.tmpdir(), "zen-dojo-tools");
}

export function manifestPath(dir: string): string {
  return path.join(dir, "manifest.json");
}

export function readManifest(dir: string): Manifest {
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath(dir), "utf8")) as Partial<Manifest>;
    const tools: Manifest["tools"] = {};
    for (const id of ["java", "python", "cpp"] as const) {
      const t = raw.tools?.[id];
      if (t && typeof t.version === "string" && typeof t.dir === "string" && typeof t.binDir === "string") tools[id] = t;
    }
    return { tools };
  } catch {
    return { tools: {} };
  }
}

export function writeManifest(dir: string, manifest: Manifest): void {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${manifestPath(dir)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmp, manifestPath(dir));
}

/** Absolute folder with the programs of a downloaded tool, or null when none is installed, it is disabled or the files are gone. */
export function managedBinDir(id: ManagedToolId, env: Env = process.env): string | null {
  const dir = toolsDir(env);
  const t = readManifest(dir).tools[id];
  if (!t || t.disabled) return null;
  const bin = path.join(dir, ...t.dir.split("/"), ...t.binDir.split("/"));
  try {
    return fs.statSync(bin).isDirectory() ? bin : null;
  } catch {
    return null;
  }
}

/** Full path of a program in a downloaded tool ("java", "g++"), or null when it is not there. */
export function managedProgram(id: ManagedToolId, program: string, env: Env = process.env, platform: string = process.platform): string | null {
  const bin = managedBinDir(id, env);
  if (!bin) return null;
  const file = path.join(bin, platform === "win32" ? `${program}.exe` : program);
  try {
    return fs.statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}
