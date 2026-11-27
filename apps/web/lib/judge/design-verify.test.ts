import { describe, expect, it } from "vitest";

import { runCode } from "./run";
import { fixtureSpecs } from "@/lib/content-db/test-helpers";

// Problems come from the content database; these are the committed fixture's (plan 0117).
const JUDGE_PROBLEMS = fixtureSpecs();

// Opt-in check for authors: runs the C++ reference solution of every design-a-class problem on all its cases.
//   VERIFY_DESIGN=1 pnpm.cmd exec vitest run apps/web/lib/judge/design-verify.test.ts
// Not part of the normal run (see plan 0022 step 7): the judge test covers LRU Cache in three languages.
const designs = Object.values(JUDGE_PROBLEMS).filter((s) => s.design);

describe.skipIf(!process.env.VERIFY_DESIGN)("design problems: reference solutions", () => {
  for (const spec of designs) {
    it(spec.id + " " + spec.title, async () => {
      const r = await runCode(spec, "cpp", spec.solution.cpp);
      expect(r.status).toBe("done");
      if (r.status !== "done") return;
      const failed = r.results.filter((x) => !x.pass).map((x) => `${x.kind} ${x.index}: ${x.note ?? x.error ?? x.actual} (input ${x.input.slice(0, 120)})`);
      expect(failed).toEqual([]);
    }, 120_000);
  }
});
