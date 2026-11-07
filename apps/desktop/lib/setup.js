// @ts-check
// Pure helpers for the desktop shell. No Electron imports, so they're unit-tested (setup.test.ts).
import { copyFileSync, existsSync } from "node:fs";

/** The port the extension expects by default (apps/extension/lib/config.js). */
export const DEFAULT_PORT = 3000;

/**
 * Use the preferred port when it's free; otherwise ask the OS for any free one.
 * @param {number} preferred
 * @param {(port: number) => Promise<boolean>} isFree
 * @param {() => Promise<number>} anyFreePort
 * @returns {Promise<{ port: number, fallback: boolean }>}
 */
export async function pickPort(preferred, isFree, anyFreePort) {
  if (await isFree(preferred)) return { port: preferred, fallback: false };
  return { port: await anyFreePort(), fallback: true };
}

/**
 * libSQL file URL, matching databaseUrl() in apps/web/lib/db.ts (forward slashes on Windows).
 * @param {string} file
 */
export function databaseUrl(file) {
  return "file:" + file.replaceAll("\\", "/");
}

/** SQLite keeps recent writes in these side files until a checkpoint, so they're copied too. */
const SIDECARS = ["-wal", "-shm"];

/**
 * Copy an existing habit.db (plus its -wal/-shm files, if present) to the desktop app's data folder.
 * The source is only read, never changed.
 * @param {string} source
 * @param {string} dest
 */
export function importDatabase(source, dest) {
  if (!existsSync(source)) throw new Error(`Not found: ${source}`);
  copyFileSync(source, dest);
  for (const suffix of SIDECARS) {
    if (existsSync(source + suffix)) copyFileSync(source + suffix, dest + suffix);
  }
}

/**
 * Links that leave the app (LeetCode, reading list, Excalidraw) open in the system browser.
 * @param {string} url
 * @param {string} appOrigin e.g. http://127.0.0.1:3000
 */
export function isExternal(url, appOrigin) {
  try {
    return new URL(url).origin !== appOrigin;
  } catch {
    return true;
  }
}

/**
 * Poll until the server answers (any HTTP status) or give up.
 * @param {() => Promise<boolean>} ping
 * @param {{ timeoutMs?: number, intervalMs?: number, stopped?: () => boolean }} [opts]
 */
export async function waitForServer(ping, { timeoutMs = 60_000, intervalMs = 200, stopped = () => false } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (stopped()) return false;
    if (await ping()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
