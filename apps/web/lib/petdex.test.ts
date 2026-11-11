import { describe, expect, it } from "vitest";
import { findZipUrl, isAssetUrl, parsePetdexUrl } from "./petdex";

describe("parsePetdexUrl", () => {
  it("accepts pet pages", () => {
    expect(parsePetdexUrl("https://petdex.dev/pets/shinchan")?.slug).toBe("shinchan");
    expect(parsePetdexUrl(" https://www.petdex.dev/pets/shinchan/?a=1#x ")).toEqual({ slug: "shinchan", pageUrl: "https://petdex.dev/pets/shinchan" });
  });
  it("rejects everything else", () => {
    for (const bad of [
      "http://petdex.dev/pets/a",
      "https://evil.com/pets/a",
      "https://petdex.dev.evil.com/pets/a",
      "https://petdex.dev@evil.com/pets/a",
      "https://petdex.dev:8443/pets/a",
      "https://petdex.dev/pets/",
      "https://petdex.dev/pets/a/b",
      "https://petdex.dev/other/a",
      "https://assets.petdex.dev/pets/a",
      "not a url",
      "",
    ]) {
      expect(parsePetdexUrl(bad)).toBeNull();
    }
  });
});

describe("findZipUrl", () => {
  it("uses the page's only zip link even when the folder name differs from the slug (luffy-2 serves luffy-0a3b70887f85)", () => {
    const z = "https://assets.petdex.dev/pets/luffy-0a3b70887f85/zip.zip";
    expect(findZipUrl(`<a href="${z}">zip</a> <img src="https://assets.petdex.dev/pets/luffy-add769b0a7f9/sprite.webp">`, "luffy-2")).toBe(z);
  });

  it("with several zip links, picks the one that matches the slug's base name", () => {
    const own = "https://assets.petdex.dev/pets/luffy-0a3b70887f85/zip.zip";
    const other = "https://assets.petdex.dev/pets/nika-3bf1011e92de/zip.zip";
    expect(findZipUrl(`${other} ${own}`, "luffy-2")).toBe(own);
  });

  const good = "https://assets.petdex.dev/pets/shinchan-0123456789ab/zip.zip";
  it("finds the pet's zip link", () => {
    expect(findZipUrl(`<a href="${good}">Download</a>`, "shinchan")).toBe(good);
  });
  it("ignores other pets and missing links", () => {
    // two different pets linked and neither matches the slug: never guess
    expect(findZipUrl(`<a href="https://assets.petdex.dev/pets/a-0123456789ab/zip.zip">x</a><a href="https://assets.petdex.dev/pets/b-0123456789ab/zip.zip">y</a>`, "shinchan")).toBeNull();
    expect(findZipUrl("<html></html>", "shinchan")).toBeNull();
    expect(findZipUrl(`https://evil.com/pets/shinchan-0123456789ab/zip.zip`, "shinchan")).toBeNull();
  });
});

describe("isAssetUrl", () => {
  it("allows only assets.petdex.dev over https", () => {
    expect(isAssetUrl("https://assets.petdex.dev/pets/a-0123456789ab/zip.zip")).toBe(true);
    expect(isAssetUrl("https://petdex.dev/x")).toBe(false);
    expect(isAssetUrl("http://assets.petdex.dev/x")).toBe(false);
    expect(isAssetUrl("https://assets.petdex.dev.evil.com/x")).toBe(false);
  });
});
