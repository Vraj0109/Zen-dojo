import { describe, expect, it } from "vitest";
import { framesFromUsage, gridCell, parsePetJson, PetImportError, sheetMime, TYPICAL_FRAMES } from "./pet-package";

const json = (o: object) => JSON.stringify(o);
const good = { id: "shinchan", displayName: "Shinchan", description: "A pet", spritesheetPath: "spritesheet.webp" };

describe("parsePetJson", () => {
  it("accepts a valid file and cleans text", () => {
    const p = parsePetJson(json({ ...good, displayName: "Shin\u0007chan", description: "a\n\nb" }));
    expect(p.displayName).toBe("Shin chan");
    expect(p.description).toBe("a b");
  });
  it("caps the description at 300 characters", () => {
    expect(parsePetJson(json({ ...good, description: "x".repeat(400) })).description).toHaveLength(300);
  });
  it.each([
    ["bad json", "{nope"],
    ["bad id", json({ ...good, id: "Bad_Id" })],
    ["empty name", json({ ...good, displayName: "  " })],
    ["long name", json({ ...good, displayName: "x".repeat(61) })],
    ["path traversal", json({ ...good, spritesheetPath: "../a.webp" })],
    ["subfolder", json({ ...good, spritesheetPath: "a/b.webp" })],
    ["wrong extension", json({ ...good, spritesheetPath: "a.gif" })],
  ])("rejects %s", (_n, text) => {
    expect(() => parsePetJson(text)).toThrow(PetImportError);
  });
});

describe("sheetMime", () => {
  it("detects webp and png by magic bytes", () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sheetMime(webp)).toBe("image/webp");
    expect(sheetMime(png)).toBe("image/png");
    expect(sheetMime(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("gridCell", () => {
  it("returns the cell size for the standard sheet", () => {
    expect(gridCell(1536, 1872)).toEqual({ cellW: 192, cellH: 208 });
  });
  it("rejects other sizes", () => {
    expect(() => gridCell(1000, 1872)).toThrow(/Petdex sheet/);
    expect(() => gridCell(1536, 1000)).toThrow(PetImportError);
  });
});

describe("framesFromUsage", () => {
  it("trims empty trailing cells and falls back to typical counts", () => {
    const usage: boolean[][] = Array.from({ length: 9 }, () => Array(8).fill(false));
    usage[0] = [true, true, true, false, false, false, false, false];
    usage[1] = [true, false, true, false, false, false, false, false];
    const f = framesFromUsage(usage);
    expect(f.idle).toBe(3);
    expect(f["running-right"]).toBe(3);
    expect(f["running-left"]).toBe(TYPICAL_FRAMES[2]);
    expect(f.review).toBe(TYPICAL_FRAMES[8]);
  });
});
