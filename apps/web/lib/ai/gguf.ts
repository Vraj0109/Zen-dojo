import "server-only";
import { mkdirSync, statSync } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { validModelName } from "./ollama";

// Plan 0082: find GGUF model files on this computer so they can be added to Ollama. Reads only the folders it is given.

export const GGUF_MAX_DEPTH = 4;
export const GGUF_MAX_FILES = 500;
/** Smaller files are adapters or projectors, not models. */
export const GGUF_MIN_BYTES = 50 * 1024 * 1024;

export interface GgufFile {
  path: string;
  name: string;
  folder: string;
  sizeBytes: number;
  /** False when the file does not start with the GGUF magic bytes; such files are listed but not offered for import. */
  isGguf: boolean;
}

async function hasGgufMagic(file: string): Promise<boolean> {
  let fh: Awaited<ReturnType<typeof open>> | undefined;
  try {
    fh = await open(file, "r");
    const buf = Buffer.alloc(4);
    const { bytesRead } = await fh.read(buf, 0, 4, 0);
    return bytesRead === 4 && buf.toString("latin1") === "GGUF";
  } catch {
    return false;
  } finally {
    await fh?.close().catch(() => undefined);
  }
}

/** Walks each folder (no symlinks, depth and count capped) and returns the model files found. Never throws. */
export async function findGgufFiles(folders: string[], opts: { minBytes?: number } = {}): Promise<GgufFile[]> {
  const minBytes = opts.minBytes ?? GGUF_MIN_BYTES;
  const out: GgufFile[] = [];
  const seen = new Set<string>();
  async function walk(dir: string, root: string, depth: number): Promise<void> {
    if (out.length >= GGUF_MAX_FILES || depth > GGUF_MAX_DEPTH) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= GGUF_MAX_FILES) return;
      if (e.isSymbolicLink()) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full, root, depth + 1);
        continue;
      }
      if (!e.isFile() || !e.name.toLowerCase().endsWith(".gguf") || e.name.toLowerCase().startsWith("mmproj")) continue;
      if (seen.has(full)) continue;
      let size: number;
      try {
        size = (await lstat(full)).size;
      } catch {
        continue;
      }
      if (size < minBytes) continue;
      seen.add(full);
      out.push({ path: full, name: e.name, folder: root, sizeBytes: size, isGguf: await hasGgufMagic(full) });
    }
  }
  for (const f of folders) {
    if (!path.isAbsolute(f)) continue;
    try {
      if ((await lstat(f)).isSymbolicLink()) continue;
    } catch {
      continue;
    }
    await walk(path.resolve(f), path.resolve(f), 0);
  }
  return out;
}

const QUANT_RE = /[-_.](i?q\d[a-z0-9_]*|f16|f32|bf16)$/i;

function cleanName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 60)
    .replace(/[-._]+$/g, "");
}

/**
 * A model name for Ollama from a file name: lowercase, letters/digits/`.-_`, no `.gguf`. The trailing quant tag is dropped
 * only when no other name in `others` (file names of the other listed files) would end up with the same name.
 */
export function suggestModelName(fileName: string, others: string[] = []): string {
  const stem = fileName.replace(/\.gguf$/i, "");
  const full = cleanName(stem) || "my-model";
  const short = cleanName(stem.replace(QUANT_RE, ""));
  const clash = others
    .filter((o) => o !== fileName)
    .some((o) => cleanName(o.replace(/\.gguf$/i, "").replace(QUANT_RE, "")) === short);
  const pick = short && !clash ? short : full;
  return validModelName(pick) ? pick : "my-model";
}

/** The app's own models folder: a sibling of HABIT_TOOLS_DIR (desktop only). Created on first use. */
export function appModelsFolder(): string | null {
  const tools = process.env.HABIT_TOOLS_DIR;
  if (!tools) return null;
  const dir = path.join(path.dirname(path.resolve(tools)), "models");
  try {
    mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return null;
  }
}

/** Default folders when the user never saved a list: the LM Studio models folder (if it exists) and the app's models folder. */
export function defaultGgufFolders(home: string = homedir()): string[] {
  const out: string[] = [];
  const lm = path.join(home, ".lmstudio", "models");
  try {
    if (statSync(lm).isDirectory()) out.push(lm);
  } catch {
    // not there
  }
  const app = appModelsFolder();
  if (app) out.push(app);
  return out;
}

/** True when `p` is an absolute path to an existing folder. */
export function isUsableFolder(p: string): boolean {
  if (typeof p !== "string" || !path.isAbsolute(p) || p.length > 500) return false;
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
