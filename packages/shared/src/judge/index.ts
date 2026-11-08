import { CSES_SPECS } from "./problems-cses";
import { LEETCODE_SPECS } from "./problems-leetcode";
import { LEETCODE_SPECS_2 } from "./problems-leetcode-2";
import { LEETCODE_SPECS_3 } from "./problems-leetcode-3";
import { LEETCODE_SPECS_4 } from "./problems-leetcode-4";
import { LEETCODE_SPECS_5 } from "./problems-leetcode-5";
import { STRESS } from "./stress";
import type { ProblemSpec } from "./types";

export * from "./types";
export * from "./templates";

/** Every problem you can run in the app, by id ("lc-1", "cses-weird-algorithm"). */
export const JUDGE_PROBLEMS: Record<string, ProblemSpec> = Object.fromEntries([...LEETCODE_SPECS, ...LEETCODE_SPECS_2, ...LEETCODE_SPECS_3, ...LEETCODE_SPECS_4, ...LEETCODE_SPECS_5, ...CSES_SPECS].map((p) => [p.id, p]));

// Attach the large inputs (speed and memory checks) to their problems.
for (const spec of Object.values(JUDGE_PROBLEMS)) {
  const stress = STRESS[spec.id];
  if (stress) spec.stress = stress;
}

export { STRESS } from "./stress";

export const CSES_PROBLEMS: ProblemSpec[] = CSES_SPECS;
