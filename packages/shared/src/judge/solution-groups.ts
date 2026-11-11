// Which author group owns which problems for the Java and Python reference solutions (plan 0063, plan 0065).
// Every problem in JUDGE_PROBLEMS belongs to exactly one group; solutions.test.ts checks that.
// The plan 0063 table listed all CSES files under e (about 149), but that made e 184; CSES math moved to d and CSES
// geometry/strings to f so the groups hold 163 / 159 / 164 problems.
import { CSES_SPECS } from "./problems-cses";
import { CSES_SPECS_INTRO } from "./problems-cses-intro";
import { CSES_SPECS_SORTING } from "./problems-cses-sorting";
import { CSES_SPECS_DP } from "./problems-cses-dp";
import { CSES_SPECS_GRAPH } from "./problems-cses-graph";
import { CSES_SPECS_MISC } from "./problems-cses-misc";
import { CSES_RANGE_SPECS } from "./problems-cses-range";
import { CSES_TREE_SPECS } from "./problems-cses-tree";
import { CSES_SPECS_MATH } from "./problems-cses-math";
import { CSES_SPECS_GEO_STR } from "./problems-cses-geo-str";
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
import { LOGIC_SPECS_C } from "./problems-logic-c";
import { PROBLEMS_LOGIC_D } from "./problems-logic-d";
import { SPECIAL_SPECS } from "./problems-special";
import type { ProblemSpec } from "./types";

export type SolutionGroup = "d" | "e" | "f";
export const SOLUTION_GROUP_IDS: readonly SolutionGroup[] = ["d", "e", "f"];

/** The spec arrays of each group (the problems an author writes Java and Python solutions for). */
export const SOLUTION_GROUPS: Record<SolutionGroup, ProblemSpec[][]> = {
  d: [LEETCODE_SPECS, LEETCODE_SPECS_2, LEETCODE_SPECS_3, LEETCODE_SPECS_4, LEETCODE_SPECS_5, LEETCODE_SPECS_6, LEETCODE_SPECS_7, LEETCODE_SPECS_8, CSES_SPECS_MATH],
  e: [
    LEETCODE_SPECS_9,
    CSES_SPECS,
    CSES_SPECS_INTRO,
    CSES_SPECS_SORTING,
    CSES_SPECS_DP,
    CSES_SPECS_GRAPH,
    CSES_SPECS_MISC,
    CSES_RANGE_SPECS,
    CSES_TREE_SPECS,
    DESIGN_SPECS_A,
    DESIGN_SPECS_B,
    DESIGN_SPECS_C,
    SPECIAL_SPECS,
    OTHER_SPECS,
  ],
  f: [LOGIC_SPECS_EULER, LOGIC_SPECS_ATCODER, LOGIC_SPECS_CODEFORCES, LOGIC_SPECS_KATTIS, LOGIC_SPECS_BATCH2, LOGIC_SPECS_C, PROBLEMS_LOGIC_D, CSES_SPECS_GEO_STR],
};

/** The problem ids of one group, in file order, without repeats. */
export function groupIds(group: SolutionGroup): string[] {
  const seen = new Set<string>();
  for (const arr of SOLUTION_GROUPS[group]) for (const p of arr) seen.add(p.id);
  return [...seen];
}

/** The group a problem id belongs to, or undefined when it is in none. */
export function groupOf(id: string): SolutionGroup | undefined {
  return SOLUTION_GROUP_IDS.find((g) => SOLUTION_GROUPS[g].some((arr) => arr.some((p) => p.id === id)));
}
