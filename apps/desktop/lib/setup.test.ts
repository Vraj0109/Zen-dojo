import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PORT, databaseUrl, importDatabase, isExternal, pickPort, waitForServer } from "./setup.js";

describe("pickPort", () => {
  it("uses the preferred port when it's free", async () => {
    expect(await pickPort(DEFAULT_PORT, async () => true, async () => 5555)).toEqual({ port: DEFAULT_PORT, fallback: false });
  });

  it("falls back to any free port when the preferred one is busy", async () => {
    expect(await pickPort(DEFAULT_PORT, async () => false, async () => 5555)).toEqual({ port: 5555, fallback: true });
  });
});

describe("databaseUrl", () => {
  it("uses forward slashes like the web app", () => {
    expect(databaseUrl("C:\\Users\\me\\AppData\\Roaming\\HabitManager\\habit.db")).toBe("file:C:/Users/me/AppData/Roaming/HabitManager/habit.db");
    expect(databaseUrl("/home/me/.config/HabitManager/habit.db")).toBe("file:/home/me/.config/HabitManager/habit.db");
  });
});

describe("importDatabase", () => {
  it("copies the database and its WAL side files, leaving the source as it was", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "habit-desktop-"));
    const src = path.join(dir, "old.db");
    const dest = path.join(dir, "new.db");
    writeFileSync(src, "main");
    writeFileSync(src + "-wal", "wal");
    importDatabase(src, dest);
    expect(readFileSync(dest, "utf8")).toBe("main");
    expect(readFileSync(dest + "-wal", "utf8")).toBe("wal");
    expect(existsSync(dest + "-shm")).toBe(false);
    expect(readFileSync(src, "utf8")).toBe("main");
  });

  it("refuses a missing file", () => {
    expect(() => importDatabase(path.join(tmpdir(), "nope-habit.db"), path.join(tmpdir(), "x.db"))).toThrow(/Not found/);
  });
});

describe("isExternal", () => {
  const app = "http://127.0.0.1:3000";
  it("keeps the app's own pages in the window", () => {
    expect(isExternal("http://127.0.0.1:3000/dsa?x=1", app)).toBe(false);
  });
  it("sends other sites, other ports and junk to the browser", () => {
    expect(isExternal("https://leetcode.com/problems/two-sum/", app)).toBe(true);
    expect(isExternal("http://localhost:3000/", app)).toBe(true);
    expect(isExternal("http://127.0.0.1:3001/", app)).toBe(true);
    expect(isExternal("not a url", app)).toBe(true);
  });
});

describe("waitForServer", () => {
  it("returns true once the server answers", async () => {
    let calls = 0;
    expect(await waitForServer(async () => ++calls >= 3, { intervalMs: 1 })).toBe(true);
    expect(calls).toBe(3);
  });
  it("gives up when the server process has stopped", async () => {
    expect(await waitForServer(async () => false, { intervalMs: 1, stopped: () => true })).toBe(false);
  });
  it("gives up after the timeout", async () => {
    expect(await waitForServer(async () => false, { timeoutMs: 20, intervalMs: 5 })).toBe(false);
  });
});
