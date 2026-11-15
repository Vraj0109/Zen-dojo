import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "@habit/shared";

describe("APP_VERSION", () => {
  it("matches the desktop package version", () => {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../../desktop/package.json", import.meta.url)), "utf8")) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
  });
});
