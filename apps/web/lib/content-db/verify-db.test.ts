import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { verifyContent, type ContentProblem, type JudgeLang } from "@habit/shared";
import { getContentDb, resetContentDbForTests, type ContentDb } from "./client";
import { loadFixtureSnapshot, seedFixture } from "./test-helpers";
import { sampleProblem } from "./fixtures";
import { testCases } from "./schema";
import { softDelete, upsertProblem } from "./write";
import { BRUTE_TIME_MULTIPLIER, SKIP_STRESS_LINE, loadSnapshotFromDb, missingSolutionIds, selectSolutionJobs, verifyDb } from "./verify-db";

let db: ContentDb;

beforeEach(async () => {
  process.env.CONTENT_DATABASE_URL = ":memory:";
  db = await getContentDb();
});

afterEach(async () => {
  await resetContentDbForTests();
  delete process.env.CONTENT_DATABASE_URL;
});

type Block = { variant: "brute" | "optimal" | null; code: Partial<Record<JudgeLang, string>> };

/** A problem with only solution blocks (the selection never reads anything else). */
function problemWith(id: string, blocks: Block[]): ContentProblem {
  const base = sampleProblem();
  return {
    ...base,
    row: { ...base.row, id },
    solution: {
      template: "problem",
      sections: [
        {
          id: `${id}-sec`,
          slot: "solution",
          ord: 0,
          title: null,
          blocks: blocks.map((b, i) => ({
            id: `${id}-b${i}`,
            ord: i,
            type: "code" as const,
            body: "",
            caption: null,
            variant: b.variant,
            label: null,
            timeComplexity: null,
            spaceComplexity: null,
            assetId: null,
            code: b.code,
          })),
        },
      ],
    },
  };
}

const twoProblems = () => [
  problemWith("p1", [
    { variant: "brute", code: { cpp: "brute cpp", java: "brute java" } },
    { variant: "optimal", code: { cpp: "opt cpp", java: "opt java", python: "opt py" } },
  ]),
  problemWith("p2", [{ variant: "optimal", code: { python: `${SKIP_STRESS_LINE}\nprint(1)` } }, { variant: null, code: { cpp: "display only" } }]),
];

describe("selectSolutionJobs", () => {
  it("runs every code block in every language by default", () => {
    const jobs = selectSolutionJobs(twoProblems());
    expect(jobs.map((j) => `${j.problemId} ${j.lang} ${j.variant}`)).toEqual([
      "p1 cpp brute",
      "p1 java brute",
      "p1 cpp optimal",
      "p1 java optimal",
      "p1 python optimal",
      "p2 python optimal",
    ]);
  });

  it("skips blocks without a variant (display only)", () => {
    const jobs = selectSolutionJobs([problemWith("p", [{ variant: null, code: { cpp: "x" } }])]);
    expect(jobs).toEqual([]);
  });

  it("gives brute blocks no stress and the time limit times five; other blocks keep stress", () => {
    const jobs = selectSolutionJobs(twoProblems());
    for (const j of jobs) {
      if (j.variant === "brute") {
        expect(j.stress).toBe(false);
        expect(j.timeMultiplier).toBe(BRUTE_TIME_MULTIPLIER);
      } else {
        expect(j.timeMultiplier).toBe(1);
      }
    }
    expect(jobs.find((j) => j.problemId === "p1" && j.lang === "cpp" && j.variant === "optimal")?.stress).toBe(true);
  });

  it("drops stress for a Python block that starts with the skip line", () => {
    const jobs = selectSolutionJobs(twoProblems());
    expect(jobs.find((j) => j.problemId === "p2")?.stress).toBe(false);
    expect(jobs.find((j) => j.problemId === "p1" && j.lang === "python")?.stress).toBe(true);
  });

  it("--brute keeps only brute force blocks", () => {
    const jobs = selectSolutionJobs(twoProblems(), { brute: true });
    expect(jobs.every((j) => j.variant === "brute")).toBe(true);
    expect(jobs.map((j) => `${j.problemId} ${j.lang}`)).toEqual(["p1 cpp", "p1 java"]);
  });

  it("--ids keeps only those problems", () => {
    const jobs = selectSolutionJobs(twoProblems(), { ids: ["p2"] });
    expect(jobs.map((j) => j.problemId)).toEqual(["p2"]);
  });

  it("--lang keeps only those languages, and a list of them", () => {
    expect(selectSolutionJobs(twoProblems(), { langs: ["cpp"] }).map((j) => j.lang)).toEqual(["cpp", "cpp"]);
    const two = selectSolutionJobs(twoProblems(), { langs: ["cpp", "python"] });
    expect(new Set(two.map((j) => j.lang))).toEqual(new Set(["cpp", "python"]));
  });

  it("returns no jobs for a language a block does not have", () => {
    expect(selectSolutionJobs([problemWith("p", [{ variant: "optimal", code: { java: "x" } }])], { langs: ["javascript"] })).toEqual([]);
  });

  it("reports ids that no problem has", () => {
    expect(missingSolutionIds(twoProblems(), ["p1", "nope", "p2", "also-no"])).toEqual(["nope", "also-no"]);
  });
});

describe("verifyDb and loadSnapshotFromDb", () => {
  it("loads every live entity and image of the fixture", async () => {
    const fixture = await seedFixtureAndLoad();
    const snapshot = await loadSnapshotFromDb(db);
    expect(snapshot.entities).toHaveLength(fixture.entities.length);
    expect(snapshot.assets.map((a) => a.id).sort()).toEqual(fixture.assets.map((a) => a.id).sort());
    expect(snapshot.schema).toBe(fixture.schema);
  });

  it("leaves soft-deleted entities out of the snapshot", async () => {
    const fixture = await seedFixtureAndLoad();
    const lesson = fixture.entities.find((e) => e.kind === "lesson");
    if (!lesson) throw new Error("fixture has no lesson");
    await db.transaction((tx) => softDelete(tx, "lesson", lesson.value.row.id, "test"));
    const snapshot = await loadSnapshotFromDb(db);
    expect(snapshot.entities).toHaveLength(fixture.entities.length - 1);
    expect(snapshot.entities.some((e) => e.kind === "lesson" && e.value.row.id === lesson.value.row.id)).toBe(false);
  });

  it("gives the same issues as verifyContent on the fixture", async () => {
    const fixture = await seedFixtureAndLoad();
    const fromDb = (await verifyDb(db)).map((i) => JSON.stringify(i)).sort();
    const fromFile = verifyContent(fixture).map((i) => JSON.stringify(i)).sort();
    expect(fromDb).toEqual(fromFile);
  });

  it("reports a warning for a problem that lost its test cases (a completeness goal, not an error)", async () => {
    const fixture = await seedFixtureAndLoad();
    const problem = fixture.entities.find((e) => e.kind === "problem");
    if (!problem) throw new Error("fixture has no problem");
    const id = problem.value.row.id;
    const before = (await verifyDb(db)).filter((i) => i.level === "warning");
    await db.delete(testCases).where(eq(testCases.problemId, id));
    const after = (await verifyDb(db)).filter((i) => i.level === "warning");
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.some((i) => i.entity === "problem" && i.id === id && i.message.includes("no test cases"))).toBe(true);
  });

  it("reports an error for a problem whose test input count no longer matches its parameters", async () => {
    const fixture = await seedFixtureAndLoad();
    const problem = fixture.entities.find((e) => e.kind === "problem" && e.value.row.kind === "function");
    if (!problem) throw new Error("fixture has no function problem");
    const id = problem.value.row.id;
    const before = (await verifyDb(db)).filter((i) => i.level === "error");
    const cases = await db.select().from(testCases).where(eq(testCases.problemId, id));
    const arity = (problem.value as { row: { fn?: { params?: unknown[] } } }).row.fn?.params?.length ?? 0;
    expect(cases.length).toBeGreaterThan(0);
    await db.update(testCases).set({ inputJson: JSON.stringify(new Array(arity + 1).fill(0)) }).where(eq(testCases.problemId, id));
    const after = (await verifyDb(db)).filter((i) => i.level === "error");
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.some((i) => i.entity === "problem" && i.id === id && i.message.includes("inputs but function takes"))).toBe(true);
  });

  it("sees a problem written through upsertProblem", async () => {
    await seedFixtureAndLoad();
    const p = sampleProblem();
    await db.transaction((tx) => upsertProblem(tx, p, "test"));
    const snapshot = await loadSnapshotFromDb(db);
    expect(snapshot.entities.some((e) => e.kind === "problem" && e.value.row.id === p.row.id)).toBe(true);
  });
});

async function seedFixtureAndLoad() {
  await seedFixture(db);
  return loadFixtureSnapshot();
}
