import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDsaView, getProblemDetail, markSolved } from "./dsa";
import { getDb } from "./db";
import { NOTE_LIMITS, getNote, getNotedIds, saveNote } from "./notes";
import { leetcodeProblems, problemSolves } from "./schema";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("notes", () => {
  it("saves, updates and reads notes with code and language", async () => {
    await saveNote("lc-560", { notes: "prefix sum + hashmap", code: "class Solution {}", language: "Java" });
    expect(await getNote("lc-560")).toMatchObject({ notes: "prefix sum + hashmap", code: "class Solution {}", language: "Java" });

    vi.setSystemTime(new Date(2026, 10, 7, 9));
    await saveNote("lc-560", { notes: "count[sum - k]", code: "", language: "Python" });
    const note = await getNote("lc-560");
    expect(note).toMatchObject({ notes: "count[sum - k]", code: "", language: "Python" });
    expect(note!.updatedAt.startsWith("2026-11-07")).toBe(true);
  });

  it("removes the entry when both fields are emptied", async () => {
    await saveNote("lc-1", { notes: "x", code: "y", language: "Go" });
    await saveNote("lc-1", { notes: "  ", code: "\n", language: "Go" });
    expect(await getNote("lc-1")).toBeNull();
  });

  it("truncates over-long input and drops unknown languages", async () => {
    await saveNote("lc-1", { notes: "n".repeat(NOTE_LIMITS.notes + 10), code: "c".repeat(NOTE_LIMITS.code + 10), language: "Brainfuck" });
    const note = (await getNote("lc-1"))!;
    expect(note.notes).toHaveLength(NOTE_LIMITS.notes);
    expect(note.code).toHaveLength(NOTE_LIMITS.code);
    expect(note.language).toBe("");
  });

  it("marks noted problems on the DSA view", async () => {
    await saveNote("lc-239", { notes: "deque of indices", code: "", language: "" });
    expect(await getNotedIds()).toEqual(new Set(["lc-239"]));
    const items = (await getDsaView()).groups.flatMap((g) => g.patterns).flatMap((p) => p.items);
    expect(items.filter((i) => i.id === "lc-239").every((i) => i.noted)).toBe(true); // listed in two patterns
    expect(items.find((i) => i.id === "lc-1")!.noted).toBe(false);
  });
});

describe("problem detail", () => {
  it("returns a roadmap problem with its patterns, status and note", async () => {
    await markSolved("lc-239");
    await saveNote("lc-239", { notes: "monotonic deque", code: "", language: "" });
    const d = (await getProblemDetail("lc-239"))!;
    expect(d).toMatchObject({ kind: "roadmap", title: "Sliding Window Maximum", difficulty: "hard", auto: false });
    expect(d.patterns.map((p) => p.id)).toEqual(["sliding-window", "monotonic-deque"]);
    expect(d.status).toMatchObject({ state: "solved", solvedOn: "2026-11-06" });
    expect(d.note?.notes).toBe("monotonic deque");
  });

  it("returns a synced problem outside the roadmap", async () => {
    const db = await getDb();
    await db.insert(leetcodeProblems).values({ slug: "new-one", number: 3999, title: "New One", difficulty: "easy" });
    await db.insert(problemSolves).values({ problemId: "lcx-new-one", kind: "solve", solvedOn: "2026-11-05", xp: 5, source: "leetcode" });
    expect(await getProblemDetail("lcx-new-one")).toMatchObject({
      kind: "extra",
      title: "New One",
      number: 3999,
      url: "https://leetcode.com/problems/new-one/",
      auto: true,
      patterns: [],
      status: { solvedOn: "2026-11-05" },
    });
  });

  it("returns null for unknown ids", async () => {
    expect(await getProblemDetail("lc-999999")).toBeNull();
    expect(await getProblemDetail("lcx-never-synced")).toBeNull();
    expect(await getProblemDetail("../etc")).toBeNull();
  });
});
