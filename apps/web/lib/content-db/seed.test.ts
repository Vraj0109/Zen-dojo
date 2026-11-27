// Parity test for the seed (plan 0112 step 6): the content database, read back, holds the same content as the repo files.
// It seeds an in-memory database once and compares every problem, lesson and doc with the file values. It never compiles
// or runs any code (no judge, no compilers): the judge fields and code strings are compared as data.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JUDGE_PROBLEMS, lessonToShape, specFromContent, type ContentProblem, type ProblemSpec } from "@habit/shared";
import { bruteCode, solutionCode, type SolutionLang } from "@habit/shared/solutions";
import { getContentDb, resetContentDbForTests, type ContentDb } from "./client";
import { getMeta } from "./meta";
import { loadCourse, loadDoc, loadLesson, loadProblem } from "./load";
import { assets } from "./schema";
import { seedFixture } from "./test-helpers";
import { docSources, lessonSources, roadmapPatternOf, seedContent, type SeedReport } from "./seed";

const LANGS: SolutionLang[] = ["cpp", "java", "python"];
const SHOW = 5;

let db: ContentDb;
let first: SeedReport;

/** Top-level keys whose values differ (key order inside values does not matter), for the mismatch printout. */
function differingKeys(a: unknown, b: unknown): string[] {
  const x = (a ?? {}) as Record<string, unknown>;
  const y = (b ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  return [...keys].filter((k) => !isEqualShape(x[k], y[k]));
}

/** Prints the first mismatches (up to SHOW) and fails if there are any. */
function expectNoMismatches(label: string, mismatches: { id: string; detail: string }[]): void {
  if (mismatches.length) {
    console.log(`${label}: ${mismatches.length} mismatches, first ${Math.min(SHOW, mismatches.length)}:`);
    for (const m of mismatches.slice(0, SHOW)) console.log(`  ${m.id}: ${m.detail}`);
  }
  expect(mismatches.map((m) => m.id)).toEqual([]);
}

/** The optimal and brute code blocks of a solution page, keyed by variant. */
function codeBlocksOf(p: ContentProblem) {
  const blocks = p.solution.sections.flatMap((s) => s.blocks);
  return {
    optimal: blocks.find((b) => b.type === "code" && b.variant === "optimal"),
    brute: blocks.find((b) => b.type === "code" && b.variant === "brute"),
  };
}

beforeAll(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
  first = await seedContent(db, { actor: "seed", batch: 50 });
}, 120_000);

afterAll(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

describe("seed parity", () => {
  it("writes every entity the files produce on an empty database", () => {
    expect(first.dryRun).toBe(false);
    expect(first.changed).toBe(first.counts.courses + first.counts.lessons + first.counts.problems + first.counts.docs);
    expect(first.unchanged).toBe(0);
    expect(first.counts.problems).toBe(486);
    expect(first.counts.lessons).toBe(287);
    expect(first.counts.courses).toBe(4);
    expect(first.version).toBe(first.changed);
  });

  it("every problem's judge fields equal the file spec (specFromContent)", async () => {
    const roadmap = roadmapPatternOf();
    const mismatches: { id: string; detail: string }[] = [];
    let roadmapPatterns = 0;
    for (const id of Object.keys(JUDGE_PROBLEMS)) {
      const { stress, ...file } = JUDGE_PROBLEMS[id] as ProblemSpec & { stress?: unknown };
      void stress; // stress generators are code and are never stored
      const loaded = await loadProblem(db, id);
      if (!loaded) {
        mismatches.push({ id, detail: "missing from the database" });
        continue;
      }
      const back = specFromContent(loaded) as unknown as Record<string, unknown>;
      // The roadmap pattern is filled into problems.pattern where the spec has none. specFromContent then reports it as
      // `pattern`; that one key is checked against the roadmap instead of the spec (see notes, deviation 2).
      const { pattern: backPattern, ...backRest } = back;
      const { pattern: filePattern, ...fileRest } = file as Record<string, unknown>;
      if (filePattern === undefined) {
        roadmapPatterns++;
        if (backPattern !== roadmap.get(id)) mismatches.push({ id, detail: `pattern ${String(backPattern)} is not the roadmap pattern` });
      } else if (backPattern !== filePattern) {
        mismatches.push({ id, detail: `pattern ${String(backPattern)} != ${String(filePattern)}` });
      }
      const keys = differingKeys(backRest, fileRest);
      if (keys.length) mismatches.push({ id, detail: `keys differ: ${keys.join(", ")}` });
    }
    console.log(`problems with a roadmap-filled pattern: ${roadmapPatterns}`);
    expectNoMismatches("judge fields", mismatches);
  }, 120_000);

  it("every solution block holds the code the solution files give, per language", async () => {
    const mismatches: { id: string; detail: string }[] = [];
    for (const id of Object.keys(JUDGE_PROBLEMS)) {
      const spec = JUDGE_PROBLEMS[id];
      const loaded = await loadProblem(db, id);
      if (!loaded) continue;
      const { optimal, brute } = codeBlocksOf(loaded);
      for (const lang of LANGS) {
        const want = solutionCode(spec, lang);
        const got = optimal?.code[lang] || null;
        if (want !== got) mismatches.push({ id, detail: `optimal ${lang}: stored ${got === null ? "none" : "code"}, file ${want === null ? "none" : "code"}` });
        const wantBrute = bruteCode(spec, lang);
        const gotBrute = brute?.code[lang] || null;
        if (wantBrute !== gotBrute) mismatches.push({ id, detail: `brute ${lang}: stored ${gotBrute === null ? "none" : "code"}, file ${wantBrute === null ? "none" : "code"}` });
      }
    }
    expectNoMismatches("solution code", mismatches);
  }, 120_000);

  it("every lesson reads back as the file value (lessonToShape)", async () => {
    const mismatches: { id: string; detail: string }[] = [];
    const sources = lessonSources();
    for (const src of sources) {
      const loaded = await loadLesson(db, src.id);
      if (!loaded) {
        mismatches.push({ id: src.id, detail: "missing from the database" });
        continue;
      }
      if (!isEqualShape(lessonToShape(loaded), src.value)) {
        mismatches.push({ id: src.id, detail: `page differs (${src.kind})` });
      }
    }
    expect(sources.length).toBe(287);
    expectNoMismatches("lessons", mismatches);
  }, 120_000);

  it("every doc reads back as the file value", async () => {
    const mismatches: { id: string; detail: string }[] = [];
    const sources = docSources();
    for (const src of sources) {
      const loaded = await loadDoc(db, src.kind, src.id);
      if (!loaded) {
        mismatches.push({ id: `${src.kind}:${src.id}`, detail: "missing from the database" });
        continue;
      }
      if (!isEqualShape(loaded.row.body, src.body)) mismatches.push({ id: `${src.kind}:${src.id}`, detail: "body differs" });
    }
    expect(sources.length).toBe(40); // 39 + dsa-groups (added in round B)
    expectNoMismatches("docs", mismatches);
  }, 120_000);

  it("a second run changes nothing and records the commit it came from", async () => {
    const again = await seedContent(db, { actor: "seed", batch: 50, seededFrom: "parity-test" });
    expect(again.changed).toBe(0);
    expect(again.unchanged).toBe(first.changed);
    expect(again.version).toBe(first.version);
    expect(await getMeta(db, "seeded_from")).toBe("parity-test");
  }, 120_000);
});

/** Deep equality through JSON, ignoring keys whose value is undefined (the file values may leave them out). */
function isEqualShape(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) out[k] = sortKeys(x);
    }
    return out;
  }
  return v;
}

describe("test fixture (packages/shared/test/fixtures/content-mini.json)", () => {
  it("writes through the write helpers and reads back unchanged", async () => {
    process.env.CONTENT_DATABASE_URL = ":memory:";
    await resetContentDbForTests();
    const fixtureDb = await getContentDb();
    const snapshot = await seedFixture(fixtureDb);
    expect(snapshot.entities.filter((e) => e.kind === "problem")).toHaveLength(12);
    expect(snapshot.entities.filter((e) => e.kind === "course")).toHaveLength(3);
    expect(snapshot.entities.filter((e) => e.kind === "lesson")).toHaveLength(6);
    expect(snapshot.entities.filter((e) => e.kind === "doc")).toHaveLength(16);

    const mismatches: { id: string; detail: string }[] = [];
    for (const e of snapshot.entities) {
      if (e.kind === "problem") {
        const got = await loadProblem(fixtureDb, e.value.row.id);
        if (!isEqualShape(got, e.value)) mismatches.push({ id: e.value.row.id, detail: "problem differs" });
      } else if (e.kind === "lesson") {
        const got = await loadLesson(fixtureDb, e.value.row.id);
        if (!isEqualShape(got, e.value)) mismatches.push({ id: e.value.row.id, detail: "lesson differs" });
      } else if (e.kind === "course") {
        const got = await loadCourse(fixtureDb, e.value.row.id);
        if (!isEqualShape(got, e.value)) mismatches.push({ id: e.value.row.id, detail: "course differs" });
      } else {
        const got = await loadDoc(fixtureDb, e.value.row.kind, e.value.row.id);
        if (!isEqualShape(got?.row.body, e.value.row.body)) mismatches.push({ id: `${e.value.row.kind}:${e.value.row.id}`, detail: "doc differs" });
      }
    }
    expectNoMismatches("fixture", mismatches);

    const assetRows = await fixtureDb.select().from(assets);
    expect(assetRows.map((a) => a.id)).toEqual(snapshot.assets.map((a) => a.id));
    await resetContentDbForTests();
    delete process.env.CONTENT_DATABASE_URL;
  }, 120_000);
});
