import { describe, expect, it } from "vitest";
import { canonicalJson, revOf, sha256Hex } from "./rev";

// Known SHA-256 values (computed with node:crypto; packages/shared has no Node types, so they are pinned here).
const KNOWN: [string, string][] = [
  ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  ["a".repeat(55), "9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318"],
  ["a".repeat(56), "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a"],
  ["a".repeat(64), "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb"],
  ["a".repeat(1000), "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3"],
  ["héllo ✓", "5657cdef8a85a584e0e961e6f8247cf5d3f8ed21496ed6fdbcfd43a761e94245"],
];

describe("rev", () => {
  it("sha256Hex matches known values, including padding edges and UTF-8", () => {
    for (const [s, hex] of KNOWN) expect(sha256Hex(new TextEncoder().encode(s))).toBe(hex);
  });

  it("canonicalJson sorts keys at every level and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: [{ y: 1, x: 2 }], c: undefined } })).toBe('{"a":{"d":[{"x":2,"y":1}]},"b":1}');
  });

  it("revOf is stable under key order and changes with content", () => {
    expect(revOf({ a: 1, b: 2 })).toBe(revOf({ b: 2, a: 1 }));
    expect(revOf({ a: 1 })).not.toBe(revOf({ a: 2 }));
    expect(revOf({ a: 1 })).toHaveLength(16);
  });
});
