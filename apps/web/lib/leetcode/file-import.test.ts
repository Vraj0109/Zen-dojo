import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importLeetCodeFileAction } from "@/app/actions";
import { getProblemDetail } from "../dsa";
import { EXT_LIMITS, getExtensionStatus } from "./extension";
import { FILE_FORMAT, FILE_MAX_BYTES, importLeetCodeFile, LeetCodeFileError, parseLeetCodeFile } from "./file-import";

vi.mock("next/cache", () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }));

const ts = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 10).getTime() / 1000;
};

const sub = (id: number, slug: string, date: string, extra: Record<string, unknown> = {}) => ({
  id: String(id),
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

const fileOf = (submissions: unknown[], topics: unknown[] = [], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ format: FILE_FORMAT, version: 1, exportedAt: "2026-11-06T12:00:00.000Z", submissions, topics, ...extra });

const form = (file?: File) => {
  const f = new FormData();
  if (file) f.set("file", file);
  return f;
};

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete process.env.HABIT_HOSTED;
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 12));
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network in tests"))));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LeetCode file: checking the file", () => {
  it("accepts the extension's format", () => {
    expect(parseLeetCodeFile(fileOf([sub(1, "two-sum", "2026-11-06")], [{ slug: "two-sum", tags: ["Array"] }]))).toMatchObject({
      submissions: [{ id: "1" }],
      topics: [{ slug: "two-sum" }],
    });
    expect(parseLeetCodeFile(fileOf([sub(1, "two-sum", "2026-11-06")], undefined, { topics: undefined })).topics).toEqual([]);
  });

  it.each([
    ["not json", "{nope", /not valid JSON/],
    ["a list", "[]", /not a Zen Dojo LeetCode file/],
    ["another format", JSON.stringify({ format: "prepwise-pack", version: 1, submissions: [] }), /not a Zen Dojo LeetCode file/],
    ["a newer version", fileOf([sub(1, "a", "2026-11-06")], [], { version: 2 }), /newer extension/],
    ["no version", fileOf([sub(1, "a", "2026-11-06")], [], { version: undefined }), /unknown version/],
    ["submissions not a list", fileOf([], [], { submissions: "x" }), /damaged/],
    ["topics not a list", fileOf([], [], { topics: {} }), /damaged/],
    ["nothing inside", fileOf([]), /no submissions/],
  ])("explains a bad file: %s", (_name, text, message) => {
    expect(() => parseLeetCodeFile(text)).toThrow(LeetCodeFileError);
    expect(() => parseLeetCodeFile(text)).toThrow(message);
  });
});

describe("LeetCode file: importing", () => {
  it("stores submissions and topics, records the solve once and updates 'last import'", async () => {
    const r = await importLeetCodeFile(
      fileOf([sub(11, "two-sum", "2026-11-06"), sub(12, "two-sum", "2026-11-06", { lang: "Python3" }), { id: "x" }], [{ slug: "two-sum", tags: ["Array"] }]),
    );
    expect(r).toEqual({ stored: 2, skipped: 1, topics: 1, added: 1, resolved: 0 });
    expect((await getProblemDetail("lc-1"))!.submissions).toHaveLength(2);
    expect((await getProblemDetail("lc-1"))!.topics).toEqual(["Array"]);
    expect((await getExtensionStatus()).last).toMatchObject({ stored: 2, added: 1 });
  });

  it("is safe to import the same file twice", async () => {
    const text = fileOf([sub(11, "two-sum", "2026-11-06")]);
    await importLeetCodeFile(text);
    expect(await importLeetCodeFile(text)).toMatchObject({ stored: 1, added: 0, resolved: 0 });
    expect((await getProblemDetail("lc-1"))!.submissions).toHaveLength(1);
  });

  it("imports in chunks of the batch size and adds the results up", async () => {
    // 2.5 batches of distinct accepted submissions across 3 problems; one real submission per slug id range
    const slugs = ["two-sum", "lru-cache", "valid-parentheses"];
    const n = EXT_LIMITS.batch * 2 + 50;
    const subs = Array.from({ length: n }, (_, i) => sub(1000 + i, slugs[i % 3], "2026-11-05"));
    const r = await importLeetCodeFile(fileOf(subs, [{ slug: "two-sum", tags: ["Array"] }, { slug: "lru-cache", tags: ["Design"] }]));
    expect(r.stored).toBe(n);
    expect(r.skipped).toBe(0);
    expect(r.topics).toBe(2); // topics are imported once, with the first chunk
    expect(r.added).toBe(3); // one solve per problem, however many submissions
    expect((await getProblemDetail("lc-1"))!.submissions.length).toBeGreaterThan(0);
    expect((await getExtensionStatus()).last).toMatchObject({ stored: n }); // the whole file, not the last chunk
  });
});

describe("LeetCode file: upload action", () => {
  const upload = (text: string, name = "zen-dojo-leetcode-2026-11-06.json") => importLeetCodeFileAction(null, form(new File([text], name, { type: "application/json" })));

  it("reports what was imported", async () => {
    expect(await upload(fileOf([sub(11, "two-sum", "2026-11-06"), sub(12, "two-sum", "2026-11-05")]))).toEqual({
      ok: true,
      message: "Imported 2 submissions, 1 new solve.",
    });
  });

  it("says so in plain words when nothing was chosen, the file is wrong, or too big", async () => {
    expect(await importLeetCodeFileAction(null, form())).toMatchObject({ ok: false, message: expect.stringMatching(/Choose the file/) });
    expect(await importLeetCodeFileAction(null, form(new File([""], "empty.json")))).toMatchObject({ ok: false });
    expect(await upload("hello")).toMatchObject({ ok: false, message: expect.stringMatching(/not valid JSON/) });
    expect(await upload(JSON.stringify({ format: "other" }))).toMatchObject({ ok: false, message: expect.stringMatching(/not a Zen Dojo LeetCode file/) });
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: FILE_MAX_BYTES + 1 });
    expect(await importLeetCodeFileAction(null, form(big))).toMatchObject({ ok: false, message: expect.stringMatching(/over 20 MB/) });
  });

  it("is refused on the hosted site", async () => {
    process.env.HABIT_HOSTED = "1";
    expect(await upload(fileOf([sub(11, "two-sum", "2026-11-06")]))).toMatchObject({ ok: false, message: expect.stringMatching(/desktop app/) });
  });
});
