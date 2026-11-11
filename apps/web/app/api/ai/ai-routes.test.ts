import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { setAiSettings } from "@/lib/ui-prefs";
import { POST as status } from "./status/route";
import { POST as chat } from "./chat/route";
import { POST as pull } from "./pull/route";

const req = (body: unknown, origin: string | null = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/ai/x", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

function ndjson(lines: string[]) {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { for (const l of lines) c.enqueue(enc.encode(l)); c.close(); } }));
}

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.stubEnv("HABIT_HOSTED", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ai routes", () => {
  it("404 when hosted", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    for (const r of [status, chat, pull]) expect((await r(req({}))).status).toBe(404);
  });

  it("403 when cross-origin", async () => {
    for (const r of [status, chat, pull]) expect((await r(req({}, "http://evil.example"))).status).toBe(403);
  });

  it("403 when disabled, except status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect((await chat(req({ problemId: "lc-1", action: "hint" }))).status).toBe(403);
    expect((await pull(req({ model: "llama3.2:3b" }))).status).toBe(403);
    const r = await status(req({}));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.enabled).toBe(false);
    expect(j.ollama).toEqual({ running: false });
  });

  it("streams a chat answer when enabled", async () => {
    await setAiSettings({ enabled: true, model: "llama3.2:3b" });
    const f = vi.fn(async () => ndjson(['{"message":{"content":"Think "}}\n', '{"message":{"content":"first"}}\n{"done":true}\n']));
    vi.stubGlobal("fetch", f);
    const r = await chat(req({ problemId: "lc-1", action: "hint", hintIndex: 0 }));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("Think first");
    expect(String((f.mock.calls[0] as unknown[])[0])).toBe("http://127.0.0.1:11434/api/chat");
  });

  it("rejects bad input and unknown problems, and a review with no saved code", async () => {
    await setAiSettings({ enabled: true, model: "llama3.2:3b" });
    expect((await chat(req({ problemId: "lc-1", action: "nope" }))).status).toBe(400);
    expect((await chat(req({ problemId: "zzz", action: "hint" }))).status).toBe(404);
    expect((await chat(req({ problemId: "lc-1", action: "review" }))).status).toBe(400);
    expect((await pull(req({ model: "bad name" }))).status).toBe(400);
  });

  it("refuses a non-loopback Ollama address", async () => {
    await setAiSettings({ enabled: true, model: "llama3.2:3b", url: "http://example.com:11434" });
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const r = await chat(req({ problemId: "lc-1", action: "hint" }));
    expect(await r.text()).toContain("stopped");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("ai settings route", () => {
  it("turns the switch on, rejects a non-loopback URL and 404s when hosted", async () => {
    const { POST: settings } = await import("./settings/route");
    const { getAiSettings } = await import("@/lib/ui-prefs");
    expect((await settings(req({ enabled: true, model: "llama3.2:3b" }))).status).toBe(200);
    expect(await getAiSettings()).toMatchObject({ enabled: true, model: "llama3.2:3b" });
    expect((await settings(req({ url: "http://example.com" }))).status).toBe(400);
    expect((await settings(req({ enabled: "yes" }))).status).toBe(400);
    vi.stubEnv("HABIT_HOSTED", "1");
    expect((await settings(req({ enabled: true }))).status).toBe(404);
  });
});
