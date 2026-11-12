import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const dbCalls = vi.hoisted(() => ({ n: 0 }));
vi.mock("@/lib/db", () => ({ getDb: async () => { dbCalls.n++; throw new Error("db must not be used"); } }));
import { LESSONS } from "@habit/shared";
import { POST as chat } from "./chat/route";
import { POST as buddy } from "./buddy/route";
import { POST as test } from "./test/route";
import { POST as status } from "./status/route";

const KEY = "sk-fake-ROUTEKEY-0987654321zyxwvu";
const mk = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost:3000/api/ai/${path}`, {
    method: "POST",
    headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const keyHeaders = (provider = "openai") => ({ "x-ai-provider": provider, "x-ai-key": KEY });
const sse = (lines: string[], st = 200) =>
  new Response(
    new ReadableStream({
      start(c) {
        const e = new TextEncoder();
        for (const l of lines) c.enqueue(e.encode(l));
        c.close();
      },
    }),
    { status: st },
  );
const openaiOk = () => sse(['data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n', 'data: {"choices":[{"delta":{"content":" world"}}]}\n\ndata: [DONE]\n\n']);

let fetchMock: ReturnType<typeof vi.fn>;
let spies: { mock: { calls: unknown[] } }[];
const lessonId = Object.keys(LESSONS)[0]!;
const lessonBody = { lessonId, messages: [{ role: "user", content: "Explain" }] };

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.stubEnv("HABIT_HOSTED", "1");
  fetchMock = vi.fn(async () => openaiOk());
  vi.stubGlobal("fetch", fetchMock);
  spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("hosted AI routes (bring your own key)", () => {
  it("chat streams through the provider with the key in a header only", async () => {
    const res = await chat(mk("chat", lessonBody, keyHeaders()));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello world");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(url).not.toContain(KEY);
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    expect(String(init.body)).not.toContain(KEY);
    for (const s of spies) expect(s.mock.calls).toHaveLength(0);
  });

  it("never persists the key: the AI routes do not touch the database at all", async () => {
    await (await chat(mk("chat", lessonBody, keyHeaders()))).text();
    await test(mk("test", {}, keyHeaders()));
    await buddy(mk("buddy", { event: "solved", tone: "peer", name: "Pip" }, keyHeaders()));
    expect(dbCalls.n).toBe(0);
  });

  it("a bad key gives a fixed-code error without the key or the upstream text", async () => {
    fetchMock.mockImplementation(async () => sse([`{"error":{"message":"bad key ${KEY}"}}`], 401));
    const res = await chat(mk("chat", lessonBody, keyHeaders()));
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: "invalid_key" });
    expect(text).not.toContain(KEY);
    for (const s of spies) expect(s.mock.calls).toHaveLength(0);
  });

  it("rejects a missing key, a malformed key and cross-origin without calling the provider or echoing the value", async () => {
    expect((await chat(mk("chat", lessonBody))).status).toBe(400);
    const bad = await chat(mk("chat", lessonBody, { "x-ai-provider": "openai", "x-ai-key": "bad key with space" }));
    expect(bad.status).toBe(400);
    expect(await bad.text()).not.toContain("with space");
    const cross = new Request("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "http://evil.example", ...keyHeaders() },
      body: JSON.stringify(lessonBody),
    });
    expect((await chat(cross)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("test and buddy use the same key path; status says hosted; gemini keeps the key out of the URL", async () => {
    expect(await (await test(mk("test", {}, keyHeaders()))).json()).toEqual({ ok: true, reply: "Hello world" });
    const b = await buddy(mk("buddy", { event: "solved", tone: "peer", name: "Pip" }, keyHeaders()));
    expect(await b.json()).toEqual({ line: "Hello world" });
    expect(await (await status(mk("status", {}))).json()).toEqual({ ok: true, hosted: true });
    fetchMock.mockImplementation(async () => sse(['data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n']));
    const g = await test(mk("test", {}, { ...keyHeaders("gemini"), "x-ai-model": "gemini-custom" }));
    expect(await g.json()).toEqual({ ok: true, reply: "ok" });
    const lastUrl = fetchMock.mock.calls.at(-1)![0] as string;
    expect(lastUrl).toContain("models/gemini-custom:streamGenerateContent");
    expect(lastUrl).not.toContain(KEY);
  });
});
