import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const chatSpy = vi.fn();
const providers = [
  { id: "ollama", label: "This computer (Ollama)", found: true, cloud: false },
  { id: "claude", label: "Claude Code", found: true, cloud: true },
];
vi.mock("@/lib/ai/providers", () => ({
  detectProviders: async () => providers,
  getProvider: (id: string) => ({
    id,
    label: id,
    cloud: id !== "ollama",
    detect: async () => ({ found: true }),
    chat: (...args: unknown[]) => chatSpy(id, ...args),
  }),
}));

import { getAiSettings, setAiSettings } from "@/lib/ui-prefs";
import { POST as status } from "./status/route";
import { POST as settings } from "./settings/route";
import { POST as test } from "./test/route";

const req = (body: unknown, origin: string | null = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/ai/x", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

async function* words(...w: string[]) {
  for (const x of w) yield x;
}

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.stubEnv("HABIT_HOSTED", "");
  chatSpy.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ai provider settings", () => {
  it("status returns the providers, the chosen one and the consent list", async () => {
    await setAiSettings({ provider: "claude", consent: ["claude"] });
    const j = await (await status(req({}))).json();
    expect(j.providers).toEqual(providers);
    expect(j.provider).toBe("claude");
    expect(j.consent).toEqual(["claude"]);
  });

  it("settings saves a provider and consent, and rejects unknown ids", async () => {
    expect((await settings(req({ provider: "claude", consent: ["claude"] }))).status).toBe(200);
    expect(await getAiSettings()).toMatchObject({ provider: "claude", consent: ["claude"] });
    expect((await settings(req({ provider: "evil" }))).status).toBe(400);
    expect((await settings(req({ consent: ["claude", "evil"] }))).status).toBe(400);
    expect((await settings(req({ consent: "claude" }))).status).toBe(400);
    expect(await getAiSettings()).toMatchObject({ provider: "claude", consent: ["claude"] });
  });

  it("settings and test are 404 when hosted and 403 when cross-origin", async () => {
    expect((await test(req({}, "http://evil.example"))).status).toBe(403);
    expect((await settings(req({}, "http://evil.example"))).status).toBe(403);
    vi.stubEnv("HABIT_HOSTED", "1");
    expect((await test(req({}))).status).toBe(404);
  });
});

describe("ai test route", () => {
  it("sends ping through the saved provider and returns the reply", async () => {
    chatSpy.mockImplementation(() => words("po", "ng"));
    const r = await test(req({}));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, reply: "pong" });
    expect(chatSpy.mock.calls[0][0]).toBe("ollama");
    expect(chatSpy.mock.calls[0][1]).toEqual([{ role: "user", content: "ping" }]);
  });

  it("refuses a cloud tool without consent, and allows it with consent", async () => {
    chatSpy.mockImplementation(() => words("pong"));
    const denied = await test(req({ provider: "claude" }));
    expect(denied.status).toBe(403);
    expect((await denied.json()).error).toBe("consent_required");
    expect(chatSpy).not.toHaveBeenCalled();
    await setAiSettings({ consent: ["claude"] });
    expect((await test(req({ provider: "claude" }))).status).toBe(200);
  });

  it("rejects an unknown provider id and reports a failing tool", async () => {
    expect((await test(req({ provider: "evil" }))).status).toBe(400);
    chatSpy.mockImplementation(() => (async function* () { throw new Error("boom"); })());
    const r = await test(req({}));
    expect(r.status).toBe(502);
    expect((await r.json()).ok).toBe(false);
  });
});
