import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDsaView, undoSolve, markSolved } from "../dsa";
import { getTodayView } from "../tasks";
import { parseQuestion, parseRecentAccepted, LeetCodeError } from "./client";
import { connectLeetCode, disconnectLeetCode, getLeetCodeStatus, syncLeetCode, syncLeetCodeIfStale } from "./sync";

function setNow(date: string, hour = 12, minute = 0) {
  const [y, m, d] = date.split("-").map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, hour, minute));
}

/** Unix seconds for a local date/time (the sync converts back to a local date). */
const ts = (date: string, hour = 10) => {
  const [y, m, d] = date.split("-").map(Number);
  return String(new Date(y, m - 1, d, hour).getTime() / 1000);
};

interface Sub {
  id: string;
  titleSlug: string;
  title?: string;
  timestamp: string;
}

/** Fake LeetCode GraphQL endpoint. */
function mockLeetCode(opts: { recent?: Sub[]; questions?: Record<string, object>; users?: string[]; status?: number } = {}) {
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    if (opts.status) return new Response("unavailable", { status: opts.status });
    const { query, variables } = JSON.parse(init.body);
    let body: object;
    if (query.includes("matchedUser")) {
      body = (opts.users ?? ["vraj"]).includes(variables.username)
        ? { data: { matchedUser: { username: variables.username } } }
        : { errors: [{ message: "That user does not exist." }], data: { matchedUser: null } };
    } else if (query.includes("recentAcSubmissionList")) {
      body = { data: { recentAcSubmissionList: (opts.recent ?? []).map((s) => ({ title: s.titleSlug, ...s })) } };
    } else if (query.includes("question(")) {
      body = { data: { question: opts.questions?.[variables.slug] ?? null } };
    } else {
      throw new Error("unexpected query " + query);
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const recentCalls = (m: ReturnType<typeof mockLeetCode>) =>
  m.mock.calls.filter(([, init]) => JSON.parse(init.body).query.includes("recentAcSubmissionList")).length;

const findProblem = async (id: string) =>
  (await getDsaView()).groups.flatMap((g) => g.patterns).flatMap((p) => p.items).find((i) => i.id === id)!;

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow("2026-11-06");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("client parsing", () => {
  it("parses recent accepted submissions and skips malformed entries", () => {
    expect(
      parseRecentAccepted({
        recentAcSubmissionList: [
          { id: "1", title: "Two Sum", titleSlug: "two-sum", timestamp: "1793500000" },
          { id: 2, titleSlug: "bad-id", timestamp: "1" },
          { id: "3", titleSlug: "bad-ts", timestamp: "soon" },
        ],
      }),
    ).toEqual([{ id: "1", slug: "two-sum", title: "Two Sum", timestamp: 1793500000 }]);
  });

  it("rejects an unexpected shape", () => {
    expect(() => parseRecentAccepted({ recentAcSubmissionList: null })).toThrow(LeetCodeError);
  });

  it("parses a question and maps difficulty", () => {
    expect(parseQuestion({ question: { questionFrontendId: "560", title: "Subarray Sum Equals K", difficulty: "Medium" } })).toEqual({
      number: 560,
      title: "Subarray Sum Equals K",
      difficulty: "medium",
    });
    expect(parseQuestion({ question: null })).toBeNull();
  });
});

describe("connecting", () => {
  it("rejects invalid usernames without calling LeetCode", async () => {
    const m = mockLeetCode();
    const r = await connectLeetCode("not a name!");
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("doesn't look like") });
    expect(m).not.toHaveBeenCalled();
    expect((await getLeetCodeStatus()).username).toBeNull();
  });

  it("rejects users LeetCode doesn't know", async () => {
    mockLeetCode({ users: [] });
    const r = await connectLeetCode("ghost");
    expect(r).toMatchObject({ ok: false, error: 'LeetCode user "ghost" was not found.' });
    expect((await getLeetCodeStatus()).username).toBeNull();
  });

  it("saves the username and runs a first sync", async () => {
    mockLeetCode({ recent: [{ id: "a", titleSlug: "two-sum", timestamp: ts("2026-11-06") }] });
    const r = await connectLeetCode("vraj");
    expect(r).toMatchObject({ ok: true, added: 1, resolved: 0 });
    expect(await getLeetCodeStatus()).toMatchObject({ username: "vraj", last: { ok: true, added: 1 } });
  });

  it("disconnect forgets the username but keeps imported solves", async () => {
    mockLeetCode({ recent: [{ id: "a", titleSlug: "two-sum", timestamp: ts("2026-11-06") }] });
    await connectLeetCode("vraj");
    await disconnectLeetCode();
    expect(await getLeetCodeStatus()).toEqual({ username: null, last: null });
    expect((await findProblem("lc-1")).status.state).toBe("solved");
  });
});

describe("importing submissions", () => {
  const recent: Sub[] = [
    { id: "s3", titleSlug: "some-new-problem", title: "Some New Problem", timestamp: ts("2026-11-06", 9) },
    { id: "s1", titleSlug: "two-sum", timestamp: ts("2026-11-05") },
    { id: "s2", titleSlug: "subarray-sum-equals-k", timestamp: ts("2026-11-06", 8) },
  ];
  const questions = { "some-new-problem": { questionFrontendId: "3999", title: "Some New Problem", difficulty: "Hard" } };

  it("records roadmap and other problems with their dates, XP and streak", async () => {
    mockLeetCode({ recent, questions });
    expect(await connectLeetCode("vraj")).toMatchObject({ ok: true, added: 3 });

    expect(await findProblem("lc-1")).toMatchObject({ auto: true, status: { state: "solved", solvedOn: "2026-11-05" } });
    expect(await findProblem("lc-560")).toMatchObject({ auto: true, status: { solvedOn: "2026-11-06" } });

    const dsa = await getDsaView();
    expect(dsa.extras).toEqual([
      expect.objectContaining({ title: "Some New Problem", number: 3999, difficulty: "hard", xp: 30, solvedOn: "2026-11-06" }),
    ]);
    // imported from LeetCode, so counted only when all platforms are included
    expect(dsa.totals).toMatchObject({ solved: 0, allSolved: 0, solvedAnywhere: 2, allSolvedAnywhere: 3 });

    const today = await getTodayView();
    expect(today).toMatchObject({ totalXp: 5 + 15 + 30, streak: 2 });
  });

  it("is idempotent: syncing again adds nothing", async () => {
    mockLeetCode({ recent, questions });
    await connectLeetCode("vraj");
    expect(await syncLeetCode()).toMatchObject({ ok: true, added: 0, resolved: 0 });
    expect((await getDsaView()).totals.xp).toBe(50);
  });

  it("does not re-import a solve the user undid", async () => {
    mockLeetCode({ recent, questions });
    await connectLeetCode("vraj");
    await undoSolve("lc-560");
    await syncLeetCode();
    expect((await findProblem("lc-560")).status.state).toBe("unsolved");
  });

  it("ticks today's DSA warm-up when a problem is solved today", async () => {
    await getTodayView(); // generates today's tasks
    mockLeetCode({ recent: [{ id: "x", titleSlug: "two-sum", timestamp: ts("2026-11-06") }] });
    await connectLeetCode("vraj");
    const warmup = (await getTodayView()).dayTasks.find((t) => t.templateKey === "dsa-warmup")!;
    expect(warmup).toMatchObject({ status: "done", doneOn: "2026-11-06" });
  });

  it("leaves the warm-up alone for solves on earlier days", async () => {
    await getTodayView();
    mockLeetCode({ recent: [{ id: "x", titleSlug: "two-sum", timestamp: ts("2026-11-04") }] });
    await connectLeetCode("vraj");
    expect((await getTodayView()).dayTasks.find((t) => t.templateKey === "dsa-warmup")!.status).toBe("todo");
  });
});

describe("re-solves", () => {
  it("records an accepted submission 14+ days after the first solve as the re-solve", async () => {
    await markSolved("lc-560"); // manual, 2026-11-06
    mockLeetCode({
      recent: [
        { id: "early", titleSlug: "subarray-sum-equals-k", timestamp: ts("2026-11-10") }, // too soon: ignored
        { id: "late", titleSlug: "subarray-sum-equals-k", timestamp: ts("2026-11-21") },
      ],
    });
    setNow("2026-11-21");
    expect(await connectLeetCode("vraj")).toMatchObject({ ok: true, added: 0, resolved: 1 });
    expect((await findProblem("lc-560")).status).toEqual({ state: "resolved", solvedOn: "2026-11-06", resolvedOn: "2026-11-21" });
  });
});

describe("failures and scheduling", () => {
  it("reports HTTP errors without changing data", async () => {
    mockLeetCode({ recent: [] });
    await connectLeetCode("vraj");
    mockLeetCode({ status: 503 });
    const r = await syncLeetCode();
    expect(r).toMatchObject({ ok: false, error: "LeetCode returned HTTP 503" });
    expect((await getLeetCodeStatus()).last).toMatchObject({ ok: false });
  });

  it("background sync runs at most every 15 minutes", async () => {
    const m = mockLeetCode({ recent: [] });
    await syncLeetCodeIfStale(); // no username yet: nothing
    expect(recentCalls(m)).toBe(0);

    await connectLeetCode("vraj"); // first sync at 12:00
    expect(recentCalls(m)).toBe(1);

    setNow("2026-11-06", 12, 10);
    await syncLeetCodeIfStale();
    expect(recentCalls(m)).toBe(1);

    setNow("2026-11-06", 12, 16);
    await syncLeetCodeIfStale();
    expect(recentCalls(m)).toBe(2);
  });

  it("shares one run between concurrent syncs", async () => {
    const m = mockLeetCode({ recent: [] });
    await connectLeetCode("vraj");
    const before = recentCalls(m);
    await Promise.all([syncLeetCode(), syncLeetCode(), syncLeetCode()]);
    expect(recentCalls(m)).toBe(before + 1);
  });
});
