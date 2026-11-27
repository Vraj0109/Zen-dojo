// @ts-check
// Pure helpers for content database setup in the desktop shell.
// No Electron imports, so they're unit-tested (content-setup.test.ts).
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync } from "node:fs";

/**
 * Decision whether to copy the shipped content.db to the app data directory.
 * Evaluates missing, older, equal, and newer states.
 *
 * @param {number | null | undefined | {
 *   existingExists?: boolean,
 *   shippedExists?: boolean,
 *   existingVersion?: number | null,
 *   shippedVersion?: number | null,
 * }} existing
 * @param {number | null | undefined} [shipped]
 * @returns {{ copy: boolean, reason: "missing" | "older" | "equal" | "newer" | "no-shipped" }}
 */
export function decideContentCopy(existing, shipped) {
  if (typeof existing === "object" && existing !== null) {
    const existingExists =
      existing.existingExists ?? (existing.existingVersion !== null && existing.existingVersion !== undefined);
    const shippedExists = existing.shippedExists ?? true;
    if (!shippedExists) return { copy: false, reason: "no-shipped" };
    if (!existingExists) return { copy: true, reason: "missing" };
    const ev = Number(existing.existingVersion ?? 0);
    const sv = Number(existing.shippedVersion ?? 0);
    if (ev < sv) return { copy: true, reason: "older" };
    if (ev === sv) return { copy: false, reason: "equal" };
    return { copy: false, reason: "newer" };
  }

  const existingVersion = existing;
  const shippedVersion = shipped;
  if (existingVersion === null || existingVersion === undefined) return { copy: true, reason: "missing" };
  const ev = Number(existingVersion);
  const sv = Number(shippedVersion ?? 0);
  if (ev < sv) return { copy: true, reason: "older" };
  if (ev === sv) return { copy: false, reason: "equal" };
  return { copy: false, reason: "newer" };
}

/**
 * Boolean helper for decideContentCopy.
 * @param {number | null | undefined} existingVersion
 * @param {number | null | undefined} shippedVersion
 * @returns {boolean}
 */
export function shouldCopyContent(existingVersion, shippedVersion) {
  return decideContentCopy(existingVersion, shippedVersion).copy;
}

/**
 * SQLite sidecar files that should be cleaned up at destination when replacing content.db.
 */
const SIDECARS = ["-wal", "-shm"];

/**
 * Atomically copies the content database from source to dest using a temporary file.
 * The source file is only read, never changed.
 * @param {string} source
 * @param {string} dest
 */
export function copyContentDatabase(source, dest) {
  if (!existsSync(source)) throw new Error(`Not found: ${source}`);
  const temp = `${dest}.tmp-${Date.now()}`;
  copyFileSync(source, temp);
  for (const suffix of SIDECARS) {
    if (existsSync(dest + suffix)) {
      try {
        rmSync(dest + suffix, { force: true });
      } catch {}
    }
  }
  renameSync(temp, dest);
}

/**
 * Reads content_version from a content SQLite database file.
 * Returns null if the file does not exist or version cannot be read.
 * @param {string} filePath
 * @returns {number | null}
 */
export function readContentVersion(filePath) {
  if (!existsSync(filePath)) return null;

  // If a companion .version file exists, prefer its value.
  const versionFile = filePath + ".version";
  if (existsSync(versionFile)) {
    try {
      const text = readFileSync(versionFile, "utf8").trim();
      const n = Number(text);
      if (Number.isFinite(n)) return n;
    } catch {}
  }

  // Otherwise inspect the SQLite database via node:sqlite if available.
  try {
    // Dynamically load node:sqlite so environments with older @types/node typecheck cleanly.
    // @ts-ignore
    const req = typeof require !== "undefined" ? require : null;
    const sqlite = req ? req("node:" + "sqlite") : null;
    if (!sqlite?.DatabaseSync) return null;
    const db = new sqlite.DatabaseSync(filePath, { readOnly: true });
    try {
      const row = /** @type {{ v?: string } | undefined} */ (
        db.prepare("SELECT v FROM content_meta WHERE k = 'content_version'").get()
      );
      if (row && row.v !== undefined && row.v !== null) {
        const n = Number(row.v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}
