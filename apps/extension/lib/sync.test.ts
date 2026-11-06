import { describe, expect, it, vi } from "vitest";
import { normalizeAppUrl } from "./config.js";
import { parseDetail, parseProgress, parseSubmissionPage, submissionIdFromPath, type Submission } from "./leetcode.js";
import { backfill, captureSubmission, fetchDetail, pool, syncRecent, type Deps } from "./sync.js";

const detail = (slug: string, ts: number, extra: Record<string, unknown> = {}) => ({
  submissionDetails: {
    runtimeDisplay: "3 ms",
    runtimePercentile: 91.2,
    memoryDisplay: "44.1 MB",
    memoryPercentile: 50,
    code: `// ${slug}`,
    timestamp: ts,
    statusCode: 10,
    notes: "",
    lang: { name: "java", verboseName: "Java" },
    question: { questionFrontendId: "1", title: "Two Sum", titleSlug: slug, difficulty: "Easy", topicTags: [{ name: "Array" }, { name: "Hash Table" }] },
    ...extra,
  },
});

/** Fake LeetCode account: solved questions with their accepted submission ids. */
function fakeLeetCode(opts: {
  signedIn?: boolean;
  questions?: { slug: string; ids: string[]; last?: string; tags?: string[] }[];
  rejectTopics?: boolean;
  recent?: string[];
  rejectFullDetail?: boolean;
}) {
  const questions = opts.questions ?? [];
  const slugOf = (id: string) => questions.find((q) => q.ids.includes(id))?.slug ?? "two-sum";
  const gql = vi.fn(async (query: string, v: Record<string, any> = {}) => {
    if (query.includes("userStatus")) return { userStatus: { username: "vraj", isSignedIn: opts.signedIn ?? true } };
    if (query.includes("userProgressQuestionList")) {
      if (opts.rejectTopics && query.includes("topicTags")) throw new Error('Cannot query field "topicTags"');
      const page = questions.slice(v.filters.skip, v.filters.skip + v.filters.limit);
      return {
        userProgressQuestionList: {
          totalNum: questions.length,
          questions: page.map((q) => ({
            titleSlug: q.slug,
            title: q.slug,
            frontendId: "7",
            difficulty: "MEDIUM",
            questionStatus: "SOLVED",
            lastSubmittedAt: q.last ?? "2026-11-01T10:00:00Z",
            ...(query.includes("topicTags") ? { topicTags: (q.tags ?? []).map((name) => ({ name })) } : {}),
          })),
        },
      };
    }
    if (query.includes("questionSubmissionList")) {
      const ids = questions.find((q) => q.slug === v.questionSlug)!.ids;
      const page = ids.slice(v.offset, v.offset + v.limit);
      return {
        questionSubmissionList: {
          hasNext: v.offset + v.limit < ids.length,
          lastKey: String(v.offset + v.limit),
          submissions: page.map((id) => ({ id, titleSlug: v.questionSlug, statusDisplay: "Accepted", timestamp: "1793500000" })),
        },
      };
    }
    if (query.includes("recentAcSubmissionList")) {
      return { recentAcSubmissionList: (opts.recent ?? []).map((id) => ({ id, titleSlug: slugOf(id), timestamp: "1793500000" })) };
    }
    if (query.includes("submissionDetails")) {
      if (opts.rejectFullDetail && query.includes("runtimeDisplay")) throw new Error('Cannot query field "runtimeDisplay"');
      return detail(slugOf(String(v.submissionId)), 1793500000);
    }
    throw new Error("unexpected query " + query);
  });
  return gql;
}

const SITE = ["two-sum", "lru-cache", "old", "new", "a", ...Array.from({ length: 130 }, (_, i) => `q-${i}`)];

function makeDeps(gql: Deps["gql"], known: string[] = [], slugs = SITE) {
  const sent: Submission[][] = [];
  const topics: { slug: string; tags: string[] }[][] = [];
  const deps: Deps = {
    gql,
    sleep: async () => {},
    app: {
      state: async () => ({ known, slugs }),
      send: async (subs, t = []) => {
        if (t.length) topics.push(t);
        if (subs.length === 0) return { stored: 0, added: 0, resolved: 0 };
        sent.push(subs);
        return { stored: subs.length, added: subs.length, resolved: 0 };
      },
    },
  };
  return { deps, sent, topics };
}

describe("parsing", () => {
  it("reads a submission's details", () => {
    expect(parseDetail(detail("two-sum", 1793500000), "42")).toEqual({
      id: "42",
      slug: "two-sum",
      title: "Two Sum",
      number: 1,
      difficulty: "easy",
      lang: "Java",
      runtime: "3 ms",
      runtimePct: 91.2,
      memory: "44.1 MB",
      memoryPct: 50,
      code: "// two-sum",
      notes: "",
      timestamp: 1793500000,
      topics: ["Array", "Hash Table"],
    });
  });

  it("ignores submissions that aren't accepted or have no code", () => {
    expect(parseDetail(detail("two-sum", 1, { statusCode: 11 }), "1")).toBeNull();
    expect(parseDetail(detail("two-sum", 1, { code: "" }), "1")).toBeNull();
    expect(parseDetail({ submissionDetails: null }, "1")).toBeNull();
    expect(() => parseDetail({}, "1")).toThrow();
  });

  it("reads progress and submission pages", () => {
    expect(
      parseProgress({
        userProgressQuestionList: {
          totalNum: 2,
          questions: [
            { titleSlug: "a", title: "A", frontendId: "12", difficulty: "HARD", questionStatus: "SOLVED", lastSubmittedAt: "2026-01-01T00:00:00Z", topicTags: [{ name: "Graph" }, {}] },
            { titleSlug: "b", questionStatus: "ATTEMPTED" },
          ],
        },
      }),
    ).toEqual({
      total: 2,
      questions: [
        { slug: "a", title: "A", number: 12, difficulty: "hard", lastSubmittedAt: Date.parse("2026-01-01T00:00:00Z"), solved: true, topics: ["Graph"] },
        { slug: "b", title: "b", number: null, difficulty: null, lastSubmittedAt: null, solved: false, topics: [] },
      ],
    });
    expect(
      parseSubmissionPage({
        questionSubmissionList: { hasNext: false, lastKey: null, submissions: [{ id: "5", titleSlug: "a", statusDisplay: "Wrong Answer", timestamp: "9" }, { id: "x" }] },
      }),
    ).toEqual({ hasNext: false, lastKey: null, items: [{ id: "5", slug: "a", accepted: false, timestamp: 9 }] });
  });

  it("finds the submission id in a result URL", () => {
    expect(submissionIdFromPath("/problems/two-sum/submissions/1234567/")).toBe("1234567");
    expect(submissionIdFromPath("/submissions/detail/987/")).toBe("987");
    expect(submissionIdFromPath("/problems/two-sum/submissions/")).toBeNull();
    expect(submissionIdFromPath("/problems/two-sum/")).toBeNull();
  });

  it("only allows local app URLs", () => {
    expect(normalizeAppUrl("")).toBe("http://localhost:3000");
    expect(normalizeAppUrl("http://127.0.0.1:4000/dsa")).toBe("http://127.0.0.1:4000");
    expect(normalizeAppUrl("https://localhost:3000")).toBeNull();
    expect(normalizeAppUrl("http://evil.example")).toBeNull();
    expect(normalizeAppUrl("not a url")).toBeNull();
  });
});

describe("backfill", () => {
  it("imports every accepted submission of every solved question, skipping known ones", async () => {
    const ids = Array.from({ length: 25 }, (_, i) => String(100 + i)); // more than one page
    const gql = fakeLeetCode({ questions: [{ slug: "two-sum", ids }, { slug: "lru-cache", ids: ["7", "8"] }] });
    const { deps, sent } = makeDeps(gql, ["8"]);
    const progress = vi.fn();
    const totals = await backfill({ ...deps, onProgress: progress });

    expect(totals).toEqual({ questions: 2, stored: 26, added: 26, resolved: 0 });
    expect(sent.map((b) => b.length).sort((x, y) => x - y)).toEqual([1, 25]);
    expect(sent.flat().find((s) => s.slug === "lru-cache")).toMatchObject({ id: "7", lang: "Java" });
    expect(progress).toHaveBeenLastCalledWith({ phase: "Importing", done: 2, total: 2, stored: 26 });
    // "8" was known: its details were never fetched
    expect(gql.mock.calls.some(([q, v]) => q.includes("submissionDetails") && v?.submissionId === 8)).toBe(false);
  });

  it("pages through more than 100 solved questions", async () => {
    const questions = Array.from({ length: 130 }, (_, i) => ({ slug: `q-${i}`, ids: [String(i + 1)] }));
    const { deps, sent } = makeDeps(fakeLeetCode({ questions }));
    expect((await backfill(deps)).questions).toBe(130);
    expect(sent).toHaveLength(130);
  });

  it("only re-checks questions submitted since the last run", async () => {
    const gql = fakeLeetCode({
      questions: [
        { slug: "old", ids: ["1"], last: "2025-01-01T00:00:00Z" },
        { slug: "new", ids: ["2"], last: "2026-11-01T00:00:00Z" },
      ],
    });
    const { deps, sent } = makeDeps(gql);
    expect((await backfill(deps, { since: Date.parse("2026-10-01T00:00:00Z") })).questions).toBe(1);
    expect(sent.flat().map((s) => s.slug)).toEqual(["new"]);
  });

  it("only checks problems the app tracks, unless asked for everything", async () => {
    const questions = [
      { slug: "two-sum", ids: ["1"] },
      { slug: "not-on-site", ids: ["2"] },
    ];
    const site = makeDeps(fakeLeetCode({ questions }));
    expect(await backfill(site.deps)).toMatchObject({ questions: 1, stored: 1 });
    expect(site.sent.flat().map((s) => s.slug)).toEqual(["two-sum"]);

    const everything = makeDeps(fakeLeetCode({ questions }));
    expect(await backfill(everything.deps, { all: true })).toMatchObject({ questions: 2, stored: 2 });
  });

  it("works on a few problems at a time", async () => {
    const questions = Array.from({ length: 12 }, (_, i) => ({ slug: `q-${i}`, ids: [String(i + 1)] }));
    const inner = fakeLeetCode({ questions });
    let inFlight = 0;
    let peak = 0;
    const gql: Deps["gql"] = async (q, v) => {
      peak = Math.max(peak, ++inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return inner(q, v);
    };
    const { deps, sent } = makeDeps(gql);
    expect((await backfill({ ...deps, concurrency: 3 })).stored).toBe(12);
    expect(sent).toHaveLength(12);
    expect(peak).toBe(3);
  });

  it("pool handles fewer items than workers", async () => {
    const seen: number[] = [];
    await pool([1, 2], 5, async (n) => {
      seen.push(n);
    });
    expect(seen).toEqual([1, 2]);
  });

  it("saves topic tags of every solved site problem, even ones with nothing new", async () => {
    const questions = [
      { slug: "two-sum", ids: ["1"], tags: ["Array", "Hash Table"], last: "2024-01-01T00:00:00Z" },
      { slug: "lru-cache", ids: ["2"], tags: ["Design"] },
      { slug: "not-on-site", ids: ["3"], tags: ["Math"] },
    ];
    const { deps, sent, topics } = makeDeps(fakeLeetCode({ questions }));
    await backfill(deps, { since: Date.parse("2026-10-01T00:00:00Z") });
    expect(topics.flat()).toEqual([
      { slug: "two-sum", tags: ["Array", "Hash Table"] },
      { slug: "lru-cache", tags: ["Design"] },
    ]);
    expect(sent.flat().map((s) => s.slug)).toEqual(["lru-cache"]);
  });

  it("still imports if LeetCode rejects topic tags in the solved list", async () => {
    const { deps, sent, topics } = makeDeps(fakeLeetCode({ questions: [{ slug: "two-sum", ids: ["1"], tags: ["Array"] }], rejectTopics: true }));
    expect(await backfill(deps)).toMatchObject({ stored: 1 });
    expect(sent).toHaveLength(1);
    expect(topics).toHaveLength(0);
  });

  it("stops with a clear message when signed out", async () => {
    const { deps } = makeDeps(fakeLeetCode({ signedIn: false }));
    await expect(backfill(deps)).rejects.toThrow("Sign in to leetcode.com");
  });

  it("waits and retries when LeetCode rate-limits", async () => {
    const inner = fakeLeetCode({ questions: [{ slug: "a", ids: ["1"] }] });
    let failures = 2;
    const gql: Deps["gql"] = async (q, v) => {
      if (q.includes("submissionDetails") && failures-- > 0) throw Object.assign(new Error("HTTP 429"), { status: 429 });
      return inner(q, v);
    };
    const { deps, sent } = makeDeps(gql);
    const sleep = vi.fn(async () => {});
    await backfill({ ...deps, sleep });
    expect(sent.flat()).toHaveLength(1);
    expect(sleep).toHaveBeenCalledWith(30_000);
    expect(sleep).toHaveBeenCalledWith(60_000);
  });
});

describe("recent + live capture", () => {
  it("sends only recent submissions the app doesn't have", async () => {
    const { deps, sent } = makeDeps(fakeLeetCode({ recent: ["1", "2", "3"] }), ["2"]);
    expect(await syncRecent(deps)).toMatchObject({ stored: 2 });
    expect(sent.flat().map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("sends topic tags with captured submissions", async () => {
    const { deps, topics } = makeDeps(fakeLeetCode({ recent: ["1", "2"] }));
    await syncRecent(deps);
    expect(topics).toEqual([[{ slug: "two-sum", tags: ["Array", "Hash Table"] }]]);
  });

  it("captures an accepted submission and retries while it's judging", async () => {
    let calls = 0;
    const gql: Deps["gql"] = async (q) => {
      if (!q.includes("submissionDetails")) throw new Error("unexpected");
      return ++calls < 3 ? detail("two-sum", 1, { statusCode: 15 }) : detail("two-sum", 1);
    };
    const { deps, sent } = makeDeps(gql);
    expect(await captureSubmission(deps, "55")).toMatchObject({ stored: 1 });
    expect(sent.flat()[0].id).toBe("55");
  });

  it("returns null for a submission that never gets accepted", async () => {
    const { deps, sent } = makeDeps(async () => detail("two-sum", 1, { statusCode: 11 }));
    expect(await captureSubmission(deps, "55", 1)).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it("falls back to a smaller query if LeetCode rejects optional fields", async () => {
    const gql = fakeLeetCode({ rejectFullDetail: true });
    const { deps } = makeDeps(gql);
    expect(await fetchDetail(deps, "9")).toMatchObject({ id: "9", code: "// two-sum" });
    await fetchDetail(deps, "10");
    // the full query is only tried once
    expect(gql.mock.calls.filter(([q]) => q.includes("runtimeDisplay"))).toHaveLength(1);
  });
});
