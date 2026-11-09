import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validatePack } from "@habit/shared";
import { getCourses } from "./courses";
import { getAddedItems, installPack, removePack, setPackItemDone } from "./packs";

const sample = () => JSON.parse(readFileSync(new URL("../../../docs/examples/sample-pack.json", import.meta.url), "utf8"));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 9, 12));
});

describe("pack format version 2", () => {
  it("still accepts version 1 and the old format name, and the new name and version 2", () => {
    expect(validatePack(sample()).ok).toBe(true);
    expect(validatePack({ ...sample(), format: "zendojo-pack", version: 2 }).ok).toBe(true);
    const bad = validatePack({ ...sample(), version: 3 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join(" ")).toContain('"version" must be 1 or 2');
    const badName = validatePack({ ...sample(), format: "other" });
    if (!badName.ok) expect(badName.errors.join(" ")).toContain("zendojo-pack");
  });

  it("reads revision, target, tags and source, and explains mistakes", () => {
    const pack = { ...sample(), version: 2, revision: "1.2.0", target: { area: "lld", section: "SOLID" } };
    pack.sections[0].items[1] = { ...pack.sections[0].items[1], tags: ["binary-search"], source: "Own words", sourceUrl: "https://example.com/p" };
    const ok = validatePack(pack);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.pack).toMatchObject({ revision: "1.2.0", target: { area: "lld", section: "SOLID" } });
      expect(ok.pack.sections[0].items[1]).toMatchObject({ tags: ["binary-search"], source: "Own words", sourceUrl: "https://example.com/p" });
    }
    const errors = (patch: Record<string, unknown>) => {
      const r = validatePack({ ...sample(), version: 2, ...patch });
      return r.ok ? "" : r.errors.join(" | ");
    };
    expect(errors({ target: { area: "nope" } })).toContain('"target.area" must be one of: sd, lld, core');
    expect(errors({ revision: "not a version!" })).toContain('"revision" must be a short version text');
    const badUrl = sample();
    badUrl.sections[0].items[1].sourceUrl = "javascript:alert(1)";
    expect(validatePack({ ...badUrl, version: 2 }).ok).toBe(false);
  });
});

describe("a pack with a target", () => {
  const targeted = (id = "more-lld", section = "SOLID") => ({
    format: "zendojo-pack",
    version: 2,
    id,
    title: "More LLD",
    description: "",
    target: { area: "lld", section },
    sections: [{ title: "x", items: [{ type: "lesson", id: "extra-lesson", title: "An extra lesson", markdown: "A lesson that is long enough to pass the check." }] }],
  });

  it("adds its items to the study area, stays out of the course list, and is gone when removed", async () => {
    await installPack(targeted());
    expect(await getAddedItems("core")).toEqual([]);
    const [group] = await getAddedItems("lld");
    expect(group).toMatchObject({ section: "SOLID", items: [{ packId: "more-lld", id: "extra-lesson", title: "An extra lesson", type: "lesson", done: false }] });
    expect((await getCourses()).some((c) => c.id === "pack:more-lld")).toBe(false);

    await setPackItemDone("more-lld", "extra-lesson", true);
    expect((await getAddedItems("lld"))[0].items[0].done).toBe(true);

    await removePack("more-lld");
    expect(await getAddedItems("lld")).toEqual([]);
  });

  it("a pack without a target stays its own course", async () => {
    await installPack(sample());
    expect((await getCourses()).some((c) => c.id === "pack:sample-binary-search")).toBe(true);
    expect(await getAddedItems("lld")).toEqual([]);
  });

  it("groups packs that use the same heading, and uses the pack title when there is no section", async () => {
    await installPack(targeted("pack-one"));
    await installPack(targeted("pack-two"));
    const noSection = targeted("pack-three");
    delete (noSection.target as { section?: string }).section;
    await installPack(noSection);
    const groups = await getAddedItems("lld");
    expect(groups.map((g) => [g.section, g.items.length])).toEqual([["SOLID", 2], ["More LLD", 1]]);
  });
});
