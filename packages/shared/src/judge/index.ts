import { CSES_SPECS } from "./problems-cses";
import { LEETCODE_SPECS } from "./problems-leetcode";
import { LEETCODE_SPECS_2 } from "./problems-leetcode-2";
import { LEETCODE_SPECS_3 } from "./problems-leetcode-3";
import { LEETCODE_SPECS_4 } from "./problems-leetcode-4";
import { LEETCODE_SPECS_5 } from "./problems-leetcode-5";
import { LEETCODE_SPECS_6 } from "./problems-leetcode-6";
import { LEETCODE_SPECS_7 } from "./problems-leetcode-7";
import { LEETCODE_SPECS_8 } from "./problems-leetcode-8";
import { LEETCODE_SPECS_9 } from "./problems-leetcode-9";
import { DESIGN_SPECS_A } from "./problems-design-a";
import { DESIGN_SPECS_B } from "./problems-design-b";
import { STRESS } from "./stress";
import { STRESS_6 } from "./stress-6";
import { STRESS_7 } from "./stress-7";
import { STRESS_8 } from "./stress-8";
import { STRESS_9 } from "./stress-9";
import type { ProblemSpec } from "./types";

export * from "./types";
export * from "./templates";

/** Every problem you can run in the app, by id ("lc-1", "cses-weird-algorithm"). */
export const JUDGE_PROBLEMS: Record<string, ProblemSpec> = Object.fromEntries(
  [
    ...LEETCODE_SPECS,
    ...LEETCODE_SPECS_2,
    ...LEETCODE_SPECS_3,
    ...LEETCODE_SPECS_4,
    ...LEETCODE_SPECS_5,
    ...LEETCODE_SPECS_6,
    ...LEETCODE_SPECS_7,
    ...LEETCODE_SPECS_8,
    ...LEETCODE_SPECS_9,
    ...CSES_SPECS,
  ].map((p) => [p.id, p])
);

// "Design a class" problems (LRU Cache and friends); see design.ts.
for (const p of [...DESIGN_SPECS_A, ...DESIGN_SPECS_B]) JUDGE_PROBLEMS[p.id] = p;

// Attach the large inputs (speed and memory checks) to their problems.
for (const spec of Object.values(JUDGE_PROBLEMS)) {
  const stress = STRESS[spec.id] ?? STRESS_6[spec.id] ?? STRESS_7[spec.id] ?? STRESS_8[spec.id] ?? STRESS_9[spec.id];
  if (stress) spec.stress = stress;
}

export { STRESS } from "./stress";
export { STRESS_6 } from "./stress-6";
export { STRESS_7 } from "./stress-7";
export { STRESS_8 } from "./stress-8";
export { STRESS_9 } from "./stress-9";

export const CSES_PROBLEMS: ProblemSpec[] = CSES_SPECS;
