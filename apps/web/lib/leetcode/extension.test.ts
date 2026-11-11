import { parseWeekKey } from "@habit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as knownRoute } from "@/app/api/ext/known/route";
import { POST as submissionsRoute } from "@/app/api/ext/submissions/route";
import { getDsaView, getProblemDetail } from "../dsa";
import { getTodayView } from "../tasks";
import { getExtensionStatus, getExtensionToken, importFromExtension, parseExtSubmission, regenerateExtensionToken } from "./extension";

/** Unix seconds for a local date/time. */
const ts = (date: string, hour = 10) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime() / 1000;
};

const sub = (id: string, slug: string, date: string, extra: Record<string, unknown> = {}) => ({
  id,
  slug,
  title: slug,
  number: 1,
  difficulty: "easy",
  lang: "Java",
  runtime: "1 ms",
  runtimePct: 99,
  memory: "44 MB",
  memoryPct: 40,
  code: `class Solution { /* ${id} */ }`,
  notes: "",
  timestamp: ts(date),
  ...extra,
});

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12)); // Fri Nov 6 2026; plan starts Mon Nov 2
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network in tests"))));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const findProblem = async (id: string) =>
  (await getDsaView()).groups.flatMap((g) => g.patterns).flatMap((p) => p.items).find((i) => i.id === id)!;

describe("import from the extension", () => {
  it("stores every solution and records the solve once", async () => {
    await getTodayView(); // creates today's tasks
    const r = await importFromExtension([sub("11", "two-sum", "2026-11-06"), sub("12", "two-sum", "2026-11-06", { lang: "Python3", notes: "hashmap" })]);
    expect(r).toMatchObject({ stored: 2, skipped: 0, added: 1, resolved: 0 });

    const d = (await getProblemDetail("lc-1"))!;
    expect(d.submissions.map((s) => [s.id, s.lang, s.notes])).toEqual([
      ["12", "Python3", "hashmap"],
      ["11", "Java", ""],
    ]);
    expect(d).toMatchObject({ auto: true, status: { state: "solved", solvedOn: "2026-11-06" } });
    expect((await getTodayView()).dayTasks.find((t) => (parseWeekKey(t.templateKey)?.key ?? t.templateKey) === "dsa-warmup")?.status).toBe("done");
    expect((await getExtensionStatus()).last).toMatchObject({ stored: 2, added: 1 });
  });

  it("re-sending a submission updates it without double counting", async () => {
    await importFromExtension([sub("11", "two-sum", "2026-11-06")]);
    expect(await importFromExtension([sub("11", "two-sum", "2026-11-06", { notes: "edited" })])).toMatchObject({ stored: 1, added: 0 });
    expect((await getProblemDetail("lc-1"))!.submissions).toHaveLength(1);
    expect((await getProblemDetail("lc-1"))!.submissions[0].notes).toBe("edited");
    expect((await getDsaView()).totals.xp).toBe(5);
  });

  it("history before the plan start counts as solved but gives no XP; a later solve is a re-solve", async () => {
    await importFromExtension([sub("1", "two-sum", "2024-03-01"), sub("2", "two-sum", "2024-03-02"), sub("3", "two-sum", "2026-11-05")]);
    expect(await findProblem("lc-1")).toMatchObject({ status: { state: "resolved", solvedOn: "2024-03-01", resolvedOn: "2026-11-05" } });
    expect((await getTodayView()).totalXp).toBe(10); // only the re-solve inside the plan
  });

  it("problems outside the roadmap use the title and difficulty sent, without a LeetCode lookup", async () => {
    await importFromExtension([sub("5", "some-new-problem", "2026-11-04", { title: "Some New Problem", number: 3999, difficulty: "hard" })]);
    expect(fetch).not.toHaveBeenCalled();
    expect((await getDsaView()).extras).toEqual([
      expect.objectContaining({ problemId: "lcx-some-new-problem", title: "Some New Problem", number: 3999, xp: 30 }),
    ]);
    expect((await getProblemDetail("lcx-some-new-problem"))!.submissions).toHaveLength(1);
  });

  it("stores topics and shows indicators on the DSA list and problem page", async () => {
    const r = await importFromExtension(
      [sub("1", "two-sum", "2026-11-05"), sub("2", "two-sum", "2026-11-06", { notes: "used a map" })],
      [{ slug: "two-sum", tags: ["Array", "Hash Table", "Array", " ", 5] }, { slug: "BAD SLUG", tags: ["x"] }, { slug: "lru-cache", tags: ["Design"] }],
    );
    expect(r.topics).toBe(2);
    expect(await findProblem("lc-1")).toMatchObject({ submissions: 2, lcNotes: true, noted: false, topics: ["Array", "Hash Table"] });
    expect(await findProblem("lc-146")).toMatchObject({ submissions: 0, lcNotes: false, topics: ["Design"], status: { state: "unsolved" } });
    expect((await getProblemDetail("lc-1"))!.topics).toEqual(["Array", "Hash Table"]);

    // topics-only update (what the extension sends first) replaces the tags and keeps "last import"
    await importFromExtension([], [{ slug: "two-sum", tags: ["Array"] }]);
    expect((await findProblem("lc-1")).topics).toEqual(["Array"]);
    expect((await getExtensionStatus()).last).toMatchObject({ stored: 2 });
  });

  it("drops malformed entries", async () => {
    expect(parseExtSubmission({ ...sub("abc", "two-sum", "2026-11-06") })).toBeNull();
    expect(parseExtSubmission({ ...sub("1", "Two Sum!", "2026-11-06") })).toBeNull();
    expect(parseExtSubmission({ ...sub("1", "two-sum", "2026-11-06"), code: "" })).toBeNull();
    expect(parseExtSubmission(null)).toBeNull();
    expect(parseExtSubmission({ ...sub("1", "two-sum", "2026-11-06"), difficulty: "Weird", lang: 5 })).toMatchObject({ difficulty: null, lang: "Unknown" });
    expect(await importFromExtension([sub("1", "two-sum", "2026-11-06"), { id: "x" }])).toMatchObject({ stored: 1, skipped: 1 });
  });
});

describe("API routes", () => {
  const req = async (path: string, init: RequestInit & { key?: string | null } = {}) => {
    const key = init.key === undefined ? await getExtensionToken() : init.key;
    const headers = new Headers(init.headers);
    if (key) headers.set("Authorization", `Bearer ${key}`);
    return new Request(`http://localhost:3000${path}`, { ...init, headers });
  };

  it("rejects a missing or wrong pairing key, and requests from web pages", async () => {
    expect((await knownRoute(await req("/api/ext/known", { key: null }))).status).toBe(401);
    expect((await knownRoute(await req("/api/ext/known", { key: "wrong" }))).status).toBe(401);
    const fromPage = await req("/api/ext/known", { headers: { Origin: "https://evil.example" } });
    expect((await knownRoute(fromPage)).status).toBe(403);
    const fromExtension = await req("/api/ext/known", { headers: { Origin: "chrome-extension://abcdef" } });
    expect((await knownRoute(fromExtension)).status).toBe(200);
  });

  it("a new key invalidates the old one", async () => {
    const old = await getExtensionToken();
    await regenerateExtensionToken();
    expect((await knownRoute(await req("/api/ext/known", { key: old }))).status).toBe(401);
    expect((await knownRoute(await req("/api/ext/known"))).status).toBe(200);
  });

  it("imports submissions and lists known ids", async () => {
    const post = await req("/api/ext/submissions", { method: "POST", body: JSON.stringify({ submissions: [sub("77", "two-sum", "2026-11-06")] }) });
    const res = await submissionsRoute(post);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, stored: 1, added: 1 });
    const body = await (await knownRoute(await req("/api/ext/known"))).json();
    expect(body).toMatchObject({ ok: true, known: ["77"] });
    // A floor, not an exact count: the problem list grows whenever problems are added.
    expect(body.slugs.length).toBeGreaterThanOrEqual(189);
    expect(body.slugs).toContain("two-sum");
  });

  it("rejects bad bodies", async () => {
    expect((await submissionsRoute(await req("/api/ext/submissions", { method: "POST", body: "{nope" }))).status).toBe(400);
    expect((await submissionsRoute(await req("/api/ext/submissions", { method: "POST", body: "{}" }))).status).toBe(400);
  });
});
