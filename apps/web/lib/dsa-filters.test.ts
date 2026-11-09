import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDsaView, markSolved } from "./dsa";
import { filterProblems, hasActiveFilters, matchesSource, parseSource, parseDsaFilters, parseDsaTab, parseProblemTab } from "./dsa-filters";
import { importFromExtension } from "./leetcode/extension";
import { saveNote } from "./notes";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

const run = async (params: Record<string, string>) => {
  const view = await getDsaView();
  return filterProblems(view.groups.flatMap((g) => g.patterns), parseDsaFilters(params));
};
const ids = (r: Awaited<ReturnType<typeof run>>) => r.map((x) => x.problem.id);

describe("parseDsaFilters", () => {
  it("keeps known values and drops the rest", () => {
    expect(parseDsaFilters({ q: "  two ", difficulty: "hard", status: "due", has: "code", topic: "Array" })).toEqual({
      q: "two",
      difficulty: "hard",
      status: "due",
      has: "code",
      topic: "Array",
    });
    const junk = parseDsaFilters({ difficulty: "insane", status: ["solved", "x"], has: "<script>" });
    expect(junk).toEqual({ q: "", topic: "", difficulty: "", status: "solved", has: "" });
    expect(hasActiveFilters(parseDsaFilters({}))).toBe(false);
    expect(hasActiveFilters(junk)).toBe(true);
  });
});

describe("parseDsaTab", () => {
  it("defaults to patterns when missing or unknown", () => {
    expect(parseDsaTab({})).toBe("patterns");
    expect(parseDsaTab({ tab: "" })).toBe("patterns");
    expect(parseDsaTab({ tab: "unknown" })).toBe("patterns");
    expect(parseDsaTab({ tab: ["invalid"] })).toBe("patterns");
  });

  it("passes through valid tab ids", () => {
    expect(parseDsaTab({ tab: "patterns" })).toBe("patterns");
    expect(parseDsaTab({ tab: "resolve" })).toBe("resolve");
    expect(parseDsaTab({ tab: "other" })).toBe("other");
    expect(parseDsaTab({ tab: ["resolve", "other"] })).toBe("resolve");
  });
});

describe("parseProblemTab", () => {
  it("defaults to solve when missing or unknown", () => {
    expect(parseProblemTab({})).toBe("solve");
    expect(parseProblemTab({ tab: "" })).toBe("solve");
    expect(parseProblemTab({ tab: "unknown" })).toBe("solve");
  });

  it("passes through valid tab ids", () => {
    expect(parseProblemTab({ tab: "solve" })).toBe("solve");
    expect(parseProblemTab({ tab: "notes" })).toBe("notes");
    expect(parseProblemTab({ tab: "submissions" })).toBe("submissions");
    expect(parseProblemTab({ tab: "stuck" })).toBe("stuck");
  });

  it("falls back to solve if submissions tab is requested but there are none", () => {
    expect(parseProblemTab({ tab: "submissions" }, false)).toBe("solve");
    expect(parseProblemTab({ tab: "submissions" }, true)).toBe("submissions");
  });
});

describe("filterProblems", () => {
  it("searches by number or title, listing each problem once with all its patterns", async () => {
    expect(ids(await run({ q: "560" }))).toEqual(["lc-560"]);
    expect(ids(await run({ q: "#1" }))).toEqual(["lc-1"]);
    const sw = await run({ q: "sliding window maximum" });
    expect(sw).toHaveLength(1);
    expect(sw[0].patterns.length).toBeGreaterThan(1);
  });

  it("filters by difficulty, status, notes and topic", async () => {
    await markSolved("lc-1");
    await saveNote("lc-560", { notes: "prefix", code: "", language: "" });
    await importFromExtension(
      [{ id: "9", slug: "lru-cache", lang: "Java", code: "x", timestamp: Date.now() / 1000 }],
      [{ slug: "two-sum", tags: ["Array", "Hash Table"] }],
    );

    const hard = await run({ difficulty: "hard" });
    expect(hard.length).toBeGreaterThan(10);
    expect(hard.every((r) => r.problem.difficulty === "hard")).toBe(true);
    expect(ids(await run({ status: "solved" })).sort()).toEqual(["lc-1", "lc-146"]);
    expect(ids(await run({ has: "notes" }))).toEqual(["lc-560"]);
    expect(ids(await run({ has: "code" }))).toEqual(["lc-146"]);
    expect(ids(await run({ topic: "Hash Table" }))).toEqual(["lc-1"]);
    expect(ids(await run({ status: "solved", difficulty: "easy" }))).toEqual(["lc-1"]);
    expect((await getDsaView()).topics).toEqual(["Array", "Hash Table"]);
  });

  it("finds re-solves that are due", async () => {
    vi.setSystemTime(new Date(2026, 9, 1, 12));
    await markSolved("lc-1");
    vi.setSystemTime(new Date(2026, 10, 6, 12));
    expect(ids(await run({ status: "due" }))).toEqual(["lc-1"]);
  });
});

describe("source filter", () => {
  it("parses the source and keeps only known values", () => {
    expect(parseSource("cp-algorithms")).toBe("cp-algorithms");
    expect(parseSource(["CSES"])).toBe("cses");
    expect(parseSource("codeforces")).toBe("");
    expect(parseSource(undefined)).toBe("");
  });

  it("matches LeetCode and CSES by id, cp-algorithms by link, and everything for an empty source", () => {
    const lc = { id: "lc-1" };
    const cses = { id: "cses-weird-algorithm", url: "https://cses.fi/problemset/task/1068" };
    const cp = { id: "c-z-function", url: "https://cp-algorithms.com/string/z-function.html" };
    const plain = { id: "c-other" };
    expect([lc, cses, cp, plain].filter((p) => matchesSource(p, "leetcode"))).toEqual([lc]);
    expect([lc, cses, cp, plain].filter((p) => matchesSource(p, "cses"))).toEqual([cses]);
    expect([lc, cses, cp, plain].filter((p) => matchesSource(p, "cp-algorithms"))).toEqual([cp]);
    expect([lc, cses, cp, plain].filter((p) => matchesSource(p, ""))).toHaveLength(4);
  });
});
