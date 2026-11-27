import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyFollowState, getFollowMute, parseUnitList, setUnitFollow } from "./content-follow";

const fresh = () => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
};

beforeEach(fresh);

afterEach(() => {
  const g = globalThis as { habitDb?: { db: { $client: { close(): void } } } };
  g.habitDb?.db.$client.close();
  delete g.habitDb;
});

describe("follow and mute store", () => {
  it("defaults to empty lists when nothing is stored", async () => {
    expect(await getFollowMute()).toEqual({ follow: [], mute: [] });
  });

  it("round-trips follow, mute and default for a unit", async () => {
    await setUnitFollow("course:sd", "follow");
    expect(await getFollowMute()).toEqual({ follow: ["course:sd"], mute: [] });

    await setUnitFollow("course:sd", "mute");
    expect(await getFollowMute()).toEqual({ follow: [], mute: ["course:sd"] });

    await setUnitFollow("course:sd", "default");
    expect(await getFollowMute()).toEqual({ follow: [], mute: [] });
  });

  it("keeps other units when one changes", async () => {
    await setUnitFollow("course:sd", "follow");
    await setUnitFollow("problems:hash-map", "mute");
    await setUnitFollow("docs", "follow");
    expect(await getFollowMute()).toEqual({ follow: ["course:sd", "docs"], mute: ["problems:hash-map"] });
  });

  it("rejects something that is not a content unit", async () => {
    await expect(setUnitFollow("course:", "follow")).rejects.toThrow("Not a content unit");
    await expect(setUnitFollow("lesson:x", "mute")).rejects.toThrow("Not a content unit");
  });
});

describe("pure follow rules", () => {
  it("a unit is in at most one list", () => {
    const start = { follow: ["course:sd"], mute: [] };
    expect(applyFollowState(start, "course:sd", "mute")).toEqual({ follow: [], mute: ["course:sd"] });
    expect(applyFollowState({ follow: [], mute: ["docs"] }, "docs", "follow")).toEqual({ follow: ["docs"], mute: [] });
  });

  it("parseUnitList drops malformed JSON, non-arrays and non-unit entries", () => {
    expect(parseUnitList(null)).toEqual([]);
    expect(parseUnitList("{not json")).toEqual([]);
    expect(parseUnitList('{"a":1}')).toEqual([]);
    expect(parseUnitList('["course:sd","bogus",3,"course:sd"]')).toEqual(["course:sd"]);
  });
});
