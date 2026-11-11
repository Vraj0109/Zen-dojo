import { describe, expect, it } from "vitest";
import { STDCXX_SHIM, STD_HEADERS, isClangVersion } from "./cpp-shim";

describe("clang stand-in for bits/stdc++.h", () => {
  it("includes the common headers and nothing GCC-only", () => {
    for (const h of ["algorithm", "vector", "iostream", "unordered_map", "bitset", "cmath", "numeric"]) expect(STDCXX_SHIM).toContain(`#include <${h}>`);
    expect(STD_HEADERS.some((h) => h.startsWith("bits/") || h.startsWith("ext/"))).toBe(false);
  });

  it("recognises Apple's clang masquerading as g++", () => {
    expect(isClangVersion("Apple clang version 15.0.0 (clang-1500.3.9.4)\nTarget: arm64-apple-darwin23.6.0")).toBe(true);
    expect(isClangVersion("g++ (Rev3, Built by MSYS2 project) 14.2.0")).toBe(false);
  });
});
