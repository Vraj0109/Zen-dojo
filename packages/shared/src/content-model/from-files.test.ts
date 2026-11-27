import { describe, expect, it } from "vitest";
import { fixtureEntities } from "./fixture-for-tests";
import { problemFromSpec } from "./from-files";
import { specFromContent } from "./to-spec";
import { pageTemplate, validatePageAgainstTemplate } from "./templates";

// The content now lives in the database (plan 0117); these checks run the converters over the committed fixture's
// problems. The full round trip of every problem was proved once at cutover (docs/plans/wave3-content-db.md).
const { problems } = fixtureEntities();
const codeBlocks = (p: (typeof problems)[number]) => p.solution.sections.flatMap((s) => s.blocks).filter((b) => b.type === "code");

describe("problemFromSpec / specFromContent", () => {
  it("round-trips the judge fields of every fixture problem", () => {
    expect(problems.length).toBeGreaterThanOrEqual(10);
    for (const p of problems) {
      const spec = specFromContent(p);
      expect(specFromContent(problemFromSpec(spec)), p.row.id).toEqual(spec);
    }
  });

  it("puts the stress generators back only when the caller passes them", () => {
    const spec = specFromContent(problems[0]);
    const stress = [{ label: "x", make: () => [] }];
    expect(specFromContent(problemFromSpec(spec), stress).stress).toBe(stress);
    expect(specFromContent(problemFromSpec(spec))).not.toHaveProperty("stress");
  });

  it("gives the same rows and page ids on two runs", () => {
    const spec = specFromContent(problems[0]);
    const a = problemFromSpec(spec);
    const b = problemFromSpec(spec);
    expect(b).toEqual(a);
    expect(a.solution.sections.map((s) => s.id)).toEqual(b.solution.sections.map((s) => s.id));
  });

  it("builds a valid problem page for every fixture problem", () => {
    const tpl = pageTemplate("problem");
    const only = (key: string) => ({ ...tpl, slots: tpl.slots.filter((s) => s.key === key) });
    for (const p of problems) {
      const back = problemFromSpec(specFromContent(p));
      expect(validatePageAgainstTemplate(only("statement"), back.statement), p.row.id).toEqual([]);
      expect(validatePageAgainstTemplate(only("solution"), back.solution), p.row.id).toEqual([]);
      expect(validatePageAgainstTemplate(only("statement"), p.statement), p.row.id).toEqual([]);
      expect(validatePageAgainstTemplate(only("solution"), p.solution), p.row.id).toEqual([]);
    }
  });

  it("brute: same, the walkthrough shows the sentence and only the optimal code", () => {
    const p = problems.find((x) => x.solution.sections.some((s) => s.blocks.some((b) => b.label === "brute-same")));
    expect(p).toBeDefined();
    const spec = specFromContent(p!);
    const back = problemFromSpec(spec, { bruteSame: true, interviewMd: "brute: same" });
    const blocks = back.solution.sections.flatMap((s) => s.blocks);
    expect(blocks.filter((b) => b.type === "code").map((b) => b.variant)).toEqual(["optimal"]);
    expect(blocks.find((b) => b.label === "brute-same")?.body).toBe("The direct approach is already optimal here.");
  });

  it("design problem: statement and optimal code, kind design, design shape kept", () => {
    const p = problems.find((x) => x.row.kind === "design");
    expect(p).toBeDefined();
    const spec = specFromContent(p!);
    const back = problemFromSpec(spec);
    expect(back.row.kind).toBe("design");
    expect(back.row.design).toEqual(spec.design);
    expect(back.statement.sections[0].blocks.map((b) => b.body)).toEqual(spec.statement);
    expect(codeBlocks(back).find((b) => b.variant === "optimal")?.code.cpp).toBe(spec.solution.cpp);
  });

  it("brute and Java and Python: block order is brute, then optimal with all three languages", () => {
    const p = problems.find((x) => {
      const c = codeBlocks(x);
      return c.length === 2 && c.every((b) => ["cpp", "java", "python"].every((l) => (b.code as Record<string, string>)[l] !== undefined));
    });
    expect(p).toBeDefined();
    const c = codeBlocks(p!);
    const opt = c.find((b) => b.variant === "optimal")!.code as Record<string, string>;
    const brute = c.find((b) => b.variant === "brute")!.code as Record<string, string>;
    const back = problemFromSpec(specFromContent(p!), { java: opt.java, python: opt.python, brute: { cpp: brute.cpp, java: brute.java, python: brute.python }, interviewMd: "x" });
    const codes = codeBlocks(back);
    expect(codes.map((b) => b.variant)).toEqual(["brute", "optimal"]);
    expect(Object.keys(codes[0].code)).toEqual(["cpp", "java", "python"]);
    expect(Object.keys(codes[1].code)).toEqual(["cpp", "java", "python"]);
    expect(codes[0].label).toBe("Brute force");
    expect(codes[1].label).toBe("Optimal");
    expect(codes[1].code.java).toBe(opt.java);
  });
});
