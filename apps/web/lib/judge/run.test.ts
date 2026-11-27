import { describe, expect, it } from "vitest";

import { runCode } from "./run";
import { fixtureSpecs } from "@/lib/content-db/test-helpers";

// Problems come from the content database; these are the committed fixture's (plan 0117).
const JUDGE_PROBLEMS = fixtureSpecs();

describe("runCode with { only: 'examples', extra }", () => {
  // Clear cpp solution in spec so the test uses JS only without invoking g++
  const spec = { ...JUDGE_PROBLEMS["lc-1"], solution: { idea: [], complexity: "O(n)", cpp: "" } };
  const jsCode = `
function twoSum(nums, target) {
  console.log("running case for target=" + target);
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) return [seen.get(diff), i];
    seen.set(nums[i], i);
  }
  return [];
}
`;

  it("runs only examples when extra is empty", async () => {
    const result = await runCode(spec, "javascript", jsCode, { only: "examples" });
    expect(result.status).toBe("done");
    if (result.status !== "done") return;

    expect(result.total).toBe(spec.examples.length);
    expect(result.results).toHaveLength(spec.examples.length);
    for (const r of result.results) {
      expect(r.kind).toBe("example");
      expect(r.pass).toBe(true);
    }
  });

  it("runs examples and extra custom cases in one process", async () => {
    const extraInputs = [
      [[1, 5, 9], 10],
      [[100, 200, 300], 500],
    ];

    const result = await runCode(spec, "javascript", jsCode, {
      only: "examples",
      extra: extraInputs,
    });
    expect(result.status).toBe("done");
    if (result.status !== "done") return;

    expect(result.total).toBe(spec.examples.length + extraInputs.length);
    expect(result.passed).toBe(result.total);

    // First spec.examples.length cases are examples
    for (let i = 0; i < spec.examples.length; i++) {
      expect(result.results[i].kind).toBe("example");
    }

    // Following cases are custom "mine"
    const mine1 = result.results[spec.examples.length];
    expect(mine1.kind).toBe("mine");
    expect(mine1.label).toBe("My case 1");
    expect(mine1.pass).toBe(true);
    expect(mine1.actual).toBe("[0,2]");
    expect(mine1.output).toContain("running case for target=10");

    const mine2 = result.results[spec.examples.length + 1];
    expect(mine2.kind).toBe("mine");
    expect(mine2.label).toBe("My case 2");
    expect(mine2.pass).toBe(true);
    expect(mine2.actual).toBe("[1,2]");
    expect(mine2.output).toContain("running case for target=500");
  });

  it("marks extra cases as failed when code throws an exception", async () => {
    const throwingCode = `
function twoSum(nums, target) {
  if (target === 999) throw new Error("intentional crash");
  return [0, 1];
}
`;
    const result = await runCode(spec, "javascript", throwingCode, {
      only: "examples",
      extra: [[[1, 2], 999]],
    });
    expect(result.status).toBe("done");
    if (result.status !== "done") return;

    const extraCase = result.results[spec.examples.length];
    expect(extraCase.kind).toBe("mine");
    expect(extraCase.pass).toBe(false);
    expect(extraCase.problem).toBe("exception");
  });
});
