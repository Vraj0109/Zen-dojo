import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { isSafeZipPath, readZip } from "./zip";

interface Entry {
  name: string;
  data: Uint8Array;
  method?: 0 | 8;
}

function le(n: number, bytes: number): number[] {
  return Array.from({ length: bytes }, (_, i) => (n >>> (8 * i)) & 0xff);
}

function buildZip(entries: Entry[]): Uint8Array {
  const parts: number[] = [];
  const central: number[] = [];
  for (const e of entries) {
    const method = e.method ?? 8;
    const comp = method === 8 ? new Uint8Array(deflateRawSync(e.data)) : e.data;
    const name = Array.from(new TextEncoder().encode(e.name));
    const offset = parts.length;
    parts.push(...le(0x04034b50, 4), ...le(20, 2), ...le(0, 2), ...le(method, 2), ...le(0, 4), ...le(0, 4));
    parts.push(...le(comp.length, 4), ...le(e.data.length, 4), ...le(name.length, 2), ...le(0, 2), ...name, ...comp);
    central.push(...le(0x02014b50, 4), ...le(20, 2), ...le(20, 2), ...le(0, 2), ...le(method, 2), ...le(0, 4), ...le(0, 4));
    central.push(...le(comp.length, 4), ...le(e.data.length, 4), ...le(name.length, 2), ...le(0, 2), ...le(0, 2));
    central.push(...le(0, 2), ...le(0, 2), ...le(0, 4), ...le(offset, 4), ...name);
  }
  const cdOffset = parts.length;
  const end = [...le(0x06054b50, 4), ...le(0, 2), ...le(0, 2), ...le(entries.length, 2), ...le(entries.length, 2), ...le(central.length, 4), ...le(cdOffset, 4), ...le(0, 2)];
  return new Uint8Array([...parts, ...central, ...end]);
}

const text = (s: string) => new TextEncoder().encode(s);

describe("readZip", () => {
  it("reads stored and deflated entries", async () => {
    const zip = buildZip([
      { name: "pet.json", data: text('{"id":"x"}'), method: 8 },
      { name: "a.bin", data: new Uint8Array([1, 2, 3]), method: 0 },
    ]);
    const files = await readZip(zip);
    expect(new TextDecoder().decode(files.get("pet.json"))).toBe('{"id":"x"}');
    expect(Array.from(files.get("a.bin")!)).toEqual([1, 2, 3]);
  });

  it("rejects non-zips", async () => {
    await expect(readZip(text("hello"))).rejects.toThrow(/not a valid zip/);
  });

  it("rejects zip-slip and absolute paths", async () => {
    await expect(readZip(buildZip([{ name: "../evil", data: text("x"), method: 0 }]))).rejects.toThrow(/unsafe/);
    await expect(readZip(buildZip([{ name: "/evil", data: text("x"), method: 0 }]))).rejects.toThrow(/unsafe/);
  });

  it("rejects more than 20 entries", async () => {
    const entries = Array.from({ length: 21 }, (_, i) => ({ name: `f${i}`, data: text("x"), method: 0 as const }));
    await expect(readZip(buildZip(entries))).rejects.toThrow(/too many/);
  });

  it("rejects an entry over 8 MB", async () => {
    const big = new Uint8Array(8 * 1024 * 1024 + 1);
    await expect(readZip(buildZip([{ name: "big", data: big }]))).rejects.toThrow(/too large/);
  });

  it("rejects a total over 12 MB", async () => {
    const part = new Uint8Array(5 * 1024 * 1024);
    const entries = [1, 2, 3].map((i) => ({ name: `p${i}`, data: part }));
    await expect(readZip(buildZip(entries))).rejects.toThrow(/too large/);
  });
});

describe("isSafeZipPath", () => {
  it("accepts plain names and rejects traversal", () => {
    expect(isSafeZipPath("spritesheet.webp")).toBe(true);
    expect(isSafeZipPath("a/b.json")).toBe(true);
    expect(isSafeZipPath("a/../b")).toBe(false);
    expect(isSafeZipPath("C:/x")).toBe(false);
  });
});
