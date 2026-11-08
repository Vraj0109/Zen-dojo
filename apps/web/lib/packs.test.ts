import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCourses } from "./courses";
import { runCode } from "./judge/run";
import { getPack, getPackProblemSpec, getPackProgress, installPack, listPacks, removePack, setPackItemDone } from "./packs";

const sample = () => JSON.parse(readFileSync(new URL("../../../docs/examples/sample-pack.json", import.meta.url), "utf8"));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
});

describe("content packs", () => {
  it("installs, lists, shows up as a Learn course, and tracks progress", async () => {
    expect(await listPacks()).toEqual([]);
    const r = await installPack(sample());
    expect(r).toMatchObject({ ok: true, id: "sample-binary-search", replaced: false });
    const [s] = await listPacks();
    expect(s).toMatchObject({ title: "Binary search warm-up", lessons: 1, problems: 2, done: 0 });

    await setPackItemDone("sample-binary-search", "what-is-binary-search", true);
    await setPackItemDone("sample-binary-search", "no-such-item", true); // ignored
    expect([...(await getPackProgress("sample-binary-search"))]).toEqual(["what-is-binary-search"]);

    const course = (await getCourses()).find((c) => c.id === "pack:sample-binary-search");
    expect(course).toMatchObject({ title: "Binary search warm-up", done: 1, total: 3, left: 2, href: "/study/packs/sample-binary-search" });
    expect(course?.next?.href).toBe("/study/packs/sample-binary-search/first-true");
  });

  it("refuses an invalid pack and stores nothing", async () => {
    const r = await installPack({ ...sample(), id: "NOPE" });
    expect(r.ok).toBe(false);
    expect(await listPacks()).toEqual([]);
  });

  it("replacing a pack keeps progress on items that still exist and drops the rest", async () => {
    await installPack(sample());
    await setPackItemDone("sample-binary-search", "first-true", true);
    await setPackItemDone("sample-binary-search", "integer-sqrt", true);
    const next = sample();
    next.title = "Binary search warm-up v2";
    next.sections[0].items = next.sections[0].items.filter((i: { id: string }) => i.id !== "integer-sqrt");
    expect(await installPack(next)).toMatchObject({ ok: true, replaced: true });
    expect([...(await getPackProgress("sample-binary-search"))]).toEqual(["first-true"]);
    expect((await getPack("sample-binary-search"))?.title).toBe("Binary search warm-up v2");
  });

  it("removes a pack with its progress", async () => {
    await installPack(sample());
    await setPackItemDone("sample-binary-search", "first-true", true);
    await removePack("sample-binary-search");
    expect(await getPack("sample-binary-search")).toBeNull();
    expect((await getPackProgress("sample-binary-search")).size).toBe(0);
  });

  it("finds a problem by its run id", async () => {
    await installPack(sample());
    expect((await getPackProblemSpec("pack:sample-binary-search:first-true"))?.fn.name).toBe("lowerBound");
    expect(await getPackProblemSpec("pack:sample-binary-search:what-is-binary-search")).toBeNull(); // a lesson
    expect(await getPackProblemSpec("pack:missing:x")).toBeNull();
    expect(await getPackProblemSpec("lc-1")).toBeNull();
  });

  it("runs an imported problem: the sample reference solution passes every case", async () => {
    await installPack(sample());
    const spec = await getPackProblemSpec("pack:sample-binary-search:first-true");
    if (!spec) throw new Error("missing");
    const r = await runCode(spec, "cpp", spec.solution.cpp);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.passed).toBe(r.total);
  }, 120_000);
});
