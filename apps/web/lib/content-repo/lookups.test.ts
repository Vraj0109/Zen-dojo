import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ALL_CONCEPTS, ALL_EXERCISES, ALL_PATTERNS, DSA_GROUPS, PROBLEMS, STUDY_AREAS } from "@habit/shared";
import { getContentDb, resetContentDbForTests } from "../content-db/client";
import { seedContent } from "../content-db/seed";
import { getAllConcepts, getAllExercises, getAllPatterns, getDsaGroups, getRoadmapProblems, getStudyAreas } from "./lookups";

// The lookups must give exactly the old constants back after a real seed, so callers can switch without changes.
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn() }));

const json = (v: unknown) => JSON.parse(JSON.stringify(v));

beforeAll(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  await seedContent(await getContentDb(), { actor: "seed", batch: 50 });
}, 60_000);

afterAll(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("lookups match the old constants", () => {
  it("STUDY_AREAS", async () => expect(await getStudyAreas()).toEqual(json(STUDY_AREAS)));
  it("ALL_CONCEPTS", async () => expect(await getAllConcepts()).toEqual(json(ALL_CONCEPTS)));
  it("ALL_EXERCISES", async () => expect(await getAllExercises()).toEqual(json(ALL_EXERCISES)));
  it("PROBLEMS", async () => expect(await getRoadmapProblems()).toEqual(json(PROBLEMS)));
  it("DSA_GROUPS", async () => expect(await getDsaGroups()).toEqual(json(DSA_GROUPS)));
  it("ALL_PATTERNS", async () => expect(await getAllPatterns()).toEqual(json(ALL_PATTERNS)));
});
