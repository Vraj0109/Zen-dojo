import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// electron-builder reads a "build" key in package.json INSTEAD of electron-builder.yml. Release 0.9.6 shipped with one
// (for content.db) and lost the bundled server, the afterPack hook, the file names and the latest*.yml update files.
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("desktop installer config", () => {
  it("lives only in electron-builder.yml", () => {
    const pkg = JSON.parse(read("../package.json")) as Record<string, unknown>;
    expect(pkg.build, "move the setting into electron-builder.yml").toBeUndefined();
  });

  it("bundles the server, runs the afterPack hook (server packages and content.db) and publishes update files", () => {
    const yml = read("../electron-builder.yml");
    expect(yml).toMatch(/extraResources:\s*\n\s*- from: server/);
    expect(yml).toMatch(/^afterPack: scripts\/after-pack\.cjs/m);
    expect(yml).toMatch(/^artifactName: /m);
    expect(yml).toMatch(/^publish:/m);
    expect(read("../scripts/after-pack.cjs")).toContain("content.db");
  });
});
