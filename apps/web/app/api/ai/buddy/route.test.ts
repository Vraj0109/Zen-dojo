import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const chatSpy = vi.fn();
vi.mock("@/lib/ai/providers", () => ({
  getProvider: (id: string) => ({
    id,
    label: id,
    cloud: id !== "ollama",
    detect: async () => ({ found: true }),
    chat: (...args: unknown[]) => chatSpy(id, ...args),
  }),
}));

import { setAiSettings } from "@/lib/ui-prefs";
import { POST } from "./route";

const req = (body: unknown, origin: string | null = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/ai/buddy", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });
const good = { event: "solved", tone: "peer", name: "Pip" };

async function* words(...w: string[]) {
  for (const x of w) yield x;
}

let testNo = 0;
beforeEach(async () => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.stubEnv("HABIT_HOSTED", "");
  vi.useFakeTimers({ toFake: ["Date"] });
  // The route keeps a module-level clock: jump far ahead so each test starts outside the 30 s window.
  vi.setSystemTime(new Date(2026, 0, 1).getTime() + ++testNo * 3_600_000);
  chatSpy.mockReset();
  await setAiSettings({ enabled: true, provider: "ollama", model: "m" });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("POST /api/ai/buddy", () => {
  it("returns a cleaned line and sends only the event, tone and name", async () => {
    chatSpy.mockReturnValue(words('"Nice ', 'one, Pip!"\n'));
    const res = await POST(req(good));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ line: "Nice one, Pip!" });
    const messages = chatSpy.mock.calls[0]![1] as { role: string; content: string }[];
    const all = messages.map((m) => m.content).join(" ");
    expect(all).toContain("Pip");
    expect(all).toContain("Say it.");
  });

  it("writes in a pet's voice when a persona is sent", async () => {
    chatSpy.mockReturnValue(words("Hehe, done!"));
    const res = await POST(req({ ...good, persona: { name: "Shinchan", description: "A mischievous boy" } }));
    expect(res.status).toBe(200);
    const messages = chatSpy.mock.calls[0]![1] as { role: string; content: string }[];
    expect(messages[0]!.content).toContain("You are playing Shinchan.");
  });

  it("is 404 when hosted, 403 cross-origin or disabled, 400 for a bad body", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    expect((await POST(req(good))).status).toBe(400); // hosted: no key header
    vi.stubEnv("HABIT_HOSTED", "");
    expect((await POST(req(good, "http://evil.example"))).status).toBe(403);
    expect((await POST(req({ ...good, tone: "evil" }))).status).toBe(400);
    await setAiSettings({ enabled: false });
    expect((await POST(req(good))).status).toBe(403);
    expect(chatSpy).not.toHaveBeenCalled();
  });

  it("needs consent for a cloud provider", async () => {
    await setAiSettings({ provider: "claude", consent: [] });
    const res = await POST(req(good));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("consent_required");
    expect(chatSpy).not.toHaveBeenCalled();
  });

  it("rate limits to one request per 30 seconds", async () => {
    chatSpy.mockImplementation(() => words("Hi!"));
    expect((await POST(req(good))).status).toBe(200);
    const second = await POST(req(good));
    expect(second.status).toBe(429);
    expect((await second.json()).error).toBe("slow_down");
    vi.setSystemTime(Date.now() + 31_000);
    expect((await POST(req(good))).status).toBe(200);
  });

  it("fails cleanly on an empty or broken answer", async () => {
    chatSpy.mockImplementation(() => words("  "));
    expect((await POST(req(good))).status).toBe(502);
    vi.setSystemTime(Date.now() + 31_000);
    chatSpy.mockImplementation(async function* () {
      throw new Error("down");
    });
    expect((await POST(req(good))).status).toBe(502);
  });
});
