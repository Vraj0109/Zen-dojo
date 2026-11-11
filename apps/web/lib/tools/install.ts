import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CatalogEntry, ManagedToolId } from "@habit/shared";
import { ToolError, downloadVerified, type DownloadOptions } from "./download";
import { readManifest, toolsDir as defaultToolsDir, writeManifest, type ManifestTool } from "./manifest";

export interface TarResult {
  ok: boolean;
  stdout: string;
}
/** Runs the system tar with fixed arguments (no shell). */
export type TarRunner = (args: string[]) => Promise<TarResult>;

/** On Windows the system tar.exe (it reads zip files too); Git Bash's GNU tar does not, so never rely on PATH there. */
export function tarProgram(platform: string = process.platform, env: Record<string, string | undefined> = process.env): string {
  if (platform !== "win32") return "tar";
  return path.join(env.SystemRoot || env.windir || "C:\Windows", "System32", "tar.exe");
}

export const systemTar: TarRunner = (args) =>
  new Promise((resolve) => {
    try {
      execFile(tarProgram(), args, { windowsHide: true, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }, (error, stdout) => resolve({ ok: !error, stdout: stdout ?? "" }));
    } catch {
      resolve({ ok: false, stdout: "" });
    }
  });

/** Archive entries that would land outside the target folder: absolute paths, drive letters, "..", NUL. */
export function unsafeEntries(entries: string[]): string[] {
  return entries.filter((e) => {
    const name = e.replace(/\\/g, "/");
    if (name.includes("\0")) return true;
    if (name.startsWith("/") || /^[A-Za-z]:/.test(name)) return true;
    return name.split("/").includes("..");
  });
}

export async function listArchive(archive: string, tar: TarRunner = systemTar): Promise<string[]> {
  const r = await tar(["-tf", archive]);
  if (!r.ok) throw new ToolError("The downloaded file could not be read as an archive, so it was not installed.", "extract");
  return r.stdout.split(/\r?\n/).filter((l) => l.length > 0);
}

/** A folder name made from a version string. */
export function versionFolder(version: string): string {
  return version.replace(/[^A-Za-z0-9._+-]+/g, "-").replace(/^-+|-+$/g, "") || "current";
}

export interface InstallOptions {
  toolsDir?: string;
  tar?: TarRunner;
}

function rm(p: string): void {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

/**
 * Checks the entries of an archive, extracts it next to its final place and moves it in with one rename, then writes the
 * manifest. Any failure deletes the partial folder. The archive file itself is not deleted here.
 */
export async function installArchive(id: ManagedToolId, entry: CatalogEntry, archive: string, opts: InstallOptions = {}): Promise<ManifestTool> {
  const base = opts.toolsDir ?? defaultToolsDir();
  const tar = opts.tar ?? systemTar;
  const entries = await listArchive(archive, tar);
  const bad = unsafeEntries(entries);
  if (bad.length > 0) throw new ToolError("The downloaded file contains paths outside its folder, so it was not installed.", "unsafe");

  const toolDir = path.join(base, id);
  const staging = path.join(toolDir, `.tmp-${randomBytes(4).toString("hex")}`);
  const folder = versionFolder(entry.version);
  const finalDir = path.join(toolDir, folder);
  try {
    fs.mkdirSync(staging, { recursive: true });
    const r = await tar(["-xf", archive, "-C", staging]);
    if (!r.ok) throw new ToolError("The downloaded file could not be unpacked. Is there enough free disk space?", "extract");
    const bin = path.join(staging, ...entry.binDir.split("/"));
    if (!fs.existsSync(bin)) throw new ToolError("The downloaded tool does not have the expected folder layout, so it was not installed.", "extract");
    rm(finalDir);
    fs.renameSync(staging, finalDir);
  } catch (e) {
    rm(staging);
    if (e instanceof ToolError) throw e;
    throw new ToolError("The tool could not be installed. Is there enough free disk space?", "extract");
  }
  const record: ManifestTool = { version: entry.version, dir: `${id}/${folder}`, binDir: entry.binDir, installedAt: new Date().toISOString() };
  const manifest = readManifest(base);
  const previous = manifest.tools[id];
  manifest.tools[id] = record;
  writeManifest(base, manifest);
  if (previous && previous.dir !== record.dir) rm(path.join(base, ...previous.dir.split("/")));
  return record;
}

let busy = false;
export function isInstallBusy(): boolean {
  return busy;
}

export interface InstallToolOptions extends InstallOptions, DownloadOptions {
  onStage?: (stage: "downloading" | "verifying" | "unpacking") => void;
}

/** Download, verify, unpack, register. One at a time. The archive is deleted afterwards, success or not. */
export async function installTool(id: ManagedToolId, entry: CatalogEntry, opts: InstallToolOptions = {}): Promise<ManifestTool> {
  if (busy) throw new ToolError("Another download is already running.", "busy");
  busy = true;
  const base = opts.toolsDir ?? defaultToolsDir();
  const downloads = path.join(base, ".downloads");
  const part = path.join(downloads, `${id}-${randomBytes(4).toString("hex")}.part`);
  try {
    fs.mkdirSync(downloads, { recursive: true });
    opts.onStage?.("downloading");
    await downloadVerified(entry, part, { fetch: opts.fetch, onProgress: opts.onProgress, signal: opts.signal });
    opts.onStage?.("unpacking");
    // tar needs a recognisable name for zip detection on some builds
    const named = `${part}.${entry.archive === "zip" ? "zip" : entry.archive}`;
    fs.renameSync(part, named);
    try {
      return await installArchive(id, entry, named, opts);
    } finally {
      rm(named);
    }
  } finally {
    rm(part);
    try {
      if (fs.readdirSync(downloads).length === 0) fs.rmdirSync(downloads);
    } catch {
      // not there or not empty
    }
    busy = false;
  }
}

/** Deletes a downloaded tool and its manifest entry. Returns false when nothing was installed. */
export function removeTool(id: ManagedToolId, opts: { toolsDir?: string } = {}): boolean {
  const base = opts.toolsDir ?? defaultToolsDir();
  const manifest = readManifest(base);
  const t = manifest.tools[id];
  rm(path.join(base, id));
  if (!t) return false;
  delete manifest.tools[id];
  writeManifest(base, manifest);
  return true;
}

export function installedTools(opts: { toolsDir?: string } = {}): Partial<Record<ManagedToolId, ManifestTool>> {
  return readManifest(opts.toolsDir ?? defaultToolsDir()).tools;
}

export type { ManifestTool };
export { ToolError };
export type { DownloadOptions };
export { defaultToolsDir };
