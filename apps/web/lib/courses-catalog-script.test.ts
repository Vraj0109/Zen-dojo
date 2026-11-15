// Tests scripts/courses-catalog.mjs (pnpm courses:catalog) on a temp folder.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { validateFeed } from "@habit/shared";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const sample = () => JSON.parse(readFileSync(join(root, "docs/examples/sample-pack.json"), "utf8"));
const dirs: string[] = [];

function repo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "zd-courses-"));
  dirs.push(dir);
  mkdirSync(join(dir, "courses"));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, "courses", name), text);
  return dir;
}

function run(dir: string) {
  return spawnSync(process.execPath, ["--disable-warning=DEP0205", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--import", "./scripts/lib/register-ts.mjs", "scripts/courses-catalog.mjs", dir], { cwd: root, encoding: "utf8" });
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("pnpm courses:catalog", () => {
  it("writes a valid catalog whose hash matches the file", () => {
    const text = JSON.stringify({ ...sample(), id: "warm-up", revision: "1.0.0", category: "Tools" }, null, 2);
    const dir = repo({ "warm-up.json": text });
    const r = run(dir);
    expect(r.status, r.stderr).toBe(0);
    const catalog = JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8"));
    const check = validateFeed(catalog);
    expect(check.ok).toBe(true);
    expect(catalog.packs[0]).toMatchObject({
      id: "warm-up",
      version: "1.0.0",
      category: "Tools",
      bytes: Buffer.byteLength(text),
      items: 3,
      sha256: createHash("sha256").update(text).digest("hex"),
      url: "https://raw.githubusercontent.com/Vraj0109/zen-dojo-courses/main/courses/warm-up.json",
    });
  });

  it("fails on an invalid pack", () => {
    const r = run(repo({ "bad.json": JSON.stringify({ ...sample(), id: "bad", revision: "1.0.0", sections: [] }) }));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("courses/bad.json");
  });

  it("fails on a pack with a target or without a revision", () => {
    const r = run(repo({ "t.json": JSON.stringify({ ...sample(), id: "t", revision: "1.0.0", target: { area: "core" } }), "n.json": JSON.stringify({ ...sample(), id: "n" }) }));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('"target"');
    expect(r.stderr).toContain('"revision"');
  });
});
