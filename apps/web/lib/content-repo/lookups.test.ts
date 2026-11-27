import { describe, expect, it, vi } from "vitest";
import type { PatternGroup, Problem } from "@habit/shared";
import { fixtureDoc } from "../content-db/test-helpers";
import { getAllConcepts, getAllExercises, getAllPatterns, getDsaGroups, getRoadmapProblems, getStudyAreas } from "./lookups";

// The lookups rebuild the shapes the app used before the content moved to the database (plan 0114), here from the
// fixture the vitest global setup loaded. At cutover they matched the old constants exactly for all content.
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn() }));

describe("content lookups", () => {
  it("study areas come in nav order with their sections, concepts and exercises", async () => {
    const areas = await getStudyAreas();
    expect(areas.map((a) => a.id)).toEqual(["sd", "lld", "core"]);
    const sd = areas[0];
    expect(sd.sections.length).toBeGreaterThan(0);
    expect(sd.sections.flatMap((s) => s.concepts).some((c) => c.id === "sd-caching")).toBe(true);
    expect(sd.exercises?.items.some((e) => e.id === "sdd-url-shortener")).toBe(true);
  });

  it("every concept and exercise is indexed with its area (and a concept with its section title)", async () => {
    const concepts = await getAllConcepts();
    expect(concepts["sd-caching"]).toMatchObject({ id: "sd-caching", area: "sd" });
    expect(typeof concepts["sd-caching"].section).toBe("string");
    expect(concepts["lld-solid"].area).toBe("lld");
    const exercises = await getAllExercises();
    expect(exercises["sdd-chat"].area).toBe("sd");
    expect(exercises["lldp-parking-lot"].area).toBe("lld");
  });

  it("the roadmap list and pattern groups are the dsa-problems and dsa-groups docs", async () => {
    expect(await getRoadmapProblems()).toEqual(fixtureDoc<Record<string, Problem>>("dsa-problems"));
    const groups = fixtureDoc<PatternGroup[]>("dsa-groups");
    expect(await getDsaGroups()).toEqual(groups);
    expect(await getAllPatterns()).toEqual(groups.flatMap((g) => g.patterns));
  });
});
