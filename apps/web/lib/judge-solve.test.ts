import { beforeEach, describe, expect, it } from "vitest";
import { getDsaView, markSolvedManually, recordJudgePass } from "./dsa";

describe("solving through the judge", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = ":memory:";
    (globalThis as { habitDb?: unknown }).habitDb = undefined;
  });

  it("refuses a manual first solve of a problem the judge can run", async () => {
    expect(await markSolvedManually("lc-128")).toBe(false);
    const v = await getDsaView();
    expect(v.totals.solved).toBe(0);
  });

  it("records the first solve when every test passed", async () => {
    expect(await recordJudgePass("lc-128")).toBe(true);
    expect(await recordJudgePass("lc-128")).toBe(false); // not due for a re-solve yet
    expect((await getDsaView()).totals.solved).toBe(1);
  });

  it("ignores unknown ids", async () => {
    expect(await recordJudgePass("nope")).toBe(false);
  });
});

describe("saved runs keep only failed test ids", () => {
  it("stores ids and looks the cases up from the problem", async () => {
    const { saveRun, getRuns } = await import("./solution-runs");
    const { JUDGE_PROBLEMS } = await import("@habit/shared");
    const spec = JUDGE_PROBLEMS["lc-128"];
    await saveRun("lc-128", "cpp", "int x;", { status: "done", passed: 3, total: 5, failedIds: [1, spec.examples.length + spec.tests.length] });
    const [run] = await getRuns("lc-128", spec);
    expect(run.failedCases).toBe(`1,${spec.examples.length + spec.tests.length}`);
    expect(run.failed?.[0].input).toBeDefined();
    expect(run.failed?.[1].kind).toBe("stress");
  });
});
