import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONCEPT_XP } from "@habit/shared";
import { getProgress } from "./progress";
import { deletePractice, getConceptDetail, getExerciseDetail, getStudyDue, getStudyView, logPractice, saveConcept } from "./study";

const setDay = (d: number, m = 11) => vi.setSystemTime(new Date(2026, m - 1, d, 12));

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay(6);
});

afterEach(() => {
  vi.useRealTimers();
});

const practice = (scores: Record<string, number>, extra: Partial<Parameters<typeof logPractice>[1]> = {}) =>
  logPractice("sdd-url-shortener", { minutes: 45, scores, notes: "", link: "", ...extra });

describe("concepts", () => {
  it("saves confidence, ticked points and notes; XP once when first covered", async () => {
    await saveConcept("sd-caching", { confidence: 2, checked: [0, 2, 2, 99, -1], notes: "cache-aside first" });
    let d = (await getConceptDetail("sd-caching"))!;
    expect(d.progress).toMatchObject({ confidence: 2, checked: [0, 2], notes: "cache-aside first", coveredOn: null, xp: 0 });

    setDay(7);
    await saveConcept("sd-caching", { confidence: 4, checked: [0, 1, 2], notes: "x" });
    setDay(8);
    await saveConcept("sd-caching", { confidence: 3, checked: [], notes: "" });
    await saveConcept("sd-caching", { confidence: 5, checked: [], notes: "" });
    d = (await getConceptDetail("sd-caching"))!;
    expect(d.progress).toMatchObject({ confidence: 5, coveredOn: "2026-11-07", xp: CONCEPT_XP });
    expect((await getProgress("2026-11-08")).totalXp).toBe(CONCEPT_XP);
  });

  it("ignores unknown concepts and clamps confidence", async () => {
    await saveConcept("nope", { confidence: 3, checked: [], notes: "" });
    expect(await getConceptDetail("nope")).toBeNull();
    await saveConcept("sd-apis", { confidence: 99, checked: [], notes: "" });
    expect((await getConceptDetail("sd-apis"))!.progress?.confidence).toBe(5);
  });

  it("asks for a review a week after rating a concept below 4", async () => {
    await saveConcept("sd-cap", { confidence: 2, checked: [], notes: "" });
    expect(await getStudyDue()).toEqual([]);
    setDay(13);
    expect((await getStudyDue()).map((d) => [d.area.id, d.count])).toEqual([["sd", 1]]);
    expect((await getStudyView("sd"))!.due.concepts.map((c) => c.id)).toEqual(["sd-cap"]);
  });
});

describe("practice", () => {
  it("logs a session scored on the framework steps", async () => {
    expect(await practice({ req: 4, est: 3, deep: 2, bogus: 5, hld: 9 }, { link: "https://excalidraw.com/x", notes: "missed hot keys" })).toBe(true);
    const d = (await getExerciseDetail("sdd-url-shortener"))!;
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0]).toMatchObject({ score: 3, scores: { req: 4, est: 3, deep: 2 }, minutes: 45, link: "https://excalidraw.com/x", xp: 30 });
    expect(d.practice).toMatchObject({ state: "practiced", score: 3, nextOn: "2026-11-20", due: false });
  });

  it("needs at least one score, rejects bad links and unknown items", async () => {
    expect(await practice({})).toBe(false);
    expect(await logPractice("sd-caching", { minutes: null, scores: { req: 3 }, notes: "", link: "" })).toBe(false); // a concept, not an exercise
    await practice({ req: 3 }, { link: "javascript:alert(1)", minutes: -5 });
    expect((await getExerciseDetail("sdd-url-shortener"))!.sessions[0]).toMatchObject({ link: null, minutes: null });
  });

  it("gives XP for the first session of the day only, and counts toward the streak", async () => {
    setDay(5);
    await practice({ req: 3 });
    setDay(6);
    await practice({ req: 3 });
    await practice({ req: 5 });
    const sessions = (await getExerciseDetail("sdd-url-shortener"))!.sessions;
    expect(sessions.map((s) => s.xp)).toEqual([0, 30, 30]);
    expect(await getProgress("2026-11-06")).toMatchObject({ totalXp: 60, todayXp: 30, streak: 2 });

    await deletePractice(sessions[0].id);
    expect((await getExerciseDetail("sdd-url-shortener"))!.practice).toMatchObject({ score: 3 });
  });

  it("schedules the next practice and shows it as due", async () => {
    await practice({ req: 2 });
    setDay(13);
    expect((await getStudyDue()).map((d) => [d.area.id, d.count])).toEqual([["sd", 1]]);
    const view = (await getStudyView("sd"))!;
    expect(view.due.exercises.map((e) => e.id)).toEqual(["sdd-url-shortener"]);
    expect(view.totals).toMatchObject({ practiced: 1, exercises: 27, sessions: 1, minutes: 45, xp: 30 });
  });

  it("works the same for LLD problems and core CS concepts", async () => {
    expect(await logPractice("lldp-parking-lot", { minutes: 40, scores: { model: 4, code: 3 }, notes: "", link: "" })).toBe(true);
    expect((await getExerciseDetail("lldp-parking-lot"))!.sessions[0]).toMatchObject({ score: 3.5, xp: 25 });
    await saveConcept("os-deadlocks", { confidence: 4, checked: [0, 1], notes: "" });
    const core = (await getStudyView("core"))!;
    expect(core.exercises).toEqual([]);
    expect(core.totals).toMatchObject({ covered: 1, concepts: 24, pointsChecked: 2, xp: CONCEPT_XP });
    expect((await getStudyView("lld"))!.totals).toMatchObject({ practiced: 1, exercises: 12, xp: 25 });
    // step ids from another area are ignored
    expect(await logPractice("lldp-elevator", { minutes: null, scores: { req: 5 }, notes: "", link: "" })).toBe(false);
  });

  it("returns null for unknown areas", async () => {
    expect(await getStudyView("nope")).toBeNull();
  });
});
