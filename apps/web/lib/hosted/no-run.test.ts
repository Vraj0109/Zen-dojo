import { afterEach, describe, expect, it, vi } from "vitest";
import { hostedNoRun } from "./no-run";

vi.mock("@/lib/judge/run", () => ({ JUDGE_LIMITS: { code: 1000 }, runCode: vi.fn(), runCustom: vi.fn() }));
vi.mock("@/lib/judge/run-project", () => ({ runJavaProject: vi.fn() }));
vi.mock("@/lib/dsa", () => ({}));
vi.mock("@/lib/notes", () => ({}));
vi.mock("@/lib/content", () => ({ resolveProblemSpec: vi.fn(async () => undefined) }));
vi.mock("@/lib/packs", () => ({}));
vi.mock("@/lib/solution-runs", () => ({ getRuns: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/tools/handlers", () => ({
  handleInstall: vi.fn(async () => Response.json({ reached: true })),
  handleRemove: vi.fn(async () => Response.json({ reached: true })),
  handleStatus: vi.fn(async () => Response.json({ reached: true })),
}));

afterEach(() => vi.unstubAllEnvs());

const post = (url: string) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
    body: "{}",
  });

describe("hostedNoRun", () => {
  it("is null on desktop and a 403 hosted-no-run when hosted", async () => {
    expect(hostedNoRun()).toBeNull();
    vi.stubEnv("HABIT_HOSTED", "1");
    const res = hostedNoRun();
    expect(res?.status).toBe(403);
    expect(await res?.json()).toMatchObject({ ok: false, error: "hosted-no-run" });
  });
});

describe("program-running routes", () => {
  it("return 403 hosted-no-run when hosted", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    const run = await import("../../app/api/judge/run/route");
    const proj = await import("../../app/api/judge/run-project/route");
    const inst = await import("../../app/api/tools/install/route");
    const rem = await import("../../app/api/tools/remove/route");
    const stat = await import("../../app/api/tools/status/route");
    const responses = [
      await run.POST(post("http://x/api/judge/run")),
      await run.GET(new Request("http://x/api/judge/run?id=a")),
      await proj.POST(post("http://x/api/judge/run-project")),
      await inst.POST(post("http://x/api/tools/install")),
      await rem.POST(post("http://x/api/tools/remove")),
      await stat.GET(new Request("http://x/api/tools/status")),
    ];
    for (const r of responses) {
      expect(r.status).toBe(403);
      expect((await r.json()).error).toBe("hosted-no-run");
    }
  });

  it("still work without hosted mode", async () => {
    const proj = await import("../../app/api/judge/run-project/route");
    const r = await proj.POST(post("http://x/api/judge/run-project"));
    expect(r.status).toBe(400); // got past the guard to normal validation
    const inst = await import("../../app/api/tools/install/route");
    expect((await inst.POST(post("http://x/api/tools/install"))).status).toBe(200);
  });
});
