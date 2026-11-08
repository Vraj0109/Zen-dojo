import { CSES_SPECS } from "./problems-cses";
import { LEETCODE_SPECS } from "./problems-leetcode";
import { LEETCODE_SPECS_2 } from "./problems-leetcode-2";
import { LEETCODE_SPECS_3 } from "./problems-leetcode-3";
import { LEETCODE_SPECS_4 } from "./problems-leetcode-4";
import type { ProblemSpec } from "./types";

export * from "./types";
export * from "./templates";

/** Every problem you can run in the app, by id ("lc-1", "cses-weird-algorithm"). */
export const JUDGE_PROBLEMS: Record<string, ProblemSpec> = Object.fromEntries([...LEETCODE_SPECS, ...LEETCODE_SPECS_2, ...LEETCODE_SPECS_3, ...LEETCODE_SPECS_4, ...CSES_SPECS].map((p) => [p.id, p]));

export const CSES_PROBLEMS: ProblemSpec[] = CSES_SPECS;
