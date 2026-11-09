import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/judge/run/route";
import { RUN_CODE_LIMIT, getRuns, saveRun } from "./solution-runs";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 9, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("solution runs", () => {
  it("keeps one row per problem and language, holding the latest run", async () => {
    await saveRun("lc-1", "cpp", "first", { status: "done", passed: 3, total: 10 });
    vi.setSystemTime(new Date(2026, 10, 10, 9));
    await saveRun("lc-1", "cpp", "second", { status: "done", passed: 10, total: 10 });
    await saveRun("lc-1", "java", "java code", { status: "compile_error", passed: 0, total: 0 });
    await saveRun("lc-2", "cpp", "other problem", { status: "done", passed: 1, total: 4 });

    const runs = await getRuns("lc-1");
    expect(runs).toHaveLength(2);
    expect(runs.find((r) => r.lang === "cpp")).toMatchObject({ code: "second", ranOn: "2026-11-10", status: "done", passed: 10, total: 10 });
    expect(runs.find((r) => r.lang === "java")).toMatchObject({ status: "compile_error" });
  });

  it("refuses code over 100 KB and keeps the earlier run", async () => {
    await saveRun("lc-1", "cpp", "small", { status: "done", passed: 1, total: 2 });
    expect(await saveRun("lc-1", "cpp", "x".repeat(RUN_CODE_LIMIT + 1), { status: "done", passed: 2, total: 2 })).toBe(false);
    expect((await getRuns("lc-1"))[0].code).toBe("small");
  });
});

describe("judge route", () => {
  const headers = { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" };
  const post = (body: unknown) => POST(new Request("http://localhost:3000/api/judge/run", { method: "POST", headers, body: JSON.stringify(body) }));

  it("says which value of a custom input does not fit", async () => {
    const res = await post({ id: "lc-1", lang: "cpp", code: "class Solution {};", input: [[2, 7, 11, 15], "9"] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "target must be an int." });
    const few = await post({ id: "lc-1", lang: "cpp", code: "class Solution {};", input: [[1]] });
    expect(((await few.json()) as { error: string }).error).toContain("takes 2 values");
  });

  it("lists the saved runs of a problem and refuses unknown problems", async () => {
    await saveRun("lc-1", "cpp", "code", { status: "done", passed: 1, total: 2 });
    const ok = await GET(new Request("http://localhost:3000/api/judge/run?id=lc-1", { headers: { "Sec-Fetch-Site": "same-origin" } }));
    expect(((await ok.json()) as { runs: unknown[] }).runs).toHaveLength(1);
    expect((await GET(new Request("http://localhost:3000/api/judge/run?id=nope", { headers: { "Sec-Fetch-Site": "same-origin" } }))).status).toBe(400);
    expect((await GET(new Request("http://localhost:3000/api/judge/run?id=lc-1"))).status).toBe(403);
  });
});
