import { CSES_SPECS } from "./problems-cses";
import { CSES_SPECS_INTRO } from "./problems-cses-intro";
import { CSES_SPECS_SORTING } from "./problems-cses-sorting";
import { CSES_SPECS_DP } from "./problems-cses-dp";
import { CSES_SPECS_GRAPH } from "./problems-cses-graph";
import { CSES_SPECS_MISC } from "./problems-cses-misc";
import { OTHER_SPECS } from "./problems-other";
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
import { DESIGN_SPECS_C } from "./problems-design-c";
import { LOGIC_SPECS_EULER } from "./problems-logic-euler";
import { LOGIC_SPECS_ATCODER } from "./problems-logic-atcoder";
import { LOGIC_SPECS_CODEFORCES } from "./problems-logic-codeforces";
import { LOGIC_SPECS_KATTIS } from "./problems-logic-kattis";
import { LOGIC_SPECS_BATCH2 } from "./problems-logic-batch2";
import { STRESS } from "./stress";
import { STRESS_6 } from "./stress-6";
import { STRESS_7 } from "./stress-7";
import { STRESS_8 } from "./stress-8";
import { STRESS_9 } from "./stress-9";
import { STRESS_CSES_INTRO } from "./stress-cses-intro";
import { STRESS_CSES_SORTING } from "./stress-cses-sorting";
import { STRESS_CSES_DP } from "./stress-cses-dp";
import { STRESS_CSES_GRAPH } from "./stress-cses-graph";
import { STRESS_CSES_MISC } from "./stress-cses-misc";
import { STRESS_LOGIC } from "./stress-logic";
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
    ...CSES_SPECS_INTRO,
    ...CSES_SPECS_SORTING,
    ...CSES_SPECS_DP,
    ...CSES_SPECS_GRAPH,
    ...CSES_SPECS_MISC,
    ...OTHER_SPECS,
    ...LOGIC_SPECS_EULER,
    ...LOGIC_SPECS_ATCODER,
    ...LOGIC_SPECS_CODEFORCES,
    ...LOGIC_SPECS_KATTIS,
    ...LOGIC_SPECS_BATCH2,
  ].map((p) => [p.id, p])
);

// "Design a class" problems (LRU Cache and friends); see design.ts.
for (const p of [...DESIGN_SPECS_A, ...DESIGN_SPECS_B, ...DESIGN_SPECS_C]) JUDGE_PROBLEMS[p.id] = p;

// Attach the large inputs (speed and memory checks) to their problems.
for (const spec of Object.values(JUDGE_PROBLEMS)) {
  const stress =
    STRESS[spec.id] ??
    STRESS_6[spec.id] ??
    STRESS_7[spec.id] ??
    STRESS_8[spec.id] ??
    STRESS_9[spec.id] ??
    STRESS_CSES_INTRO[spec.id] ??
    STRESS_CSES_SORTING[spec.id] ??
    STRESS_CSES_DP[spec.id] ??
    STRESS_CSES_GRAPH[spec.id] ??
    STRESS_CSES_MISC[spec.id] ??
    STRESS_LOGIC[spec.id];
  if (stress) spec.stress = stress;
}

export { STRESS } from "./stress";
export { STRESS_6 } from "./stress-6";
export { STRESS_7 } from "./stress-7";
export { STRESS_8 } from "./stress-8";
export { STRESS_9 } from "./stress-9";
export { STRESS_CSES_INTRO } from "./stress-cses-intro";
export { STRESS_CSES_SORTING } from "./stress-cses-sorting";
export { STRESS_CSES_DP } from "./stress-cses-dp";
export { STRESS_CSES_GRAPH } from "./stress-cses-graph";
export { STRESS_CSES_MISC } from "./stress-cses-misc";
export { STRESS_LOGIC } from "./stress-logic";

export const CSES_PROBLEMS: ProblemSpec[] = [
  ...CSES_SPECS,
  ...CSES_SPECS_INTRO,
  ...CSES_SPECS_SORTING,
  ...CSES_SPECS_DP,
  ...CSES_SPECS_GRAPH,
  ...CSES_SPECS_MISC,
];
export const OTHER_PROBLEMS: ProblemSpec[] = OTHER_SPECS;
export const LOGIC_PROBLEMS: ProblemSpec[] = [...LOGIC_SPECS_EULER, ...LOGIC_SPECS_ATCODER, ...LOGIC_SPECS_CODEFORCES, ...LOGIC_SPECS_KATTIS, ...LOGIC_SPECS_BATCH2];
