import { describe, expect, it } from "vitest";
import { SKIP_STRESS_LINE, checkFiles, generatedIsCurrent, groupStatus, readSolutionFiles, renderGenerated, type SolutionFile } from "../../../../scripts/solutions.mjs";
import { SOLUTIONS } from "./generated/solutions";
import { JUDGE_PROBLEMS } from "./index";
import { SOLUTION_GROUP_IDS, groupIds, groupOf } from "./solution-groups";
import { hasBundledSolutions, solutionCode, solutionLangs } from "./solutions";
import type { ProblemSpec } from "./types";

const FORBIDDEN = ["Runtime.getRuntime().exec", "ProcessBuilder", "subprocess", "os.system", "socket", "urllib", "java.net"];

/** Everything the structural rules say about one solution file; an empty list means it is fine. */
function problemsWith(f: SolutionFile, spec: ProblemSpec | undefined): string[] {
  const out: string[] = [];
  if (!spec) return [`${f.name}: not a problem id`];
  if (f.code.length > 40 * 1024) out.push(`${f.name}: over 40 KB`);
  for (const word of FORBIDDEN) if (f.code.includes(word)) out.push(`${f.name}: contains "${word}"`);
  const first = f.code.split("\n")[0].trim();
  if (f.code.includes(SKIP_STRESS_LINE) && !(f.lang === "python" && first === SKIP_STRESS_LINE)) out.push(`${f.name}: "${SKIP_STRESS_LINE}" only as the first line of a .py file`);
  if (f.lang === "java") {
    if (!f.code.includes("class ")) out.push(`${f.name}: no class`);
    if (spec.design) {
      if (!f.code.includes(`class ${spec.design.className}`)) out.push(`${f.name}: no class ${spec.design.className}`);
    } else if (!f.code.includes(`${spec.fn.name}(`)) out.push(`${f.name}: no ${spec.fn.name}(`);
  } else {
    const want = spec.design ? `class ${spec.design.className}` : `def ${spec.fn.name}(`;
    if (!f.code.includes(want)) out.push(`${f.name}: no "${want}"`);
  }
  return out;
}

describe("solution groups", () => {
  it("put every problem in exactly one group", () => {
    const seen = new Map<string, string>();
    for (const g of SOLUTION_GROUP_IDS)
      for (const id of groupIds(g)) {
        expect(seen.has(id), `${id} is in groups ${seen.get(id)} and ${g}`).toBe(false);
        seen.set(id, g);
      }
    expect([...seen.keys()].sort()).toEqual(Object.keys(JUDGE_PROBLEMS).sort());
    expect(groupOf("lc-1")).toBe("d");
    expect(groupOf("nope")).toBeUndefined();
  });

  it("are about the same size", () => {
    const sizes = SOLUTION_GROUP_IDS.map((g) => groupIds(g).length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(10);
  });
});

describe("solution files", () => {
  const { files, errors } = readSolutionFiles();

  it("have only .java and .py files named after problem ids", () => {
    expect(checkFiles(files, errors, new Set(Object.keys(JUDGE_PROBLEMS)))).toEqual([]);
  });

  it("follow the structural rules", () => {
    const bad = files.flatMap((f) => problemsWith(f, JUDGE_PROBLEMS[f.id]));
    expect(bad).toEqual([]);
  });

  it("are in the generated bundle", () => {
    expect(generatedIsCurrent(), "generated/solutions.ts is stale: run pnpm solutions:build").toBe(true);
  });
});

describe("the structural rules", () => {
  const two = JUDGE_PROBLEMS["lc-1"];
  const f = (name: string, code: string): SolutionFile => {
    const lang = name.endsWith(".java") ? "java" : "python";
    return { id: name.replace(/\.(java|py)$/, ""), lang, name, code };
  };

  it("accept a good Java and Python file", () => {
    expect(problemsWith(f("lc-1.java", "class Solution { public int[] twoSum(int[] a, int t) { return a; } }"), two)).toEqual([]);
    expect(problemsWith(f("lc-1.py", `${SKIP_STRESS_LINE}\nclass Solution:\n    def twoSum(self, nums, target):\n        return nums\n`), two)).toEqual([]);
  });

  it("reject missing methods, forbidden calls, a misplaced skip line and a huge file", () => {
    expect(problemsWith(f("lc-1.java", "class Solution { }"), two)).toHaveLength(1);
    expect(problemsWith(f("lc-1.py", "import subprocess\ndef twoSum(x): pass"), two)).toHaveLength(1);
    expect(problemsWith(f("lc-1.py", `def twoSum(x): pass\n${SKIP_STRESS_LINE}\n`), two)).toHaveLength(1);
    expect(problemsWith(f("lc-1.java", `${SKIP_STRESS_LINE}\nclass Solution { int twoSum( ) {} }`), two)).toHaveLength(1);
    expect(problemsWith(f("lc-1.py", `def twoSum(x): pass\n# ${"x".repeat(41 * 1024)}`), two)).toHaveLength(1);
  });

  it("want the class of a design problem", () => {
    const lru = Object.values(JUDGE_PROBLEMS).find((p) => p.design);
    expect(lru).toBeTruthy();
    expect(problemsWith(f("x.py", `class ${lru!.design!.className}:\n    pass\n`), lru)).toEqual([]);
    expect(problemsWith(f("x.py", "class Other:\n    pass\n"), lru)).toHaveLength(1);
  });
});

describe("the bundle and group status", () => {
  const files: SolutionFile[] = [
    { id: "lc-1", lang: "java", name: "lc-1.java", code: "class Solution {}\n" },
    { id: "lc-1", lang: "python", name: "lc-1.py", code: "class Solution: pass\n" },
  ];

  it("renders a deterministic bundle", () => {
    expect(renderGenerated([])).toContain("= {};");
    expect(renderGenerated([...files].reverse())).toBe(renderGenerated(files));
    expect(renderGenerated(files)).toContain('"lc-1": { java: "class Solution {}\\n", python: "class Solution: pass\\n" },');
  });

  it("flags names that are not problem ids", () => {
    expect(checkFiles(files, ["lc-2.txt: extension must be .java or .py"], new Set(["lc-9"]))).toEqual(["lc-2.txt: extension must be .java or .py", 'lc-1.java: "lc-1" is not a problem id', 'lc-1.py: "lc-1" is not a problem id']);
  });

  it("counts what is missing per group", () => {
    const s = groupStatus(["lc-1", "lc-2", "lc-3"], [
      { id: "lc-1", lang: "java", name: "lc-1.java", code: "" },
      { id: "lc-1", lang: "python", name: "lc-1.py", code: `${SKIP_STRESS_LINE}\n` },
      { id: "lc-2", lang: "java", name: "lc-2.java", code: "" },
    ]);
    expect(s).toMatchObject({ total: 3, java: 2, python: 1, missing: ["lc-2", "lc-3"], missingJava: ["lc-3"], missingPython: ["lc-2", "lc-3"], skipStress: ["lc-1"] });
  });
});

describe("solutionCode and solutionLangs", () => {
  const two = JUDGE_PROBLEMS["lc-1"];

  it("give C++ from the spec", () => {
    expect(solutionCode(two, "cpp")).toBe(two.solution.cpp);
    expect(solutionLangs(two)[0]).toBe("cpp");
  });

  it("give Java and Python from the bundle, and null when missing", () => {
    for (const id of Object.keys(SOLUTIONS)) {
      const spec = JUDGE_PROBLEMS[id];
      expect(solutionCode(spec, "java")).toBe(SOLUTIONS[id].java ?? null);
      expect(solutionCode(spec, "python")).toBe(SOLUTIONS[id].python ?? null);
    }
    const nobody = { ...two, id: "not-in-the-bundle" };
    expect(solutionCode(nobody, "java")).toBeNull();
    expect(solutionCode(nobody, "python")).toBeNull();
    expect(solutionLangs(nobody)).toEqual(["cpp"]);
  });

  it("keep C++ only for a stored problem with its own solution", () => {
    const stored = { ...two, id: "pack-demo", solution: { idea: [], complexity: "O(1)", cpp: "int main() {}" } };
    expect(solutionLangs(stored)).toEqual(["cpp"]);
    expect(solutionCode(stored, "cpp")).toBe("int main() {}");
    // A stored problem that reuses a built-in id but has its own solution does not get the built-in Java and Python.
    const over = { ...two, solution: { ...two.solution, cpp: "int other() {}" } };
    expect(hasBundledSolutions(over)).toBe(false);
    expect(hasBundledSolutions(two)).toBe(true);
    expect(solutionCode(over, "java")).toBeNull();
  });
});
