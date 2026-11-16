import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { assertLoopback, chat, importGguf, listModels, pullModel, status, validModelName } from "./ollama";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function stream(lines: string[]): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(c) {
        for (const l of lines) c.enqueue(enc.encode(l));
        c.close();
      },
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("assertLoopback", () => {
  it("accepts loopback hosts", () => {
    expect(assertLoopback("http://localhost:11434")).toBe("http://localhost:11434");
    expect(assertLoopback("http://127.0.0.1:11434/x")).toBe("http://127.0.0.1:11434");
    expect(assertLoopback("http://[::1]:11434")).toBe("http://[::1]:11434");
  });
  it("rejects everything else", () => {
    for (const u of ["http://example.com", "http://192.168.1.5:11434", "http://localhost.evil.com", "ftp://localhost", "nonsense", "http://u:p@localhost"]) {
      expect(() => assertLoopback(u), u).toThrow();
    }
  });
});

describe("model names", () => {
  it("validates", () => {
    expect(validModelName("qwen2.5-coder:7b")).toBe(true);
    expect(validModelName("a b")).toBe(false);
    expect(validModelName("../x;rm")).toBe(false);
    expect(validModelName("")).toBe(false);
  });
});

describe("ollama client", () => {
  it("status ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ version: "0.5.1" }))));
    expect(await status()).toEqual({ running: true, version: "0.5.1" });
  });
  it("status down, and non-loopback is down without a request", async () => {
    const f = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    vi.stubGlobal("fetch", f);
    expect(await status()).toEqual({ running: false });
    expect(await status("http://example.com")).toEqual({ running: false });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("lists models", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ models: [{ name: "a:1" }, { x: 1 }] }))));
    expect(await listModels()).toEqual(["a:1"]);
  });
  it("rejects a bad model name before any request", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(async () => {
      for await (const _ of pullModel("bad name")) void _;
    }).rejects.toThrow();
    expect(f).not.toHaveBeenCalled();
  });
  it("parses a chat stream split across chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => stream(['{"message":{"content":"Hel"}}\n{"mess', 'age":{"content":"lo"}}\nnot json\n{"done":true}\n'])),
    );
    const out: string[] = [];
    for await (const t of chat([{ role: "user", content: "hi" }], "llama3.2:3b")) out.push(t);
    expect(out.join("")).toBe("Hello");
  });
  it("parses pull progress", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => stream(['{"status":"pulling","total":10,"completed":5}\n', '{"status":"success"}\n'])));
    const out = [];
    for await (const p of pullModel("llama3.2:3b")) out.push(p.status);
    expect(out).toEqual(["pulling", "success"]);
  });
  it("passes the abort signal to fetch", async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      if (init.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return stream([]);
    });
    vi.stubGlobal("fetch", f);
    const ac = new AbortController();
    ac.abort();
    await expect(async () => {
      for await (const _ of chat([], "llama3.2:3b", undefined, ac.signal)) void _;
    }).rejects.toThrow();
  });
});

describe("importGguf (plan 0082)", () => {
  const content = Buffer.from("GGUF fake model bytes");
  const digest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
  let dir = "";
  let file = "";
  const setup = () => {
    dir = mkdtempSync(path.join(tmpdir(), "ollama-import-"));
    file = path.join(dir, "my-model.gguf");
    writeFileSync(file, content);
  };
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  const run = async () => {
    const out: unknown[] = [];
    for await (const p of importGguf(file, "my-model", "http://127.0.0.1:11434")) out.push(p);
    return out;
  };

  it("skips the upload when the blob exists, then creates the model", async () => {
    setup();
    const calls: { url: string; method: string; body?: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? "GET", body: typeof init.body === "string" ? init.body : undefined });
      if (init.method === "HEAD") return new Response(null, { status: 200 });
      return stream(['{"status":"parsing GGUF"}\n', '{"status":"success"}\n']);
    }));
    const out = await run();
    cleanup();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`HEAD http://127.0.0.1:11434/api/blobs/${digest}`, "POST http://127.0.0.1:11434/api/create"]);
    expect(JSON.parse(calls[1].body!)).toEqual({ model: "my-model", files: { "my-model.gguf": digest }, stream: true });
    expect(out).toEqual([
      { stage: "hashing", completed: content.length, total: content.length },
      { stage: "creating", status: "parsing GGUF" },
      { stage: "creating", status: "success" },
      { stage: "done" },
    ]);
  });

  it("uploads the blob when it is missing", async () => {
    setup();
    let uploaded = "";
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      if (init.method === "HEAD") return new Response(null, { status: 404 });
      if (url.includes("/api/blobs/")) {
        uploaded = await new Response(init.body).text();
        return new Response(null, { status: 201 });
      }
      return stream(['{"status":"success"}\n']);
    }));
    const out = await run();
    cleanup();
    expect(uploaded).toBe(content.toString());
    expect(out).toContainEqual({ stage: "uploading", completed: content.length, total: content.length });
  });

  it("throws Ollama's message on an error line", async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => (init.method === "HEAD" ? new Response(null, { status: 200 }) : stream(['{"error":"unsupported architecture"}\n']))));
    await expect(run()).rejects.toThrow("Ollama: unsupported architecture");
    cleanup();
  });

  it("refuses a bad name and a non-loopback address", async () => {
    await expect(importGguf("/x.gguf", "bad name;", "http://127.0.0.1:11434").next()).rejects.toThrow("Bad model name.");
    await expect(importGguf("/x.gguf", "ok", "http://example.com").next()).rejects.toThrow();
  });
});
