import type { Case, DesignSpec, ProblemSpec } from "./types";

// Helpers for "design a class" problems (see DesignSpec in types.ts). Pure data helpers; the programs that run a class
// are built in apps/web/lib/judge/harness-design.ts.

/**
 * Writes a test case the way you would say it: the calls in order, then the answers.
 *   seq('LRUCache(2) put(1,1) get(1)', [null, null, 1])
 * becomes input [["LRUCache","put","get"],[[2],[1,1],[1]]] with output [null,null,1]. Arguments are JSON, so strings
 * have double quotes; a call with no arguments is written snap().
 */
export function seq(calls: string, output: unknown[]): Case {
  const ops: string[] = [];
  const args: unknown[][] = [];
  for (const m of calls.matchAll(/(\w+)\(([^)]*)\)/g)) {
    ops.push(m[1]);
    args.push(JSON.parse(`[${m[2]}]`) as unknown[]);
  }
  if (ops.length !== output.length) throw new Error(`seq: ${ops.length} calls but ${output.length} answers in "${calls.slice(0, 60)}"`);
  return { input: [ops, args], output };
}

/** The same, for a large input built by a generator: [ops, args]. */
export const callList = (ops: string[], args: unknown[][]): unknown[] => [ops, args];

/** A small seeded random number generator (mulberry32): the same seed always gives the same numbers. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Everything a design problem has except the parts that follow from its class. */
export type DesignProblem = Omit<ProblemSpec, "fn" | "kind" | "source"> & { design: DesignSpec };

/** Builds the full spec: a design problem keeps a stand-in `fn` (the two inputs, ops and args) so shared code still works. */
export function designProblem(p: DesignProblem): ProblemSpec {
  return {
    ...p,
    source: "leetcode",
    kind: "design",
    fn: { name: p.design.className, params: [{ name: "ops", type: "string[]" }, { name: "args", type: "string[][]" }], returns: "string[]" },
  };
}
