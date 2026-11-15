import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { lmChat, lmStatus, validLocalModelId } from "./openai-local";

function stream(chunks: string[], init?: ResponseInit): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(c) {
        for (const l of chunks) c.enqueue(enc.encode(l));
        c.close();
      },
    }),
    init,
  );
}

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let s = "";
  for await (const c of gen) s += c;
  return s;
}

const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
const msgs = [{ role: "user" as const, content: "hi" }];

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
});
afterEach(() => vi.unstubAllGlobals());

describe("lmStatus", () => {
  it("lists chat models and hides embedding models", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: [{ id: "qwen/qwen3-4b" }, { id: "my-tune@q4" }, { id: "text-embedding-nomic-embed-text-v1.5" }] })));
    expect(await lmStatus("http://127.0.0.1:1234")).toEqual({ running: true, models: ["qwen/qwen3-4b", "my-tune@q4"] });
  });

  it("reports not running when the server is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    expect(await lmStatus()).toEqual({ running: false });
  });

  it("never calls a non-loopback address", async () => {
    const f = vi.fn(async () => Response.json({ data: [] }));
    vi.stubGlobal("fetch", f);
    expect(await lmStatus("http://example.com")).toEqual({ running: false });
    expect(await lmStatus("http://192.168.1.5:1234")).toEqual({ running: false });
    expect(f).not.toHaveBeenCalled();
    await expect(collect(lmChat(msgs, "m", "http://192.168.1.5:1234"))).rejects.toThrow();
    expect(f).not.toHaveBeenCalled();
  });
});

describe("lmChat", () => {
  it("validates the model id", async () => {
    expect(validLocalModelId("lmstudio-community/Qwen3-4B-GGUF@q4_k_m+x")).toBe(true);
    expect(validLocalModelId("bad id;rm")).toBe(false);
    expect(validLocalModelId("")).toBe(false);
    await expect(collect(lmChat(msgs, "bad id;"))).rejects.toThrow("Bad model name.");
  });

  it("parses a stream split mid-line, ignores reasoning and comments, and stops at [DONE]", async () => {
    const reasoning = `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "thinking" } }] })}\n\n`;
    const full = ": ping\n\n" + reasoning + delta("Hel") + delta("lo") + "data: not json\n\n" + "data: [DONE]\n\n" + delta("AFTER");
    const cut = Math.floor(full.indexOf("lo") - 3);
    let sent: { model?: string; stream?: boolean; messages?: unknown } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        sent = JSON.parse(String(init.body));
        return stream([full.slice(0, cut), full.slice(cut)]);
      }),
    );
    expect(await collect(lmChat(msgs, "qwen/qwen3-4b"))).toBe("Hello");
    expect(sent).toEqual({ model: "qwen/qwen3-4b", messages: msgs, stream: true });
  });

  it("throws a generic error on a non-2xx status or an error object, without the body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("SECRET BODY", { status: 500 })));
    await expect(collect(lmChat(msgs, "m"))).rejects.toThrow(/answered 500/);
    await expect(collect(lmChat(msgs, "m"))).rejects.not.toThrow(/SECRET/);
    vi.stubGlobal("fetch", vi.fn(async () => stream([`data: ${JSON.stringify({ error: { message: "SECRET" } })}\n\n`])));
    await expect(collect(lmChat(msgs, "m"))).rejects.toThrow("The model reported an error.");
  });

  it("stops when aborted", async () => {
    const ac = new AbortController();
    vi.stubGlobal("fetch", vi.fn(async () => stream([delta("a"), delta("b"), delta("c")])));
    const out: string[] = [];
    for await (const p of lmChat(msgs, "m", undefined, ac.signal)) {
      out.push(p);
      ac.abort();
    }
    expect(out).toEqual(["a"]);
  });
});
