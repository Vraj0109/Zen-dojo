import { describe, expect, it } from "vitest";
import { AVATAR_MAX_BYTES, validateAvatarFile } from "./import-avatar";

const bytes = (...n: number[]) => new Uint8Array(n);
const text = (s: string) => new TextEncoder().encode(s);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const WEBP = bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);

describe("validateAvatarFile", () => {
  it("accepts real png, jpeg, gif and webp", () => {
    expect(validateAvatarFile({ type: "image/png", size: 100, bytesHead: PNG }).ok).toBe(true);
    expect(validateAvatarFile({ type: "image/jpeg", size: 100, bytesHead: bytes(0xff, 0xd8, 0xff, 0xe0) }).ok).toBe(true);
    expect(validateAvatarFile({ type: "image/gif", size: 100, bytesHead: text("GIF89a") }).ok).toBe(true);
    expect(validateAvatarFile({ type: "image/webp", size: 100, bytesHead: WEBP }).ok).toBe(true);
  });

  it("refuses wrong types, empty and oversized files", () => {
    expect(validateAvatarFile({ type: "text/html", size: 10, bytesHead: text("<html>") }).ok).toBe(false);
    expect(validateAvatarFile({ type: "image/png", size: 0, bytesHead: PNG }).ok).toBe(false);
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES + 1, bytesHead: PNG }).ok).toBe(false);
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES, bytesHead: PNG }).ok).toBe(true);
  });

  it("refuses a file whose bytes do not match its type", () => {
    expect(validateAvatarFile({ type: "image/png", size: 10, bytesHead: bytes(0xff, 0xd8, 0xff) }).ok).toBe(false);
    expect(validateAvatarFile({ type: "image/webp", size: 10, bytesHead: PNG }).ok).toBe(false);
    expect(validateAvatarFile({ type: "image/gif", size: 10, bytesHead: bytes(1, 2) }).ok).toBe(false);
  });

  it("accepts a plain svg and refuses scripts", () => {
    const ok = (s: string) => validateAvatarFile({ type: "image/svg+xml", size: s.length, bytesHead: text(s) }).ok;
    expect(ok('<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>')).toBe(true);
    expect(ok('  <?xml version="1.0"?><svg></svg>')).toBe(true);
    expect(ok("<html></html>")).toBe(false);
    expect(ok("<svg><script>alert(1)</script></svg>")).toBe(false);
    expect(ok('<svg onload="x()"></svg>')).toBe(false);
    expect(ok('<svg><image onerror="x()"/></svg>')).toBe(false);
    expect(ok('<svg><a href="javascript:x()"/></svg>')).toBe(false);
    expect(ok("<svg><foreignObject></foreignObject></svg>")).toBe(false);
    expect(ok("<svg><SCRIPT>x</SCRIPT></svg>")).toBe(false);
  });
});
