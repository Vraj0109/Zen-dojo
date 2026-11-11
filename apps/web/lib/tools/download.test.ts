import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CatalogEntry } from "@habit/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ToolError, downloadVerified } from "./download";

const DATA = Buffer.from("hello portable tools ".repeat(500));
const entry: CatalogEntry = {
  version: "1.0",
  url: "https://github.com/acme/tool/releases/download/v1/tool.zip",
  sha256: createHash("sha256").update(DATA).digest("hex"),
  bytes: DATA.length,
  diskBytes: 1000,
  archive: "zip",
  binDir: "bin",
  license: "MIT",
  source: "Acme",
};

let dir: string;
let dest: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "zd-dl-"));
  dest = path.join(dir, "tool.part");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const ok = (data: Buffer = DATA, headers: Record<string, string> = {}) => new Response(new Uint8Array(data), { status: 200, headers });
const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });
const stub = (...answers: Response[]) => {
  const urls: string[] = [];
  const f = (async (u: string) => {
    urls.push(u);
    const a = answers.shift();
    if (!a) throw new Error("unexpected request");
    return a;
  }) as unknown as typeof fetch;
  return { f, urls };
};

describe("downloadVerified", () => {
  it("downloads, reports progress and keeps the file", async () => {
    const { f } = stub(ok());
    const seen: number[] = [];
    await downloadVerified(entry, dest, { fetch: f, onProgress: (r) => seen.push(r) });
    expect(fs.readFileSync(dest).equals(DATA)).toBe(true);
    expect(seen.at(-1)).toBe(DATA.length);
  });

  it("follows redirects to allowed hosts", async () => {
    const { f, urls } = stub(redirect("https://objects.githubusercontent.com/abc?sig=1"), ok());
    await downloadVerified(entry, dest, { fetch: f });
    expect(urls).toHaveLength(2);
  });

  it("refuses a wrong hash and deletes the file", async () => {
    const bad = Buffer.from(DATA);
    bad[0] ^= 1;
    const { f } = stub(ok(bad));
    await expect(downloadVerified(entry, dest, { fetch: f })).rejects.toMatchObject({ code: "hash" });
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("refuses a file that is too large", async () => {
    const big = Buffer.concat([DATA, Buffer.alloc(Math.ceil(DATA.length * 0.2))]);
    const { f } = stub(ok(big));
    await expect(downloadVerified(entry, dest, { fetch: f })).rejects.toMatchObject({ code: "too_large" });
    expect(fs.existsSync(dest)).toBe(false);
    const { f: f2 } = stub(ok(DATA, { "content-length": String(DATA.length * 2) }));
    await expect(downloadVerified(entry, dest, { fetch: f2 })).rejects.toMatchObject({ code: "too_large" });
  });

  it("refuses a redirect to a host that is not allowed", async () => {
    const { f, urls } = stub(redirect("https://evil.example.com/tool.zip"));
    await expect(downloadVerified(entry, dest, { fetch: f })).rejects.toMatchObject({ code: "host" });
    expect(urls).toHaveLength(1);
  });

  it("refuses a redirect to plain http", async () => {
    const { f } = stub(redirect("http://github.com/tool.zip"));
    await expect(downloadVerified(entry, dest, { fetch: f })).rejects.toMatchObject({ code: "host" });
  });

  it("allows 3 redirects but not 4", async () => {
    const hop = "https://github.com/next";
    const three = stub(redirect(hop), redirect(hop), redirect(hop), ok());
    await downloadVerified(entry, dest, { fetch: three.f });
    const four = stub(redirect(hop), redirect(hop), redirect(hop), redirect(hop), ok());
    await expect(downloadVerified(entry, dest, { fetch: four.f })).rejects.toMatchObject({ code: "redirects" });
  });

  it("stops when aborted", async () => {
    const ctl = new AbortController();
    const f = (async () => {
      ctl.abort();
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    }) as unknown as typeof fetch;
    await expect(downloadVerified(entry, dest, { fetch: f, signal: ctl.signal })).rejects.toMatchObject({ code: "aborted" });
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("stops in the middle of a body when aborted", async () => {
    const ctl = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(new Uint8Array(100));
        ctl.abort();
        c.error(Object.assign(new Error("aborted"), { name: "AbortError" }));
      },
    });
    const f = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
    await expect(downloadVerified(entry, dest, { fetch: f, signal: ctl.signal })).rejects.toBeInstanceOf(ToolError);
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("rejects an invalid entry and an http error", async () => {
    await expect(downloadVerified({ ...entry, url: "http://github.com/x.zip" }, dest, { fetch: stub().f })).rejects.toMatchObject({ code: "bad_entry" });
    await expect(downloadVerified(entry, dest, { fetch: stub(new Response("no", { status: 404 })).f })).rejects.toMatchObject({ code: "http" });
  });
});
