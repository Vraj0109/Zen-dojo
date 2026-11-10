import { JUDGE_PROBLEMS } from "@habit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDsaView, markSolved } from "./dsa";
import {
  FILTER_OPTIONS,
  filterProblems,
  filtersToSearchParams,
  hasActiveFilters,
  matchesSource,
  parseDsaFilters,
  parseDsaTab,
  parseProblemTab,
  parseSource,
  removeFilterValue,
  searchText,
} from "./dsa-filters";
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

const run = async (params: Record<string, string | string[]>) => {
  const view = await getDsaView();
  return filterProblems(view.groups.flatMap((g) => g.patterns), parseDsaFilters(params));
};
const ids = (r: Awaited<ReturnType<typeof run>>) => r.map((x) => x.problem.id);

describe("parseDsaFilters", () => {
  it("keeps known values as lists and drops the rest", () => {
    expect(parseDsaFilters({ q: "  two ", difficulty: "hard", status: "due", has: "code", topic: "Array", source: "CSES" })).toEqual({
      q: "two",
      source: ["cses"],
      difficulty: ["hard"],
      status: ["due"],
      has: ["code"],
      topic: ["Array"],
    });
    const junk = parseDsaFilters({ difficulty: "insane", status: ["solved", "x", "solved"], has: "<script>", source: "hackerrank" });
    expect(junk).toEqual({ q: "", source: [], difficulty: [], status: ["solved"], has: [], topic: [] });
    expect(hasActiveFilters(parseDsaFilters({}))).toBe(false);
    expect(hasActiveFilters(junk)).toBe(true);
    expect(hasActiveFilters(parseDsaFilters({ q: "x" }))).toBe(true);
  });

  it("reads repeated parameters and old single-value URLs", () => {
    expect(parseDsaFilters({ difficulty: ["easy", "medium"] }).difficulty).toEqual(["easy", "medium"]);
    expect(parseDsaFilters({ difficulty: "easy" }).difficulty).toEqual(["easy"]);
    expect(parseDsaFilters({ topic: ["Array", "Hash Table"], source: ["leetcode", "cses"] })).toMatchObject({
      topic: ["Array", "Hash Table"],
      source: ["leetcode", "cses"],
    });
  });

  it("caps the number of values and the lengths", () => {
    const topics = Array.from({ length: 40 }, (_, i) => "t" + i);
    expect(parseDsaFilters({ topic: topics }).topic).toHaveLength(20);
    expect(parseDsaFilters({ topic: "x".repeat(80) }).topic[0]).toHaveLength(50);
    expect(parseDsaFilters({ q: "y".repeat(300) }).q).toHaveLength(100);
    expect(parseDsaFilters({ status: Array(50).fill("solved") }).status).toEqual(["solved"]);
  });
});

describe("url helpers", () => {
  it("writes repeated keys without empty values and round-trips", () => {
    const f = parseDsaFilters({ q: "graph", difficulty: ["easy", "medium"], status: "solved", topic: ["Array"] });
    const sp = filtersToSearchParams(f);
    expect(sp.getAll("difficulty")).toEqual(["easy", "medium"]);
    expect(sp.toString()).toBe("q=graph&status=solved&difficulty=easy&difficulty=medium&topic=Array");
    expect(parseDsaFilters(Object.fromEntries([...new Set(sp.keys())].map((k) => [k, sp.getAll(k)])))).toEqual(f);
    expect(filtersToSearchParams(parseDsaFilters({})).toString()).toBe("");
  });

  it("removes one value, a whole filter, or the search", () => {
    const f = parseDsaFilters({ q: "graph", difficulty: ["easy", "hard"], status: "solved" });
    expect(removeFilterValue(f, "difficulty", "easy").difficulty).toEqual(["hard"]);
    expect(removeFilterValue(f, "difficulty").difficulty).toEqual([]);
    expect(removeFilterValue(f, "q").q).toBe("");
    expect(removeFilterValue(f, "status", "nope").status).toEqual(["solved"]);
    expect(f.difficulty).toEqual(["easy", "hard"]);
  });

  it("lists the options of each fixed filter", () => {
    expect(FILTER_OPTIONS.difficulty.map((o) => o.value)).toEqual(["easy", "medium", "hard"]);
    expect(FILTER_OPTIONS.source.some((o) => o.value === "")).toBe(false);
    expect(FILTER_OPTIONS.source[0]).toEqual({ value: "leetcode", label: "LeetCode" });
    expect(FILTER_OPTIONS.status.map((o) => o.value)).toContain("stuck");
    expect(FILTER_OPTIONS.has.map((o) => o.value)).toEqual(["notes", "code", "none"]);
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

  it("ORs values within a filter, ANDs across filters, and treats empty as all", async () => {
    const all = await run({});
    const easy = await run({ difficulty: "easy" });
    const medium = await run({ difficulty: "medium" });
    const both = await run({ difficulty: ["easy", "medium"] });
    expect(both).toHaveLength(easy.length + medium.length);
    expect(all.length).toBeGreaterThan(both.length);
    await markSolved("lc-1");
    expect(ids(await run({ difficulty: ["easy", "medium"], status: "solved" }))).toEqual(["lc-1"]);
    expect(ids(await run({ difficulty: ["hard"], status: "solved" }))).toEqual([]);
    expect(ids(await run({ status: ["solved", "stuck"] }))).toEqual(["lc-1"]);
    const lc = await run({ source: "leetcode" });
    const cses = await run({ source: "cses" });
    expect((await run({ source: ["leetcode", "cses"] })).length).toBe(lc.length + cses.length);
    expect(ids(await run({ topic: ["Nope", "Also nope"] }))).toEqual([]);
  });
});

describe("search", () => {
  const withJudge = Object.values(JUDGE_PROBLEMS).find((s) => s.id.startsWith("lc-") && s.hints.length > 0 && s.tests.length > 0)!;

  it("finds words from the statement, hints and test inputs", async () => {
    const word = withJudge.statement.join(" ").split(/\W+/).find((w) => w.length >= 6)!;
    expect(ids(await run({ q: word }))).toContain(withJudge.id);
    const hintWord = withJudge.hints[0].split(/\W+/).find((w) => w.length >= 6)!;
    expect(ids(await run({ q: hintWord }))).toContain(withJudge.id);
    const input = JSON.stringify(withJudge.tests[0].input);
    expect(ids(await run({ q: input }))).toContain(withJudge.id);
    expect(ids(await run({ q: "zzzqqq-no-such-text" }))).toEqual([]);
  });

  it("finds by topic, pattern name, source label and id, case-insensitively", async () => {
    await importFromExtension([], [{ slug: "two-sum", tags: ["Array", "Hash Table"] }]);
    expect(ids(await run({ q: "hash table" }))).toContain("lc-1");
    expect(ids(await run({ q: "HASH" }))).toContain("lc-1");
    expect(ids(await run({ q: "LC-560" }))).toContain("lc-560");
    const view = await getDsaView();
    const pattern = view.groups.flatMap((g) => g.patterns)[0];
    expect(ids(await run({ q: pattern.name }))).toContain(pattern.items[0].id);
    expect(ids(await run({ q: "leetcode" }))).toContain("lc-1");
  });

  it("needs every word, in any order", async () => {
    expect(ids(await run({ q: "maximum sliding window" }))).toContain("lc-239");
    expect(ids(await run({ q: "sliding zzzqqq" }))).toEqual([]);
    expect((await run({ q: "  sliding   window  " })).length).toBeGreaterThan(0);
  });

  it("treats digits as an exact problem number", async () => {
    expect(ids(await run({ q: "1" }))).toEqual(["lc-1"]);
    expect(ids(await run({ q: "#560" }))).toEqual(["lc-560"]);
  });

  it("keeps notes and saved code out of the text and bounds its size", async () => {
    await saveNote("lc-560", { notes: "secretnotewordxyz", code: "secretcodewordxyz", language: "" });
    expect(ids(await run({ q: "secretnotewordxyz" }))).toEqual([]);
    expect(ids(await run({ q: "secretcodewordxyz" }))).toEqual([]);
    const view = await getDsaView();
    const p = view.groups.flatMap((g) => g.patterns).flatMap((x) => x.items)[0];
    expect(searchText(p).length).toBeLessThan(20000);
  });
});

describe("source filter", () => {
  it("parses the source and keeps only known values", () => {
    expect(parseSource("cp-algorithms")).toBe("cp-algorithms");
    expect(parseSource(["CSES"])).toBe("cses");
    expect(parseSource("codeforces")).toBe("codeforces");
    expect(parseSource("euler")).toBe("euler");
    expect(parseSource("hackerrank")).toBe("");
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
    const logic = [{ id: "c-euler-1" }, { id: "c-atc-abc086-a" }, { id: "c-cf-4a" }, { id: "c-kattis-pot" }];
    expect(logic.filter((p) => matchesSource(p, "euler"))).toEqual([logic[0]]);
    expect(logic.filter((p) => matchesSource(p, "atcoder"))).toEqual([logic[1]]);
    expect(logic.filter((p) => matchesSource(p, "codeforces"))).toEqual([logic[2]]);
    expect(logic.filter((p) => matchesSource(p, "kattis"))).toEqual([logic[3]]);
    expect(logic.filter((p) => matchesSource(p, "leetcode"))).toEqual([]);
  });
});
