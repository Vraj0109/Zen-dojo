// Stress lookup by problem id (plan 0117 step 2). Reads only the stress*.ts files, never the problem specs, so code
// that needs stress (apps/web/lib/content-repo/stress.ts) does not load every problem. judge/index.ts attaches the same
// sets to the specs, so the judge sees the same data.
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
import { STRESS_CSES_RANGE } from "./stress-cses-range";
import { STRESS_CSES_TREE } from "./stress-cses-tree";
import { STRESS_CSES_MATH } from "./stress-cses-math";
import { STRESS_CSES_GEO_STR } from "./stress-cses-geo-str";
import { STRESS_LOGIC } from "./stress-logic";
import { STRESS_LOGIC_C } from "./stress-logic-c";
import { STRESS_LOGIC_D } from "./stress-logic-d";
import { STRESS_INLINE } from "./stress-inline";
import type { StressCase } from "./types";

/**
 * Every stress map, in the order the judge has always used. When two maps name the same id, the earlier map wins, so
 * STRESS_INLINE (the 14 entries moved out of the problem specs) is only used when no other map has the id.
 */
const SOURCES: Record<string, StressCase[]>[] = [
  STRESS,
  STRESS_6,
  STRESS_7,
  STRESS_8,
  STRESS_9,
  STRESS_CSES_INTRO,
  STRESS_CSES_SORTING,
  STRESS_CSES_DP,
  STRESS_CSES_GRAPH,
  STRESS_CSES_MISC,
  STRESS_CSES_RANGE,
  STRESS_CSES_TREE,
  STRESS_CSES_MATH,
  STRESS_CSES_GEO_STR,
  STRESS_LOGIC,
  STRESS_LOGIC_C,
  STRESS_LOGIC_D,
  STRESS_INLINE,
];

/** Stress sets by problem id, merged from every stress map. */
export const STRESS_BY_ID: Record<string, StressCase[]> = {};
for (const source of SOURCES) {
  for (const [id, cases] of Object.entries(source)) {
    if (!Object.hasOwn(STRESS_BY_ID, id)) STRESS_BY_ID[id] = cases;
  }
}

/** The large inputs (speed and memory checks) for one problem, or undefined when it has none. */
export function stressFor(id: string): StressCase[] | undefined {
  return Object.hasOwn(STRESS_BY_ID, id) ? STRESS_BY_ID[id] : undefined;
}
