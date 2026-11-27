import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyContentDatabase,
  decideContentCopy,
  readContentVersion,
  shouldCopyContent,
} from "./content-setup.js";

describe("decideContentCopy", () => {
  it("decides to copy when existing content.db is missing", () => {
    expect(decideContentCopy(null, 10)).toEqual({ copy: true, reason: "missing" });
    expect(decideContentCopy(undefined, 10)).toEqual({ copy: true, reason: "missing" });
    expect(decideContentCopy({ existingExists: false, shippedExists: true, shippedVersion: 10 })).toEqual({
      copy: true,
      reason: "missing",
    });
    expect(shouldCopyContent(null, 10)).toBe(true);
  });

  it("decides to copy when existing content.db is older than shipped", () => {
    expect(decideContentCopy(5, 10)).toEqual({ copy: true, reason: "older" });
    expect(
      decideContentCopy({
        existingExists: true,
        shippedExists: true,
        existingVersion: 5,
        shippedVersion: 10,
      }),
    ).toEqual({ copy: true, reason: "older" });
    expect(shouldCopyContent(5, 10)).toBe(true);
  });

  it("decides not to copy when existing content.db is equal to shipped", () => {
    expect(decideContentCopy(10, 10)).toEqual({ copy: false, reason: "equal" });
    expect(
      decideContentCopy({
        existingExists: true,
        shippedExists: true,
        existingVersion: 10,
        shippedVersion: 10,
      }),
    ).toEqual({ copy: false, reason: "equal" });
    expect(shouldCopyContent(10, 10)).toBe(false);
  });

  it("decides not to copy when existing content.db is newer than shipped", () => {
    expect(decideContentCopy(15, 10)).toEqual({ copy: false, reason: "newer" });
    expect(
      decideContentCopy({
        existingExists: true,
        shippedExists: true,
        existingVersion: 15,
        shippedVersion: 10,
      }),
    ).toEqual({ copy: false, reason: "newer" });
    expect(shouldCopyContent(15, 10)).toBe(false);
  });

  it("decides not to copy when shipped content.db does not exist", () => {
    expect(
      decideContentCopy({
        existingExists: true,
        shippedExists: false,
        existingVersion: 5,
        shippedVersion: 10,
      }),
    ).toEqual({ copy: false, reason: "no-shipped" });
    expect(
      decideContentCopy({
        existingExists: false,
        shippedExists: false,
      }),
    ).toEqual({ copy: false, reason: "no-shipped" });
  });
});

describe("copyContentDatabase", () => {
  it("atomically copies content.db to dest, cleans up sidecars, leaves source unchanged", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "content-db-test-"));
    const src = path.join(dir, "shipped.db");
    const dest = path.join(dir, "content.db");
    writeFileSync(src, "shipped-content-bytes");
    // Pre-create stale sidecar files at destination
    writeFileSync(dest + "-wal", "stale-wal");
    writeFileSync(dest + "-shm", "stale-shm");

    copyContentDatabase(src, dest);

    expect(readFileSync(dest, "utf8")).toBe("shipped-content-bytes");
    expect(readFileSync(src, "utf8")).toBe("shipped-content-bytes");
    expect(existsSync(dest + "-wal")).toBe(false);
    expect(existsSync(dest + "-shm")).toBe(false);
  });

  it("refuses a missing source file", () => {
    const nonExistent = path.join(tmpdir(), "missing-source.db");
    const dest = path.join(tmpdir(), "out.db");
    expect(() => copyContentDatabase(nonExistent, dest)).toThrow(/Not found/);
  });
});

describe("readContentVersion", () => {
  it("returns null for non-existent file", () => {
    expect(readContentVersion(path.join(tmpdir(), "does-not-exist.db"))).toBeNull();
  });

  it("reads version from companion .version file when present", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "content-version-test-"));
    const dbFile = path.join(dir, "test.db");
    writeFileSync(dbFile, "sqlite-dummy");
    writeFileSync(dbFile + ".version", "42\n");

    expect(readContentVersion(dbFile)).toBe(42);
  });
});
