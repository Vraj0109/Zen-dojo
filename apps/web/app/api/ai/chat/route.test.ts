import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A stub provider records what it is asked to send; no process or network is involved.
const seen: { messages: { role: string; content: string }[]; opts: { model?: string; url?: string } }[] = [];
vi.mock("@/lib/ai/providers", () => ({
  getProvider: (id: string) => ({
    id,
    label: id,
    cloud: id !== "ollama",
    detect: async () => ({ found: true }),
    async *chat(messages: { role: string; content: string }[], opts: { model?: string; url?: string }) {
      seen.push({ messages, opts });
      yield "stub ";
      yield "answer";
    },
  }),
}));

import { JUDGE_PROBLEMS } from "@habit/shared";
import { setAiSettings } from "@/lib/ui-prefs";
import { getDb } from "@/lib/db";
import { problemNotes } from "@/lib/schema";
import { POST } from "./route";

const PID = "lc-1";
const SECRET = JUDGE_PROBLEMS[PID].solution.cpp.trim().split("\n").find((l) => l.trim().length > 12)!.trim();

const req = (body: unknown, origin: string | null = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const user = (content: string) => ({ role: "user", content });
const ask = (extra: Record<string, unknown> = {}, messages: unknown = [user("Explain the question to me.")]) =>
  POST(req({ problemId: PID, messages, ...extra }));
const systemText = () => seen[seen.length - 1].messages[0].content;

beforeEach(async () => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.stubEnv("HABIT_HOSTED", "");
  seen.length = 0;
  await setAiSettings({ enabled: true, model: "llama3.2:3b" });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function saveCode(code: string) {
  const db = await getDb();
  await db.insert(problemNotes).values({ problemId: PID, code, language: "cpp", updatedAt: "2026-11-11T00:00:00Z" }).onConflictDoNothing();
}

describe("POST /api/ai/chat", () => {
  it("404 when hosted, 403 cross-origin, 403 when disabled", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    expect((await ask()).status).toBe(404);
    vi.stubEnv("HABIT_HOSTED", "");
    expect((await POST(req({ problemId: PID, messages: [user("hi")] }, "http://evil.example"))).status).toBe(403);
    await setAiSettings({ enabled: false });
    expect((await ask()).status).toBe(403);
    expect(seen).toHaveLength(0);
  });

  it("streams the provider's answer using the saved model", async () => {
    const r = await ask();
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("stub answer");
    expect(seen[0].opts.model).toBe("llama3.2:3b");
    expect(seen[0].messages[0].role).toBe("system");
    expect(seen[0].messages[seen[0].messages.length - 1].content).toBe("Explain the question to me.");
  });

  it("400 bad_request for a bad role, bad JSON, missing messages, a last assistant message or a bad intent", async () => {
    for (const messages of [
      [{ role: "system", content: "x" }, user("hi")],
      [{ role: "tool", content: "x" }],
      [],
      "nope",
      [user("hi"), { role: "assistant", content: "yo" }],
      [{ role: "user", content: 5 }],
    ]) {
      const r = await ask({}, messages);
      expect(r.status).toBe(400);
      expect((await r.json()).error).toBe("bad_request");
    }
    expect((await POST(req("{not json"))).status).toBe(400);
    expect((await ask({ intent: "hack" })).status).toBe(400);
    expect((await ask({ revealSolution: "yes" })).status).toBe(400);
    expect(seen).toHaveLength(0);
  });

  it("404 unknown_problem", async () => {
    const r = await POST(req({ problemId: "zzz", messages: [user("hi")] }));
    expect(r.status).toBe(404);
    expect((await r.json()).error).toBe("unknown_problem");
  });

  it("trims an over-long history to the newest 20 messages and clips long ones", async () => {
    const many = Array.from({ length: 41 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }));
    await ask({}, many.slice(0, 40).concat(user("x".repeat(9000))));
    const sent = seen[0].messages.slice(1);
    expect(sent.length).toBeLessThanOrEqual(20);
    expect(sent[sent.length - 1].content.length).toBeLessThanOrEqual(4000);
    expect(sent.some((m) => m.content === "m0")).toBe(false);
  });

  it("review without saved code is 400 no_code; with code it is sent", async () => {
    const r = await ask({ intent: "review" }, [user("Review my code.")]);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("no_code");
    await saveCode("MY_SAVED_CODE_MARKER");
    expect((await ask({ intent: "review" }, [user("Review my code.")])).status).toBe(200);
    expect(systemText()).toContain("MY_SAVED_CODE_MARKER");
  });

  it("includes saved code only when includeCode is true (free chat without code just omits it)", async () => {
    expect((await ask({ includeCode: true })).status).toBe(200);
    expect(systemText()).not.toContain("Learner's code");
    await saveCode("MY_SAVED_CODE_MARKER");
    await ask({ includeCode: false });
    expect(systemText()).not.toContain("MY_SAVED_CODE_MARKER");
    await ask({ includeCode: true });
    expect(systemText()).toContain("MY_SAVED_CODE_MARKER");
  });

  it("the hint intent sends the chosen hint text", async () => {
    await ask({ intent: "hint", hintIndex: 0 });
    expect(systemText()).toContain(JUDGE_PROBLEMS[PID].hints[0].slice(0, 30));
  });

  it("never sends the reference solution without revealSolution, and sends it with revealSolution", async () => {
    expect(SECRET.length).toBeGreaterThan(12);
    for (const extra of [{}, { intent: "solution" }, { intent: "review", includeCode: true }, { revealSolution: false, intent: "solution" }]) {
      await saveCode("code");
      expect((await ask(extra, [user("Explain the solution.")])).status).toBe(200);
    }
    expect(seen).toHaveLength(4);
    for (const call of seen) expect(JSON.stringify(call.messages)).not.toContain(JSON.stringify(SECRET).slice(1, -1));
    seen.length = 0;
    expect((await ask({ intent: "solution", revealSolution: true }, [user("Explain the solution.")])).status).toBe(200);
    expect(JSON.stringify(seen[0].messages)).toContain(JSON.stringify(SECRET).slice(1, -1));
  });

  it("a cloud provider without consent is 403 and nothing is sent; with consent it runs without a model", async () => {
    await setAiSettings({ provider: "claude", consent: [] });
    const r = await ask();
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe("consent_required");
    expect(seen).toHaveLength(0);
    await setAiSettings({ provider: "claude", consent: ["gemini"] });
    expect((await ask()).status).toBe(403);
    await setAiSettings({ provider: "claude", consent: ["claude"] });
    expect((await ask()).status).toBe(200);
    expect(seen[0].opts.model).toBeUndefined();
  });

  it("400 no_model for Ollama with no model chosen", async () => {
    await setAiSettings({ model: "" });
    const r = await ask();
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("no_model");
  });
});
