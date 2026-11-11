import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import type { CatalogEntry } from "@habit/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ToolError } from "./download";
import { installArchive, installTool, installedTools, isInstallBusy, removeTool, systemTar, tarProgram, unsafeEntries, type TarRunner } from "./install";
import { managedProgram } from "./manifest";

/** A tiny tar file written by hand, so tests can contain entries a real tar program would refuse to create. */
function makeTar(files: Record<string, string>): Buffer {
  const blocks: Buffer[] = [];
  for (const [name, content] of Object.entries(files)) {
    const h = Buffer.alloc(512);
    h.write(name, 0, 100, "utf8");
    h.write("0000644\0", 100);
    h.write("0000000\0", 108);
    h.write("0000000\0", 116);
    h.write(`${Buffer.byteLength(content).toString(8).padStart(11, "0")}\0`, 124);
    h.write("00000000000\0", 136);
    h.write("        ", 148);
    h.write("0", 156);
    h.write("ustar\0", 257);
    h.write("00", 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
    blocks.push(h);
    const data = Buffer.from(content);
    blocks.push(data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

const hasBsdtar = (() => {
  try {
    return /bsdtar/.test(execFileSync(tarProgram(), ["--version"], { encoding: "utf8" }));
  } catch {
    return false;
  }
})();

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "zd-inst-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const entryFor = (archive: Buffer, type: CatalogEntry["archive"] = "tar.gz"): CatalogEntry => ({
  version: "1.2.3",
  url: "https://github.com/acme/tool/releases/download/v1/tool.tar.gz",
  sha256: createHash("sha256").update(archive).digest("hex"),
  bytes: archive.length,
  diskBytes: 1000,
  archive: type,
  binDir: "tool-1.2.3/bin",
  license: "MIT",
  source: "Acme",
});

const goodTarGz = () => zlib.gzipSync(makeTar({ "tool-1.2.3/bin/hello": "#!/bin/sh\necho hi\n", "tool-1.2.3/README": "x" }));
const writeArchive = (name: string, data: Buffer) => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, data);
  return f;
};

describe("unsafeEntries", () => {
  it("flags parent folders, absolute paths and drive letters", () => {
    expect(unsafeEntries(["a/b", "a/../../x", "/etc/passwd", "C:\\x", "..\\y", "ok/file..txt"])).toEqual(["a/../../x", "/etc/passwd", "C:\\x", "..\\y"]);
    expect(unsafeEntries(["a/b/c", "a/"])).toEqual([]);
  });
});

describe("installArchive", () => {
  it("installs a normal archive, writes the manifest and finds the program", async () => {
    const data = goodTarGz();
    const tools = path.join(dir, "tools");
    const rec = await installArchive("java", entryFor(data), writeArchive("a.tar.gz", data), { toolsDir: tools, tar: systemTar });
    expect(rec.dir).toBe("java/1.2.3");
    expect(fs.existsSync(path.join(tools, "java", "1.2.3", "tool-1.2.3", "bin", "hello"))).toBe(true);
    expect(installedTools({ toolsDir: tools }).java?.version).toBe("1.2.3");
    expect(managedProgram("java", "hello", { HABIT_TOOLS_DIR: tools }, "linux")).toBe(path.join(tools, "java", "1.2.3", "tool-1.2.3", "bin", "hello"));
    expect(fs.readdirSync(path.join(tools, "java"))).toEqual(["1.2.3"]);
  });

  it("rejects an entry with .. and extracts nothing", async () => {
    const data = zlib.gzipSync(makeTar({ "tool-1.2.3/bin/hello": "x", "tool-1.2.3/../../evil.txt": "bad" }));
    const tools = path.join(dir, "tools");
    await expect(installArchive("java", entryFor(data), writeArchive("a.tar.gz", data), { toolsDir: tools, tar: systemTar })).rejects.toMatchObject({ code: "unsafe" });
    expect(fs.existsSync(path.join(tools, "java"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "evil.txt"))).toBe(false);
    expect(installedTools({ toolsDir: tools })).toEqual({});
  });

  it("leaves no folder when the extract fails", async () => {
    const data = goodTarGz();
    const tools = path.join(dir, "tools");
    const flaky: TarRunner = async (args) => (args[0] === "-tf" ? systemTar(args) : { ok: false, stdout: "" });
    await expect(installArchive("java", entryFor(data), writeArchive("a.tar.gz", data), { toolsDir: tools, tar: flaky })).rejects.toMatchObject({ code: "extract" });
    expect(fs.readdirSync(path.join(tools, "java"))).toEqual([]);
    expect(installedTools({ toolsDir: tools })).toEqual({});
  });

  it("rejects an archive without the expected bin folder", async () => {
    const data = zlib.gzipSync(makeTar({ "other/file": "x" }));
    const tools = path.join(dir, "tools");
    await expect(installArchive("java", entryFor(data), writeArchive("a.tar.gz", data), { toolsDir: tools, tar: systemTar })).rejects.toBeInstanceOf(ToolError);
    expect(fs.readdirSync(path.join(tools, "java"))).toEqual([]);
  });

  it("rejects a file that is not an archive", async () => {
    const tools = path.join(dir, "tools");
    const junk = Buffer.from("junk");
    await expect(installArchive("java", entryFor(junk), writeArchive("a.tar.gz", junk), { toolsDir: tools, tar: systemTar })).rejects.toMatchObject({ code: "extract" });
    expect(fs.existsSync(path.join(tools, "java"))).toBe(false);
  });

  it.skipIf(!hasBsdtar)("installs a zip archive", async () => {
    const src = path.join(dir, "src", "tool-1.2.3", "bin");
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, "hello.exe"), "x");
    const zip = path.join(dir, "a.zip");
    execFileSync(tarProgram(), ["-a", "-cf", zip, "-C", path.join(dir, "src"), "tool-1.2.3"]);
    const data = fs.readFileSync(zip);
    const tools = path.join(dir, "tools");
    await installArchive("cpp", entryFor(data, "zip"), zip, { toolsDir: tools, tar: systemTar });
    expect(managedProgram("cpp", "hello", { HABIT_TOOLS_DIR: tools }, "win32")).not.toBeNull();
  });
});

describe("installTool and removeTool", () => {
  const serve = (data: Buffer) => (async () => new Response(new Uint8Array(data), { status: 200 })) as unknown as typeof fetch;

  it("downloads, installs, leaves no archive behind, and remove deletes everything", async () => {
    const data = goodTarGz();
    const tools = path.join(dir, "tools");
    const stages: string[] = [];
    await installTool("python", entryFor(data), { toolsDir: tools, fetch: serve(data), onStage: (s) => stages.push(s) });
    expect(stages).toEqual(["downloading", "unpacking"]);
    expect(isInstallBusy()).toBe(false);
    expect(fs.existsSync(path.join(tools, ".downloads"))).toBe(false);
    expect(installedTools({ toolsDir: tools }).python).toBeDefined();
    expect(removeTool("python", { toolsDir: tools })).toBe(true);
    expect(fs.existsSync(path.join(tools, "python"))).toBe(false);
    expect(installedTools({ toolsDir: tools })).toEqual({});
    expect(removeTool("python", { toolsDir: tools })).toBe(false);
  });

  it("a tampered download installs nothing", async () => {
    const data = goodTarGz();
    const tools = path.join(dir, "tools");
    const tampered = Buffer.from(data);
    tampered[tampered.length - 1] ^= 1;
    await expect(installTool("java", entryFor(data), { toolsDir: tools, fetch: serve(tampered) })).rejects.toMatchObject({ code: "hash" });
    expect(fs.existsSync(path.join(tools, "java"))).toBe(false);
    expect(isInstallBusy()).toBe(false);
  });

  it("allows one install at a time", async () => {
    const data = goodTarGz();
    const tools = path.join(dir, "tools");
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    const slow = (async () => {
      await gate;
      return new Response(new Uint8Array(data), { status: 200 });
    }) as unknown as typeof fetch;
    const first = installTool("java", entryFor(data), { toolsDir: tools, fetch: slow });
    await expect(installTool("python", entryFor(data), { toolsDir: tools, fetch: serve(data) })).rejects.toMatchObject({ code: "busy" });
    release();
    await first;
    expect(isInstallBusy()).toBe(false);
  });
});
