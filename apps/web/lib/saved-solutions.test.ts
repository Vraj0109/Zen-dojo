import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSolutionAction, getSavedSolutionsAction } from "@/app/actions";
import { editorHelp, TAB_HELP } from "@/app/editor-help";
import { getNote, getSavedSolutions, saveSolution, saveSolutionFor } from "./notes";
import { saveRun } from "./solution-runs";

vi.mock("next/cache", () => ({ refresh: () => {}, revalidatePath: () => {} }));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 9, 12));
});

describe("saved solutions (the Save button)", () => {
  it("saves without running, as not verified, and shows it in the list and the notes form", async () => {
    const r = await saveSolutionAction("lc-1", "cpp", "class Solution {};");
    expect(r).toMatchObject({ ok: true, solution: { lang: "cpp", code: "class Solution {};", savedOn: "2026-11-09", verified: false } });
    expect(await getSavedSolutionsAction("lc-1")).toEqual([{ lang: "cpp", code: "class Solution {};", savedOn: "2026-11-09", verified: false }]);
    expect(await getNote("lc-1")).toMatchObject({ code: "class Solution {};", language: "C++" });
  });

  it("is verified only when the last run of exactly this code passed every case", async () => {
    await saveRun("lc-1", "cpp", "good", { status: "done", passed: 10, total: 10 });
    expect((await saveSolutionFor("lc-1", "cpp", "good")).verified).toBe(true);
    expect((await saveSolutionFor("lc-1", "cpp", "good but edited")).verified).toBe(false);
    await saveRun("lc-1", "cpp", "partly", { status: "done", passed: 3, total: 10 });
    expect((await saveSolutionFor("lc-1", "cpp", "partly")).verified).toBe(false);
    await saveRun("lc-1", "java", "does not build", { status: "compile_error", passed: 0, total: 0 });
    expect((await saveSolutionFor("lc-1", "java", "does not build")).verified).toBe(false);
  });

  it("keeps one solution per language and replaces the earlier one", async () => {
    await saveSolutionAction("lc-1", "cpp", "first");
    await saveSolutionAction("lc-1", "java", "java version");
    vi.setSystemTime(new Date(2026, 10, 10, 9));
    await saveSolutionAction("lc-1", "cpp", "second");
    const list = await getSavedSolutions("lc-1");
    expect(list.map((s) => [s.lang, s.code, s.savedOn])).toEqual([
      ["cpp", "second", "2026-11-10"],
      ["java", "java version", "2026-11-09"],
    ]);
    expect(await getSavedSolutions("lc-2")).toEqual([]);
  });

  it("an all-pass run (the auto-save) records a verified solution for that language", async () => {
    await saveSolution("lc-1", "class Solution {};", "C++");
    expect(await getSavedSolutions("lc-1")).toMatchObject([{ lang: "cpp", verified: true }]);
  });

  it("refuses unknown problems and languages and code that is too long", async () => {
    expect(await saveSolutionAction("nope", "cpp", "x")).toMatchObject({ ok: false, error: "Unknown problem." });
    expect(await saveSolutionAction("lc-1", "python", "x")).toMatchObject({ ok: false, error: "Unknown language." });
    expect(await saveSolutionAction("lc-1", "cpp", "x".repeat(50_001))).toMatchObject({ ok: false });
    expect(await getSavedSolutions("lc-1")).toEqual([]);
  });
});

describe("the editor small print", () => {
  it("is behind the ? button: the text is there for every language, and the old lines are gone from the layout", () => {
    expect(editorHelp("javascript")).toBe(TAB_HELP);
    expect(editorHelp("cpp")).toContain("bits/stdc++.h");
    expect(editorHelp("cpp")).toContain("Tab indents");
    expect(editorHelp("java")).toContain("java.util.*");
    const read = (f: string) => readFileSync(new URL(`../app/${f}`, import.meta.url), "utf8");
    expect(read("code-editor.tsx")).not.toContain("Tab indents");
    expect(read("judge-workspace.tsx")).not.toContain("Added for you");
    expect(read("judge-workspace.tsx")).toContain("aria-describedby");
  });
});
