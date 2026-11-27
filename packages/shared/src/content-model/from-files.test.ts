import { describe, expect, it } from "vitest";
import { JUDGE_PROBLEMS } from "../judge/index";
import { BRUTE, SOLUTIONS } from "../judge/generated/solutions";
import { INTERVIEW as INTERVIEW_MD } from "../judge/generated/interview";
import type { ProblemSpec } from "../judge/types";
import { problemFromSpec, type ProblemExtra } from "./from-files";
import { specFromContent } from "./to-spec";
import { validatePageAgainstTemplate, pageTemplate } from "./templates";

/** The extra inputs the seed will read for one problem, from the generated bundles. */
function extraFor(id: string): ProblemExtra {
  const sol = SOLUTIONS[id] ?? {};
  const brute = BRUTE[id];
  const md = INTERVIEW_MD[id]?.md;
  return {
    java: sol.java,
    python: sol.python,
    brute: brute as ProblemExtra["brute"],
    interviewMd: md,
    bruteSame: md !== undefined && /brute:\s*same/i.test(md),
  };
}

function withoutStress(spec: ProblemSpec): Partial<ProblemSpec> {
  const { stress: _stress, ...rest } = spec;
  return rest;
}

describe("problemFromSpec / specFromContent", () => {
  it("round-trips the judge fields of every built-in problem", () => {
    const ids = Object.keys(JUDGE_PROBLEMS);
    expect(ids.length).toBe(486);
    const mismatches: string[] = [];
    for (const id of ids) {
      const spec = JUDGE_PROBLEMS[id];
      const back = specFromContent(problemFromSpec(spec, extraFor(id)));
      try {
        expect(back).toEqual(withoutStress(spec));
      } catch {
        mismatches.push(id);
      }
    }
    if (mismatches.length) console.log("round-trip mismatches (first 5):", mismatches.slice(0, 5));
    expect(mismatches).toEqual([]);
  });

  it("puts the stress generators back only when the caller passes them", () => {
    const spec = JUDGE_PROBLEMS["lc-1"];
    const stress = [{ label: "x", make: () => [] }];
    expect(specFromContent(problemFromSpec(spec, extraFor("lc-1")), stress).stress).toBe(stress);
    expect(specFromContent(problemFromSpec(spec, extraFor("lc-1")))).not.toHaveProperty("stress");
  });

  it("gives the same rows and page ids on two runs", () => {
    const spec = JUDGE_PROBLEMS["abc151-a"];
    const a = problemFromSpec(spec, extraFor("abc151-a"));
    const b = problemFromSpec(spec, extraFor("abc151-a"));
    expect(b).toEqual(a);
    expect(a.solution.sections.map((s) => s.id)).toEqual(b.solution.sections.map((s) => s.id));
  });

  it("builds a valid problem page for every problem", () => {
    const tpl = pageTemplate("problem");
    const only = (key: string) => ({ ...tpl, slots: tpl.slots.filter((s) => s.key === key) });
    for (const id of Object.keys(JUDGE_PROBLEMS)) {
      const p = problemFromSpec(JUDGE_PROBLEMS[id], extraFor(id));
      expect(validatePageAgainstTemplate(only("statement"), p.statement), id).toEqual([]);
      expect(validatePageAgainstTemplate(only("solution"), p.solution), id).toEqual([]);
    }
  });

  it("brute: same, the walkthrough shows the sentence and only the optimal code", () => {
    const id = "abc151-a";
    expect(extraFor(id).bruteSame).toBe(true);
    const p = problemFromSpec(JUDGE_PROBLEMS[id], extraFor(id));
    const blocks = p.solution.sections.flatMap((s) => s.blocks);
    expect(blocks.filter((b) => b.type === "code").map((b) => b.variant)).toEqual(["optimal"]);
    const same = blocks.find((b) => b.label === "brute-same");
    expect(same?.body).toBe("The direct approach is already optimal here.");
    const brute = p.solution.sections.find((s) => s.title?.toLowerCase().includes("brute force"));
    expect(brute?.blocks.some((b) => b.label === "brute-same")).toBe(true);
  });

  it("design problem: statement and optimal code, kind design, design shape kept", () => {
    const id = Object.keys(JUDGE_PROBLEMS).find((k) => JUDGE_PROBLEMS[k].kind === "design");
    expect(id).toBeDefined();
    const spec = JUDGE_PROBLEMS[id!];
    const p = problemFromSpec(spec, extraFor(id!));
    expect(p.row.kind).toBe("design");
    expect(p.row.design).toEqual(spec.design);
    expect(p.statement.sections[0].blocks.map((b) => b.body)).toEqual(spec.statement);
    const code = p.solution.sections.flatMap((s) => s.blocks).find((b) => b.variant === "optimal");
    expect(code?.code.cpp).toBe(spec.solution.cpp);
    expect(specFromContent(p).kind).toBe("design");
  });

  it("brute and Java and Python: block order is brute, then optimal with all three languages", () => {
    const id = Object.keys(JUDGE_PROBLEMS).find((k) => {
      const e = extraFor(k);
      const b = BRUTE[k];
      return !e.bruteSame && e.java !== undefined && e.python !== undefined && e.interviewMd !== undefined && b?.java !== undefined && b?.python !== undefined && b?.cpp !== undefined;
    });
    expect(id).toBeDefined();
    const e = extraFor(id!);
    const p = problemFromSpec(JUDGE_PROBLEMS[id!], e);
    const codes = p.solution.sections.flatMap((s) => s.blocks).filter((b) => b.type === "code");
    expect(codes.map((b) => b.variant)).toEqual(["brute", "optimal"]);
    expect(Object.keys(codes[0].code)).toEqual(["cpp", "java", "python"]);
    expect(Object.keys(codes[1].code)).toEqual(["cpp", "java", "python"]);
    expect(codes[0].label).toBe("Brute force");
    expect(codes[1].label).toBe("Optimal");
    expect(codes[1].code.java).toBe(e.java);
    expect(codes[1].code.python).toBe(e.python);
  });
});
