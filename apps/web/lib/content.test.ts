import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateItem } from "@habit/shared";
import { exportBackup, restoreBackup } from "./backup";
import { adminDenied } from "./content-admin";
import { deleteItem, getExtraTests, getItem, listAddedProblems, listItems, listReading, resolveProblemSpec, seedBuiltinProblems, upsertItem, withExtraTests } from "./content";
import { clientOptions, databaseUrl } from "./db";
import { getPackProblemSpec, listPacks } from "./packs";

const example = (name: string) => JSON.parse(readFileSync(new URL(`../../../docs/examples/${name}.json`, import.meta.url), "utf8"));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 9, 12));
});

describe("content items", () => {
  it("stores an item, skips the same revision, replaces a changed one and deletes it", async () => {
    const first = await upsertItem(example("one-reading"));
    expect(first).toMatchObject({ ok: true, id: "reading:cp-algorithms-binary-search", changed: true });
    expect(await upsertItem(example("one-reading"))).toMatchObject({ ok: true, changed: false });
    expect(await upsertItem({ ...example("one-reading"), note: "A different note." })).toMatchObject({ ok: true, changed: true });
    expect((await listReading()).map((r) => r.item)).toMatchObject([{ note: "A different note." }]);
    expect(await deleteItem("reading:cp-algorithms-binary-search")).toBe(true);
    expect(await deleteItem("reading:cp-algorithms-binary-search")).toBe(false);
    expect(await listItems()).toEqual([]);
  });

  it("refuses bad items with messages that name the field", async () => {
    expect(validateItem("nope")).toMatchObject({ ok: false });
    expect(validateItem({ type: "poem" })).toMatchObject({ ok: false, errors: [expect.stringContaining("type")] });
    const r = await upsertItem({ type: "reading", id: "Bad Id", title: "", url: "ftp://x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/"id"[\s\S]*"title"[\s\S]*"url"/);
    const bad = await upsertItem({ type: "tests", problem: "lc-1", cases: [{ input: [[1, 2]] }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors[0]).toContain("cases[0].input has 1 values but lc-1 takes 2");
    const noOutput = await upsertItem({ type: "tests", problem: "lc-1", cases: [{ input: [[3, 3], 6] }] });
    expect(noOutput.ok).toBe(false);
    if (!noOutput.ok) expect(noOutput.errors[0]).toContain("content:add");
    expect(await listItems()).toEqual([]);
  });

  it("a stored problem appears as a pack problem with its own id and runs through the packs code", async () => {
    expect(await upsertItem(example("one-problem"))).toMatchObject({ ok: true, id: "problem:count-vowels" });
    const spec = await getPackProblemSpec("pack:items:count-vowels");
    expect(spec).toMatchObject({ title: "Count the vowels", fn: { name: "countVowels" } });
    expect((await listPacks()).find((p) => p.id === "items")).toMatchObject({ problems: 1, lessons: 0 });
    await upsertItem(example("one-lesson"));
    expect((await listPacks()).find((p) => p.id === "items")).toMatchObject({ problems: 1, lessons: 1 });
    await deleteItem("problem:count-vowels");
    expect(await getPackProblemSpec("pack:items:count-vowels")).toBeNull();
    await deleteItem("lesson:two-pointers-in-one-minute");
    expect(await listPacks()).toEqual([]);
  });

  it("stored problems are listed for /dsa under their group and on the pattern pages they name", async () => {
    await upsertItem(example("one-problem"));
    await upsertItem({ ...example("one-problem"), id: "plain-one", title: "Plain", group: undefined, patterns: undefined });
    expect((await listAddedProblems()).map((p) => [p.id, p.group, p.done])).toEqual([["pack:items:count-vowels", "Warm-ups", false], ["pack:items:plain-one", "Added by you", false]]);
    expect((await listAddedProblems("hash-map")).map((p) => p.title)).toEqual(["Count the vowels"]);
    expect(await listAddedProblems("dp-1d")).toEqual([]);
    expect((await listAddedProblems())[0].href).toBe("/study/packs/items/count-vowels");
    const bad = await upsertItem({ ...example("one-problem"), id: "bad-pattern", patterns: ["no-such-pattern"] });
    expect(bad.ok).toBe(false);
  });

  it("an invalid problem is refused and leaves the stored ones alone", async () => {
    await upsertItem(example("one-problem"));
    const r = await upsertItem({ ...example("one-problem"), id: "broken", fn: { name: "f", params: [], returns: "nonsense" } });
    expect(r.ok).toBe(false);
    expect((await listItems("problem")).map((i) => i.id)).toEqual(["problem:count-vowels"]);
  });

  it("extra test cases are appended to a built-in problem and to a stored one, and removing the item restores the old tests", async () => {
    const { JUDGE_PROBLEMS } = await import("@habit/shared");
    const before = JUDGE_PROBLEMS["lc-1"].tests.length;
    expect(await upsertItem({ type: "tests", problem: "lc-1", cases: [{ input: [[3, 3], 6], output: [0, 1] }] })).toMatchObject({ ok: true });
    expect(await getExtraTests("lc-1")).toHaveLength(1);
    const spec = await resolveProblemSpec("lc-1", getPackProblemSpec);
    expect(spec?.tests).toHaveLength(before + 1);
    expect(JUDGE_PROBLEMS["lc-1"].tests).toHaveLength(before); // the shipped spec is untouched
    await deleteItem("tests:lc-1");
    expect((await resolveProblemSpec("lc-1", getPackProblemSpec))?.tests).toHaveLength(before);

    await upsertItem(example("one-problem"));
    await upsertItem({ type: "tests", problem: "pack:items:count-vowels", cases: [{ input: ["abe"], output: 2 }] });
    const stored = await withExtraTests((await getPackProblemSpec("pack:items:count-vowels"))!);
    expect(stored.tests.at(-1)).toEqual({ input: ["abe"], output: 2 });
  });

  it("a seeded copy of a built-in problem wins over the shipped one, and seeding never overwrites your own item", async () => {
    expect(await seedBuiltinProblems()).toBeGreaterThan(100);
    expect(await getItem("problem:lc-1")).toMatchObject({ source: "builtin" });
    expect((await listPacks()).find((p) => p.id === "items")).toBeUndefined(); // seeded items are not courses
    const seeded = await getItem("problem:lc-1");
    const edited = { ...(seeded!.item as object), title: "Two Sum, rewritten" };
    const { getDb } = await import("./db");
    const { contentItems } = await import("./schema");
    const { eq } = await import("drizzle-orm");
    await (await getDb()).update(contentItems).set({ body: JSON.stringify(edited) }).where(eq(contentItems.id, "problem:lc-1"));
    expect((await resolveProblemSpec("lc-1", getPackProblemSpec))?.title).toBe("Two Sum, rewritten");
  });

  it("items survive a backup and restore", async () => {
    await upsertItem(example("one-reading"));
    await upsertItem(example("one-problem"));
    const backup = await exportBackup();
    expect(backup.tables.content_items).toHaveLength(2);
    delete (globalThis as { habitDb?: unknown }).habitDb;
    await restoreBackup(JSON.parse(JSON.stringify(backup)));
    expect((await listItems()).map((i) => i.id)).toEqual(["problem:count-vowels", "reading:cp-algorithms-binary-search"]);
  });
});

describe("admin access", () => {
  const request = (auth?: string) => new Request("http://localhost/api/admin/content", { headers: auth ? { authorization: auth } : {} });
  it("answers 404 without a token configured, 401 for a wrong one, and allows the right one", () => {
    expect(adminDenied(request("Bearer x"), {})?.status).toBe(404);
    expect(adminDenied(request(), { CONTENT_ADMIN_TOKEN: "secret" })?.status).toBe(401);
    expect(adminDenied(request("Bearer wrong!"), { CONTENT_ADMIN_TOKEN: "secret" })?.status).toBe(401);
    expect(adminDenied(request("Bearer secret"), { CONTENT_ADMIN_TOKEN: "secret" })).toBeNull();
  });
});

describe("remote database settings", () => {
  it("passes the token when DATABASE_AUTH_TOKEN is set and leaves local files as they were", () => {
    expect(clientOptions({ DATABASE_URL: "libsql://content.turso.io", DATABASE_AUTH_TOKEN: "t0k3n" })).toEqual({ url: "libsql://content.turso.io", authToken: "t0k3n" });
    expect(clientOptions({ DATABASE_URL: ":memory:" })).toEqual({ url: ":memory:" });
    expect(clientOptions({}).url).toBe(databaseUrl());
  });
});

describe("content:sync", () => {
  it("adds every file of a folder, skips unchanged files and prunes items whose file is gone", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "habit-sync-"));
    const db = path.join(dir, "test.db");
    try {
      const folder = path.join(dir, "items");
      execFileSync(process.execPath, ["-e", `require("fs").mkdirSync(${JSON.stringify(folder)})`]);
      writeFileSync(path.join(folder, "a.json"), JSON.stringify(example("one-reading")));
      writeFileSync(path.join(folder, "b.json"), JSON.stringify({ ...example("one-reading"), id: "second-link", title: "Second" }));
      const root = path.resolve(__dirname, "..", "..", "..");
      const run = (...a: string[]) =>
        execFileSync(process.execPath, ["--disable-warning=DEP0205", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--import", "./scripts/lib/register-ts.mjs", "scripts/content.mjs", ...a], {
          cwd: root,
          env: { ...process.env, DATABASE_URL: "file:" + db.replaceAll("\\", "/") },
          encoding: "utf8",
        });
      const first = run("sync", folder);
      expect(first).toContain("stored  reading:cp-algorithms-binary-search");
      expect(first).toContain("stored  reading:second-link");
      expect(run("sync", folder)).not.toContain("stored ");
      rmSync(path.join(folder, "b.json"));
      expect(run("sync", folder, "--prune")).toContain("removed reading:second-link");
      expect(run("list")).toContain("reading:cp-algorithms-binary-search");
      expect(run("list")).not.toContain("second-link");
      expect(existsSync(db)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
