import { afterEach, describe, expect, it, vi } from "vitest";
import { ByokError, buildProviderRequest, byokChat, parseByokHeaders, statusToCode, textFromEvent, type ByokRequest } from "./byok";

const KEY = "sk-fake-TESTKEY-1234567890abcdef";
const sse = (lines: string[], status = 200) =>
  new Response(
    new ReadableStream({
      start(c) {
        const e = new TextEncoder();
        for (const l of lines) c.enqueue(e.encode(l));
        c.close();
      },
    }),
    { status },
  );
const msgs = [
  { role: "system" as const, content: "SYS" },
  { role: "user" as const, content: "hi" },
  { role: "assistant" as const, content: "yo" },
  { role: "user" as const, content: "again" },
];
const req = (provider: ByokRequest["provider"]): ByokRequest => ({ provider, key: KEY, model: "m-1" });
const collect = async (g: AsyncGenerator<string>) => {
  let t = "";
  for await (const p of g) t += p;
  return t;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parseByokHeaders", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("accepts a good set and defaults the model", () => {
    const r = parseByokHeaders(h({ "x-ai-provider": "gemini", "x-ai-key": KEY }));
    expect(r).toEqual({ provider: "gemini", key: KEY, model: "gemini-3.5-flash-lite" });
    expect((parseByokHeaders(h({ "x-ai-provider": "openai", "x-ai-key": KEY, "x-ai-model": "gpt-x" })) as ByokRequest).model).toBe("gpt-x");
  });
  it("rejects missing, bad provider, bad key and bad model with fixed codes", () => {
    expect((parseByokHeaders(h({})) as ByokError).code).toBe("no_key");
    expect((parseByokHeaders(h({ "x-ai-provider": "evil", "x-ai-key": KEY })) as ByokError).code).toBe("bad_provider");
    expect((parseByokHeaders(h({ "x-ai-provider": "openai", "x-ai-key": "short" })) as ByokError).code).toBe("bad_key_format");
    expect((parseByokHeaders(h({ "x-ai-provider": "openai", "x-ai-key": KEY, "x-ai-model": "a b;c" })) as ByokError).code).toBe("bad_model");
  });
});

describe("request building", () => {
  it("anthropic: key in x-api-key, system split out, never in the URL", () => {
    const b = buildProviderRequest(req("anthropic"), msgs);
    expect(b.url).toBe("https://api.anthropic.com/v1/messages");
    expect(b.headers["x-api-key"]).toBe(KEY);
    const body = b.body as { system: string; stream: boolean; messages: { role: string }[] };
    expect(body.system).toBe("SYS");
    expect(body.stream).toBe(true);
    expect(body.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(b.url).not.toContain(KEY);
  });
  it("openai: bearer header, system kept as a message", () => {
    const b = buildProviderRequest(req("openai"), msgs);
    expect(b.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(b.headers.authorization).toBe(`Bearer ${KEY}`);
    expect((b.body as { messages: unknown[] }).messages).toHaveLength(4);
  });
  it("gemini: key in x-goog-api-key header, not the URL; assistant becomes model", () => {
    const b = buildProviderRequest(req("gemini"), msgs);
    expect(b.url).toContain(":streamGenerateContent?alt=sse");
    expect(b.url).not.toContain(KEY);
    expect(b.headers["x-goog-api-key"]).toBe(KEY);
    const body = b.body as { systemInstruction: unknown; contents: { role: string }[] };
    expect(body.contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(body.systemInstruction).toBeTruthy();
  });
});

describe("streams", () => {
  it("reads Anthropic text deltas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          'event: message_start\ndata: {"type":"message_start"}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hel"}}\n\n',
          'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"x"}}\n\n',
          'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo"}}\n\n',
        ]),
      ),
    );
    expect(await collect(byokChat(req("anthropic"), msgs, new AbortController().signal))).toBe("Hello");
  });
  it("reads OpenAI deltas and stops at [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"A"}}]}\r\n\r\n',
          'data: {"choices":[{"delta":{"content":"B"}}]}\n\ndata: [DONE]\n\n',
        ]),
      ),
    );
    expect(await collect(byokChat(req("openai"), msgs, new AbortController().signal))).toBe("AB");
  });
  it("reads Gemini parts, skips thought parts and handles a chunk split mid-line", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          'data: {"candidates":[{"content":{"parts":[{"text":"no","thought":true},{"text":"Hi "}]}}]}\n\nda',
          'ta: {"candidates":[{"content":{"parts":[{"text":"there"}]}}]}\n\n',
        ]),
      ),
    );
    expect(await collect(byokChat(req("gemini"), msgs, new AbortController().signal))).toBe("Hi there");
  });
  it("textFromEvent ignores junk and turns error events into a fixed error", () => {
    expect(textFromEvent("openai", "not json")).toBe("");
    expect(() => textFromEvent("anthropic", '{"type":"error","error":{"message":"secret upstream text"}}')).toThrow(ByokError);
  });
});

describe("key safety", () => {
  it("maps statuses to fixed codes", () => {
    expect([401, 403, 404, 429, 400, 503].map(statusToCode)).toEqual(["invalid_key", "invalid_key", "model_not_found", "rate_limited", "provider_rejected", "provider_unavailable"]);
  });
  it("errors never contain the key or the upstream body, and nothing is logged", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    vi.stubGlobal("fetch", vi.fn(async () => sse([`{"error":{"message":"Incorrect API key provided: ${KEY}"}}`], 401)));
    let err: unknown;
    try {
      await collect(byokChat(req("openai"), msgs, new AbortController().signal));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ByokError);
    const text = JSON.stringify({ m: (err as Error).message, s: String((err as Error).stack).split("\n")[0], c: (err as ByokError).code });
    expect(text).not.toContain(KEY);
    expect(text).not.toContain("Incorrect");
    expect((err as ByokError).code).toBe("invalid_key");
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
  it("a network failure whose message holds the key becomes a fixed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError(`failed ${KEY}`);
      }),
    );
    let err: unknown;
    try {
      await collect(byokChat(req("anthropic"), msgs, new AbortController().signal));
    } catch (e) {
      err = e;
    }
    expect((err as ByokError).code).toBe("network");
    expect((err as Error).message).not.toContain(KEY);
  });
});
