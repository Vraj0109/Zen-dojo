import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { getAiSettings, setAiSettings } from "@/lib/ui-prefs";
import { POST as status } from "./status/route";
import { POST as chat } from "./chat/route";
import { POST as settings } from "./settings/route";
import { POST as test } from "./test/route";

// Plan 0078: LM Studio (or any OpenAI-compatible loopback server) through the real provider, with a stubbed server.

const req = (body: unknown, origin: string | null = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/ai/x", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

type Sent = { url: string; body: { model?: string; messages?: { role: string; content: string }[] } };

function fakeLmStudio(sent: Sent[]) {
  return vi.fn(async (u: string | URL, init?: RequestInit) => {
    const url = String(u);
    if (url.endsWith("/v1/models")) return Response.json({ data: [{ id: "my-tune@q4" }] });
    if (url.endsWith("/v1/chat/completions")) {
      sent.push({ url, body: JSON.parse(String(init?.body)) });
      const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: "Think " } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: { content: "first" } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sse);
    }
    throw new Error("down");
  });
}

const ask = () => chat(req({ problemId: "lc-1", intent: "hint", hintIndex: 0, messages: [{ role: "user", content: "Explain hint 1." }] }));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.stubEnv("HABIT_HOSTED", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LM Studio routes", () => {
  it("streams a chat through LM Studio with its own model and address", async () => {
    const sent: Sent[] = [];
    vi.stubGlobal("fetch", fakeLmStudio(sent));
    await setAiSettings({ enabled: true, provider: "lmstudio", lmstudioModel: "my-tune@q4", model: "llama3.2:3b" });
    const r = await ask();
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("Think first");
    expect(sent[0].url).toBe("http://127.0.0.1:1234/v1/chat/completions");
    expect(sent[0].body.model).toBe("my-tune@q4");
    expect(sent[0].body.messages?.[0].role).toBe("system");
  });

  it("no_model when the LM Studio model is empty, even with an Ollama model saved", async () => {
    vi.stubGlobal("fetch", fakeLmStudio([]));
    await setAiSettings({ enabled: true, provider: "lmstudio", model: "llama3.2:3b" });
    const r = await ask();
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ error: "no_model" });
  });

  it("with the fold on, no system message is sent and the first user message starts with the instructions", async () => {
    const off: Sent[] = [];
    vi.stubGlobal("fetch", fakeLmStudio(off));
    await setAiSettings({ enabled: true, provider: "lmstudio", lmstudioModel: "my-tune@q4" });
    await (await ask()).text();
    const system = off[0].body.messages!.find((m) => m.role === "system")!.content;

    const on: Sent[] = [];
    vi.stubGlobal("fetch", fakeLmStudio(on));
    await setAiSettings({ foldSystem: true });
    await (await ask()).text();
    const msgs = on[0].body.messages!;
    expect(msgs.some((m) => m.role === "system")).toBe(false);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content.startsWith(system)).toBe(true);
    expect(msgs[0].content.endsWith("Explain hint 1.")).toBe(true);
  });

  it("Test pings LM Studio", async () => {
    const sent: Sent[] = [];
    vi.stubGlobal("fetch", fakeLmStudio(sent));
    await setAiSettings({ provider: "lmstudio", lmstudioModel: "my-tune@q4" });
    const r = await test(req({}));
    expect(await r.json()).toEqual({ ok: true, reply: "Think first" });
    expect(sent[0].body.model).toBe("my-tune@q4");
  });

  it("settings: loopback address, model id and fold switch are validated", async () => {
    expect((await settings(req({ lmstudioUrl: "http://192.168.1.5:1234" }))).status).toBe(400);
    expect(await (await settings(req({ lmstudioUrl: "http://example.com" }))).json()).toMatchObject({ error: "not_loopback" });
    expect((await settings(req({ lmstudioModel: "bad id;" }))).status).toBe(400);
    expect((await settings(req({ foldSystem: "yes" }))).status).toBe(400);
    expect((await settings(req({ provider: "lmstudio", lmstudioUrl: "http://localhost:4321/x", lmstudioModel: "a/b@c", foldSystem: true }))).status).toBe(200);
    expect(await getAiSettings()).toMatchObject({ provider: "lmstudio", lmstudioUrl: "http://localhost:4321", lmstudioModel: "a/b@c", foldSystem: true });
  });

  it("status includes LM Studio, its model and the fold switch", async () => {
    vi.stubGlobal("fetch", fakeLmStudio([]));
    await setAiSettings({ lmstudioModel: "my-tune@q4" });
    const j = await (await status(req({}))).json();
    expect(j.lmstudio).toEqual({ running: true, models: ["my-tune@q4"] });
    expect(j.lmstudioModel).toBe("my-tune@q4");
    expect(j.foldSystem).toBe(false);
  });

  it("is 404 on the hosted site", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    expect((await settings(req({ lmstudioUrl: "http://127.0.0.1:1234" }))).status).toBe(404);
  });
});
