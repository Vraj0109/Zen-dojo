import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { packProblemSpec, validatePack } from "@habit/shared";
import { runCode } from "./run";

const has = (cmd: string) => !spawnSync(cmd, ["--version"], { stdio: "ignore" }).error;
const GPP = has("g++");
const root = path.resolve(__dirname, "../../../..");

const run = (script: string, args: string[]) =>
  spawnSync(process.execPath, ["--disable-warning=DEP0205", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--import", "./scripts/lib/register-ts.mjs", `scripts/${script}`, ...args], { cwd: root, encoding: "utf8" });

const draft = (cpp: string) => ({
  format: "prepwise-pack",
  version: 1,
  id: "tiny",
  title: "Tiny",
  description: "",
  sections: [
    {
      title: "S",
      items: [
        {
          type: "problem",
          id: "double-it",
          title: "Double it",
          statement: ["Return 2 * x."],
          constraints: ["0 <= x <= 1000"],
          fn: { name: "doubleIt", params: [{ name: "x", type: "int" }], returns: "int" },
          examples: [{ input: [4] }],
          tests: [{ input: [0] }, { input: [1000] }, { input: [7] }],
          hints: ["h"],
          solution: { idea: ["Multiply."], complexity: "O(1)", cpp },
        },
      ],
    },
  ],
});

describe("pack:check", () => {
  it("accepts the sample pack and explains what is wrong with a draft", () => {
    const ok = run("pack-check.mjs", ["docs/examples/sample-pack.json"]);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("OK:");
    const d = run("pack-check.mjs", ["docs/examples/sample-draft.json"]);
    expect(d.status).toBe(1);
    expect(d.stderr).toContain('needs "input"');
    expect(d.stderr).toContain("pnpm pack:build");
    expect(run("pack-check.mjs", ["docs/examples/does-not-exist.json"]).status).toBe(2);
  }, 60_000); // three node start-ups; slow when several checks run at once
});

describe.skipIf(!GPP)("pack:build", () => {
  it("writes the outputs of a draft from its C++ solution, and --verify agrees", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "habit-packbuild-"));
    try {
      const file = path.join(dir, "draft.json");
      const out = path.join(dir, "pack.json");
      writeFileSync(file, JSON.stringify(draft("class Solution {\npublic:\n    int doubleIt(int x) { return 2 * x; }\n};\n")));
      const built = run("pack-build.mjs", [file, "-o", out]);
      expect(built.status, built.stderr).toBe(0);
      const pack = JSON.parse(readFileSync(out, "utf8"));
      const item = pack.sections[0].items[0];
      expect([...item.examples, ...item.tests].map((c: { output: number }) => c.output)).toEqual([8, 0, 2000, 14]);
      expect(run("pack-check.mjs", [out]).status).toBe(0);
      expect(run("pack-build.mjs", ["--verify", out]).status).toBe(0);
      // a stored answer that is wrong is reported
      item.tests[0].output = 1;
      writeFileSync(out, JSON.stringify(pack));
      const wrong = run("pack-build.mjs", ["--verify", out]);
      expect(wrong.status).toBe(1);
      expect(wrong.stderr).toContain("differ");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  it("fails and writes nothing when the solution does not compile or crashes", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "habit-packbuild-"));
    try {
      const out = path.join(dir, "pack.json");
      const bad = path.join(dir, "bad.json");
      writeFileSync(bad, JSON.stringify(draft("class Solution { this is not C++ };")));
      const compile = run("pack-build.mjs", [bad, "-o", out]);
      expect(compile.status).toBe(1);
      expect(compile.stderr).toContain("does not compile");
      const crash = path.join(dir, "crash.json");
      writeFileSync(crash, JSON.stringify(draft("class Solution {\npublic:\n    int doubleIt(int x) { vector<int> v; return v.at(5) + x; }\n};\n")));
      const c2 = run("pack-build.mjs", [crash, "-o", out]);
      expect(c2.status).toBe(1);
      expect(c2.stderr).toContain("Nothing was written");
      expect(() => readFileSync(out)).toThrow();
      const missing = path.join(dir, "missing.json");
      const d = draft("x");
      delete (d.sections[0].items[0] as { solution?: unknown }).solution;
      writeFileSync(missing, JSON.stringify(d));
      expect(run("pack-build.mjs", [missing, "-o", out]).stderr).toContain("solution");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});

describe.skipIf(!GPP)("large inputs in a pack problem", () => {
  const pack = (cpp: string) => {
    const check = validatePack({
      format: "prepwise-pack",
      version: 1,
      id: "slow",
      title: "Slow",
      description: "",
      sections: [
        {
          title: "S",
          items: [
            {
              type: "problem",
              id: "total",
              title: "Total",
              statement: ["Return the sum of nums."],
              constraints: ["1 <= nums.length <= 200000"],
              fn: { name: "total", params: [{ name: "nums", type: "int[]" }], returns: "long" },
              examples: [{ input: [[1, 2, 3]], output: 6 }],
              tests: [{ input: [[5]], output: 5 }],
              hints: ["h"],
              solution: { idea: ["Add them up."], complexity: "O(n)", cpp },
              stress: [{ label: "200000 numbers", limitMs: 600, gen: { kind: "ints", n: 200000, min: 1, max: 9, seed: 5 } }],
            },
          ],
        },
      ],
    });
    if (!check.ok) throw new Error(check.errors.join("; "));
    const item = check.pack.sections[0].items[0];
    if (item.type !== "problem") throw new Error("problem");
    return packProblemSpec(item, "slow");
  };

  it("passes a linear solution and reports a quadratic one as too slow", async () => {
    const linear = "class Solution {\npublic:\n    long long total(vector<int>& nums) { long long s = 0; for (int x : nums) s += x; return s; }\n};\n";
    // The right answer, but it does n steps for each of the n numbers.
    const quadratic = "class Solution {\npublic:\n    long long total(vector<int>& nums) {\n        long long s = 0;\n        for (size_t i = 0; i < nums.size(); i++) {\n            long long part = 0;\n            for (size_t j = 0; j <= i; j++) part += (j == i) ? nums[i] : 0;\n            s += part;\n        }\n        return s;\n    }\n};\n";
    const fast = await runCode(pack(linear), "cpp", linear);
    expect(fast.status).toBe("done");
    if (fast.status === "done") expect(fast.passed, JSON.stringify(fast.results.filter((r) => !r.pass))).toBe(fast.total);
    const slow = await runCode(pack(linear), "cpp", quadratic);
    expect(slow.status).toBe("done");
    if (slow.status === "done") {
      const big = slow.results.find((r) => r.kind === "stress")!;
      expect(big.pass).toBe(false);
      expect(big.problem).toBe("tle");
    }
  }, 120_000);
});
