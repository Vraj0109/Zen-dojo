import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { defaultGgufFolders, findGgufFiles, GGUF_MIN_BYTES, isUsableFolder, suggestModelName } from "./gguf";

let root: string;
const gguf = (rel: string, magic = "GGUF") => {
  const p = path.join(root, rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, Buffer.concat([Buffer.from(magic, "latin1"), Buffer.alloc(60)]));
  return p;
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "gguf-test-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("findGgufFiles (plan 0082)", () => {
  it("finds .gguf files up to depth 4 and skips projectors and other files", async () => {
    gguf("a.gguf");
    gguf("x/y/b.GGUF");
    gguf("1/2/3/4/c.gguf");
    gguf("1/2/3/4/5/too-deep.gguf");
    gguf("mmproj-model.gguf");
    gguf("notes.txt");
    const found = await findGgufFiles([root], { minBytes: 0 });
    expect(found.map((f) => f.name).sort()).toEqual(["a.gguf", "b.GGUF", "c.gguf"]);
    expect(found.every((f) => f.folder === root && f.sizeBytes === 64)).toBe(true);
  });

  it("marks files without the GGUF magic", async () => {
    gguf("good.gguf");
    gguf("bad.gguf", "NOPE");
    const found = await findGgufFiles([root], { minBytes: 0 });
    expect(Object.fromEntries(found.map((f) => [f.name, f.isGguf]))).toEqual({ "good.gguf": true, "bad.gguf": false });
  });

  it("skips files under the size limit (adapters) by default", async () => {
    gguf("small.gguf");
    const big = gguf("big.gguf");
    truncateSync(big, GGUF_MIN_BYTES);
    const found = await findGgufFiles([root]);
    expect(found.map((f) => f.name)).toEqual(["big.gguf"]);
    expect(found[0].isGguf).toBe(true);
  });

  it("ignores relative and missing folders and stops at the file cap", async () => {
    expect(await findGgufFiles(["relative/dir", path.join(root, "missing")], { minBytes: 0 })).toEqual([]);
    for (let i = 0; i < 505; i++) writeFileSync(path.join(root, `m${i}.gguf`), "GGUF");
    expect(await findGgufFiles([root], { minBytes: 0 })).toHaveLength(500);
  });
});

describe("suggestModelName (plan 0082)", () => {
  it("cleans the name and drops .gguf", () => {
    expect(suggestModelName("My Model 7B.gguf")).toBe("my-model-7b");
  });
  it("drops the quant tag only when the result stays unique", () => {
    expect(suggestModelName("my-model-Q4_K_M.gguf")).toBe("my-model");
    expect(suggestModelName("my-model-Q4_K_M.gguf", ["my-model-Q4_K_M.gguf", "my-model-Q8_0.gguf"])).toBe("my-model-q4_k_m");
  });
  it("caps the length at 60 and falls back for empty names", () => {
    expect(suggestModelName(`${"a".repeat(80)}.gguf`)).toHaveLength(60);
    expect(suggestModelName("!!!.gguf")).toBe("my-model");
  });
});

describe("folders (plan 0082)", () => {
  it("defaults to the LM Studio folder when present and the app's models folder", () => {
    mkdirSync(path.join(root, ".lmstudio", "models"), { recursive: true });
    vi.stubEnv("HABIT_TOOLS_DIR", path.join(root, "data", "tools"));
    const d = defaultGgufFolders(root);
    expect(d).toEqual([path.join(root, ".lmstudio", "models"), path.join(root, "data", "models")]);
    expect(existsSync(path.join(root, "data", "models"))).toBe(true);
  });
  it("has no defaults without either folder", () => {
    vi.stubEnv("HABIT_TOOLS_DIR", "");
    expect(defaultGgufFolders(root)).toEqual([]);
  });
  it("accepts only absolute, existing folders", () => {
    expect(isUsableFolder(root)).toBe(true);
    expect(isUsableFolder("rel")).toBe(false);
    expect(isUsableFolder(path.join(root, "nope"))).toBe(false);
  });
});
